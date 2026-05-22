import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data: dbTasks, error } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("user_id", (session.user as any).id)
      .neq("status", "dismissed")
      .order("created_at", { ascending: false });

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

  try {
    const body = await req.json();
    const { id, status, assignee, isBlocked, blockerNote } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const updateFields: any = {};

    if (status !== undefined) {
      updateFields.status = status;
    }
    if (assignee !== undefined) {
      updateFields.assignee = assignee;
    }
    if (isBlocked !== undefined || blockerNote !== undefined) {
      const sourceQuoteJSON = JSON.stringify({
        isBlocked: !!isBlocked,
        blockerNote: blockerNote || "",
      });
      updateFields.source_quote = sourceQuoteJSON;
    }

    const { error } = await supabaseAdmin
      .from("tasks")
      .update(updateFields)
      .eq("id", id)
      .eq("user_id", (session.user as any).id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { title, client, assignedTo, priority, deadline } = await req.json();
    if (!title || !client) return NextResponse.json({ error: "title and client are required" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .insert({
        user_id: (session.user as any).id,
        title,
        assignee: assignedTo || "Unassigned",
        priority: priority || "Medium",
        deadline: deadline || new Date().toISOString().split("T")[0],
        status: "confirmed",
        confidence: 100,
        source_platform: "whatsapp",
        source_group_name: `${client} Campaign`,
        source_message_text: `Manually created task for ${client}`,
      })
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data?.[0] });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

