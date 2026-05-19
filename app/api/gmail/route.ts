import { google } from "googleapis"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { cookies } from "next/headers"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" })

export async function GET() {
  const cookieStore = await cookies()
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
      maxResults: 5, // reduced from 10 to save quota
      q: "is:inbox",
    })

    const messages = messageList.data.messages || []
    const emailSummaries: { id: string; from: string; subject: string; snippet: string }[] = []

    // Step 1: Fetch all emails first (no AI calls yet)
    for (const msg of messages) {
      const full = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
      })

      const headers = full.data.payload?.headers || []
      const subject = headers.find(h => h.name === "Subject")?.value || ""
      const from = headers.find(h => h.name === "From")?.value || ""
      const snippet = full.data.snippet || ""

      emailSummaries.push({ id: msg.id!, from, subject, snippet })
    }

    if (emailSummaries.length === 0) {
      return Response.json({ tasks: [] })
    }

    // Step 2: ONE single AI call for ALL emails (saves 90% quota)
    const emailList = emailSummaries.map((e, i) =>
      `Email ${i + 1}:\nFrom: ${e.from}\nSubject: ${e.subject}\nMessage: ${e.snippet.substring(0, 200)}`
    ).join("\n---\n")

    let text = ""
    try {
      const prompt = `You are a task extraction AI. Analyze these emails and extract actionable tasks.

${emailList}

Respond ONLY with a JSON array. For each email, include an entry ONLY if it contains a task:
[{"email_index":1,"is_task":true,"task_title":"short title","client":"company name","priority":"High or Medium or Low","deadline":"date or null","confidence":80}]
If no emails have tasks, respond with: []`;

      // The Gemini SDK auto-retries on 429 quota errors, causing the app to hang for up to a minute.
      // We wrap it in a 4-second timeout to instantly trigger the mock fallback instead.
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error("429 Timeout")), 4000))
      ]) as any;

      text = result.response.text()
    } catch (apiError: any) {
      if (apiError.status === 429 || String(apiError).includes("429") || String(apiError).includes("quota")) {
        console.warn("Gemini Quota Exceeded. Falling back to mock extraction for testing.");
        // Fallback: create mock tasks from the first 2 emails so the user can test the UI
        text = JSON.stringify(
          emailSummaries.slice(0, 2).map((e, i) => ({
            email_index: i + 1,
            is_task: true,
            task_title: `[MOCK] Address: ${e.subject.substring(0, 20)}`,
            client: e.from.split("@")[0].substring(0, 15),
            priority: i === 0 ? "High" : "Medium",
            deadline: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
            confidence: 99
          }))
        );
      } else {
        throw apiError;
      }
    }

    const extractedTasks = []

    try {
      const cleaned = text.replace(/```json|```/g, "").trim()
      const parsed = JSON.parse(cleaned)

      if (Array.isArray(parsed)) {
        for (const task of parsed) {
          if (task.is_task) {
            const emailData = emailSummaries[task.email_index - 1]
            if (!emailData) continue

            extractedTasks.push({
              id: Date.now() + Math.floor(Math.random() * 10000),
              title: task.task_title,
              client: task.client || "Unknown",
              assignedTo: "Unassigned",
              deadline: task.deadline || new Date().toISOString().split('T')[0],
              priority: task.priority || "Medium",
              source: "email",
              sourceGroup: emailData.subject.substring(0, 30) + "...",
              status: "pending",
              confidence: task.confidence || 85,
              sourceMessage: emailData.snippet,
            })
          }
        }
      }
    } catch (e) {
      console.error("Failed to parse Gemini response:", text)
    }

    return Response.json({ tasks: extractedTasks })
  } catch (error: any) {
    console.error("Gmail API Error:", error)
    return Response.json({ error: "Failed to fetch emails", details: error.message || String(error) }, { status: 500 })
  }
}
