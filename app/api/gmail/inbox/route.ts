import { google } from "googleapis";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function getDBEmails(company: string | null, userId: string) {
  let query = supabaseAdmin.from("emails").select("*");
  if (company) {
    query = query.eq("company", company);
  } else {
    query = query.eq("user_id", userId);
  }
  const { data, error } = await query.order("created_at", { ascending: false }).limit(20);
  if (error) {
    console.error("[Gmail Inbox API] Failed to fetch emails from DB:", error);
    return [];
  }
  return (data || []).map((e: any) => ({
    id: e.id,
    subject: e.subject,
    fromName: e.from_name,
    fromEmail: e.from_email,
    date: e.date,
    snippet: e.snippet,
    isUnread: e.is_unread,
  }));
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  // Resolve company from user's profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("company")
    .eq("id", userId)
    .single();
  const company = profile?.company || null;

  const cookieStore = await cookies();
  let token = cookieStore.get("gmail_token")?.value;
  const refreshToken = cookieStore.get("gmail_refresh_token")?.value;

  if (!token && !refreshToken) {
    // If not authenticated via Gmail, pull cached emails from DB
    const dbEmails = await getDBEmails(company, userId);
    return NextResponse.json({ emails: dbEmails, source: "database" });
  }

  const origin = new URL(request.url).origin;
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${origin}/api/auth/callback`
  );

  auth.setCredentials({
    access_token: token,
    refresh_token: refreshToken,
  });

  let refreshed = false;

  // Proactively refresh access token if it is missing but we have a refresh token
  if (!token && refreshToken) {
    try {
      console.log("[Gmail Inbox API] Access token missing. Silently refreshing with refresh token...");
      const { credentials } = await auth.refreshAccessToken();
      token = credentials.access_token!;
      auth.setCredentials(credentials);
      refreshed = true;
    } catch (refreshErr) {
      console.error("[Gmail Inbox API] Proactive token refresh failed:", refreshErr);
      const dbEmails = await getDBEmails(company, userId);
      return NextResponse.json({ emails: dbEmails, source: "database" });
    }
  }

  const gmail = google.gmail({ version: "v1", auth });
  let messageList;

  try {
    messageList = await gmail.users.messages.list({
      userId: "me",
      maxResults: 20,
      q: "is:inbox",
    });
  } catch (err: any) {
    const isAuthError = err.code === 401 || String(err).includes("invalid_grant") || String(err).includes("credentials") || String(err).includes("auth");
    if (isAuthError && refreshToken) {
      try {
        console.log("[Gmail Inbox API] Token expired. Silently refreshing...");
        const { credentials } = await auth.refreshAccessToken();
        token = credentials.access_token!;
        auth.setCredentials(credentials);
        refreshed = true;

        // Retry the list fetch
        messageList = await gmail.users.messages.list({
          userId: "me",
          maxResults: 20,
          q: "is:inbox",
        });
      } catch (refreshErr) {
        console.error("[Gmail Inbox API] Token refresh on 401 failed:", refreshErr);
        const dbEmails = await getDBEmails(company, userId);
        return NextResponse.json({ emails: dbEmails, source: "database" });
      }
    } else {
      console.error("[Gmail Inbox API] Failed to list messages:", err);
      const dbEmails = await getDBEmails(company, userId);
      return NextResponse.json({ emails: dbEmails, source: "database_fallback", details: err.message || String(err) });
    }
  }

  const messages = messageList.data.messages || [];
  const emails = [];

  for (const msg of messages) {
    try {
      const full = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "Date"],
      });

      const headers = full.data.payload?.headers || [];
      const subject = headers.find(h => h.name === "Subject")?.value || "(No Subject)";
      const from = headers.find(h => h.name === "From")?.value || "";
      const date = headers.find(h => h.name === "Date")?.value || "";
      const isUnread = full.data.labelIds?.includes("UNREAD") || false;

      // Parse from name and email
      const fromMatch = from.match(/^(.*?)\s*<(.+)>$/);
      const fromName = fromMatch ? fromMatch[1].trim() : from;
      const fromEmail = fromMatch ? fromMatch[2] : from;

      emails.push({
        id: msg.id,
        subject,
        fromName,
        fromEmail,
        date,
        snippet: full.data.snippet || "",
        isUnread,
      });
    } catch (getErr) {
      console.error(`[Gmail Inbox API] Failed to fetch full message ${msg.id}:`, getErr);
    }
  }

  // Batch upsert to database under company scope for collaborative sync
  if (emails.length > 0) {
    const upsertRows = emails.map(email => ({
      id: email.id,
      user_id: userId,
      subject: email.subject,
      from_name: email.fromName,
      from_email: email.fromEmail,
      date: email.date,
      snippet: email.snippet,
      is_unread: email.isUnread,
      company,
    }));

    const { error: upsertError } = await supabaseAdmin
      .from("emails")
      .upsert(upsertRows, { onConflict: "id" });

    if (upsertError) {
      console.error("[Gmail Inbox API] Failed to batch-upsert emails to DB:", upsertError);
    }
  }

  const response = NextResponse.json({ emails, source: "gmail_api" });

  // If the access token was refreshed, update the client cookie
  if (refreshed && token) {
    response.cookies.set("gmail_token", token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return response;
}
