CREATE OR REPLACE FUNCTION public.is_school_administrator()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('ADM', 'DIRETOR')
  );
$$;

REVOKE ALL ON FUNCTION public.is_school_administrator() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_school_administrator() TO authenticated;

CREATE TABLE IF NOT EXISTS public.student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'OUTRO' CHECK (category IN ('IDENTIFICACAO', 'SAUDE', 'AUTORIZACAO', 'ESCOLAR', 'OUTRO')),
  file_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS student_documents_student_created_idx
  ON public.student_documents (student_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_documents TO authenticated;

ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School administrators can manage student documents" ON public.student_documents;
CREATE POLICY "School administrators can manage student documents"
  ON public.student_documents FOR ALL TO authenticated
  USING (public.is_school_administrator())
  WITH CHECK (public.is_school_administrator());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-documents',
  'student-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "School administrators can read student documents" ON storage.objects;
CREATE POLICY "School administrators can read student documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'student-documents' AND public.is_school_administrator());

DROP POLICY IF EXISTS "School administrators can upload student documents" ON storage.objects;
CREATE POLICY "School administrators can upload student documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'student-documents' AND public.is_school_administrator());

DROP POLICY IF EXISTS "School administrators can delete student documents" ON storage.objects;
CREATE POLICY "School administrators can delete student documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'student-documents' AND public.is_school_administrator());

CREATE TABLE IF NOT EXISTS public.school_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('FERIADO', 'RECESSO', 'REUNIAO', 'PEDAGOGICO', 'OUTRO')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  affects_school_days BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS school_calendar_events_dates_idx
  ON public.school_calendar_events (start_date, end_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_calendar_events TO authenticated;

ALTER TABLE public.school_calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School administrators can manage school calendar events" ON public.school_calendar_events;
CREATE POLICY "School administrators can manage school calendar events"
  ON public.school_calendar_events FOR ALL TO authenticated
  USING (public.is_school_administrator())
  WITH CHECK (public.is_school_administrator());

CREATE TABLE IF NOT EXISTS public.user_report_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_key TEXT NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, report_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_report_preferences TO authenticated;

ALTER TABLE public.user_report_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own report preferences" ON public.user_report_preferences;
CREATE POLICY "Users can manage their own report preferences"
  ON public.user_report_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
