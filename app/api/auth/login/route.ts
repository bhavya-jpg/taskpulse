import { google } from "googleapis"

export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${origin}/api/auth/callback`
  )
  
  const url = oauth2Client.generateAuthUrl({
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email"
    ],
    access_type: "offline",
    prompt: "consent",
  })
  
  return Response.redirect(url)
}
