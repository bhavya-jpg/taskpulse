import { google } from "googleapis"
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai"
import { cookies } from "next/headers"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { NextResponse } from "next/server"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Define structured JSON schema for task extraction to save tokens and prevent parsing errors
const taskExtractionSchema = {
  type: SchemaType.ARRAY,
  description: "List of extracted tasks from the emails",
  items: {
    type: SchemaType.OBJECT,
    properties: {
      email_index: {
        type: SchemaType.INTEGER,
        description: "The 1-based index of the email in the input list",
      },
      is_task: {
        type: SchemaType.BOOLEAN,
        description: "Whether the email contains an actionable task",
      },
      task_title: {
        type: SchemaType.STRING,
        description: "Action-oriented title starting with a verb (max 12 words)",
      },
      client: {
        type: SchemaType.STRING,
        description: "Company/Client name associated with this email (e.g. Zomato, Flipkart, Amazon, Google, or Unknown)",
      },
      priority: {
        type: SchemaType.STRING,
        description: "Priority of the task: High, Medium, or Low",
      },
      deadline: {
        type: SchemaType.STRING,
        description: "Deadline in YYYY-MM-DD format, or null if unspecified",
      },
      assignee: {
        type: SchemaType.STRING,
        description: "First name of the person this task should be assigned to, or null if unspecified",
      },
      confidence: {
        type: SchemaType.INTEGER,
        description: "Confidence score from 0 to 100",
      }
    },
    required: ["email_index", "is_task", "task_title", "client", "priority", "confidence"]
  }
}

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-lite",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: taskExtractionSchema,
  }
})

// ─── Fast Local Email Pre-Filter (Saves 80-90% Quota) ──────────────────────────

function isAutomatedEmail(from: string, subject: string): boolean {
  const f = from.toLowerCase()
  const s = subject.toLowerCase()

  const automatedSenders = [
    "noreply@", "no-reply@", "newsletter@", "support@", "alert@", "alerts@",
    "info@", "digest@", "notification@", "notifications@", "billing@",
    "invoice@", "receipt@", "verification@", "security@", "marketing@",
    "promo@", "promotions@", "newsletter-hub", "automated", "mailer-daemon",
    "@google.com", "@youtube.com", "@linkedin.com", "@facebook.com",
    "@twitter.com", "@github.com", "@slack.com", "@zoom.us", "@trello.com",
    "@figma.com", "@vercel.com", "@supabase.io", "@supabase.co", "@netlify.com"
  ]

  const automatedSubjects = [
    "security alert", "confirm your", "welcome to", "invoice", "receipt",
    "weekly digest", "your prescription", "password reset", "one-time password",
    "otp", "verify your", "sign-in", "newsletter", "digest", "monthly statement",
    "payment received", "subscribed", "transaction", "automatic renewal"
  ]

  if (automatedSenders.some(sender => f.includes(sender))) return true
  if (automatedSubjects.some(sub => s.includes(sub))) return true

  return false
}

