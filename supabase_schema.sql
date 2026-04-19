-- Tabale de Perfis (Roles)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT CHECK (role IN ('DIRETOR', 'PORTEIRO', 'ALUNO')) DEFAULT 'ALUNO',
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Tabela de Alunos
CREATE TABLE students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  enrollment_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  grade TEXT, -- Ex: 3º Ano A
  photo_url TEXT,
  is_authorized BOOLEAN DEFAULT false,
  qr_code_id TEXT UNIQUE NOT NULL, -- Identificador único para o QR Code
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Autorizações (Vigência de saídas)
CREATE TABLE student_authorizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  reason TEXT, -- Ex: Almoço, Médico
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week INTEGER[], -- Array de dias (0=domingo, 1=segunda...)
  status TEXT DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Registros de Acesso (Logs)
CREATE TABLE access_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('IN', 'OUT')) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  gatekeeper_id UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE access_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE students;

-- Segurana (RSL) - Exemplos bsicos
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Diretores podem ler/escrever tudo
-- Porteiros podem ler alunos e escrever logs
-- Alunos podem ler seus prprios dados e autorizaes
