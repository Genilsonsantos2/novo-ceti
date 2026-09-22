-- Acompanhamento de processos administrativos no modelo de fluxo judicial.
-- O numero do processo e o numero da matricula do servidor interessado.

CREATE TABLE workflow_processes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  process_number TEXT UNIQUE NOT NULL,
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

CREATE TABLE workflow_movements (
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

CREATE POLICY "Authenticated users can manage workflow processes"
  ON workflow_processes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage workflow movements"
  ON workflow_movements FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE workflow_processes;
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_movements;

CREATE INDEX workflow_processes_status_idx ON workflow_processes(status);
CREATE INDEX workflow_movements_process_id_idx ON workflow_movements(process_id, created_at DESC);
