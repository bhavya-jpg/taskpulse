-- ─── Meetings ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              text NOT NULL,
  title                text NOT NULL,
  platform             text NOT NULL CHECK (platform IN ('google_meet', 'zoom', 'teams', 'manual', 'fathom')),
  meeting_date         timestamptz NOT NULL,
  transcript_url       text, 
  summary              text,
  raw_transcript       text,
  key_topics           text[],
  decisions            jsonb,
  processed_at         timestamptz DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- Update tasks table to support meeting source
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_quote text;

-- Row Level Security for meetings
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meetings_own_user" ON meetings
  USING ((select auth.jwt() ->> 'sub') = user_id)
  WITH CHECK ((select auth.jwt() ->> 'sub') = user_id);

-- ─── Database Migration for Existing Tables ──────────────────────────────────
-- If you already created the meetings table, run the following SQL to allow 'fathom':
-- 
-- ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_platform_check;
-- ALTER TABLE meetings ADD CONSTRAINT meetings_platform_check CHECK (platform IN ('google_meet', 'zoom', 'teams', 'manual', 'fathom'));

