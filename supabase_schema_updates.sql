-- ═══════════════════════════════════════════════════════════════
-- TASKPULSE — SUPABASE SCHEMA UPDATES FOR MULTI-USER SYNC
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. PROFILES TABLE ───────────────────────────────────────────────────────
-- Maps a user's authenticated Google ID (session.user.id) to their profile details.
CREATE TABLE IF NOT EXISTS profiles (
  id           text PRIMARY KEY, -- Google User ID (next-auth session.user.id string)
  name         text NOT NULL,
  email        text NOT NULL,
  company      text NOT NULL,
  designation  text NOT NULL CHECK (designation IN ('founder', 'employee')),
  created_at   timestamptz DEFAULT now()
);

-- ─── 2. EMAILS TABLE ──────────────────────────────────────────────────────────
-- Stores raw Gmail email summaries to allow company-wide sync and keep them persisted on refresh.
CREATE TABLE IF NOT EXISTS emails (
  id           text PRIMARY KEY, -- Gmail message ID string
  user_id      text NOT NULL,
  subject      text,
  from_name    text,
  from_email   text,
  date         text,
  snippet      text,
  is_unread    boolean DEFAULT false,
  company      text, -- For collaborative sync filtering
  created_at   timestamptz DEFAULT now()
);

-- ─── 3. SLACK MESSAGES TABLE ──────────────────────────────────────────────────
-- Stores raw Slack channel history summaries to keep them persisted and synced on refresh.
CREATE TABLE IF NOT EXISTS slack_messages (
  id           text PRIMARY KEY, -- Slack unique message ts string
  user_id      text NOT NULL,
  sender       text,
  text         text,
  timestamp    text,
  channel_id   text,
  channel_name text,
  company      text, -- For collaborative sync filtering
  created_at   timestamptz DEFAULT now()
);

-- ─── 4. ADD COMPANY COLUMNS TO EXISTING TABLES ──────────────────────────────
-- Allows tasks and meetings to be shared across employees of the same company.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS event_id text;

-- ─── 5. DISABLE RLS ON NEW TABLES FOR DEV/DEMO COLLABORATIVE SIMPLICITY ──────
-- Ensures that different laptops/clients can query and update shared tables without restriction.
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE emails DISABLE ROW LEVEL SECURITY;
ALTER TABLE slack_messages DISABLE ROW LEVEL SECURITY;

-- ─── 6. CLIENTS TABLE ────────────────────────────────────────────────────────
-- Stores whitelisted clients registered manually by the founder.
CREATE TABLE IF NOT EXISTS clients (
  id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company      text NOT NULL,
  name         text NOT NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (company, name)
);

-- Disable RLS on the clients table for collaborative testing simplicity
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

-- ─── 7. STAKEHOLDERS TABLE ──────────────────────────────────────────────────
-- Stores stakeholders mapped to client accounts (people associated with tasks).
-- Not a permission system — purely operational mapping.
CREATE TABLE IF NOT EXISTS stakeholders (
  id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company      text NOT NULL,
  client_name  text NOT NULL,
  name         text NOT NULL,
  email        text,
  slack_id     text,
  role         text NOT NULL,
  category     text,
  created_at   timestamptz DEFAULT now()
);

-- Disable RLS on the stakeholders table for collaborative testing simplicity
ALTER TABLE stakeholders DISABLE ROW LEVEL SECURITY;


-- ─── 8. TASK COUNTDOWN TIMERS ────────────────────────────────────────────────
-- Add a column to support precise due date/time for real-time countdown timers.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_at timestamptz;


