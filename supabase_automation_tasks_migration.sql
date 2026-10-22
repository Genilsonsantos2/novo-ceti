-- Shared daily review status for automatically generated dashboard tasks.
CREATE TABLE IF NOT EXISTS automation_task_reviews (
  task_date DATE NOT NULL,
  task_key TEXT NOT NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by_name TEXT NOT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (task_date, task_key)
);

ALTER TABLE automation_task_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Administrators can view automation task reviews" ON automation_task_reviews;
CREATE POLICY "Administrators can view automation task reviews"
  ON automation_task_reviews FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ADM', 'DIRETOR')
    )
  );

DROP POLICY IF EXISTS "Administrators can create automation task reviews" ON automation_task_reviews;
CREATE POLICY "Administrators can create automation task reviews"
  ON automation_task_reviews FOR INSERT TO authenticated
  WITH CHECK (
    reviewed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ADM', 'DIRETOR')
    )
  );

DROP POLICY IF EXISTS "Administrators can update automation task reviews" ON automation_task_reviews;
CREATE POLICY "Administrators can update automation task reviews"
  ON automation_task_reviews FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ADM', 'DIRETOR')
    )
  )
  WITH CHECK (
    reviewed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ADM', 'DIRETOR')
    )
  );

DROP POLICY IF EXISTS "Administrators can remove automation task reviews" ON automation_task_reviews;
CREATE POLICY "Administrators can remove automation task reviews"
  ON automation_task_reviews FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ADM', 'DIRETOR')
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'automation_task_reviews'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE automation_task_reviews;
  END IF;
END $$;
