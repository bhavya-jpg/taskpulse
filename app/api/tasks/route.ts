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
    const mapped = (dbTasks || []).map((t: any) => ({
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
    }));

    return NextResponse.json(mapped);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, status } = await req.json();
    if (!id || !status) return NextResponse.json({ error: "id and status required" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("tasks")
      .update({ status })
      .eq("id", id)
      .eq("user_id", (session.user as any).id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
