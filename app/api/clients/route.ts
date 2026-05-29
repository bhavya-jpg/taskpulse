import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Helper to check user auth and get company name
async function getCompanyContext() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const userId = (session.user as any).id;

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("company")
    .eq("id", userId)
    .single();

  if (error || !profile?.company) {
    return { errorResponse: NextResponse.json({ error: "Profile company not resolved" }, { status: 400 }) };
  }

  return { company: profile.company, userId };
}

export async function GET(req: NextRequest) {
  try {
    const { company, errorResponse } = await getCompanyContext();
    if (errorResponse) return errorResponse;

    const { data: clients, error } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("company", company)
      .order("name", { ascending: true });

    if (error) {
      // Catch missing table error and return a graceful structure to instruct SQL setup
      if (error.message?.includes("relation \"clients\" does not exist") || error.code === "42P01") {
        console.warn("[Clients API] Database table 'clients' is not initialized yet in Supabase.");
        return NextResponse.json({ 
          clients: [], 
          schemaNotInitialized: true,
          message: "Please execute the SQL updates in supabase_schema_updates.sql in your Supabase SQL Editor to enable full client registry features."
        });
      }
      throw error;
    }

    return NextResponse.json({ clients: clients || [], schemaNotInitialized: false });
  } catch (err) {
    console.error("[Clients GET API Error]:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { company, errorResponse } = await getCompanyContext();
    if (errorResponse) return errorResponse;

    const { name } = await req.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Client name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      return NextResponse.json({ error: "Client name cannot be empty" }, { status: 400 });
    }

    // Capitalize first letter of client name for clean display
    const formattedName = trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1);

    const { data, error } = await supabaseAdmin
      .from("clients")
      .insert({
        company,
        name: formattedName,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") { // Unique constraint violation
        return NextResponse.json({ success: true, message: "Client already registered", alreadyExists: true });
      }
      if (error.message?.includes("relation \"clients\" does not exist") || error.code === "42P01") {
        return NextResponse.json({ 
          error: "Clients table not initialized in your database. Please run the SQL schema update in your Supabase Dashboard first.",
          schemaNotInitialized: true 
        }, { status: 400 });
      }
      throw error;
    }

    // Trigger: Activity Log
    try {
      await supabaseAdmin.from("activity_logs").insert({
        company,
        client_name: formattedName,
        event_type: "client",
        event_name: "Client Whitelisted",
        description: `AI scanning whitelist activated for brand "${formattedName}". Routing for Gmail, Slack, and WhatsApp triggers enabled.`,
        metadata: { client_id: data.id },
        user_name: "Founder"
      });
    } catch (e) {
      console.warn("[Clients API] Could not write activity log (compatible fallback mode):", e);
    }

    return NextResponse.json({ success: true, client: data });
  } catch (err) {
    console.error("[Clients POST API Error]:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { company, errorResponse } = await getCompanyContext();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("clients")
      .delete()
      .eq("id", id)
      .eq("company", company);

    if (error) {
      if (error.message?.includes("relation \"clients\" does not exist") || error.code === "42P01") {
        return NextResponse.json({ error: "Database schema not initialized", schemaNotInitialized: true }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Clients DELETE API Error]:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
