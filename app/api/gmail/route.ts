import { google } from "googleapis"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { cookies } from "next/headers"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

export async function GET() {
  const cookieStore = cookies()
  const token = cookieStore.get("gmail_token")?.value

  if (!token) {
    return Response.json({ error: "Not authenticated" }, { status: 401 })
  }

  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: token })
  const gmail = google.gmail({ version: "v1", auth })

  try {
    const messageList = await gmail.users.messages.list({
      userId: "me",
      maxResults: 10,
      q: "is:inbox",
    })

    const messages = messageList.data.messages || []
    const extractedTasks = []

    for (const msg of messages) {
      const full = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
      })

      const headers = full.data.payload?.headers || []
      const subject = headers.find(h => h.name === "Subject")?.value || ""
      const from = headers.find(h => h.name === "From")?.value || ""
      const snippet = full.data.snippet || ""

      const result = await model.generateContent(`
You are a task extraction AI. Analyze this email and extract any actionable task.
From: ${from}
Subject: ${subject}
Message: ${snippet}

Respond ONLY in this JSON format, nothing else:
{
  "is_task": true or false,
  "task_title": "action verb first, max 10 words",
  "client": "company name from sender",
  "priority": "High or Medium or Low",
  "deadline": "date if mentioned or null",
  "confidence": number between 0 and 100
}`)

      const text = result.response.text()
      try {
        const cleaned = text.replace(/```json|```/g, "").trim()
        const parsed = JSON.parse(cleaned)
        if (parsed.is_task) {
          extractedTasks.push({
            id: Date.now() + Math.floor(Math.random() * 1000), // unique id
            title: parsed.task_title,
            client: parsed.client || "Unknown",
            assignedTo: "Unassigned",
            deadline: parsed.deadline || new Date().toISOString().split('T')[0],
            priority: parsed.priority || "Medium",
            source: "email",
            sourceGroup: \`\${subject.substring(0, 30)}...\`,
            status: "pending",
            confidence: parsed.confidence || 85,
            sourceMessage: snippet,
          })
        }
      } catch (e) {
        console.error("Failed to parse Gemini response", e)
        continue
      }
    }

    return Response.json({ tasks: extractedTasks })
  } catch (error) {
    console.error("Gmail API Error:", error)
    return Response.json({ error: "Failed to fetch emails" }, { status: 500 })
  }
}
