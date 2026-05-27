import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeTranscript } from "@/lib/utils/parsers";
import { analyzeMeetingTranscript, processMeetingTasks } from "@/lib/ai/meeting-analyzer.service";
import { updateGoogleCalendarEventDescription } from "@/lib/meetings/calendar.service";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("transcript") as File | null;
    const platform = (formData.get("platform") as string) || "manual";
    const title = (formData.get("title") as string) || "Untitled Meeting";
    const date = (formData.get("date") as string) || new Date().toISOString();
    const participantsString = (formData.get("participants") as string) || "";
    const participants = participantsString.split(",").map(p => p.trim()).filter(p => p);
    
    // New fields
    const eventId = formData.get("eventId") as string | null;
    const meetingType = formData.get("meetingType") as string | null;
    const clientName = formData.get("clientName") as string | null;

    let rawText = "";
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      rawText = buffer.toString("utf-8");
    } else {
      rawText = (formData.get("text") as string) || "";
    }

    if (!rawText) {
      return NextResponse.json({ error: "No transcript content provided" }, { status: 400 });
    }

    // 1. Normalize
    const normalizedText = normalizeTranscript(rawText, platform as any);

    // 2. Analyze
    const analysis = await analyzeMeetingTranscript(normalizedText, {
      title,
      date,
      participants,
      meetingType: meetingType || undefined,
      clientName: clientName || undefined,
    });

    // 3. Save Meeting to DB
    const { data: meeting, error: meetingError } = await supabaseAdmin
      .from("meetings")
      .insert({
        user_id: session.user.id,
        title,
        platform,
        meeting_date: date,
        summary: analysis.summary,
        raw_transcript: normalizedText,
        key_topics: analysis.key_topics,
        decisions: analysis.decisions,
        event_id: eventId,
      })
      .select()
      .single();

    if (meetingError) throw meetingError;

    // 4. Process Tasks
    const tasks = await processMeetingTasks(
      session.user.id,
      meeting.id,
      analysis,
      { 
        title, 
        date, 
        platform,
        meetingType: meetingType || undefined,
        clientName: clientName || undefined,
      }
    );

    // 5. Calendar Writeback
    if (eventId && (session as any).accessToken) {
      const dashboardLink = `[View Meeting in TaskPulse Dashboard](${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/founder)`;
      const writebackContent = `Summary:\n${analysis.summary}\n\nTasks Extracted: ${tasks.length}\n\n${dashboardLink}`;
      
      try {
        await updateGoogleCalendarEventDescription((session as any).accessToken, eventId, writebackContent);
      } catch (calendarError) {
        console.error("Failed to update Google Calendar event:", calendarError);
        // We do not fail the upload request if calendar update fails
      }
    }

    return NextResponse.json({
      success: true,
      meetingId: meeting.id,
      analysis,
      tasksCreated: tasks.length,
    });
  } catch (error) {
    console.error("Meeting upload error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
