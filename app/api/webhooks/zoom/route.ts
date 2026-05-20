import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeTranscript } from "@/lib/utils/parsers";
import { analyzeMeetingTranscript, processMeetingTasks } from "@/lib/ai/meeting-analyzer.service";
import crypto from "crypto";

// Zoom requires a CRC validation for webhooks
// https://developers.zoom.us/docs/api/rest/webhook-reference/#validate-webhook-events
function validateZoomWebhook(req: NextRequest, secretToken: string | undefined) {
  if (!secretToken) return true; // Skip if not configured (not recommended for production)
  
  // Implementation of validation logic would go here
  // For now, we'll focus on the data processing logic
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Handle CRC validation
    if (body.event === "endpoint.url_validation") {
      const plainToken = body.payload.plainToken;
      const hash = crypto
        .createHmac("sha256", process.env.ZOOM_WEBHOOK_SECRET_TOKEN || "")
        .update(plainToken)
        .digest("hex");
      
      return NextResponse.json({
        plainToken,
        encryptedToken: hash
      });
    }

    // 2. Handle Transcript Completed
    if (body.event === "recording.transcript_completed") {
      const { payload } = body;
      const recordingFile = payload.object.recording_files.find(
        (f: any) => f.file_type === "TRANSCRIPT"
      );

      if (!recordingFile) {
        return NextResponse.json({ message: "No transcript file found" });
      }

      const downloadUrl = `${recordingFile.download_url}?access_token=${payload.download_token}`;
      
      // Fetch transcript content
      const response = await fetch(downloadUrl);
      const transcriptText = await response.text();

      // Find user by Zoom email or account ID
      // This part requires a mapping in your database
      const userEmail = payload.object.host_email;
      const { data: user, error: userError } = await supabaseAdmin
        .from("users") // Replace with your actual users table or logic
        .select("id")
        .eq("email", userEmail)
        .single();
      
      // If we don't have a users table with emails, we might need another way to link
      // For this demo, we'll try to find the user in auth.users
      let userId = user?.id;
      if (!userId) {
        const { data: authUser } = await supabaseAdmin.rpc('get_user_id_by_email', { email: userEmail });
        userId = authUser;
      }

      if (!userId) {
        console.error("Could not find user for Zoom email:", userEmail);
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const title = payload.object.topic || "Zoom Meeting";
      const date = payload.object.start_time;
      const platform = "zoom";

      // Normalize
      const normalizedText = normalizeTranscript(transcriptText, "zoom");

      // Analyze
      const analysis = await analyzeMeetingTranscript(normalizedText, {
        title,
        date,
        participants: [], // Zoom webhook doesn't easily list all participants here
      });

      // Save Meeting
      const { data: meeting, error: meetingError } = await supabaseAdmin
        .from("meetings")
        .insert({
          user_id: userId,
          title,
          platform,
          meeting_date: date,
          summary: analysis.summary,
          raw_transcript: normalizedText,
          key_topics: analysis.key_topics,
          decisions: analysis.decisions,
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      // Process Tasks
      await processMeetingTasks(userId, meeting.id, analysis, { title, date, platform });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ message: "Event ignored" });
  } catch (error) {
    console.error("Zoom webhook error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
