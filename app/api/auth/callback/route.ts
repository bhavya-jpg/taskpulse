import { google } from "googleapis"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${origin}/api/auth/callback`
  )

  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  
  if (!code) {
    return Response.json({ error: "No code provided" }, { status: 400 })
  }

  try {
    const { tokens } = await oauth2Client.getToken(code)
    
    // Fetch connected user's email address
    oauth2Client.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client })
    let userEmail = ""
    try {
      const userInfo = await oauth2.userinfo.get()
      userEmail = userInfo.data.email || ""
    } catch (e) {
      // If we can't get email, just continue without it
    }

    const response = NextResponse.redirect(new URL("/", request.url))
    response.cookies.set("gmail_token", tokens.access_token!, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7
    })
    if (tokens.refresh_token) {
      response.cookies.set("gmail_refresh_token", tokens.refresh_token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30 * 6 // 6 months
      })
    }
    response.cookies.set("gmail_email", userEmail, {
      path: "/",
      httpOnly: false, // readable by client JS
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7
    })
    
    return response
  } catch (error: any) {
    console.error("OAuth Error:", error.message || error)
    return Response.json({ error: "Failed to exchange token", details: error.message || String(error) }, { status: 500 })
  }
}
