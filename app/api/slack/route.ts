import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const taskExtractionSchema = {
  type: SchemaType.ARRAY,
  description: "List of extracted tasks from the Slack messages",
  items: {
    type: SchemaType.OBJECT,
    properties: {
      message_index: {
        type: SchemaType.INTEGER,
        description: "The 1-based index of the message in the input list",
      },
      is_task: {
        type: SchemaType.BOOLEAN,
        description: "Whether the message contains an actionable task",
      },
      task_title: {
        type: SchemaType.STRING,
        description: "Action-oriented title starting with a verb (max 12 words)",
      },
      client: {
        type: SchemaType.STRING,
        description: "Company/Client name associated with this message (e.g. Zomato, Flipkart, Amazon, Google, or Unknown)",
      },
      priority: {
        type: SchemaType.STRING,
        description: "Priority of the task: High, Medium, or Low",
      },
      deadline: {
        type: SchemaType.STRING,
        description: "Deadline in YYYY-MM-DD format, or null if unspecified",
      },
      due_at: {
        type: SchemaType.STRING,
        description: "Precise deadline date and time in ISO 8601 format (e.g. YYYY-MM-DDTHH:MM:SSZ) calculated using the reference current time, or null if unspecified. Intelligently extract from context phrases like 'tomorrow morning at 11 AM', 'tonight', 'by 6 PM today', 'urgent', 'ASAP', etc.",
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
    required: ["message_index", "is_task", "task_title", "client", "priority", "confidence"]
  }
};

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-lite",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: taskExtractionSchema,
  }
});

// Cache for Slack User IDs -> Usernames to avoid rate limits
// Since Next.js routes run on Node, we can use a global variable to persist cache across requests.
const globalAny: any = global;
globalAny._slackUserCache = globalAny._slackUserCache || {};

async function getSlackUsername(userId: string, token: string): Promise<string> {
  if (globalAny._slackUserCache[userId]) {
    return globalAny._slackUserCache[userId];
  }

  try {
    const res = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.ok && data.user) {
      const name = data.user.real_name || data.user.name;
      globalAny._slackUserCache[userId] = name;
      return name;
    }
  } catch (err) {
    console.error(`[Slack API] Error resolving username for ${userId}:`, err);
  }

  return userId; // Fallback to raw ID
}

// ─── Fast Local Pre-Filter ────────────────────────────────────────────────────

function hasTaskKeywords(text: string): boolean {
  const normalized = text.toLowerCase();
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
  ];
  return taskKeywords.some(kw => normalized.includes(kw));
}

