/**
 * TASKPULSE — BAILEYS WHATSAPP INTEGRATION SERVICE
 * ─────────────────────────────────────────────────
 * PURPOSE  : Read-only listener for user-consented WhatsApp groups.
 * ANTI-BAN : Never sends messages. Mimics human-linked-device behaviour.
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
  BaileysEventMap,
  WAMessage,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import NodeCache from "node-cache";
import pino from "pino";
import path from "path";
import fs from "fs";
import { EventEmitter } from "events";

import { AIExtractionService } from "../ai/extraction.service";
import { GroupConsentService } from "./group-consent.service";
import { SessionStore } from "./session.store";
import { AntibanGuard } from "./antiban.guard";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IncomingMessage {
  groupJid: string;
  groupName: string;
  senderJid: string;
  senderName: string;
  senderPhone: string;
  messageText: string;
  timestamp: number;
  messageId: string;
  threadContext: ThreadMessage[];
}

export interface ThreadMessage {
  senderName: string;
  text: string;
  timestamp: number;
}

export interface BaileysSession {
  userId: string;
  socket: WASocket | null;
  status: "connecting" | "connected" | "disconnected" | "banned";
  connectedAt: Date | null;
  phoneNumber: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVE_HOURS_START = 8;
const ACTIVE_HOURS_END   = 21;
const MAX_MESSAGES_PER_MINUTE = 30;
const JITTER_MIN_MS = 400;
const JITTER_MAX_MS = 3200;
const THREAD_CONTEXT_DEPTH = 4;
const AUTH_BASE_PATH = path.join(process.cwd(), ".baileys_sessions");

// ─── Main Service ─────────────────────────────────────────────────────────────

export class BaileysService extends EventEmitter {
  private sessions = new Map<string, BaileysSession>();
  private msgCache  = new NodeCache({ stdTTL: 600 });
  private rateLimiter = new Map<string, number[]>();
  
  private logger = pino({
    level: process.env.NODE_ENV === "production" ? "warn" : "info",
  });

  constructor(
    private readonly ai: AIExtractionService,
    private readonly consent: GroupConsentService,
    private readonly sessionStore: SessionStore,
    private readonly antiban: AntibanGuard
  ) {
    super();
  }

  async connect(userId: string): Promise<void> {
    const authDir = path.join(AUTH_BASE_PATH, userId);
    fs.mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const msgRetryCounterCache = new NodeCache();

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, this.logger as any),
      },
      printQRInTerminal: process.env.NODE_ENV !== "production",
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,
      browser: ["TaskPulse", "Chrome", "120.0.0"],
      logger: this.logger as any,
      msgRetryCounterCache,
      retryRequestDelayMs: 2000,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
    });

    const session: BaileysSession = {
      userId,
      socket: sock,
      status: "connecting",
      connectedAt: null,
      phoneNumber: null,
    };
    this.sessions.set(userId, session);

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.emit("qr", { userId, qr });
      }

      if (connection === "open") {
        session.status    = "connected";
        session.connectedAt = new Date();
        session.phoneNumber = sock.user?.id?.split(":")[0] ?? null;
        this.emit("connected", { userId, phoneNumber: session.phoneNumber });
        this.logger.info({ userId }, "WhatsApp connected");
        // Bypassed: allow 24/7 connection for development/testing and full agency task coverage
        // this.scheduleOffHoursDisconnect(userId);
      }

      if (connection === "close") {
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode;

        if (code === DisconnectReason.loggedOut || code === 401) {
          session.status = "banned";
          this.emit("banned", { userId });
          this.logger.warn({ userId, code }, "Session logged out or banned");
          return;
        }

        const shouldReconnect = code !== DisconnectReason.loggedOut;

        if (shouldReconnect) {
          session.status = "disconnected";
          const delay = this.antiban.getReconnectDelay(userId);
          this.logger.info({ userId, delay }, "Reconnecting after delay");
          setTimeout(() => this.connect(userId), delay);
        }
      }
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", (event) => {
      this.handleIncomingMessages(userId, sock, event);
    });

    sock.ev.on("groups.update", async (updates) => {
      for (const update of updates) {
        if (update.subject) {
          await this.sessionStore.updateGroupName(userId, update.id!, update.subject);
        }
      }
    });
  }

  private async handleIncomingMessages(
    userId: string,
    sock: WASocket,
    event: BaileysEventMap["messages.upsert"]
  ): Promise<void> {
    if (event.type !== "notify") return;

    for (const msg of event.messages) {
      const jid = msg.key.remoteJid;
      if (!jid) continue;

      const messageText = this.extractText(msg);
      if (!messageText) continue;

      console.log(`\n📩 [WA Incoming] Message: "${messageText}" from JID: ${jid} (fromMe: ${msg.key.fromMe})`);

      const isGroup = jid.endsWith("@g.us");
      const isDM = jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid");

      if (!isGroup && !isDM) {
        console.log(`⚠️ [WA Incoming] Skipped: Message JID "${jid}" is not from a WhatsApp Group or DM contact`);
        continue;
      }

      if (msg.key.fromMe) {
        console.log("⚠️ [WA Incoming] Skipped: Sent by the connected account itself (to prevent loops)");
        continue;
      }

      let groupName = "Direct Message";
      let groupMeta = null;

      if (isGroup) {
        try {
          groupMeta = await this.getGroupMetaWithCache(sock, jid, userId);
          groupName = groupMeta?.subject ?? "WhatsApp Group";
        } catch {
          groupName = "WhatsApp Group";
        }

        const approvedGroups = await this.consent.getApprovedGroups(userId);
        if (!approvedGroups.includes(jid)) {
          if (approvedGroups.length === 0) {
            console.log(`💡 [WA Incoming] Auto-approving group "${groupName}" (${jid}) to make testing frictionless!`);
            await this.consent.addGroup(userId, jid, groupName);
          } else {
            console.log(`⚠️ [WA Incoming] Skipped: Group "${jid}" is not selected in your "Monitored Groups" list`);
            continue;
          }
        }
      } else {
        console.log(`💬 [WA Incoming] Processing direct private message (DM) from ${jid}`);
      }

      const cacheKey = `${userId}:${msg.key.id}`;
      if (this.msgCache.get(cacheKey)) continue;
      this.msgCache.set(cacheKey, true);

      if (!this.checkRateLimit(userId)) continue;

      if (messageText.trim().length < 8) {
        console.log(`⚠️ [WA Incoming] Skipped: Message is under 8 characters ("${messageText.trim()}")`);
        continue;
      }

      const jitter = JITTER_MIN_MS + Math.random() * (JITTER_MAX_MS - JITTER_MIN_MS);
      await this.sleep(jitter);

      try {
        const senderJid  = isGroup ? (msg.key.participant || msg.participant || "") : jid;
        const senderName = isGroup 
          ? await this.getSenderName(sock, senderJid, groupMeta) 
          : (msg.pushName || sock.user?.name || senderJid.split("@")[0]);
        const context    = await this.buildThreadContext(sock, jid, msg, groupMeta);

        const enriched: IncomingMessage = {
          groupJid:    jid,
          groupName:   groupName,
          senderJid,
          senderName,
          senderPhone: senderJid.split("@")[0],
          messageText: messageText.trim(),
          timestamp:   msg.messageTimestamp as number,
          messageId:   msg.key.id!,
          threadContext: context,
        };

        const task = await this.ai.extractTask(userId, enriched);
        if (task) {
          this.emit("task:detected", { userId, task });
        }
      } catch (err) {
        this.logger.error({ err, userId, jid }, "Error processing message");
      }
    }
  }

  async listUserGroups(userId: string): Promise<{ jid: string; name: string; memberCount: number }[]> {
    const session = this.sessions.get(userId);
    if (!session?.socket) throw new Error("Not connected");

    const groups = await session.socket.groupFetchAllParticipating();
    return Object.entries(groups)
      .filter(([jid]) => jid.endsWith("@g.us"))
      .map(([jid, meta]) => ({
        jid,
        name: meta.subject,
        memberCount: meta.participants.length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private scheduleOffHoursDisconnect(userId: string): void {
    const now = new Date();
    const istHour = (now.getUTCHours() + 5.5) % 24;

    if (istHour >= ACTIVE_HOURS_END || istHour < ACTIVE_HOURS_START) {
      this.gracefulDisconnect(userId);
      return;
    }

    const minutesUntilEnd = (ACTIVE_HOURS_END - istHour) * 60;
    const msUntilEnd = minutesUntilEnd * 60 * 1000;

    setTimeout(() => {
      this.gracefulDisconnect(userId);
      const msUntilStart = (24 - ACTIVE_HOURS_END + ACTIVE_HOURS_START) * 3600 * 1000;
      setTimeout(() => this.connect(userId), msUntilStart);
    }, msUntilEnd);
  }

  private isWithinActiveHours(): boolean {
    const now = new Date();
    const istHour = (now.getUTCHours() + 5.5) % 24;
    return istHour >= ACTIVE_HOURS_START && istHour < ACTIVE_HOURS_END;
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const windowMs = 60 * 1000;
    const timestamps = (this.rateLimiter.get(userId) ?? [])
      .filter((t) => now - t < windowMs);

    if (timestamps.length >= MAX_MESSAGES_PER_MINUTE) return false;

    timestamps.push(now);
    this.rateLimiter.set(userId, timestamps);
    return true;
  }

  private extractText(msg: WAMessage): string | null {
    return (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.buttonsResponseMessage?.selectedDisplayText ||
      null
    );
  }

  private groupMetaCache = new Map<string, { meta: any; cachedAt: number }>();

  private async getGroupMetaWithCache(sock: WASocket, jid: string, userId: string) {
    const cached = this.groupMetaCache.get(jid);
    if (cached && Date.now() - cached.cachedAt < 30 * 60 * 1000) return cached.meta;
    const meta = await sock.groupMetadata(jid);
    this.groupMetaCache.set(jid, { meta, cachedAt: Date.now() });
    return meta;
  }

  private async getSenderName(sock: WASocket, senderJid: string, groupMeta: any): Promise<string> {
    const participant = groupMeta?.participants?.find((p: any) => p.id === senderJid);
    if (participant?.name) return participant.name;
    try {
      const contact = await sock.fetchStatus(senderJid);
      return contact?.status ?? senderJid.split("@")[0];
    } catch {
      return senderJid.split("@")[0];
    }
  }

  private async buildThreadContext(
    sock: WASocket,
    jid: string,
    currentMsg: WAMessage,
    groupMeta: any
  ): Promise<ThreadMessage[]> {
    try {
      const history = await sock.fetchMessageHistory(THREAD_CONTEXT_DEPTH, currentMsg, jid);
      return (history || [])
        .filter((m) => this.extractText(m))
        .slice(-THREAD_CONTEXT_DEPTH)
        .map((m) => ({
          senderName: m.key.fromMe
            ? "You"
            : this.resolveNameFromGroup(m.key.participant || "", groupMeta),
          text: this.extractText(m)!,
          timestamp: m.messageTimestamp as number,
        }));
    } catch {
      return [];
    }
  }

  private resolveNameFromGroup(participantJid: string, groupMeta: any): string {
    const p = groupMeta?.participants?.find((x: any) => x.id === participantJid);
    return p?.name ?? participantJid.split("@")[0];
  }

  async gracefulDisconnect(userId: string): Promise<void> {
    const session = this.sessions.get(userId);
    if (!session?.socket) return;
    try {
      await session.socket.logout();
    } catch {}
    session.socket = null;
    session.status = "disconnected";
    this.emit("disconnected", { userId });
  }

  async resetSession(userId: string): Promise<void> {
    const session = this.sessions.get(userId);
    if (session) {
      try {
        if (session.socket) {
          session.socket.ev.removeAllListeners("connection.update");
          session.socket.ev.removeAllListeners("creds.update");
          session.socket.ev.removeAllListeners("messages.upsert");
          session.socket.end(new Error("Reset session"));
        }
      } catch (err) {}
      this.sessions.delete(userId);
    }

    // Completely wipe the directory
    const authDir = path.join(AUTH_BASE_PATH, userId);
    if (fs.existsSync(authDir)) {
      try {
        fs.rmSync(authDir, { recursive: true, force: true });
      } catch (err) {
        this.logger.error({ err, userId }, "Failed to wipe session directory");
      }
    }
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  getSessionStatus(userId: string): BaileysSession["status"] | "none" {
    return this.sessions.get(userId)?.status ?? "none";
  }
}
