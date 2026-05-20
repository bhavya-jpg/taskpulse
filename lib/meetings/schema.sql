-- ─── Meetings ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                text NOT NULL,
  platform             text NOT NULL CHECK (platform IN ('google_meet', 'zoom', 'teams', 'manual')),
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
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
