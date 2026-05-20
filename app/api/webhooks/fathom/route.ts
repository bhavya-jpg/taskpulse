import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ingestFathomMeeting } from "@/lib/meetings/fathom.service";
import crypto from "crypto";

/**
 * Verifies that the webhook request is authentic and comes from Fathom.
 */
function verifyFathomWebhook(secret: string, headers: { id: string; timestamp: string; signature: string }, rawBody: string): boolean {
  try {
    // 1. Verify timestamp (within 5 minutes skew tolerance to prevent replay attacks)
    const timestamp = parseInt(headers.timestamp, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTimestamp - timestamp) > 300) {
      console.error("Fathom webhook timestamp skew too large:", { currentTimestamp, timestamp });
      return false;
    }

    // 2. Construct signed content: id.timestamp.body
    const signedContent = `${headers.id}.${headers.timestamp}.${rawBody}`;

    // 3. Base64 decode the secret (after whsec_ prefix)
    const secretPart = secret.split("_")[1] || secret;
    const secretBytes = Buffer.from(secretPart, "base64");

    // 4. Calculate expected HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac("sha256", secretBytes)
      .update(signedContent)
      .digest("base64");

    // 5. Extract signatures from header (removing any version prefixes, e.g. "v1,")
    const signatures = headers.signature.split(" ").map((sig) => {
      const parts = sig.split(",");
      return parts.length > 1 ? parts[1] : parts[0];
    });

    // 6. Perform constant-time secure comparison
    return signatures.some((sig) =>
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(sig)
      )
    );
  } catch (error) {
    console.error("Fathom webhook signature verification failed with error:", error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const webhookSecret = process.env.FATHOM_WEBHOOK_SECRET;

    // 1. Validate signature if a secret is configured in the environment
    if (webhookSecret) {
      const webhookId = req.headers.get("webhook-id") || "";
      const webhookTimestamp = req.headers.get("webhook-timestamp") || "";
      const webhookSignature = req.headers.get("webhook-signature") || "";

      if (!webhookId || !webhookTimestamp || !webhookSignature) {
        return NextResponse.json({ error: "Missing required webhook verification headers" }, { status: 401 });
      }

      const isValid = verifyFathomWebhook(
        webhookSecret,
        { id: webhookId, timestamp: webhookTimestamp, signature: webhookSignature },
        rawBody
      );

      if (!isValid) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }
    } else {
      console.warn("FATHOM_WEBHOOK_SECRET is not configured in .env. Skipping webhook verification.");
    }

    // 2. Parse body
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // 3. Resolve user email from Fathom recorded_by
    const hostEmail = body.recorded_by?.email;
    if (!hostEmail) {
      console.error("No host email found in Fathom payload:", body);
      return NextResponse.json({ error: "Missing recorded_by.email in payload" }, { status: 400 });
    }

    // 4. Resolve user ID
    let userId: string | null = null;
    
    // Attempt lookup in DB using get_user_id_by_email RPC
    try {
      const { data: authUser } = await supabaseAdmin.rpc("get_user_id_by_email", { email: hostEmail });
      userId = authUser;
    } catch (err) {
      console.warn("RPC get_user_id_by_email lookup failed, checking tables...", err);
    }

    // Smart fallback for demo or development environment where host email might not match auth.users exactly
    if (!userId) {
      console.log(`Could not find user ID matching email ${hostEmail}. Trying fallback to primary user ID.`);
      const { data: anyMeeting } = await supabaseAdmin.from("meetings").select("user_id").limit(1);
      if (anyMeeting && anyMeeting.length > 0) {
        userId = anyMeeting[0].user_id;
      } else {
        const { data: anyTask } = await supabaseAdmin.from("tasks").select("user_id").limit(1);
        if (anyTask && anyTask.length > 0) {
          userId = anyTask[0].user_id;
        }
      }
    }

    if (!userId) {
      console.error("Could not resolve any user ID for this Fathom meeting. hostEmail:", hostEmail);
      return NextResponse.json({ error: "Could not resolve user" }, { status: 404 });
    }

    // 5. Ingest meeting and tasks
    console.log(`Ingesting Fathom meeting: "${body.title || body.meeting_title}" for user: ${userId}`);
    const result = await ingestFathomMeeting(userId, body);

    return NextResponse.json({
      success: true,
      alreadyExisted: result.alreadyExisted,
      meetingId: result.meeting.id,
      tasksCreated: result.tasksCreated,
    });
  } catch (error) {
    console.error("Fathom webhook processing error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