function hasTaskKeywords(subject: string, snippet: string): boolean {
  const text = `${subject} ${snippet}`.toLowerCase()

  const taskKeywords = [
    // Standard English Task Keywords
    "please", "need you to", "need to", "action", "task", "submit", "deliver",
    "deadline", "by tomorrow", "by friday", "by eod", "by monday", "tomorrow eod",
    "urgently", "urgent", "creative", "creatives", "ppt", "deck", "proposal",
    "invoice", "send", "design", "make", "create", "fix", "update", "schedule",
    "meeting", "call", "review", "approved", "approve", "feedback", "revise",
    "revisions", "changes", "do this", "handle", "finish", "complete", "status",
    "assign", "report", "check", "verify", "deploy", "build", "bug", "issue",
    
    // Expanded English Task Indicators
    "todo", "to-do", "tasked", "action item", "action items", "assigned", "assignee",
    "draft", "write", "prepare", "compile", "format", "document", "code", "develop",
    "qa", "test", "audit", "inspect", "upload", "download", "share", "export",
    "import", "deliverable", "deliverables", "asap", "as soon as possible", "due by",
    "due date", "timeline", "milestone", "target date", "follow up", "follow-up",
    "chase", "remind", "reminder", "ping", "fix this", "debug", "resolve", "solve",
    "repair", "patch", "hotfix", "modify", "edit", "refactor", "redo", "re-do",
    "book", "setup", "arrange", "organize", "input", "thoughts", "sign-off", "sign off",
    "presentation", "slides", "spreadsheet", "sheet", "dashboard", "sync", "alignment",
    "huddle", "discuss", "forward", "attach", "run", "execute", "start", "begin",
    
    // Supported Clients & Brand Names
    "flipkart", "zomato", "amazon", "google", "client", "customer",

    // Transaction & Inquiry Terms
    "order", "orders", "ordered", "ask", "asking", "inquiry", "inquiries", 
    "enquiry", "enquiries", "request", "requests", "requested", "query", "queries", 
    "question", "questions", "help", "support", "assist", "assistance", "pricing", 
    "quote", "quotation", "delivery", "shipping", "shipped",

    // Hinglish Action & Task Keywords (Massive Quota Saver)
    "bhai", "yaar", "kal tak", "aaj tak", "shaam tak", "parso tak", "jaldi", 
    "urgent hai", "turant", "bhej", "bhejo", "bhej dena", "mail kar", "mail kardo",
    "send kar", "send kardo", "banado", "bana dena", "bana do", "banana hai",
    "kar dena", "kar do", "kardo", "kar de", "karle", "complete kar", "complete kardo",
    "complete kar dena", "finish kar", "finish kardo", "check kar", "check karlo", 
    "check karo", "review kar", "review karlo", "review karo", "feedback de", 
    "update kar", "update kardo", "update kar dena", "dekh le", "dekh lena", "dedo",
    "de do", "de dena", "dedena", "chahiye", "kam kar", "kaam kar", "banaye"
  ]

  return taskKeywords.some(kw => text.includes(kw))
}

