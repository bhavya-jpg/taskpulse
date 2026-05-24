import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is code for no rows returned
      throw error;
    }

    return NextResponse.json({ profile: profile || null });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const body = await req.json();
    const { name, email, company, designation } = body;

    if (!name || !email || !company || !designation) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, company, designation" },
        { status: 400 }
      );
    }

    if (designation !== "founder" && designation !== "employee") {
      return NextResponse.json(
        { error: "Designation must be either 'founder' or 'employee'" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        name: name.trim(),
        email: email.trim(),
        company: company.trim(),
        designation,
      })
      .select()
      .single();

    if (error) throw error;

    // Link any existing tasks seeded under this user_id to their company if they don't have one
    try {
      await supabaseAdmin
        .from("tasks")
        .update({ company })
        .eq("user_id", userId)
        .is("company", null);
    } catch (e) {
      console.error("Failed to link seeded tasks to company during profile upsert:", e);
    }

    return NextResponse.json({ success: true, profile: data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const { error } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

