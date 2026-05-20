const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// 1. Parse .env to get the actual FATHOM_WEBHOOK_SECRET
const envPath = path.join(__dirname, "../.env");
const envContent = fs.readFileSync(envPath, "utf8");
const secrets = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let key = match[1];
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    secrets[key] = value;
  }
});

const webhookSecret = secrets["FATHOM_WEBHOOK_SECRET"];
if (!webhookSecret) {
  console.error("FATHOM_WEBHOOK_SECRET is not configured in .env");
  process.exit(1);
}

// 2. Prepare mock Fathom webhook payload
const webhookId = "evt_" + crypto.randomBytes(8).toString("hex");
const webhookTimestamp = Math.floor(Date.now() / 1000).toString();

const mockPayload = {
  recording_id: 1234567,
  title: "Fathom AI Integration Sync Meeting",
  url: "https://fathom.video/share/1234567",
  share_url: "https://fathom.video/share/1234567",
  created_at: new Date().toISOString(),
  recorded_by: {
    name: "Saurabh",
    email: "saurabh@example.com"
  },
  default_summary: {
    markdown_formatted: "### Summary\n- Configured Fathom API keys and secrets.\n- Successfully simulated webhook ingestion on TaskPulse."
  },
  action_items: [
    {
      description: "Verify that tasks generated from Fathom appear in the 'Needs Review' section on the dashboard",
      completed: false,
      recording_playback_url: "https://fathom.video/share/1234567#t=60"
    }
  ]
};

const rawBody = JSON.stringify(mockPayload);

// 3. Generate secure signature
const secretPart = webhookSecret.split("_")[1] || webhookSecret;
const secretBytes = Buffer.from(secretPart, "base64");
const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
const expectedSignature = crypto
  .createHmac("sha256", secretBytes)
  .update(signedContent)
  .digest("base64");

const signatureHeader = `v1,${expectedSignature}`;

console.log("=== SIMULATING WEBHOOK REQUEST ===");
console.log("Endpoint: http://localhost:3000/api/webhooks/fathom");
console.log("Headers:");
console.log(`  webhook-id: ${webhookId}`);
console.log(`  webhook-timestamp: ${webhookTimestamp}`);
console.log(`  webhook-signature: ${signatureHeader}`);
console.log("\nCopy and run this command in a separate terminal to test while your dev server (npm run dev) is running:\n");

const curlCommand = `curl -X POST http://localhost:3000/api/webhooks/fathom \\
  -H "Content-Type: application/json" \\
  -H "webhook-id: ${webhookId}" \\
  -H "webhook-timestamp: ${webhookTimestamp}" \\
  -H "webhook-signature: ${signatureHeader}" \\
  -d '${rawBody.replace(/'/g, "'\\''")}'`;

console.log(curlCommand);
console.log("\n====================================");
