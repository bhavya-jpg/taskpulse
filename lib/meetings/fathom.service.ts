import { supabaseAdmin } from "../supabase-admin";

export interface FathomTranscriptItem {
  speaker?: {
    display_name?: string;
    matched_calendar_invitee_email?: string;
  };
  text: string;
  timestamp?: string;
}

export interface FathomActionItem {
  description: string;
  completed?: boolean;
  recording_timestamp?: string;
  recording_playback_url?: string;
  assignee?: {
    name?: string;
    email?: string;
    team?: string;
  };
}

export interface FathomMeeting {
  recording_id: number;
  title: string;
  meeting_title?: string;
  url: string;
  share_url: string;
  created_at: string;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  recording_start_time?: string;
  recording_end_time?: string;
  transcript?: FathomTranscriptItem[];
  default_summary?: {
    template_name?: string;
    markdown_formatted?: string;
    text?: string;
  };
  action_items?: FathomActionItem[];
  recorded_by?: {
    name?: string;
    email?: string;
    team?: string;
  };
}

/**
 * Formats a Fathom transcript array into a single readable string.
 */
export function formatFathomTranscript(transcript?: FathomTranscriptItem[]): string {
  if (!transcript || !Array.isArray(transcript)) return "";
  return transcript
    .map((item) => {
      const speakerName = item.speaker?.display_name || "Unknown Speaker";
      const timestampPart = item.timestamp ? `[${item.timestamp}] ` : "";
      return `${timestampPart}${speakerName}: ${item.text}`;
    })
    .join("\n");
}

/**
 * Fetches meetings from Fathom external API.
 */
export async function fetchFathomMeetings(apiKey: string, cursor?: string): Promise<{ items: FathomMeeting[]; next_cursor: string | null }> {
  const url = new URL("https://api.fathom.ai/external/v1/meetings");
  url.searchParams.set("include_summary", "true");
  url.searchParams.set("include_action_items", "true");
  url.searchParams.set("include_transcript", "true");
  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fathom API error (${response.status}): ${errorText || response.statusText}`);
  }

  const data = await response.json();
  return {
    items: data.items || [],
    next_cursor: data.next_cursor || null,
  };
}

/**
 * Ingests a Fathom meeting and its tasks into the database.
 * Returns the inserted meeting and the count of tasks created.
 */
export async function ingestFathomMeeting(userId: string, fathomMeeting: FathomMeeting) {
  const shareUrl = fathomMeeting.share_url || fathomMeeting.url;
  const meetingTitle = fathomMeeting.title || fathomMeeting.meeting_title || "Fathom Meeting";
  const meetingDate = fathomMeeting.recording_start_time || fathomMeeting.scheduled_start_time || fathomMeeting.created_at || new Date().toISOString();
  
  // 1. Check if meeting already exists for this user by share_url
  const { data: existingMeeting, error: checkError } = await supabaseAdmin
    .from("meetings")
    .select("id")
    .eq("user_id", userId)
    .eq("transcript_url", shareUrl)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking existing fathom meeting:", checkError);
  }

  if (existingMeeting) {
    console.log(`Meeting already ingested (ID: ${existingMeeting.id})`);
    return { meeting: existingMeeting, alreadyExisted: true, tasksCreated: 0 };
  }

  // 2. Prepare meeting object
  const rawTranscript = formatFathomTranscript(fathomMeeting.transcript);
  const summaryMarkdown = fathomMeeting.default_summary?.markdown_formatted || fathomMeeting.default_summary?.text || "";

  // Attempt to parse out some decisions/topics from the summary if available
  const decisions: any[] = [];
  const keyTopics: string[] = [];
  
  if (summaryMarkdown) {
    // Simple regex or line analysis to populate key topics if empty
    const lines = summaryMarkdown.split("\n");
    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.startsWith("-") || cleanLine.startsWith("*")) {
        const item = cleanLine.substring(1).trim();
        if (item.length > 5 && item.length < 100 && decisions.length < 5) {
          decisions.push({ decision: item, context: "" });
        }
      }
    }
  }

  const meetingData = {
    user_id: userId,
    title: meetingTitle,
    platform: "fathom",
    meeting_date: meetingDate,
    transcript_url: shareUrl,
    summary: summaryMarkdown,
    raw_transcript: rawTranscript,
    key_topics: keyTopics.length > 0 ? keyTopics : ["Fathom Integration", "Meeting Notes"],
    decisions: decisions.length > 0 ? decisions : [{ decision: "Fathom meeting notes successfully captured.", context: "" }],
  };

  // 3. Insert meeting into database with platform constraint retry fallback
  let meetingInsertResult = await supabaseAdmin
    .from("meetings")
    .insert(meetingData)
    .select()
    .single();

  if (meetingInsertResult.error) {
    const errorMsg = meetingInsertResult.error.message;
    // Check if it's a check constraint error on the platform column
    if (errorMsg.includes("platform") || errorMsg.includes("meetings_platform_check")) {
      console.warn("Fathom platform CHECK constraint failed in database. Retrying with platform 'manual' fallback.");
      const fallbackMeetingData = {
        ...meetingData,
        platform: "manual" as any, // fallback to manual platform
      };
      meetingInsertResult = await supabaseAdmin
        .from("meetings")
        .insert(fallbackMeetingData)
        .select()
        .single();
    }
  }

  if (meetingInsertResult.error) {
    throw new Error(`Failed to insert fathom meeting into database: ${meetingInsertResult.error.message}`);
  }

  const insertedMeeting = meetingInsertResult.data;
  let tasksCreatedCount = 0;

  // 4. Ingest action items as unconfirmed tasks
  if (fathomMeeting.action_items && Array.isArray(fathomMeeting.action_items)) {
    for (const item of fathomMeeting.action_items) {
      const task = {
        user_id: userId,
        title: item.description,
        priority: "Medium" as const,
        deadline: null,
        assignee: item.assignee?.name || item.assignee?.email || "Unassigned",
        confidence: 100, // Direct extraction from Fathom action items is high confidence
        status: "unconfirmed" as const, // goes to 'Needs Review'
        source_platform: "fathom",
        source_group_name: meetingTitle,
        source_message_text: `Action Item from Fathom Meeting. Playback Link: ${item.recording_playback_url || shareUrl}`,
        source_timestamp: meetingDate,
        meeting_id: insertedMeeting.id,
        source_quote: item.recording_playback_url || shareUrl,
      };

      const { error: taskError } = await supabaseAdmin
        .from("tasks")
        .insert(task);

      if (taskError) {
        console.error("Error inserting fathom task:", taskError);
      } else {
        tasksCreatedCount++;
      }
    }
  }

  return {
    meeting: insertedMeeting,
    alreadyExisted: false,
    tasksCreated: tasksCreatedCount,
  };
}
