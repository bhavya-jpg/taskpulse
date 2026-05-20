import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pollGoogleMeetTranscripts } from "@/lib/meetings/google-meet.service";
import { google } from "googleapis";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !(session as any).accessToken) {
    return NextResponse.json({ error: "Unauthorized or missing access token" }, { status: 401 });
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: (session as any).accessToken });

    const results = await pollGoogleMeetTranscripts(session.user.id, auth);

    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        processed: [],
        message: "No new meeting transcripts found in your Google Drive for the last 24 hours.",
      });
    }

    return NextResponse.json({
      success: true,
      processed: results,
      message: `Successfully checked Google Drive. Processed ${results.length} new meetings.`,
    });
  } catch (error) {
    console.error("Google sync error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
