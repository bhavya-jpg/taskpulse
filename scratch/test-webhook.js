const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

// 1. Mock supabase setup to read existing data
const supabaseUrl = "https://vrmolysvojuxrdhqizwi.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZybW9seXN2b2p1eHJkaHFpendpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODkzNDQzMCwiZXhwIjoyMDk0NTEwNDMwfQ.5q8Ww9TP0cSzlndlcAI0qSjJH01W8-SD1oqDRpc3Q5k";
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 2. Mock Webhook signature function to test locally
function verifyFathomWebhook(secret, headers, rawBody) {
  try {
    const timestamp = parseInt(headers.timestamp, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTimestamp - timestamp) > 300) {
      console.error("Timestamp skew too large:", { currentTimestamp, timestamp });
      return false;
    }

    const signedContent = `${headers.id}.${headers.timestamp}.${rawBody}`;
    const secretPart = secret.split("_")[1] || secret;
    const secretBytes = Buffer.from(secretPart, "base64");

    const expectedSignature = crypto
      .createHmac("sha256", secretBytes)
      .update(signedContent)
      .digest("base64");

    const signatures = headers.signature.split(" ").map((sig) => {
      const parts = sig.split(",");
      return parts.length > 1 ? parts[1] : parts[0];
    });

    return signatures.some((sig) =>
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(sig)
      )
    );
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
}

async function runTest() {
  console.log("=== FATHOM INTEGRATION VERIFICATION ===");

  // Test 1: Webhook Signature Verification Logic
  const testSecret = "whsec_YW50aWdyYXZpdHlfc2VjcmV0X2tleV9mb3JfdGVzdGluZw=="; // Base64 encoding for 'antigravity_secret_key_for_testing'
  const webhookId = "evt_fathom_test_12345";
  const webhookTimestamp = Math.floor(Date.now() / 1000).toString();
  const rawBody = JSON.stringify({
    recording_id: 998877,
    title: "Weekly Engineering Sync & Roadmap Plan",
    url: "https://fathom.video/share/998877",
    share_url: "https://fathom.video/share/998877",
    created_at: new Date().toISOString(),
    recorded_by: {
      name: "Saurabh",
      email: "saurabh@example.com"
    },
    default_summary: {
      markdown_formatted: "### Summary\n- Discussed Q3 product goals and aligned on priority items.\n- Decided to integrate Fathom AI for automatic meeting note-taking."
    },
    action_items: [
      {
        description: "Configure Fathom webhook endpoints and environment secrets in .env",
        completed: false,
        recording_playback_url: "https://fathom.video/share/998877#t=120"
      },
      {
        description: "Style meeting list items with premium purple design elements",
        completed: false,
        recording_playback_url: "https://fathom.video/share/998877#t=245"
      }
    ]
  });

  // Calculate signature
  const secretPart = testSecret.split("_")[1];
  const secretBytes = Buffer.from(secretPart, "base64");
  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const generatedSignature = crypto
    .createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");

  console.log("Testing verifyFathomWebhook...");
  const signatureHeader = `v1,${generatedSignature}`;
  const isValid = verifyFathomWebhook(
    testSecret,
    { id: webhookId, timestamp: webhookTimestamp, signature: signatureHeader },
    rawBody
  );

  console.log(`Signature verification validation result: ${isValid ? "PASSED ✅" : "FAILED ❌"}`);

  // Test 2: Database and User lookup check
  console.log("\nInspecting DB user details and tables...");
  const { data: users, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, email")
    .limit(5);

  if (userError) {
    console.error("Error querying users table:", userError);
  } else {
    console.log(`Found ${users.length} users in Supabase:`);
    users.forEach(u => console.log(` - ID: ${u.id}, Email: ${u.email}`));
  }

  const { data: meetings, error: meetingError } = await supabaseAdmin
    .from("meetings")
    .select("id, title, platform, meeting_date")
    .limit(3);

  if (meetingError) {
    console.warn("Meetings query warn (Table may not exist or empty):", meetingError.message);
  } else {
    console.log(`Found ${meetings.length} existing meetings:`);
    meetings.forEach(m => console.log(` - ID: ${m.id}, Title: ${m.title}, Platform: ${m.platform}`));
  }
}

runTest();
