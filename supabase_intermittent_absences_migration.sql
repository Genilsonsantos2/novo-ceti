-- Execute este arquivo no SQL Editor do projeto Supabase.
-- Registros antigos permanecem como normais; novos registros podem ser marcados como intermitentes.

ALTER TABLE student_absences
  ADD COLUMN IF NOT EXISTS is_intermittent BOOLEAN DEFAULT false NOT NULL;

NOTIFY pgrst, 'reload schema';