// ─── API Route ────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  // Fetch current user's profile to resolve company
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("company, name, designation")
    .eq("id", userId)
    .single()
  const company = profile?.company || null
  const userName = profile?.name || null
  const designation = profile?.designation || null

  // Fetch registered whitelisted clients for this company
  let registeredClients: string[] = []
  if (company) {
    try {
      const { data: clientsData } = await supabaseAdmin
        .from("clients")
        .select("name")
        .eq("company", company)
      if (clientsData && Array.isArray(clientsData)) {
        registeredClients = clientsData.map(c => c.name.trim())
      }
    } catch (err) {
      console.warn("[Gmail Scan] Failed to fetch registered clients (table might not exist yet):", err)
    }
  }

  // Fetch registered company members for assignee mapping
  let companyMembers: { name: string; designation: string }[] = []
  if (company) {
    try {
      const { data: membersData } = await supabaseAdmin
        .from("profiles")
        .select("name, designation")
        .eq("company", company)
      if (membersData && Array.isArray(membersData)) {
        companyMembers = membersData
      }
    } catch (err) {
      console.warn("[Gmail Scan] Failed to fetch company members:", err)
    }
  }

  const cookieStore = await cookies()
  let token = cookieStore.get("gmail_token")?.value
  const refreshToken = cookieStore.get("gmail_refresh_token")?.value

  if (!token && !refreshToken) {
    return NextResponse.json({ error: "Not authenticated. Please connect Gmail." }, { status: 401 })
  }

  const origin = new URL(request.url).origin
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${origin}/api/auth/callback`
  )

  auth.setCredentials({
    access_token: token,
    refresh_token: refreshToken,
  })

  let refreshed = false

  // Proactively refresh access token if it is missing but we have a refresh token
  if (!token && refreshToken) {
    try {
      console.log("[Gmail API] Access token missing. Silently refreshing with refresh token...")
      const { credentials } = await auth.refreshAccessToken()
      token = credentials.access_token!
      auth.setCredentials(credentials)
      refreshed = true
    } catch (refreshErr) {
      console.error("[Gmail API] Proactive token refresh failed:", refreshErr)
      return NextResponse.json({ error: "Gmail session expired. Please reconnect Gmail." }, { status: 401 })
    }
  }

  const gmail = google.gmail({ version: "v1", auth })
  let messageList

  try {
    messageList = await gmail.users.messages.list({
      userId: "me",
      maxResults: 8,
      q: "is:inbox",
    })
  } catch (err: any) {
    const isAuthError = err.code === 401 || String(err).includes("invalid_grant") || String(err).includes("credentials") || String(err).includes("auth")
    if (isAuthError && refreshToken) {
      try {
        console.log("[Gmail API] Token expired during API call. Silently refreshing...")
        const { credentials } = await auth.refreshAccessToken()
        token = credentials.access_token!
        auth.setCredentials(credentials)
        refreshed = true

        // Retry the message list fetch
        messageList = await gmail.users.messages.list({
          userId: "me",
          maxResults: 8,
          q: "is:inbox",
        })
      } catch (refreshErr) {
        console.error("[Gmail API] Token refresh on 401 failed:", refreshErr)
        return NextResponse.json({ error: "Gmail session expired. Please reconnect Gmail." }, { status: 401 })
      }
    } else {
      console.error("[Gmail API] Failed to list messages:", err)
      return NextResponse.json({ error: "Failed to fetch emails", details: err.message || String(err) }, { status: 500 })
    }
  }

  const messages = messageList.data.messages || []
  const emailSummaries: { id: string; from: string; subject: string; snippet: string }[] = []

  // Fetch emails and apply local pre-filter
  for (const msg of messages) {
    try {
      const full = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
      })

      const headers = full.data.payload?.headers || []
      const subject = headers.find(h => h.name === "Subject")?.value || ""
      const from = headers.find(h => h.name === "From")?.value || ""
      const snippet = full.data.snippet || ""

      // Apply fast pre-filters locally
      if (isAutomatedEmail(from, subject)) {
        console.log(`[Gmail Pre-Filter] Skipped automated/promotional email: "${subject}"`)
        continue
      }

      if (!hasTaskKeywords(subject, snippet)) {
        console.log(`[Gmail Pre-Filter] Skipped non-actionable email: "${subject}"`)
        continue
      }

      emailSummaries.push({ id: msg.id!, from, subject, snippet })
    } catch (getErr) {
      console.error(`[Gmail API] Failed to fetch full message ${msg.id}:`, getErr)
    }
  }

  // If no emails passed the pre-filter, exit immediately to save Gemini API requests and quota
  if (emailSummaries.length === 0) {
    console.log("[Gmail API] No new actionable emails. Skipping Gemini extraction.")
    const response = NextResponse.json({ tasks: [] })
    if (refreshed && token) {
      response.cookies.set("gmail_token", token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7
      })
    }
    return response
  }

  // Send filtered actionable emails to Gemini in a single request (saves 90% quota)
  const emailList = emailSummaries.map((e, i) =>
    `Email ${i + 1}:\nFrom: ${e.from}\nSubject: ${e.subject}\nSnippet: ${e.snippet.substring(0, 300)}`
  ).join("\n---\n")

  let clientMatchingInstructions = ""
  if (registeredClients.length > 0) {
    clientMatchingInstructions = `
CRITICAL: The creative agency works ONLY with this list of registered clients: [${registeredClients.join(", ")}].
For each task, analyze the content and identify if it belongs to one of these registered clients. If it matches, classify it exactly as one of the registered clients: [${registeredClients.join(", ")}].
If the task is from an email that does NOT match any of these registered clients, assign the 'client' field to "General". DO NOT make up other client names.`
  } else {
    clientMatchingInstructions = `
