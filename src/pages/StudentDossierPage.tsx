import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';

interface Student {
  id: string;
  full_name: string;
  enrollment_id: string;
  grade: string | null;
}

interface StudentDocument {
  id: string;
  title: string;
  category: 'IDENTIFICACAO' | 'SAUDE' | 'AUTORIZACAO' | 'ESCOLAR' | 'OUTRO';
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

interface LegacyTerm {
  id: string;
  term_type: string;
  file_url: string;
  file_name: string;
  uploaded_at: string;
  verification_code: string | null;
}

const documentCategories: Array<{ value: StudentDocument['category']; label: string }> = [
  { value: 'IDENTIFICACAO', label: 'Identificação' },
  { value: 'SAUDE', label: 'Saúde' },
  { value: 'AUTORIZACAO', label: 'Autorização' },
  { value: 'ESCOLAR', label: 'Escolar' },
  { value: 'OUTRO', label: 'Outro' },
];

const formatFileSize = (bytes: number) => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export const StudentDossierPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Student[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [legacyTerms, setLegacyTerms] = useState<LegacyTerm[]>([]);
  const [category, setCategory] = useState<StudentDocument['category']>('ESCOLAR');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const searchStudents = async (event: React.FormEvent) => {
    event.preventDefault();
    if (query.trim().length < 2) {
      setError('Digite pelo menos dois caracteres para buscar.');
      return;
    }
    setLoading(true);
    setError('');
    const [nameResult, enrollmentResult] = await Promise.all([
      supabase.from('students').select('id, full_name, enrollment_id, grade').ilike('full_name', `%${query.trim()}%`).order('full_name').limit(8),
      supabase.from('students').select('id, full_name, enrollment_id, grade').ilike('enrollment_id', `%${query.trim()}%`).order('full_name').limit(8),
    ]);
    const searchError = nameResult.error || enrollmentResult.error;
    if (searchError) {
      setError(`Não foi possível pesquisar alunos: ${searchError.message}`);
      setResults([]);
    } else {
      const unique = new Map<string, Student>();
      [...(nameResult.data || []), ...(enrollmentResult.data || [])].forEach(item => unique.set(item.id, item as Student));
      setResults(Array.from(unique.values()).slice(0, 10));
      if (unique.size === 0) setError('Nenhum aluno encontrado.');
    }
    setLoading(false);
  };

  const loadDocuments = async (selected: Student) => {
    setStudent(selected);
    setResults([]);
    setDocuments([]);
    setLegacyTerms([]);
    setError('');
    setNotice('');
    setLoading(true);
    const [documentsResult, termsResult] = await Promise.all([
      supabase.from('student_documents').select('*').eq('student_id', selected.id).order('created_at', { ascending: false }),
      supabase.from('term_attachments').select('id, term_type, file_url, file_name, uploaded_at, verification_code').eq('student_id', selected.id).order('uploaded_at', { ascending: false }),
    ]);
    if (documentsResult.error) setError(`Não foi possível abrir os novos documentos: ${documentsResult.error.message}. Confira se a migração de documentos foi aplicada no Supabase.`);
    else setDocuments((documentsResult.data || []) as StudentDocument[]);
    if (termsResult.error) setError(current => current || `Não foi possível carregar termos antigos: ${termsResult.error.message}`);
    else setLegacyTerms((termsResult.data || []) as LegacyTerm[]);
    setLoading(false);
  };

  const saveDocument = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!student || !file) return;
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Formato inválido. Envie PDF, JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('O arquivo deve ter no máximo 10 MB.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${student.id}/${crypto.randomUUID()}-${safeName}`;
    const { data: authData } = await supabase.auth.getUser();
    const { error: uploadError } = await supabase.storage.from('student-documents').upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      setError(`Não foi possível enviar o arquivo: ${uploadError.message}`);
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase.from('student_documents').insert({
      student_id: student.id,
      title: title.trim() || file.name,
      category,
      file_path: path,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      uploaded_by: authData.user?.id || null,
    }).select('*').single();

    if (insertError) {
      await supabase.storage.from('student-documents').remove([path]);
      setError(`Arquivo enviado, mas não foi possível registrar no prontuário: ${insertError.message}`);
    } else {
      setDocuments(current => [data as StudentDocument, ...current]);
      setTitle('');
      setFile(null);
      setNotice('Documento adicionado ao prontuário.');
    }
    setSaving(false);
  };

