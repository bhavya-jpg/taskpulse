/**
 * MEETING ANALYZER SERVICE (GEMINI)
 * ────────────────────────────────
 * Takes a normalized meeting transcript and uses Gemini to:
 * 1. Generate a summary
 * 2. Extract key decisions
 * 3. Extract action items (tasks)
 * 4. Identify key topics
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabaseAdmin } from "../supabase-admin";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface MeetingAnalysis {
  summary: string;
  decisions: Array<{ decision: string; context: string }>;
  action_items: Array<{
    task: string;
    assignee: string;
    deadline: string | null;
    priority: "High" | "Medium" | "Low";
    source_quote: string;
  }>;
  key_topics: string[];
  next_meeting: string | null;
}

const SYSTEM_PROMPT = `You are a meeting analyst for TaskPulse. 
Analyze the following meeting transcript and return a structured JSON response.

STRICT RULES:
1. "summary": 2-3 sentence overview of the meeting.
2. "decisions": List significant decisions made, with context.
3. "action_items": Extract specific tasks. 
   - "task": Action-oriented title (e.g., "Create marketing slides").
   - "assignee": Name or "Unassigned".
   - "deadline": YYYY-MM-DD or null.
   - "priority": "High" | "Medium" | "Low".
   - "source_quote": The exact sentence from the transcript where this was mentioned.
4. "key_topics": List 3-5 major topics discussed.
5. "next_meeting": Mentioned date/time or null.

RESPOND ONLY WITH VALID JSON.`;

export async function analyzeMeetingTranscript(
  transcript: string,
  meetingMeta: { title: string; date: string; participants: string[]; meetingType?: string; clientName?: string }
): Promise<MeetingAnalysis> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  let contextAddon = "";
  if (meetingMeta.meetingType === 'client' || meetingMeta.meetingType === 'internal_client') {
    contextAddon = `\nContext: This is a ${meetingMeta.meetingType === 'client' ? 'client meeting' : 'internal client discussion'} regarding ${meetingMeta.clientName}. Please tailor tasks appropriately.`;
  } else if (meetingMeta.meetingType === 'normal') {
    contextAddon = `\nContext: This is a normal internal team meeting.`;
  }

  const userPrompt = `
Meeting Title: ${meetingMeta.title}
Meeting Date: ${meetingMeta.date}
Participants: ${meetingMeta.participants.join(", ")}${contextAddon}

Transcript:
"""
${transcript}
"""

Return the analysis in the specified JSON format.`;

  const result = await model.generateContent([SYSTEM_PROMPT, userPrompt]);
  const response = await result.response;
  const text = response.text();

  // Strip markdown code blocks if Gemini includes them
  const cleanJson = text.replace(/```json|```/g, "").trim();
  
  try {
    return JSON.parse(cleanJson) as MeetingAnalysis;
  } catch (error) {
    console.error("Failed to parse Gemini response as JSON:", text);
    throw new Error("AI analysis failed to return valid data.");
  }
}

export async function processMeetingTasks(
  userId: string,
  meetingId: string,
  analysis: MeetingAnalysis,
  meetingMeta: { title: string; date: string; platform: string; meetingType?: string; clientName?: string }
) {
  // Fetch current user's profile to resolve company
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("company")
    .eq("id", userId)
    .single();
  const company = profile?.company || null;

  const createdTasks = [];

  for (const item of analysis.action_items) {
    let sourceGroupName = meetingMeta.title;
    if (meetingMeta.meetingType === 'client' || meetingMeta.meetingType === 'internal_client') {
      sourceGroupName = meetingMeta.clientName ? `${meetingMeta.clientName} Campaign` : meetingMeta.title;
    } else if (meetingMeta.meetingType === 'normal') {
      sourceGroupName = 'Internal Task';
    }

    const task = {
      user_id: userId,
      company,
      title: item.task,
      priority: item.priority || "Medium",
      deadline: item.deadline,
      assignee: item.assignee === "Unassigned" ? null : item.assignee,
      confidence: 100, // Direct extraction from meeting is usually high confidence
      status: "unconfirmed",
      source_platform: meetingMeta.platform,
      source_group_name: sourceGroupName,
      source_message_text: item.source_quote,
      source_timestamp: meetingMeta.date,
      meeting_id: meetingId,
      source_quote: item.source_quote,
    };

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .insert(task)
      .select()
      .single();

    if (error) {
      console.error("Error creating task from meeting:", error);
      continue;
    }
    
    createdTasks.push(data);
  }

  return createdTasks;
}
