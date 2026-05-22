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
    // 1. Fetch current user's profile to resolve their company
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("company")
      .eq("id", userId)
      .single();

    if (profileError) {
      if (profileError.code === "PGRST116") {
        // No profile exists yet, return empty list gracefully
        return NextResponse.json([]);
      }
      throw profileError;
    }

    if (!userProfile?.company) {
      return NextResponse.json([]);
    }

    // 2. Fetch all registered users belonging to the same company
    const { data: employees, error: employeesError } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, designation, created_at")
      .eq("company", userProfile.company)
      .order("name", { ascending: true });

    if (employeesError) throw employeesError;

    return NextResponse.json(employees || []);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