  const openDocument = async (document: StudentDocument) => {
    const { data, error: signedUrlError } = await supabase.storage.from('student-documents').createSignedUrl(document.file_path, 60);
    if (signedUrlError || !data?.signedUrl) {
      setError(`Não foi possível abrir o documento: ${signedUrlError?.message || 'URL indisponível'}`);
      return;
    }
    const link = window.document.createElement('a');
    link.href = data.signedUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  const openLegacyTerm = (term: LegacyTerm) => {
    const link = window.document.createElement('a');
    link.href = term.file_url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  const deleteDocument = async (document: StudentDocument) => {
    if (!window.confirm(`Remover "${document.title}" do prontuário?`)) return;
    setError('');
    const { error: metadataError } = await supabase.from('student_documents').delete().eq('id', document.id);
    if (metadataError) {
      setError(`Não foi possível remover o registro: ${metadataError.message}`);
      return;
    }
    const { error: storageError } = await supabase.storage.from('student-documents').remove([document.file_path]);
    setDocuments(current => current.filter(item => item.id !== document.id));
    if (storageError) setError(`O registro foi removido, mas o arquivo não pôde ser apagado: ${storageError.message}`);
  };

  return (
    <main className="min-h-screen px-4 py-6 md:px-10 md:py-8">
      <header className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Secretaria • Documentos do aluno</p>
        <h1 className="mt-2 font-headline text-3xl font-extrabold text-on-surface">Prontuário digital</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Documentos privados organizados por aluno, com acesso autenticado.</p>
      </header>

      <section className="mb-6 rounded-2xl border border-primary/10 bg-white/80 p-5 shadow-sm">
        <form onSubmit={searchStudents} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-xs font-bold uppercase tracking-wide text-on-surface-variant">Nome ou matrícula
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar aluno cadastrado" className="mt-2 w-full rounded-xl border border-primary/15 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-primary" />
          </label>
          <button disabled={loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><span className="material-symbols-outlined">search</span>Buscar</button>
        </form>
        {results.length > 0 && <div className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">{results.map(item => <button type="button" key={item.id} onClick={() => loadDocuments(item)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-primary/5"><span><strong className="block text-sm text-gray-900">{item.full_name}</strong><span className="text-xs text-gray-500">RM {item.enrollment_id} · {item.grade || 'Turma não informada'}</span></span><span className="material-symbols-outlined text-primary">chevron_right</span></button>)}</div>}
        {error && <p role="alert" className="mt-3 text-sm font-bold text-rose-700">{error}</p>}
      </section>

      {student && <>
        <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
          <div><p className="font-bold text-gray-900">{student.full_name}</p><p className="text-xs text-gray-500">RM {student.enrollment_id} · {student.grade || 'Turma não informada'}</p></div>
          <button type="button" onClick={() => { setStudent(null); setDocuments([]); setLegacyTerms([]); setNotice(''); }} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600"><span className="material-symbols-outlined text-base">arrow_back</span>Trocar aluno</button>
        </section>

        {legacyTerms.length > 0 && <section className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4"><h2 className="font-bold text-gray-900">Termos já arquivados</h2><span className="text-xs font-semibold text-gray-500">{legacyTerms.length} arquivo(s)</span></div>
          <ul className="divide-y divide-gray-100">{legacyTerms.map(term => <li key={term.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-bold text-gray-900">{term.term_type === 'gym' ? 'Academia / Transporte' : 'Saída para almoço'}</p><p className="mt-0.5 truncate text-xs text-gray-500">{term.file_name} · {format(parseISO(term.uploaded_at), 'dd/MM/yyyy HH:mm')}</p>{term.verification_code && <p className="mt-0.5 text-[10px] font-mono text-primary">{term.verification_code}</p>}</div><button type="button" onClick={() => openLegacyTerm(term)} className="inline-flex items-center gap-1 self-start rounded-lg border border-primary/20 px-3 py-2 text-xs font-bold text-primary sm:self-auto"><span className="material-symbols-outlined text-base">open_in_new</span>Abrir termo</button></li>)}</ul>
        </section>}

        <form onSubmit={saveDocument} className="mb-6 grid gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_1.4fr_auto] md:items-end">
          <label className="text-xs font-bold text-gray-600">Categoria<select value={category} onChange={event => setCategory(event.target.value as StudentDocument['category'])} className="mt-1.5 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm">{documentCategories.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="text-xs font-bold text-gray-600">Título<input value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Laudo médico" className="mt-1.5 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-xs font-bold text-gray-600">Arquivo (PDF, JPG, PNG, WEBP; até 10 MB)<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={event => setFile(event.target.files?.[0] || null)} className="mt-1.5 block w-full rounded-lg border border-gray-200 px-3 py-2 text-xs" /></label>
          <button disabled={!file || saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><span className="material-symbols-outlined text-base">upload</span>{saving ? 'Enviando...' : 'Anexar'}</button>
          {notice && <p role="status" className="text-sm font-bold text-emerald-700 md:col-span-4">{notice}</p>}
          {error && <p role="alert" className="text-sm font-bold text-rose-700 md:col-span-4">{error}</p>}
        </form>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4"><h2 className="font-bold text-gray-900">Documentos</h2><span className="text-xs font-semibold text-gray-500">{documents.length} arquivo(s)</span></div>
          {loading ? <p className="p-8 text-center text-sm text-gray-500">Carregando prontuário...</p> : documents.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">Nenhum documento anexado.</p> : <ul className="divide-y divide-gray-100">{documents.map(document => <li key={document.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="material-symbols-outlined mt-0.5 text-primary">{document.mime_type === 'application/pdf' ? 'picture_as_pdf' : 'image'}</span><div className="min-w-0"><p className="truncate font-bold text-gray-900">{document.title}</p><p className="mt-0.5 text-xs text-gray-500">{documentCategories.find(item => item.value === document.category)?.label} · {document.file_name} · {formatFileSize(document.file_size)} · {format(parseISO(document.created_at), 'dd/MM/yyyy')}</p></div></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => openDocument(document)} className="inline-flex items-center gap-1 rounded-lg border border-primary/20 px-3 py-2 text-xs font-bold text-primary"><span className="material-symbols-outlined text-base">open_in_new</span>Abrir</button><button type="button" onClick={() => deleteDocument(document)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700"><span className="material-symbols-outlined text-base">delete</span>Remover</button></div></li>)}</ul>}
        </section>
      </>}
    </main>
  );
};