// ─── GET API Endpoint ────────────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // Fetch current user's profile to resolve company
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("company")
    .eq("id", userId)
    .single();
  const company = profile?.company || null;

  // Fetch registered whitelisted clients for this company
  let registeredClients: string[] = []
  if (company) {
    try {
      const { data: clientsData } = await supabaseAdmin
        .from("clients")
        .select("name")
        .eq("company", company);
      if (clientsData && Array.isArray(clientsData)) {
        registeredClients = clientsData.map(c => c.name.trim());
      }
    } catch (err) {
      console.warn("[Slack Scan] Failed to fetch registered clients (table might not exist yet):", err);
    }
  }

  // Fetch registered company members for assignee mapping
  let companyMembers: { name: string; designation: string }[] = [];
  if (company) {
    try {
      const { data: membersData } = await supabaseAdmin
        .from("profiles")
        .select("name, designation")
        .eq("company", company);
      if (membersData && Array.isArray(membersData)) {
        companyMembers = membersData;
      }
    } catch (err) {
      console.warn("[Slack Scan] Failed to fetch company members:", err);
    }
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("slack_token")?.value;
  const channelId = cookieStore.get("slack_channel")?.value;
  const channelName = cookieStore.get("slack_channel_name")?.value || "Slack Channel";

  if (!token || !channelId) {
    return NextResponse.json({ error: "Slack is not connected. Please enter token and channel ID." }, { status: 400 });
  }

  try {
    // 1. Fetch channel messages from Slack
    const slackRes = await fetch(`https://slack.com/api/conversations.history?channel=${channelId}&limit=12`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const slackData = await slackRes.json();
    if (!slackData.ok) {
      console.error("[Slack API] History Fetch Error:", slackData.error);
      return NextResponse.json({ error: `Slack API Error: ${slackData.error}` }, { status: 520 });
    }

    const messages = slackData.messages || [];
    const actionableMessages = [];

    // 2. Pre-filter and resolve sender names
    for (const msg of messages) {
      // Skip system messages, join/leaves, bot messages, or empty text
      if (msg.subtype && msg.subtype !== "bot_message") continue;
      if (!msg.text || msg.text.trim() === "") continue;

      if (!hasTaskKeywords(msg.text)) {
        console.log(`[Slack Pre-Filter] Skipped non-actionable message: "${msg.text.substring(0, 30)}..."`);
        continue;
      }

      const senderName = await getSlackUsername(msg.user || "Slack Bot", token);
      actionableMessages.push({
        id: msg.ts, // Unique timestamp is Slack message ID
        sender: senderName,
        text: msg.text,
        timestamp: msg.ts
      });
    }

    // 3. Skip Gemini call if no actionable messages
    if (actionableMessages.length === 0) {
      console.log("[Slack API] No new actionable messages found. Skipping Gemini extraction.");
      return NextResponse.json({ tasks: [] });
    }

    // 4. Send to Gemini for structured extraction
    const messageList = actionableMessages.map((m, i) =>
      `Message ${i + 1}:\nFrom: ${m.sender}\nText: ${m.text}`
    ).join("\n---\n");

    let clientMatchingInstructions = "";
    if (registeredClients.length > 0) {
      clientMatchingInstructions = `
CRITICAL: The creative agency works ONLY with this list of registered clients: [${registeredClients.join(", ")}].
For each task, analyze the content and identify if it belongs to one of these registered clients. If it matches, classify it exactly as one of the registered clients: [${registeredClients.join(", ")}].
If the task is from a message that does NOT match any of these registered clients, assign the 'client' field to "General". DO NOT make up other client names.`;
    } else {
      clientMatchingInstructions = `
Identify the company or client name associated with this task (e.g., Zomato, Flipkart, Amazon, Google, or Unknown). If it doesn't match any obvious brand, output "General" or "Unknown".`;
    }

    let assignmentInstructions = "";
    if (companyMembers.length > 0) {
      const employees = companyMembers.filter(m => m.designation === "employee").map(m => m.name);
      const founders = companyMembers.filter(m => m.designation === "founder").map(m => m.name);
      assignmentInstructions = `
CRITICAL ASSIGNMENT RULES:
The company members are:
- Registered Employees: [${employees.join(", ")}]
- Founders/Admins: [${founders.join(", ")}]

Please analyze each Slack message text to identify who the task is specifically directed to:
1. If the message explicitly mentions, tags (@), or naturally references an Employee name from [${employees.join(", ")}] (case-insensitive, e.g. "Hi Employee A", "@Employee A", "Employee A please do this", "can Employee A handle this?"), assign the "assignee" field EXACTLY as their name in that list.
2. If the message references or is directed to a Founder/Admin from [${founders.join(", ")}], or contains general coordination, or does not specify any particular employee, set the "assignee" field to "Unassigned".
3. If no specific name is mentioned or the name does not match any of the registered employees, set "assignee" to null.
4. Auto-assignment Confidence: If you successfully map a task to an employee name from [${employees.join(", ")}], assign a high confidence score (85-100) so the task is automatically confirmed and routed.`;
    } else {
      assignmentInstructions = `
Identify the person this task is assigned to based on mentions (e.g. "@Name", "Hi Name"). If unspecified, set "assignee" to null.`;
    }

    let text = "";
    try {
      const localTimeRef = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      const prompt = `You are an elite task extraction AI. Analyze these Slack team messages and extract actionable tasks assigned to team members.
The current reference local time is: ${localTimeRef}.
${clientMatchingInstructions}
${assignmentInstructions}

Here are the messages to analyze:
${messageList}

Respond ONLY with the requested JSON array representing tasks found.`;

      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))
      ]) as any;

      text = result.response.text().trim();
    } catch (geminiErr: any) {
      console.warn("[Slack API] Gemini failed, falling back to mock extraction:", geminiErr);
      // Fallback: mock parse the first actionable message
      text = JSON.stringify(
        actionableMessages.slice(0, 2).map((m, i) => ({
          message_index: i + 1,
          is_task: true,
          task_title: `Handle Slack request: ${m.text.substring(0, 30)}`,
          client: "General",
          priority: "Medium",
          deadline: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          confidence: 85
        }))
      );
    }

    const extractedTasks = [];

    // 5. Parse and save tasks
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        for (const task of parsed) {
          if (task.is_task) {
            const originalMsg = actionableMessages[task.message_index - 1];
            if (!originalMsg) continue;

            // Standardize client name to match registered whitelisted clients dynamically
            let matchedClient = "General";
            const clientInput = String(task.client).trim();
            if (clientInput && clientInput.toLowerCase() !== "unknown" && clientInput.toLowerCase() !== "general") {
              const lowerInput = clientInput.toLowerCase();
              // Check if there's a match in registered clients list
              const matchedRegistered = registeredClients.find(rc => rc.toLowerCase() === lowerInput);
              if (matchedRegistered) {
                matchedClient = matchedRegistered;
              } else if (registeredClients.length === 0) {
                // Heuristic fallback if no registered clients are set yet (V0 compatibility)
                if (lowerInput.includes("flipkart")) matchedClient = "Flipkart";
                else if (lowerInput.includes("zomato")) matchedClient = "Zomato";
                else if (lowerInput.includes("amazon")) matchedClient = "Amazon";
                else if (lowerInput.includes("google")) matchedClient = "Google";
                else {
                  matchedClient = clientInput.charAt(0).toUpperCase() + clientInput.slice(1);
                }
              } else {
                // If we have whitelisted clients and it didn't match, map to "General" to avoid spam tasks
                matchedClient = "General";
              }
            }

            // ─── Direct Keyword Matching against Registered Clients ───
            // If the Slack message text or channel name or sender name mentions a registered client (e.g. "Rapido"),
            // we match it directly, overriding the "General" or fallback classification.
            const slackTextToScan = `${originalMsg.text} ${originalMsg.sender} ${channelName}`.toLowerCase();
            const clientsToScan = registeredClients.length > 0 ? registeredClients : ["Flipkart", "Zomato", "Amazon", "Google"];
            const matchedByKeyword = clientsToScan.find(rc => {
              const rcLower = rc.toLowerCase();
              return slackTextToScan.includes(rcLower);
            });

            if (matchedByKeyword) {
              matchedClient = matchedByKeyword;
            }

            // Standardize assignee to match registered company members
            let matchedAssignee = "Unassigned";
            const assigneeInput = task.assignee ? String(task.assignee).trim() : "";
            if (assigneeInput && assigneeInput.toLowerCase() !== "unknown" && assigneeInput.toLowerCase() !== "unassigned" && assigneeInput.toLowerCase() !== "null") {
              const lowerInput = assigneeInput.toLowerCase();
              const matchedMember = companyMembers.find(m => m.name.toLowerCase() === lowerInput);
              if (matchedMember) {
                matchedAssignee = matchedMember.name;
              } else {
                // Heuristic mapping for default members if profiles table doesn't have them yet
                const defaultMembers = ["Rahul", "Priya", "Admin", "Vikas"];
                const matchedDefault = defaultMembers.find(m => m.toLowerCase() === lowerInput);
                if (matchedDefault) {
                  matchedAssignee = matchedDefault;
                } else {
                  matchedAssignee = assigneeInput.charAt(0).toUpperCase() + assigneeInput.slice(1);
                }
              }
            }

            // ─── Direct Employee Name Matching from Message ───
            // If the Slack message text or sender name naturally references an employee (e.g. "@Rahul", "Rahul please do this"),
            // we override assignee and set confidence to 90 to ensure proper automatic confirmation and routing.
            const messageTextLower = originalMsg.text.toLowerCase();
            const membersToScan = companyMembers.length > 0 
              ? companyMembers.filter(m => m.designation === "employee").map(m => m.name)
              : ["Rahul", "Priya", "Vikas"];

            const matchedEmployee = membersToScan.find(emp => {
              const empLower = emp.toLowerCase();
              const regex = new RegExp(`\\b@?${empLower}\\b`, "i");
              return regex.test(messageTextLower);
            });

            if (matchedEmployee) {
              matchedAssignee = matchedEmployee;
              task.confidence = Math.max(task.confidence || 0, 90);
            }

            // Save to database with deduplication using Slack message ts
            try {
              const insertPayload: any = {
                user_id: userId,
                company,
                title: task.task_title,
                priority: task.priority || "Medium",
                deadline: task.deadline || null,
                assignee: matchedAssignee,
                confidence: task.confidence || 80,
                status: (task.confidence || 80) >= 85 ? "confirmed" : "unconfirmed",
                source_platform: "slack",
                source_group_name: `${matchedClient} - #${channelName}`,
                source_sender_name: originalMsg.sender,
                source_message_text: originalMsg.text,
                source_message_id: originalMsg.id, // UNIQUE key preventing duplicates
                source_timestamp: new Date(parseFloat(originalMsg.timestamp) * 1000).toISOString(),
              };
              
              if (task.due_at) {
                insertPayload.due_at = task.due_at;
              }

              const { data, error } = await supabaseAdmin
                .from("tasks")
                .insert(insertPayload)
                .select()
                .single();

              if (!error && data) {
                extractedTasks.push({
                  id: data.id,
                  title: data.title,
                  client: matchedClient,
                  assignedTo: data.assignee || "Unassigned",
                  deadline: data.deadline ? data.deadline.split("T")[0] : new Date().toISOString().split("T")[0],
                  dueAt: data.due_at || null,
                  priority: data.priority,
                  source: "slack",
                  sourceGroup: data.source_group_name || `#${channelName}`,
                  status: data.status === "done" ? "done" : "pending",
                  confidence: data.confidence,
                  sourceMessage: data.source_message_text,
                });
              } else if (error && error.code === "23505") {
                console.log(`[Slack Deduplication] Skipped duplicate Slack task: ${originalMsg.id}`);
              } else {
                if (error) console.error("[Slack API] DB Save Error:", error.message);
              }
            } catch (dbErr) {
              console.error("[Slack API] DB Save Exception:", dbErr);
            }
          }
        }
      }
    } catch (e) {
      console.error("[Slack API] Failed to parse Gemini response JSON:", text, e);
    }

    return NextResponse.json({ tasks: extractedTasks });
  } catch (err: any) {
    console.error("[Slack API] General error:", err);
    return NextResponse.json({ error: err.message || "Failed to scan Slack messages" }, { status: 500 });
  }
}
