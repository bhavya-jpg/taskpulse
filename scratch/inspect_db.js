const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "../.env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach(line => {
  const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

async function test() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseServiceKey}`);
    const schema = await res.json();
    console.log("=== EXPOSED PATHS / RPCs ===");
    const paths = Object.keys(schema.paths || {});
    console.log(paths.filter(p => p.startsWith("/rpc/")));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
