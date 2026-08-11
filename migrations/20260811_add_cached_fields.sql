ALTER TABLE student_absences
  ADD COLUMN IF NOT EXISTS cached_full_name text,
  ADD COLUMN IF NOT EXISTS cached_enrollment_id text,
  ADD COLUMN IF NOT EXISTS cached_grade text;