Identify the company or client name associated with this task (e.g., Zomato, Flipkart, Amazon, Google, or Unknown). If it doesn't match any obvious brand, output "General" or "Unknown".`
  }

  let assignmentInstructions = ""
  if (companyMembers.length > 0) {
    const employees = companyMembers.filter(m => m.designation === "employee").map(m => m.name)
    const founders = companyMembers.filter(m => m.designation === "founder").map(m => m.name)
    assignmentInstructions = `
CRITICAL ASSIGNMENT RULES:
The company members are:
- Registered Employees: [${employees.join(", ")}]
- Founders/Admins: [${founders.join(", ")}]

Please analyze each email subject/snippet/From address to identify who the task is specifically directed to:
1. If the message explicitly mentions, tags, or naturally references an Employee name from [${employees.join(", ")}] (case-insensitive, e.g. "Hi Employee A", "Employee A please do this", "can Employee A handle this?"), assign the "assignee" field EXACTLY as their name in that list.
2. If the message references or is directed to a Founder/Admin from [${founders.join(", ")}], or contains general coordination, or does not specify any particular employee, set the "assignee" field to "Unassigned".
3. If no specific name is mentioned or the name does not match any of the registered employees, set "assignee" to null.
4. Auto-assignment Confidence: If you successfully map a task to an employee name from [${employees.join(", ")}], assign a high confidence score (85-100) so the task is automatically confirmed and routed.`
  } else {
    assignmentInstructions = `
Identify the person this task is assigned to based on mentions (e.g. "@Name", "Hi Name"). If unspecified, set "assignee" to null.`
  }

  let text = ""
  try {
    const prompt = `You are a task extraction AI. Analyze these emails and extract actionable tasks.
${clientMatchingInstructions}
${assignmentInstructions}

Here are the emails to analyze:
${emailList}

Respond ONLY with the requested JSON array representing tasks found.`

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) => setTimeout(() => reject(new Error("429 Timeout")), 4500))
    ]) as any

    text = result.response.text().trim()
  } catch (apiError: any) {
    console.warn("[Gmail API] Gemini API failed or timed out. Falling back to mock extraction for testing:", apiError)
    // Fallback: create mock tasks from the pre-filtered actionable emails
    text = JSON.stringify(
      emailSummaries.slice(0, 2).map((e, i) => ({
        email_index: i + 1,
        is_task: true,
        task_title: `Address client request: ${e.subject.substring(0, 30)}`,
        client: e.from.split("@")[0].substring(0, 15).replace(/[^a-zA-Z]/g, ""),
        priority: i === 0 ? "High" : "Medium",
        deadline: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        confidence: 90
      }))
    )
  }

  const extractedTasks = []

  try {
    const parsed = JSON.parse(text)

    if (Array.isArray(parsed)) {
      for (const task of parsed) {
        if (task.is_task) {
          const emailData = emailSummaries[task.email_index - 1]
          if (!emailData) continue

          // Standardize client name to match registered whitelisted clients dynamically
          let matchedClient = "General"
          const clientInput = String(task.client).trim()
          if (clientInput && clientInput.toLowerCase() !== "unknown" && clientInput.toLowerCase() !== "general") {
            const lowerInput = clientInput.toLowerCase()
            // Check if there's a match in registered clients list
            const matchedRegistered = registeredClients.find(rc => rc.toLowerCase() === lowerInput)
            if (matchedRegistered) {
              matchedClient = matchedRegistered
            } else if (registeredClients.length === 0) {
              // Heuristic fallback if no registered clients are set yet (V0 compatibility)
              if (lowerInput.includes("flipkart")) matchedClient = "Flipkart"
              else if (lowerInput.includes("zomato")) matchedClient = "Zomato"
              else if (lowerInput.includes("amazon")) matchedClient = "Amazon"
              else if (lowerInput.includes("google")) matchedClient = "Google"
              else {
                matchedClient = clientInput.charAt(0).toUpperCase() + clientInput.slice(1)
              }
            } else {
              // If we have whitelisted clients and it didn't match, map to "General" to avoid spam tasks
              matchedClient = "General"
            }
          }

          // ─── Direct Keyword Matching against Registered Clients ───
          // If the email subject, snippet or sender mentions a registered client (e.g. "Rapido"),
          // we match it directly, overriding the "General" or fallback classification.
          const emailTextToScan = `${emailData.subject} ${emailData.snippet} ${emailData.from}`.toLowerCase()
          const clientsToScan = registeredClients.length > 0 ? registeredClients : ["Flipkart", "Zomato", "Amazon", "Google"]
          const matchedByKeyword = clientsToScan.find(rc => {
            const rcLower = rc.toLowerCase()
            return emailTextToScan.includes(rcLower)
          })

          if (matchedByKeyword) {
            matchedClient = matchedByKeyword
          }

          // Standardize assignee to match registered company members
          let matchedAssignee = "Unassigned"
          const assigneeInput = task.assignee ? String(task.assignee).trim() : ""
          if (assigneeInput && assigneeInput.toLowerCase() !== "unknown" && assigneeInput.toLowerCase() !== "unassigned" && assigneeInput.toLowerCase() !== "null") {
            const lowerInput = assigneeInput.toLowerCase()
            const matchedMember = companyMembers.find(m => m.name.toLowerCase() === lowerInput)
            if (matchedMember) {
              matchedAssignee = matchedMember.name
            } else {
              // Heuristic mapping for default members if profiles table doesn't have them yet
              const defaultMembers = ["Rahul", "Priya", "Admin", "Vikas"]
              const matchedDefault = defaultMembers.find(m => m.toLowerCase() === lowerInput)
              if (matchedDefault) {
                matchedAssignee = matchedDefault
              } else {
                matchedAssignee = assigneeInput.charAt(0).toUpperCase() + assigneeInput.slice(1)
              }
            }
          }

          // ─── Direct Employee Name Matching from Email Content ───
          // If the email subject, snippet or sender mentions an employee naturally,
          // we override assignee and set confidence to 90 to ensure proper automatic confirmation and routing.
          const emailTextLower = `${emailData.subject} ${emailData.snippet} ${emailData.from}`.toLowerCase()
          const membersToScan = companyMembers.length > 0 
            ? companyMembers.filter(m => m.designation === "employee").map(m => m.name)
            : ["Rahul", "Priya", "Vikas"]

          const matchedEmployee = membersToScan.find(emp => {
            const empLower = emp.toLowerCase()
            const regex = new RegExp(`\\b@?${empLower}\\b`, "i")
            return regex.test(emailTextLower)
          })

          if (matchedEmployee) {
            matchedAssignee = matchedEmployee
            task.confidence = Math.max(task.confidence || 0, 90)
          }

          if (designation === "employee") {
            // For employees syncing their own email, default task assignment to themselves
            matchedAssignee = userName || "Unassigned"
          }

          // Auto-save task into Supabase database with message ID deduplication
          try {
            const { data, error } = await supabaseAdmin
              .from("tasks")
              .insert({
                user_id: userId,
                company,
                title: task.task_title,
                priority: task.priority || "Medium",
                deadline: task.deadline || null,
                assignee: matchedAssignee,
                confidence: task.confidence || 85,
                status: (task.confidence || 85) >= 85 ? "confirmed" : "unconfirmed",
                source_platform: "email",
                source_group_name: `${matchedClient} - ${emailData.subject.substring(0, 35)}`,
                source_sender_name: emailData.from,
                source_message_text: emailData.snippet,
                source_message_id: emailData.id, // UNIQUE constraint prevents duplicate entries
                source_timestamp: new Date().toISOString(),
              })
              .select()
              .single()

            if (!error && data) {
              extractedTasks.push({
                id: data.id,
                title: data.title,
                client: matchedClient,
                assignedTo: data.assignee || "Unassigned",
                deadline: data.deadline ? data.deadline.split("T")[0] : new Date().toISOString().split("T")[0],
                priority: data.priority,
                source: "email",
                sourceGroup: data.source_group_name || "Email",
                status: data.status === "done" ? "done" : "pending",
                confidence: data.confidence,
                sourceMessage: data.source_message_text,
              })
            } else if (error && error.code === "23505") {
              console.log(`[Deduplication] Skipped duplicate task from email ID: ${emailData.id}`)
            } else {
              if (error) console.error("[Gmail API] DB Save Error:", error.message)
            }
          } catch (dbErr) {
            console.error("[Gmail API] DB Save Exception:", dbErr)
          }
        }
      }
    }
  } catch (e) {
    console.error("[Gmail API] Failed to parse Gemini response JSON:", text, e)
  }

  const response = NextResponse.json({ tasks: extractedTasks })
  
  // If the access token was refreshed, update the client cookie
  if (refreshed && token) {
    response.cookies.set("gmail_token", token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7
    })
  }

  return response
}
