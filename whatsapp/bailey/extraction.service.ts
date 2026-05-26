/**
 * AI EXTRACTION SERVICE
 * ──────────────────────
 * Takes an enriched WhatsApp message from Baileys and asks Claude to determine
 * if it is a task. Returns a structured task object or null.
 *
 * Uses a two-tier filter to reduce Claude API costs:
 *   Tier 1 → Fast keyword check (free, instant)
 *   Tier 2 → Full Claude extraction (costs tokens, only ~15% of msgs reach here)
 */

import Anthropic from "@anthropic-ai/sdk";
import { IncomingMessage } from "../whatsapp/baileys.service";
import { supabaseAdmin } from "../../lib/supabase-admin";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExtractedTask {
  id:             string;
  userId:         string;
  title:          string;
  priority:       "High" | "Medium" | "Low";
  deadline:       string | null;   // ISO date or null
  assignee:       string | null;   // Name of person task is assigned to (for auto-routing)
  confidence:     number;          // 0–100
  status:         "confirmed" | "unconfirmed";
  sourcePayload: {
    platform:    "whatsapp";
    groupName:   string;
    groupJid:    string;
    senderName:  string;
    senderPhone: string;
    messageText: string;
    timestamp:   number;
    messageId:   string;
  };
}

// ─── Tier 1: Fast Filter ──────────────────────────────────────────────────────
// Skip Claude entirely for obvious non-tasks. Saves ~85% of API costs.

const NON_TASK_EXACT: Set<string> = new Set([
  "ok", "okay", "k", "yes", "no", "sure", "noted", "noted.", "👍", "👌",
  "thanks", "thank you", "thx", "ty", "hmm", "haha", "lol", "😂", "🙏",
  "good", "great", "nice", "perfect", "🎉", "understood", "received",
  "ji", "ji haan", "theek hai", "dekha jayega", "ho jayega",
]);

const NON_TASK_PATTERNS = [
  /^[\u{1F300}-\u{1FFFF}]+$/u,      // emoji-only
  /^(good morn|good night|gm|gn)/i, // greetings
  /^\+\d{10,15}$/,                  // phone numbers
  /^https?:\/\//i,                  // bare URLs without text
];

function passesQuickFilter(text: string): boolean {
  const clean = text.trim().toLowerCase();
  if (NON_TASK_EXACT.has(clean)) return false;
  if (clean.length < 8) return false;
  if (NON_TASK_PATTERNS.some((p) => p.test(clean))) return false;
  return true;
}

// ─── Tier 2: Claude Extraction ────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a task extraction AI for a business productivity platform called TaskPulse.

Your job: Given a WhatsApp group message and its thread context, determine if it contains an actionable task.

STRICT RULES:
1. Messages like "OK", "noted", "yes sir", "ji", "theek hai", "👍", "sure" → NEVER a task. confidence: 0.
2. Questions asked by the sender are NOT tasks unless the question implies they assigned work.
3. If a name is mentioned ("Rahul, please do X"), extract the assignee as "Rahul".
4. Hinglish messages: translate mentally before classifying. "kal tak bhej de" = "send by tomorrow".
5. Senders with role "admin" or "owner" in a group carry higher implicit priority.
6. Extract deadlines from phrases: "by EOD", "kal tak" (by tomorrow), "Friday tak", "ASAP".
7. If confidence is below 55, set is_task to false.

RESPOND ONLY WITH VALID JSON — no markdown, no explanation outside the JSON:
{
  "is_task": true | false,
  "task_title": "Action-oriented title starting with a verb (max 12 words)",
  "priority": "High" | "Medium" | "Low",
  "deadline": "YYYY-MM-DD" | null,
  "assignee": "Person's first name or full name" | null,
  "confidence": 0-100,
  "reason": "One sentence explaining the decision"
}`;

function buildUserPrompt(msg: IncomingMessage, senderRole: string): string {
  const contextBlock = msg.threadContext.length > 0
    ? `THREAD CONTEXT (last ${msg.threadContext.length} messages before this one):\n` +
      msg.threadContext
        .map((m) => `  [${m.senderName}]: "${m.text}"`)
        .join("\n")
    : "THREAD CONTEXT: (no prior messages available)";

  return `${contextBlock}

CURRENT MESSAGE:
  Sender: ${msg.senderName} (${senderRole})
  Group: ${msg.groupName}
  Text: "${msg.messageText}"
  Sent at: ${new Date(msg.timestamp * 1000).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class AIExtractionService {
  async extractTask(userId: string, msg: IncomingMessage): Promise<ExtractedTask | null> {
    // TIER 1: Quick filter
    if (!passesQuickFilter(msg.messageText)) return null;

    // Fetch sender role from group metadata (stored during connection)
    const senderRole = await this.getSenderRole(userId, msg.groupJid, msg.senderJid);

    // TIER 2: Claude extraction
    let parsed: any;
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(msg, senderRole) }],
      });

      const raw = (response.content[0] as any).text.trim();
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("[AI] Extraction failed:", err);
      return null;
    }

    if (!parsed.is_task || parsed.confidence < 55) return null;

    // Boost priority if sender is group admin/owner
    if (senderRole === "admin" || senderRole === "owner") {
      if (parsed.priority === "Low") parsed.priority = "Medium";
      else if (parsed.priority === "Medium") parsed.priority = "High";
    }

    const task: ExtractedTask = {
      id:         crypto.randomUUID(),
      userId,
      title:      parsed.task_title,
      priority:   parsed.priority,
      deadline:   parsed.deadline ?? null,
      assignee:   parsed.assignee ?? null,
      confidence: parsed.confidence,
      status:     parsed.confidence >= 85 ? "confirmed" : "unconfirmed",
      sourcePayload: {
        platform:    "whatsapp",
        groupName:   msg.groupName,
        groupJid:    msg.groupJid,
        senderName:  msg.senderName,
        senderPhone: msg.senderPhone,
        messageText: msg.messageText,
        timestamp:   msg.timestamp,
        messageId:   msg.messageId,
      },
    };

    // Persist to Supabase
    await this.saveTask(task);
    return task;
  }

  private async saveTask(task: ExtractedTask): Promise<void> {
    await supabaseAdmin.from("tasks").insert({
      id:           task.id,
      user_id:      task.userId,
      title:        task.title,
      priority:     task.priority,
      deadline:     task.deadline,
      assignee:     task.assignee,
      confidence:   task.confidence,
      status:       task.status,
      source_platform: "whatsapp",
      source_group_name: task.sourcePayload.groupName,
      source_group_jid:  task.sourcePayload.groupJid,
      source_sender_name: task.sourcePayload.senderName,
      source_message_text: task.sourcePayload.messageText,
      source_timestamp: new Date(task.sourcePayload.timestamp * 1000).toISOString(),
      source_message_id: task.sourcePayload.messageId,
      created_at:   new Date().toISOString(),
    });
  }

  private async getSenderRole(userId: string, groupJid: string, senderJid: string): Promise<string> {
    try {
      const { data } = await supabaseAdmin
        .from("whatsapp_group_participants")
        .select("role")
        .eq("user_id", userId)
        .eq("group_jid", groupJid)
        .eq("participant_jid", senderJid)
        .single();
      return data?.role ?? "member";
    } catch {
      return "member";
    }
  }
}
