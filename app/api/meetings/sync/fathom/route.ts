import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchFathomMeetings, ingestFathomMeeting } from "@/lib/meetings/fathom.service";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.FATHOM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      error: "Fathom API Key is not configured. Please add FATHOM_API_KEY to your .env file."
    }, { status: 400 });
  }

  try {
    console.log(`Starting manual Fathom sync for user: ${session.user.id}`);
    
    // Fetch recent meetings from Fathom
    const { items } = await fetchFathomMeetings(apiKey);
    
    if (!items || items.length === 0) {
      return NextResponse.json({
        success: true,
        processed: [],
        message: "No meetings found in your Fathom account."
      });
    }

    const processed = [];
    
    // Ingest each meeting
    for (const item of items) {
      const result = await ingestFathomMeeting(session.user.id, item);
      if (!result.alreadyExisted) {
        processed.push({
          id: result.meeting.id,
          title: (result.meeting as any).title || item.title || item.meeting_title || "Fathom Meeting",
          tasksCreated: result.tasksCreated
        });
      }
    }

    if (processed.length === 0) {
      return NextResponse.json({
        success: true,
        processed: [],
        message: "All meetings are already synced."
      });
    }

    return NextResponse.json({
      success: true,
      processed,
      message: `Successfully synced Fathom. Processed ${processed.length} new meetings.`
    });
  } catch (error) {
    console.error("Fathom manual sync error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
