import { google } from 'googleapis';
import { supabaseAdmin } from '../supabase-admin';
import { normalizeTranscript } from '../utils/parsers';
import { analyzeMeetingTranscript, processMeetingTasks } from '../ai/meeting-analyzer.service';

export async function pollGoogleMeetTranscripts(userId: string, auth: any) {
  // Fetch current user's profile to resolve company
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("company")
    .eq("id", userId)
    .single();
  const company = profile?.company || null;

  const drive = google.drive({ version: 'v3', auth });
  
  // Search for Google Doc transcripts created in the last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const response = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.document' 
        and name contains 'Transcript' 
        and createdTime > '${oneDayAgo}'`,
    fields: 'files(id, name, createdTime, webViewLink)',
  });

  const files = response.data.files || [];
  const processedResults = [];

  for (const file of files) {
    if (!file.id) continue;

    // Check if we've already processed this file
    const { data: existing } = await supabaseAdmin
      .from('meetings')
      .select('id')
      .eq('transcript_url', file.webViewLink || file.id)
      .single();

    if (existing) continue;

    // Export Google Doc as plain text
    const content = await drive.files.export({
      fileId: file.id,
      mimeType: 'text/plain',
    });

    const rawText = content.data as string;
    const title = file.name?.replace('Transcript - ', '') || 'Google Meet';
    const date = file.createdTime || new Date().toISOString();
    const platform = 'google_meet';

    // Normalize
    const normalizedText = normalizeTranscript(rawText, 'google_meet');

    // Analyze
    const analysis = await analyzeMeetingTranscript(normalizedText, {
      title,
      date,
      participants: [],
    });

    const { data: meeting, error: meetingError } = await supabaseAdmin
      .from('meetings')
      .insert({
        user_id: userId,
        company,
        title,
        platform,
        meeting_date: date,
        transcript_url: file.webViewLink || file.id,
        summary: analysis.summary,
        raw_transcript: normalizedText,
        key_topics: analysis.key_topics,
        decisions: analysis.decisions,
      })
      .select()
      .single();

    if (meetingError) {
      console.error('Error saving Google Meet meeting:', meetingError);
      continue;
    }

    // Process Tasks
    const tasks = await processMeetingTasks(userId, meeting.id, analysis, { title, date, platform });

    processedResults.push({ meetingId: meeting.id, tasksCreated: tasks.length });
  }

  return processedResults;
}
