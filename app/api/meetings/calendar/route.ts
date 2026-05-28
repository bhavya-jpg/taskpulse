import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchGoogleCalendarEvents, createGoogleCalendarEvent } from "@/lib/meetings/calendar.service";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !(session as any).accessToken) {
    return NextResponse.json({ error: "Unauthorized or missing access token" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    // Default to a 3-month window around today if not specified
    const timeMin = start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = end || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    const events = await fetchGoogleCalendarEvents((session as any).accessToken, timeMin, timeMax);

    // Also fetch our taskpulse processed meetings to see which events are already processed
    const { data: processedMeetings } = await supabaseAdmin
      .from('meetings')
      .select('id, event_id')
      .eq('user_id', session.user.id)
      .not('event_id', 'is', null);

    const processedEventMap = new Map(processedMeetings?.map(m => [m.event_id, m.id]) || []);

    const enrichedEvents = events.map(ev => ({
      ...ev,
      isProcessed: ev.id ? processedEventMap.has(ev.id) : false,
      meetingId: ev.id ? processedEventMap.get(ev.id) : null
    }));

    return NextResponse.json({ success: true, events: enrichedEvents });
  } catch (error) {
    console.error("Calendar fetch error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !(session as any).accessToken) {
    return NextResponse.json({ error: "Unauthorized or missing access token" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, start, end, platform, description, meetingType, clientName } = body;

    if (!title || !start || !end) {
      return NextResponse.json({ error: "Title, start time, and end time are required." }, { status: 400 });
    }

    const event = await createGoogleCalendarEvent((session as any).accessToken, {
      title,
      start,
      end,
      platform: platform || "manual",
      description,
      meetingType,
      clientName,
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error("Calendar event scheduling error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
