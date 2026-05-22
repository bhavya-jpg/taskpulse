import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const globalAny = global as any;
globalAny._slackUserCache = globalAny._slackUserCache || {};

async function getSlackUsername(userId: string, token: string): Promise<string> {
  if (globalAny._slackUserCache[userId]) {
    return globalAny._slackUserCache[userId];
  }
  try {
    const res = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.ok && data.user) {
      const name = data.user.real_name || data.user.name;
      globalAny._slackUserCache[userId] = name;
      return name;
    }
  } catch (err) {
    console.error(`[Slack messages API] Error resolving username for ${userId}:`, err);
  }
  return userId === "USLACKBOT" ? "Slack Bot" : userId;
}

async function getDBSlackMessages(company: string | null, userId: string) {
  let query = supabaseAdmin.from("slack_messages").select("*");
  if (company) {
    query = query.eq("company", company);
  } else {
    query = query.eq("user_id", userId);
  }
  const { data, error } = await query.order("timestamp", { ascending: false }).limit(30);
  if (error) {
    console.error("[Slack messages API] Failed to fetch from DB:", error);
    return [];
  }
  return (data || []).map((m: any) => ({
    id: m.id,
    sender: m.sender,
    text: m.text,
    timestamp: m.timestamp,
    channelId: m.channel_id,
    channelName: m.channel_name,
  }));
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  // Resolve user company profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("company")
    .eq("id", userId)
    .single();
  const company = profile?.company || null;

  const cookieStore = await cookies();
  const token = cookieStore.get("slack_token")?.value;
  const channelId = cookieStore.get("slack_channel")?.value;
  const channelName = cookieStore.get("slack_channel_name")?.value || "Slack Channel";

  if (!token || !channelId) {
    // Return cached DB messages if offline/not connected
    const cached = await getDBSlackMessages(company, userId);
    return NextResponse.json({ messages: cached, source: "database" });
  }

  try {
    const slackRes = await fetch(`https://slack.com/api/conversations.history?channel=${channelId}&limit=30`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const slackData = await slackRes.json();
    if (!slackData.ok) {
      console.error("[Slack messages API] Slack API Error:", slackData.error);
      const cached = await getDBSlackMessages(company, userId);
      return NextResponse.json({ messages: cached, source: "database_fallback", error: slackData.error });
    }

    const messages = slackData.messages || [];
    const parsedMessages = [];

    for (const msg of messages) {
      // Skip system join/leave/pin messages unless they are standard messages or bot messages
      if (msg.subtype && msg.subtype !== "bot_message") continue;
      if (!msg.text || msg.text.trim() === "") continue;

      const senderName = await getSlackUsername(msg.user || "Slack Bot", token);
      parsedMessages.push({
        id: msg.ts,
        sender: senderName,
        text: msg.text,
        timestamp: msg.ts,
        channelId,
        channelName,
      });
    }

    // Persist to database in batch
    if (parsedMessages.length > 0) {
      const upsertRows = parsedMessages.map(m => ({
        id: m.id,
        user_id: userId,
        sender: m.sender,
        text: m.text,
        timestamp: m.timestamp,
        channel_id: m.channelId,
        channel_name: m.channelName,
        company,
      }));

      const { error: upsertError } = await supabaseAdmin
        .from("slack_messages")
        .upsert(upsertRows, { onConflict: "id" });

      if (upsertError) {
        console.error("[Slack messages API] Failed to upsert to DB:", upsertError);
      }
    }

    return NextResponse.json({ messages: parsedMessages, source: "slack_api" });
  } catch (err: any) {
    console.error("[Slack messages API] Fetch Error:", err);
    const cached = await getDBSlackMessages(company, userId);
    return NextResponse.json({ messages: cached, source: "database_fallback", error: err.message || String(err) });
  }
}
