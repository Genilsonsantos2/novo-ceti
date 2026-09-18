-- Execute este arquivo no SQL Editor do projeto Supabase.
-- Registros antigos permanecem como normais; novos registros podem ser marcados como intermitentes.

ALTER TABLE student_absences
  ADD COLUMN IF NOT EXISTS is_intermittent BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE student_absences
  ADD COLUMN IF NOT EXISTS is_intermittent_active BOOLEAN DEFAULT true NOT NULL;

ALTER TABLE student_absences
  ADD COLUMN IF NOT EXISTS intermittent_group_id UUID;

NOTIFY pgrst, 'reload schema';
