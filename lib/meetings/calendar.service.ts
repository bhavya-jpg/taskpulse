import { google } from "googleapis";

export interface ParsedEventTag {
  meetingType: 'client' | 'internal_client' | 'normal' | null;
  clientName: string | null;
}

export function parseEventDescriptionForTags(description: string = ""): ParsedEventTag {
  const desc = description.toLowerCase();
  
  let meetingType: ParsedEventTag['meetingType'] = null;
  let clientName: string | null = null;

  // Flexible regex to match '#client: Zomato', '#client Zomato', 'client: Zomato', 'client Zomato'
  const clientRegex = /(?:#)?client(?:[:\s]+)([\w\s-]+?)(?=\n|$|<|#)/i;
  const internalClientRegex = /(?:#)?internal_client(?:[:\s]+)([\w\s-]+?)(?=\n|$|<|#)/i;
  const normalRegex = /(?:#)?normal/i;

  if (desc.includes("#internal_client") || internalClientRegex.test(desc)) {
    meetingType = 'internal_client';
    clientName = desc.match(internalClientRegex)?.[1]?.trim() || null;
  } else if (desc.includes("#client") || clientRegex.test(desc)) {
    meetingType = 'client';
    clientName = desc.match(clientRegex)?.[1]?.trim() || null;
    // Clean up if common words like meeting/sync get matched as client names
    if (clientName && ["meeting", "sync", "call", "discussion"].includes(clientName.toLowerCase())) {
      clientName = null;
    }
  } else if (desc.includes("#normal") || normalRegex.test(desc)) {
    meetingType = 'normal';
  }

  // Cleanup clientName if it matched trailing spaces or extra chars
  if (clientName) {
    clientName = clientName.replace(/<[^>]*>?/gm, '').trim(); // Remove HTML tags if any
  }

  return { meetingType, clientName };
}

export async function fetchGoogleCalendarEvents(accessToken: string, timeMin: string, timeMax: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth });

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: timeMin,
    timeMax: timeMax,
    maxResults: 100,
    singleEvents: true,
    orderBy: "startTime",
  });

  const events = res.data.items || [];
  
  return events.map(event => {
    const combinedText = `${event.summary || ""}\n${event.description || ""}`;
    const { meetingType, clientName } = parseEventDescriptionForTags(combinedText);
    
    return {
      id: event.id,
      title: event.summary || "Untitled Event",
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      description: event.description,
      htmlLink: event.htmlLink,
      meetingType,
      clientName,
      platform: event.hangoutLink ? 'google_meet' : 'manual'
    };
  });
}

export async function updateGoogleCalendarEventDescription(accessToken: string, eventId: string, newDescriptionAddon: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth });

  // First fetch the event to get the current description
  const eventRes = await calendar.events.get({
    calendarId: "primary",
    eventId: eventId,
  });

  const currentDesc = eventRes.data.description || "";
  
  // Prevent duplicate additions
  if (currentDesc.includes("TaskPulse Analysis")) {
    return;
  }

  const updatedDesc = `${currentDesc}\n\n========================\n🌟 TaskPulse Analysis 🌟\n========================\n${newDescriptionAddon}`;

  await calendar.events.patch({
    calendarId: "primary",
    eventId: eventId,
    requestBody: {
      description: updatedDesc,
    },
  });
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  eventDetails: {
    title: string;
    start: string;
    end: string;
    platform: string;
    description?: string;
    meetingType?: string;
    clientName?: string;
  }
) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth });

  // Format description with client tags if present
  let tagSnippet = "";
  if (eventDetails.meetingType) {
    if (eventDetails.meetingType === "client" && eventDetails.clientName) {
      tagSnippet = `#client: ${eventDetails.clientName}`;
    } else if (eventDetails.meetingType === "internal_client" && eventDetails.clientName) {
      tagSnippet = `#internal_client: ${eventDetails.clientName}`;
    } else if (eventDetails.meetingType === "normal") {
      tagSnippet = `#normal`;
    }
  }

  const finalDescription = eventDetails.description
    ? `${eventDetails.description}\n\n${tagSnippet}`.trim()
    : tagSnippet;

  const requestBody: any = {
    summary: eventDetails.title,
    description: finalDescription,
    start: {
      dateTime: eventDetails.start,
    },
    end: {
      dateTime: eventDetails.end,
    },
  };

  // If google_meet is selected, automatically request Google Meet link creation
  if (eventDetails.platform === "google_meet") {
    requestBody.conferenceData = {
      createRequest: {
        requestId: Math.random().toString(36).substring(2) + Date.now().toString(),
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    };
  }

  const res = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: eventDetails.platform === "google_meet" ? 1 : undefined,
    requestBody,
  });

  return res.data;
}
