-- Execute este arquivo no SQL Editor do projeto Supabase.
-- Ocorrencias registradas na portaria, com ou sem carteira estudantil.
CREATE TABLE IF NOT EXISTS gate_occurrences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL,
  enrollment_id TEXT,
  grade TEXT,
  has_card BOOLEAN NOT NULL DEFAULT false,
  reason TEXT NOT NULL,
  details TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE gate_occurrences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage gate occurrences" ON gate_occurrences;
CREATE POLICY "Authenticated users can manage gate occurrences"
  ON gate_occurrences FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'gate_occurrences'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE gate_occurrences;
  END IF;
END $$;
