import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SEED_TASKS = [
  { title: "Send revised creatives to Flipkart", assignee: "Rahul", deadline: "2026-05-18", priority: "High", source_platform: "slack", source_group_name: "Flipkart Campaign", status: "confirmed", confidence: 95, source_message_text: "Can someone send the revised creatives before 6 PM today? The client is waiting. This is urgent." },
  { title: "Finalize proposal document for Zomato", assignee: "Priya", deadline: "2026-05-19", priority: "High", source_platform: "email", source_group_name: "Zomato Strategy Thread", status: "confirmed", confidence: 88, source_message_text: "Hi team, we need the proposal finalized by tomorrow EOD. Please review the attached doc and send it across." },
  { title: "Update social media posts for Amazon", assignee: "Priya", deadline: "2026-05-17", priority: "Medium", source_platform: "email", source_group_name: "Amazon Campaign", status: "unconfirmed", confidence: 72, source_message_text: "Dekha jayega if we can push the posts out by tomorrow? Client ka pressure hai bhai." },
  { title: "Send May invoice to Flipkart", assignee: "Admin", deadline: "2026-05-20", priority: "Medium", source_platform: "email", source_group_name: "Flipkart Campaign", status: "done", confidence: 92, source_message_text: "Please send the May invoice to Flipkart by end of week. Accounts team is waiting." },
  { title: "Design banner for Google Ads campaign", assignee: "Rahul", deadline: "2026-05-17", priority: "High", source_platform: "slack", source_group_name: "Google Campaign", status: "confirmed", confidence: 91, source_message_text: "@Rahul please design the banner for the Google Ads campaign by tomorrow morning. Client review is at 11 AM." },
  { title: "Schedule Q2 strategy meeting with Zomato", assignee: "Priya", deadline: "2026-05-16", priority: "High", source_platform: "email", source_group_name: "Zomato Strategy Thread", status: "confirmed", confidence: 87, source_message_text: "Can we schedule a meeting with the Zomato team this Friday to discuss Q2 strategy? Please confirm availability." },
  { title: "Send performance report to Amazon", assignee: "Vikas", deadline: "2026-05-21", priority: "Low", source_platform: "email", source_group_name: "Amazon Monthly Reports", status: "unconfirmed", confidence: 83, source_message_text: "Vikas, please compile and send the monthly performance report for the Amazon account by next Tuesday." },
  { title: "Prepare pitch deck for new Google campaign", assignee: "Rahul", deadline: "2026-05-22", priority: "Medium", source_platform: "slack", source_group_name: "Google Campaign", status: "unconfirmed", confidence: 76, source_message_text: "Bhai kal tak ek rough pitch deck banana hai Google ke naye campaign ke liye. Founder ko dikhana hai." }
];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  try {
    // 1. Fetch current user's profile to resolve company
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("company")
      .eq("id", userId)
      .single();

    let query = supabaseAdmin
      .from("tasks")
      .select("*")
      .neq("status", "dismissed");

    if (profile?.company) {
      query = query.eq("company", profile.company);
    } else {
      query = query.eq("user_id", userId);
    }

    let { data: dbTasks, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    if (!dbTasks || dbTasks.length === 0) {
      // Seed initial tasks into DB!
      const company = profile?.company || "";
      const seedData = SEED_TASKS.map(t => ({
        user_id: userId,
        company: company || null,
        title: t.title,
        assignee: t.assignee,
        priority: t.priority,
        deadline: t.deadline,
        status: t.status,
        confidence: t.confidence,
        source_platform: t.source_platform,
        source_group_name: t.source_group_name,
        source_message_text: t.source_message_text,
        source_message_id: "msg-" + Math.random().toString(36).substr(2, 9),
      }));

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("tasks")
        .insert(seedData)
        .select();

      if (!insertErr && inserted) {
        dbTasks = inserted;
      }
    }

    // Map Supabase tasks to front-end Task interface
    const mapped = (dbTasks || []).map((t: any) => {
      let isBlocked = false;
      let blockerNote = "";
      if (t.source_quote) {
        try {
          const parsed = JSON.parse(t.source_quote);
          if (parsed && typeof parsed === "object") {
            isBlocked = !!parsed.isBlocked;
            blockerNote = parsed.blockerNote || "";
          }
        } catch (e) {
          // ignore parsing error
        }
      }
      let clientName = "No Client";
      if (t.source_group_name) {
        const sgn = t.source_group_name.trim();
        if (sgn === "No Client" || sgn === "Internal Task" || sgn === "No Client Campaign" || sgn === "Internal Task Campaign" || sgn === "#manual-tasks") {
          clientName = "No Client";
        } else if (sgn.includes(" - ")) {
          clientName = sgn.split(" - ")[0].trim();
        } else if (sgn.endsWith(" Campaign")) {
          clientName = sgn.replace(/ Campaign$/, "").trim();
        } else {
          clientName = sgn.split(" ")[0].trim();
        }
      }

      if (clientName === "General" && (!t.source_group_name || t.source_group_name === "General Chat")) {
        clientName = "No Client";
      }

      return {
        id: t.id,
        title: t.title,
        client: clientName,
        assignedTo: t.assignee || "Unassigned",
        deadline: t.deadline ? t.deadline.split("T")[0] : new Date().toISOString().split("T")[0],
        dueAt: t.due_at || null,
        meetingId: t.meeting_id || null,
        priority: t.priority,
        source: t.source_platform || "whatsapp",
        sourceGroup: t.source_group_name || "General Chat",
        status: t.status === "done" ? "done" : "pending",
        confidence: t.status === "unconfirmed" ? 80 : (t.status === "confirmed" ? 95 : (t.confidence || 100)),
        sourceMessage: t.source_message_text || "",
        sourceMessageId: t.source_message_id || null,
        isBlocked,
        blockerNote,
        trackedByFounder: t.tracked_by_founder || false,
      };
    });

    return NextResponse.json(mapped);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  try {
    const body = await req.json();
    const { id, status, assignee, isBlocked, blockerNote, title, priority, deadline, client, dueAt, trackedByFounder } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
 
    const updateFields: any = {};
 
    if (status !== undefined) {
      updateFields.status = status;
    }
    if (assignee !== undefined) {
      updateFields.assignee = assignee;
    }
    if (trackedByFounder !== undefined) {
      updateFields.tracked_by_founder = trackedByFounder;
    }
    if (title !== undefined) {
      updateFields.title = title;
    }
    if (priority !== undefined) {
      updateFields.priority = priority;
    }
    if (deadline !== undefined) {
      updateFields.deadline = deadline;
    }
    if (client !== undefined) {
      updateFields.source_group_name = client === "No Client" ? "No Client" : `${client} Campaign`;
    }
    if (dueAt !== undefined) {
      updateFields.due_at = dueAt;
    }
    if (isBlocked !== undefined || blockerNote !== undefined) {
      const sourceQuoteJSON = JSON.stringify({
        isBlocked: !!isBlocked,
        blockerNote: blockerNote || "",
      });
      updateFields.source_quote = sourceQuoteJSON;
    }

    // 1. Fetch current user's profile to resolve company
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("company, name")
      .eq("id", userId)
      .single();

    let updateQuery = supabaseAdmin
      .from("tasks")
      .update(updateFields)
      .eq("id", id);

    if (profile?.company) {
      updateQuery = updateQuery.eq("company", profile.company);
    } else {
      updateQuery = updateQuery.eq("user_id", userId);
    }

    // Fetch current task first for activity log diffs
    const { data: currentTask } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    const { error } = await updateQuery;
    if (error) throw error;

    // Trigger: Activity Log
    if (currentTask) {
      let clientName = "No Client";
      if (currentTask.source_group_name) {
        const sgn = currentTask.source_group_name.trim();
        if (sgn === "No Client" || sgn === "Internal Task" || sgn === "No Client Campaign" || sgn === "Internal Task Campaign" || sgn === "#manual-tasks") {
          clientName = "No Client";
        } else if (sgn.includes(" - ")) {
          clientName = sgn.split(" - ")[0].trim();
        } else if (sgn.endsWith(" Campaign")) {
          clientName = sgn.replace(/ Campaign$/, "").trim();
        } else {
          clientName = sgn.split(" ")[0].trim();
        }
      }
      if (clientName === "General" && (!currentTask.source_group_name || currentTask.source_group_name === "General Chat")) {
        clientName = "No Client";
      }

      let eventName = "Task Updated";
      let logDesc = `Task "${currentTask.title}" details updated.`;

      if (status === "done" && currentTask.status !== "done") {
        eventName = "Task Completed";
        logDesc = `Deliverable "${currentTask.title}" was marked as completed.`;
      } else if (status === "confirmed" && currentTask.status === "unconfirmed") {
        eventName = "Task Confirmed";
        logDesc = `AI-extracted deliverable "${currentTask.title}" confirmed by Founder.`;
      } else if (assignee !== undefined && assignee !== currentTask.assignee) {
        eventName = "Task Reassigned";
        logDesc = `Task "${currentTask.title}" reassigned to ${assignee || "Rahul"}.`;
      } else if (isBlocked === true && !currentTask.source_quote?.includes('"isBlocked":true')) {
        eventName = "Task Blocked";
        logDesc = `Task "${currentTask.title}" blocked: "${blockerNote || "No blocker note provided."}"`;
      } else if (isBlocked === false && currentTask.source_quote?.includes('"isBlocked":true')) {
        eventName = "Task Blocker Resolved";
        logDesc = `Task "${currentTask.title}" blocker resolved.`;
      } else if (priority !== undefined && priority !== currentTask.priority) {
        eventName = "Priority Changed";
        logDesc = `Task "${currentTask.title}" priority updated from ${currentTask.priority} to ${priority}.`;
      }

      try {
        await supabaseAdmin.from("activity_logs").insert({
          company: profile?.company || "General",
          client_name: clientName,
          event_type: "task",
          event_name: eventName,
          description: logDesc,
          metadata: { task_id: id, assignee: assignee || currentTask.assignee, priority: priority || currentTask.priority },
          user_name: profile?.name || "System"
        });
      } catch (e) {
        console.warn("[Tasks API PUT] Could not write activity log:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  try {
    const { title, client, assignedTo, priority, deadline, dueAt, trackedByFounder } = await req.json();
    if (!title || !client) return NextResponse.json({ error: "title and client are required" }, { status: 400 });
 
    // 1. Fetch current user's profile to resolve company
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("company, name")
      .eq("id", userId)
      .single();
 
    const clientName = client === "No Client" ? "No Client" : client;
    const insertData: any = {
      user_id: userId,
      title,
      assignee: assignedTo || "Unassigned",
      priority: priority || "Medium",
      deadline: deadline || new Date().toISOString().split("T")[0],
      status: "confirmed",
      confidence: 100,
      source_platform: "whatsapp",
      source_group_name: clientName === "No Client" ? "No Client" : `${clientName} Campaign`,
      source_message_text: clientName === "No Client" ? "Manually created internal task" : `Manually created task for ${clientName}`,
    };
 
    if (profile?.company) {
      insertData.company = profile.company;
    }
    
    if (dueAt) {
      insertData.due_at = dueAt;
    }

    if (trackedByFounder !== undefined) {
      insertData.tracked_by_founder = trackedByFounder;
    }
 
    const { data, error } = await supabaseAdmin
      .from("tasks")
      .insert(insertData)
      .select();

    if (error) throw error;

    // Trigger: Activity Log
    try {
      if (data?.[0]) {
        const createdTask = data[0];
        await supabaseAdmin.from("activity_logs").insert({
          company: profile?.company || "General",
          client_name: clientName,
          event_type: "task",
          event_name: "Task Created",
          description: `Task "${createdTask.title}" manually created and assigned to ${createdTask.assignee || "Rahul"}.`,
          metadata: { task_id: createdTask.id, assignee: createdTask.assignee, priority: createdTask.priority },
          user_name: profile?.name || "System"
        });
      }
    } catch (e) {
      console.warn("[Tasks API POST] Could not write activity log:", e);
    }

    return NextResponse.json({ success: true, data: data?.[0] });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
