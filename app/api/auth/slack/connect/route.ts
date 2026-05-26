import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { token, channelId, channelName } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Slack Token is required" }, { status: 400 });
    }

    if (!channelId) {
      return NextResponse.json({ error: "Slack Channel ID is required" }, { status: 400 });
    }

    const response = NextResponse.json({ success: true, channelName: channelName || channelId });

    // Store credentials in HttpOnly secure cookies
    response.cookies.set("slack_token", token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    response.cookies.set("slack_channel", channelId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    response.cookies.set("slack_channel_name", channelName || channelId, {
      path: "/",
      httpOnly: false, // Accessible by UI to show connected status
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to connect Slack" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });

  response.cookies.delete("slack_token");
  response.cookies.delete("slack_channel");
  response.cookies.delete("slack_channel_name");

  return response;
}
