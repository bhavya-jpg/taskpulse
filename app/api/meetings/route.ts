import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // 1. Fetch current user's profile to resolve company
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("company")
      .eq("id", userId)
      .single();

    let query = supabaseAdmin
      .from("meetings")
      .select("*");

    if (profile?.company) {
      query = query.eq("company", profile.company);
    } else {
      query = query.eq("user_id", userId);
    }

    const { data: meetings, error } = await query.order("meeting_date", { ascending: false });

    if (error) throw error;

    return NextResponse.json(meetings);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
