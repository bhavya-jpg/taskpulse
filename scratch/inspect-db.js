const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://vrmolysvojuxrdhqizwi.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZybW9seXN2b2p1eHJkaHFpendpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODkzNDQzMCwiZXhwIjoyMDk0NTEwNDMwfQ.5q8Ww9TP0cSzlndlcAI0qSjJH01W8-SD1oqDRpc3Q5k";
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
  console.log("=== INSPECTING SUPABASE SCHEMA ===");

  // 1. Inspect tasks table columns
  console.log("\n1. Querying a single row from tasks...");
  const { data: taskData, error: taskError } = await supabaseAdmin
    .from("tasks")
    .select("*")
    .limit(1);

  if (taskError) {
    console.error("Error querying tasks:", taskError);
  } else {
    console.log("Task columns:", Object.keys(taskData[0] || {}));
    console.log("Sample task:", taskData[0]);
  }

  // 2. Inspect meetings table columns
  console.log("\n2. Querying meetings table...");
  const { data: meetingData, error: meetingError } = await supabaseAdmin
    .from("meetings")
    .select("*")
    .limit(1);

  if (meetingError) {
    console.error("Error querying meetings:", meetingError);
  } else {
    console.log("Meeting columns:", Object.keys(meetingData[0] || {}));
    console.log("Sample meeting:", meetingData[0]);
  }

  // 3. Inspect public schema tables via RPC or postgres system tables
  console.log("\n3. Querying database tables from pg_catalog...");
  const { data: tables, error: tablesError } = await supabaseAdmin
    .rpc("get_tables"); // we might not have get_tables RPC, let's see if we can do an arbitrary query or use public API
  
  if (tablesError) {
    console.log("pg_tables RPC not found, which is expected. Trying standard select...");
  } else {
    console.log("Tables:", tables);
  }
}

inspect();
