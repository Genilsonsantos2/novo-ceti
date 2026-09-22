-- Acompanhamento de processos administrativos no modelo de fluxo judicial.
-- O numero do processo e o numero da matricula do servidor interessado.

CREATE TABLE IF NOT EXISTS workflow_processes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  process_number TEXT UNIQUE NOT NULL,
  student_id UUID REFERENCES students(id),
  student_name TEXT,
  guest_enrollment_id TEXT,
  guest_name TEXT,
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('BAIXA', 'NORMAL', 'ALTA', 'URGENTE')) DEFAULT 'NORMAL' NOT NULL,
  status TEXT CHECK (status IN ('RECEBIDO', 'EM_ANALISE', 'PENDENTE', 'DECISAO', 'CONCLUIDO', 'ARQUIVADO')) DEFAULT 'RECEBIDO' NOT NULL,
  responsible_name TEXT,
  operator_id UUID REFERENCES auth.users(id),
  operator_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE workflow_processes
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id),
  ADD COLUMN IF NOT EXISTS student_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_enrollment_id TEXT,
  ADD COLUMN IF NOT EXISTS guest_name TEXT;

-- Registros antigos ainda não tinham uma origem vinculada.
-- Mantém esses processos como solicitações avulsas para permitir a migração.
UPDATE workflow_processes
SET guest_enrollment_id = COALESCE(guest_enrollment_id, process_number),
    guest_name = COALESCE(NULLIF(guest_name, ''), 'Solicitação avulsa (registro legado)')
WHERE student_id IS NULL
  AND (guest_name IS NULL OR guest_name = '');

UPDATE workflow_processes
SET guest_name = NULL,
    guest_enrollment_id = NULL
WHERE student_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workflow_processes_subject_source_check'
      AND conrelid = 'workflow_processes'::regclass
  ) THEN
    ALTER TABLE workflow_processes
      ADD CONSTRAINT workflow_processes_subject_source_check
      CHECK ((student_id IS NOT NULL AND guest_name IS NULL) OR (student_id IS NULL AND guest_name IS NOT NULL));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS workflow_movements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  process_id UUID REFERENCES workflow_processes(id) ON DELETE CASCADE NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT NOT NULL,
  operator_id UUID REFERENCES auth.users(id),
  operator_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE workflow_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage workflow processes" ON workflow_processes;
CREATE POLICY "Authenticated users can manage workflow processes"
  ON workflow_processes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage workflow movements" ON workflow_movements;
CREATE POLICY "Authenticated users can manage workflow movements"
  ON workflow_movements FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'workflow_processes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE workflow_processes;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'workflow_movements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE workflow_movements;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS workflow_processes_status_idx ON workflow_processes(status);
CREATE INDEX IF NOT EXISTS workflow_movements_process_id_idx ON workflow_movements(process_id, created_at DESC);
