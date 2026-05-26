# 🚀 TaskPulse WhatsApp Integration Setup Guide

This guide details how to set up the WhatsApp/Baileys integration for TaskPulse AI from scratch.

---

## 1. Google OAuth Setup (Authentication)
The system uses **NextAuth.js** for user authentication. This is required to associate WhatsApp sessions with a specific user.

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project or select an existing one.
3.  Navigate to **APIs & Services > Credentials**.
4.  Click **Create Credentials > OAuth client ID**.
5.  Select **Web application** as the type.
6.  **Authorized JavaScript origins**: `http://localhost:3000`
7.  **Authorized Redirect URIs**: `http://localhost:3000/api/auth/callback/google`
8.  Copy the **Client ID** and **Client Secret** to your `.env.local`.

---

## 2. Supabase Database Setup
TaskPulse stores group consent and extracted tasks in Supabase.

1.  Open your [Supabase Dashboard](https://supabase.com/).
2.  Go to the **SQL Editor**.
3.  Run the contents of `whatsapp/bailey/schema.sql`.
4.  **IMPORTANT**: Run the following fix to support NextAuth/Google IDs (since they are strings, not UUIDs):

```sql
-- Disable RLS for local testing or update policies for TEXT IDs
ALTER TABLE whatsapp_consented_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_group_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- Change user_id column type to TEXT
ALTER TABLE whatsapp_consented_groups ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE whatsapp_group_participants ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE tasks ALTER COLUMN user_id TYPE TEXT;
```

---

## 3. Environment Variables
Create a `.env.local` in the project root and fill in these values:

```env
# Core
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=any_random_string_here

# Gemini (AI Extraction)
GEMINI_API_KEY=your_google_ai_studio_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Baileys Session
BAILEYS_SESSION_DIR=.baileys_sessions
```

---

## 4. Installation & Running
1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Start the development server**:
    ```bash
    npm run dev
    ```

---

## 5. Usage Procedure
1.  **Login**: Open `http://localhost:3000` and click **Login with Google**.
2.  **WhatsApp Setup**:
    *   Navigate to the **WhatsApp** tab in the dashboard.
    *   Click **Setup WhatsApp** in the top-right.
    *   Click **Connect WhatsApp** and scan the QR code with your phone.
3.  **Group Monitoring**:
    *   Once "Connected", a list of your groups will appear.
    *   Toggle the switch for up to **5 groups** you want to monitor.
4.  **Task Extraction**:
    *   Send a message in a monitored group like: *"@Team, please submit the project report by Friday 5 PM."*
    *   The task will appear automatically on your **Dashboard** and in the **Tasks** table in Supabase.

---

## 🛡 Anti-Ban & Privacy Features
*   **Read-Only**: The service never sends messages, mimicking a human observer to avoid WhatsApp bans.
*   **Active Hours**: The service automatically disconnects during off-hours (default 9 PM - 8 AM) to mimic human sleep patterns.
*   **Privacy-First**: Raw messages are processed ephemerally and never stored permanently. Only structured task metadata is saved.
