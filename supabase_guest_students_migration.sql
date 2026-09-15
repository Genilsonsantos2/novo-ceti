-- Execute este arquivo no SQL Editor do projeto Supabase.
-- Alunos avulsos ficam fora da tabela oficial students.

CREATE TABLE IF NOT EXISTS absence_guest_students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  full_name TEXT NOT NULL,
  grade TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE absence_guest_students ENABLE ROW LEVEL SECURITY;

ALTER TABLE student_absences
  ALTER COLUMN student_id DROP NOT NULL;

ALTER TABLE student_absences
  ADD COLUMN IF NOT EXISTS guest_student_id UUID REFERENCES absence_guest_students(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_absences_one_student_source'
  ) THEN
    ALTER TABLE student_absences
      ADD CONSTRAINT student_absences_one_student_source
      CHECK ((student_id IS NOT NULL) <> (guest_student_id IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can manage absence guest students'
  ) THEN
    CREATE POLICY "Authenticated users can manage absence guest students"
      ON absence_guest_students FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can manage absence records'
  ) THEN
    CREATE POLICY "Authenticated users can manage absence records"
      ON student_absences FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'absence_guest_students'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE absence_guest_students;
  END IF;
END $$;