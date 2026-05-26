/**
 * TASKPULSE — BAILEYS WHATSAPP INTEGRATION SERVICE
 * ─────────────────────────────────────────────────
 * PURPOSE  : Read-only listener for user-consented WhatsApp groups.
 *            Extracts task signals and pushes them to the AI pipeline.
 * ANTI-BAN : Never sends messages. Mimics human-linked-device behaviour.
 * SCOPE    : Only processes groups the user explicitly approves.
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
  proto,
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
  userId: string;               // Your app's user ID
  socket: WASocket | null;
  status: "connecting" | "connected" | "disconnected" | "banned";
  connectedAt: Date | null;
  phoneNumber: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// ANTI-BAN: We only reconnect during these hours (IST).
// Outside these hours, we close the socket and let the phone be the primary device.
const ACTIVE_HOURS_START = 8;   // 8 AM
const ACTIVE_HOURS_END   = 21;  // 9 PM

// ANTI-BAN: Maximum messages we process per minute (rate-limit our own AI calls).
const MAX_MESSAGES_PER_MINUTE = 30;

// ANTI-BAN: Random jitter range in ms added before processing (looks human).
const JITTER_MIN_MS = 400;
const JITTER_MAX_MS = 3200;

// Thread context: how many prior messages to fetch for AI context window.
const THREAD_CONTEXT_DEPTH = 4;

// Auth state storage path (per user).
const AUTH_BASE_PATH = path.join(process.cwd(), ".baileys_sessions");

// ─── Main Service ─────────────────────────────────────────────────────────────

export class BaileysService extends EventEmitter {
  private sessions = new Map<string, BaileysSession>();
  private msgCache  = new NodeCache({ stdTTL: 600 });  // 10-min message cache for dedup
  private rateLimiter = new Map<string, number[]>();    // userId → timestamps[]
  
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

  // ─── Connect (called after user scans QR) ──────────────────────────────────

  async connect(userId: string): Promise<void> {
    const authDir = path.join(AUTH_BASE_PATH, userId);
    fs.mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    // ANTI-BAN: Use a signal key cache so session re-use is smooth,
    // avoiding repeated QR re-scans that look suspicious to WhatsApp servers.
    const msgRetryCounterCache = new NodeCache();

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, this.logger as any),
      },
      // ANTI-BAN: Do NOT print QR to terminal in production.
      printQRInTerminal: process.env.NODE_ENV !== "production",
      
      // ANTI-BAN: Suppress read receipts so we don't mark every message
      // as "read by a bot" — that pattern is detectable.
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,

      // ANTI-BAN: Use browser fingerprint identical to WhatsApp Web.
      browser: ["TaskPulse", "Chrome", "120.0.0"],

      logger: this.logger as any,
      msgRetryCounterCache,

      // ANTI-BAN: Enable retries for failed decrypts (reduces error noise).
      retryRequestDelayMs: 2000,
    });

    const session: BaileysSession = {
      userId,
      socket: sock,
      status: "connecting",
      connectedAt: null,
      phoneNumber: null,
    };
    this.sessions.set(userId, session);

    // ── Event: QR Code ──────────────────────────────────────────────────────
    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Emit QR for the frontend to display as a scannable image.
        this.emit("qr", { userId, qr });
      }

      if (connection === "open") {
        session.status    = "connected";
        session.connectedAt = new Date();
        session.phoneNumber = sock.user?.id?.split(":")[0] ?? null;
        this.emit("connected", { userId, phoneNumber: session.phoneNumber });
        this.logger.info({ userId }, "WhatsApp connected");
        this.scheduleOffHoursDisconnect(userId);
      }

      if (connection === "close") {
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode;

        // ANTI-BAN: Handle ban detection gracefully.
        if (code === DisconnectReason.loggedOut || code === 401) {
          session.status = "banned";
          this.emit("banned", { userId });
          this.logger.warn({ userId, code }, "Session logged out or banned");
          return; // Do NOT reconnect — number is banned.
        }

        // ANTI-BAN: Use exponential back-off for reconnects, not instant retry.
        const shouldReconnect =
          code !== DisconnectReason.loggedOut &&
          this.isWithinActiveHours();

        if (shouldReconnect) {
          session.status = "disconnected";
          const delay = this.antiban.getReconnectDelay(userId);
          this.logger.info({ userId, delay }, "Reconnecting after delay");
          setTimeout(() => this.connect(userId), delay);
        }
      }
    });

    // ── Event: Save credentials ─────────────────────────────────────────────
    sock.ev.on("creds.update", saveCreds);

    // ── Event: Incoming messages (THE CORE OPERATION) ───────────────────────
    sock.ev.on("messages.upsert", (event) => {
      this.handleIncomingMessages(userId, sock, event);
    });

    // ── Event: Group metadata update (name changes, etc.) ───────────────────
    sock.ev.on("groups.update", async (updates) => {
      for (const update of updates) {
        if (update.subject) {
          await this.sessionStore.updateGroupName(userId, update.id!, update.subject);
        }
      }
    });
  }

  // ─── Core Message Handler ──────────────────────────────────────────────────

  private async handleIncomingMessages(
    userId: string,
    sock: WASocket,
    event: BaileysEventMap["messages.upsert"]
  ): Promise<void> {
    if (event.type !== "notify") return;  // Only process new incoming messages

    for (const msg of event.messages) {
      // ── GATE 1: Only process group messages ─────────────────────────────
      const jid = msg.key.remoteJid;
      if (!jid || !jid.endsWith("@g.us")) continue;  // Not a group

      // ── GATE 2: Skip messages sent BY this account ──────────────────────
      // ANTI-BAN: We are read-only. Never echo our own messages.
      if (msg.key.fromMe) continue;

      // ── GATE 3: Only process user-consented groups ───────────────────────
      // This is the privacy guarantee — we literally ignore everything else.
      const approvedGroups = await this.consent.getApprovedGroups(userId);
      if (!approvedGroups.includes(jid)) continue;

      // ── GATE 4: Deduplication ────────────────────────────────────────────
      const cacheKey = `${userId}:${msg.key.id}`;
      if (this.msgCache.get(cacheKey)) continue;
      this.msgCache.set(cacheKey, true);

      // ── GATE 5: Rate limiting ─────────────────────────────────────────────
      // ANTI-BAN: We throttle our own processing to look non-robotic.
      if (!this.checkRateLimit(userId)) continue;

      // ── GATE 6: Extract text (only process text-based messages) ──────────
      const messageText = this.extractText(msg);
      if (!messageText || messageText.trim().length < 3) continue;

      // ── ANTI-BAN: Add human-like random jitter before processing ─────────
      const jitter = JITTER_MIN_MS + Math.random() * (JITTER_MAX_MS - JITTER_MIN_MS);
      await this.sleep(jitter);

      // ── Build enriched message payload ───────────────────────────────────
      try {
        const groupMeta  = await this.getGroupMetaWithCache(sock, jid, userId);
        const senderJid  = msg.key.participant || msg.participant || "";
        const senderName = await this.getSenderName(sock, senderJid, groupMeta);
        const context    = await this.buildThreadContext(sock, jid, msg, groupMeta);

        const enriched: IncomingMessage = {
          groupJid:    jid,
          groupName:   groupMeta?.subject ?? "Unknown Group",
          senderJid,
          senderName,
          senderPhone: senderJid.split("@")[0],
          messageText: messageText.trim(),
          timestamp:   msg.messageTimestamp as number,
          messageId:   msg.key.id!,
          threadContext: context,
        };

        // ── Send to AI extraction pipeline ───────────────────────────────
        const task = await this.ai.extractTask(userId, enriched);
        if (task) {
          this.emit("task:detected", { userId, task });
        }
      } catch (err) {
        this.logger.error({ err, userId, jid }, "Error processing message");
      }
    }
  }

  // ─── Group Listing (for consent UI) ───────────────────────────────────────

  /**
   * Returns all groups the user is a member of.
   * Called after connection to populate the "Select groups to monitor" UI.
   */
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

  // ─── Anti-Ban: Schedule off-hours disconnect ───────────────────────────────

  private scheduleOffHoursDisconnect(userId: string): void {
    const now = new Date();
    const istHour = (now.getUTCHours() + 5.5) % 24; // IST = UTC+5:30

    if (istHour >= ACTIVE_HOURS_END || istHour < ACTIVE_HOURS_START) {
      // Already off-hours — disconnect now
      this.gracefulDisconnect(userId);
      return;
    }

    // Schedule disconnect at end of active window
    const minutesUntilEnd = (ACTIVE_HOURS_END - istHour) * 60;
    const msUntilEnd = minutesUntilEnd * 60 * 1000;

    setTimeout(() => {
      this.gracefulDisconnect(userId);
      // Schedule reconnect at start of next active window
      const msUntilStart = (24 - ACTIVE_HOURS_END + ACTIVE_HOURS_START) * 3600 * 1000;
      setTimeout(() => this.connect(userId), msUntilStart);
    }, msUntilEnd);
  }

  private isWithinActiveHours(): boolean {
    const now = new Date();
    const istHour = (now.getUTCHours() + 5.5) % 24;
    return istHour >= ACTIVE_HOURS_START && istHour < ACTIVE_HOURS_END;
  }

  // ─── Anti-Ban: Rate limiter ────────────────────────────────────────────────

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const timestamps = (this.rateLimiter.get(userId) ?? [])
      .filter((t) => now - t < windowMs);

    if (timestamps.length >= MAX_MESSAGES_PER_MINUTE) return false;

    timestamps.push(now);
    this.rateLimiter.set(userId, timestamps);
    return true;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

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
    if (cached && Date.now() - cached.cachedAt < 30 * 60 * 1000) return cached.meta; // 30 min TTL
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
    await session.socket.logout();
    session.socket = null;
    session.status = "disconnected";
    this.emit("disconnected", { userId });
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  getSessionStatus(userId: string): BaileysSession["status"] | "none" {
    return this.sessions.get(userId)?.status ?? "none";
  }
}
