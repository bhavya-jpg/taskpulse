-- ═══════════════════════════════════════════════════════════════
-- TASKPULSE — SUPABASE SCHEMA
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════════

-- ─── WhatsApp consented groups ───────────────────────────────────────────────
-- Each row = one group a user has explicitly approved for monitoring.
-- The Baileys service checks this table before processing every message.

CREATE TABLE IF NOT EXISTS whatsapp_consented_groups (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_jid     text NOT NULL,                -- e.g. "120363xxxxxx@g.us"
  group_name    text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  consented_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at    timestamptz,
  UNIQUE(user_id, group_jid)
);

-- Max 5 groups per user (enforced by the service, double-enforced here)
CREATE OR REPLACE FUNCTION check_group_consent_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM whatsapp_consented_groups
    WHERE user_id = NEW.user_id AND is_active = true
  ) >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 consented groups per user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_group_limit ON whatsapp_consented_groups;
CREATE TRIGGER enforce_group_limit
  BEFORE INSERT ON whatsapp_consented_groups
  FOR EACH ROW EXECUTE FUNCTION check_group_consent_limit();

-- ─── Group participants cache ─────────────────────────────────────────────────
-- Stores participant roles (member/admin/owner) to inform AI priority scoring.

CREATE TABLE IF NOT EXISTS whatsapp_group_participants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_jid       text NOT NULL,
  participant_jid text NOT NULL,
  participant_name text,
  role            text NOT NULL DEFAULT 'member',  -- 'member' | 'admin' | 'owner'
  last_synced_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, group_jid, participant_jid)
);

-- ─── Tasks ────────────────────────────────────────────────────────────────────
-- Core task store. Raw message text is intentionally NOT stored long-term —
-- only stored temporarily in source_message_text for context display,
-- and purged after 30 days.

CREATE TABLE IF NOT EXISTS tasks (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                text NOT NULL,
  priority             text NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
  deadline             date,
  assignee             text,
  confidence           int  NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  status               text NOT NULL DEFAULT 'unconfirmed'
                        CHECK (status IN ('confirmed', 'unconfirmed', 'dismissed', 'done')),

  -- Source attribution (what the UI shows on each task card)
  source_platform      text NOT NULL DEFAULT 'whatsapp',
  source_group_name    text,
  source_group_jid     text,
  source_sender_name   text,
  source_message_text  text,  -- ⚠️ Auto-purged after 30 days (see function below)
  source_timestamp     timestamptz,
  source_message_id    text UNIQUE,  -- prevents duplicate extractions

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  done_at              timestamptz
);

-- ─── Row-Level Security ───────────────────────────────────────────────────────
-- Users can only read and write their own tasks and groups.

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_own_user" ON tasks
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE whatsapp_consented_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups_own_user" ON whatsapp_consented_groups
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE whatsapp_group_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants_own_user" ON whatsapp_group_participants
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_user_status   ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_priority ON tasks(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at    ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_groups_user_active  ON whatsapp_consented_groups(user_id, is_active);

-- ─── Auto-purge raw message text after 30 days ────────────────────────────────
-- Satisfies privacy requirements: raw message content is not stored indefinitely.

CREATE OR REPLACE FUNCTION purge_old_message_text()
RETURNS void AS $$
BEGIN
  UPDATE tasks
  SET source_message_text = '[Message content purged after 30 days]'
  WHERE source_message_text IS NOT NULL
    AND source_message_text != '[Message content purged after 30 days]'
    AND created_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule this with pg_cron (Supabase supports it):
-- SELECT cron.schedule('purge-message-text', '0 2 * * *', 'SELECT purge_old_message_text()');

-- ─── Auto-update updated_at timestamp ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
