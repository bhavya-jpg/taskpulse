import { google } from "googleapis"

export async function GET(request: Request) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:3000/api/auth/callback"
  )

  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  
  if (!code) {
    return Response.json({ error: "No code provided" }, { status: 400 })
  }

  const { tokens } = await oauth2Client.getToken(code)
  
  const response = Response.redirect("http://localhost:3000")
  response.headers.set(
    "Set-Cookie",
    `gmail_token=${tokens.access_token}; Path=/; HttpOnly`
  )
  
  return response
}
