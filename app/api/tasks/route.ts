import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

    const { data: dbTasks, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

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
      return {
        id: t.id,
        title: t.title,
        client: t.source_group_name ? t.source_group_name.split(" ")[0] : "General",
        assignedTo: t.assignee || "Unassigned",
        deadline: t.deadline ? t.deadline.split("T")[0] : new Date().toISOString().split("T")[0],
        priority: t.priority,
        source: t.source_platform || "whatsapp",
        sourceGroup: t.source_group_name || "General Chat",
        status: t.status === "done" ? "done" : "pending",
        confidence: t.status === "unconfirmed" ? 80 : (t.status === "confirmed" ? 95 : (t.confidence || 100)),
        sourceMessage: t.source_message_text || "",
        sourceMessageId: t.source_message_id || null,
        isBlocked,
        blockerNote,
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
    const { id, status, assignee, isBlocked, blockerNote, title, priority, deadline, client } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const updateFields: any = {};

    if (status !== undefined) {
      updateFields.status = status;
    }
    if (assignee !== undefined) {
      updateFields.assignee = assignee;
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
      updateFields.source_group_name = `${client} Campaign`;
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
      .select("company")
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

    const { error } = await updateQuery;

    if (error) throw error;

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
    const { title, client, assignedTo, priority, deadline } = await req.json();
    if (!title || !client) return NextResponse.json({ error: "title and client are required" }, { status: 400 });

    // 1. Fetch current user's profile to resolve company
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("company")
      .eq("id", userId)
      .single();

    const insertData: any = {
      user_id: userId,
      title,
      assignee: assignedTo || "Unassigned",
      priority: priority || "Medium",
      deadline: deadline || new Date().toISOString().split("T")[0],
      status: "confirmed",
      confidence: 100,
      source_platform: "whatsapp",
      source_group_name: `${client} Campaign`,
      source_message_text: `Manually created task for ${client}`,
    };

    if (profile?.company) {
      insertData.company = profile.company;
    }

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .insert(insertData)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data?.[0] });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
