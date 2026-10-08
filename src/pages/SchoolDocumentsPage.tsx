import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { printElementAsPDF } from '../utils/exportUtils';

interface Student {
  id: string;
  full_name: string;
  enrollment_id: string;
  grade: string | null;
  birth_date: string | null;
  guardian_name: string | null;
}

type TemplateType = 'MATRICULA' | 'COMPARECIMENTO' | 'COMUNICADO';

const templateLabels: Record<TemplateType, string> = {
  MATRICULA: 'Declaração de matrícula',
  COMPARECIMENTO: 'Declaração de comparecimento',
  COMUNICADO: 'Comunicado ao responsável',
};

export const SchoolDocumentsPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Student[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [template, setTemplate] = useState<TemplateType>('MATRICULA');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [arrival, setArrival] = useState('');
  const [departure, setDeparture] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const searchStudents = async (event: React.FormEvent) => {
    event.preventDefault();
    if (query.trim().length < 2) {
      setError('Digite pelo menos dois caracteres para buscar o aluno.');
      return;
    }
    setLoading(true);
    setError('');
    const [names, enrollmentIds] = await Promise.all([
      supabase.from('students').select('id, full_name, enrollment_id, grade, birth_date, guardian_name').ilike('full_name', `%${query.trim()}%`).order('full_name').limit(8),
      supabase.from('students').select('id, full_name, enrollment_id, grade, birth_date, guardian_name').ilike('enrollment_id', `%${query.trim()}%`).order('full_name').limit(8),
    ]);
    const queryError = names.error || enrollmentIds.error;
    if (queryError) setError(`Não foi possível buscar alunos: ${queryError.message}`);
    else {
      const unique = new Map<string, Student>();
      [...(names.data || []), ...(enrollmentIds.data || [])].forEach(item => unique.set(item.id, item as Student));
      setResults(Array.from(unique.values()).slice(0, 10));
      if (unique.size === 0) setError('Nenhum aluno encontrado.');
    }
    setLoading(false);
  };

  const documentBody = () => {
    if (!student) return null;
    if (template === 'MATRICULA') return <p>Declaramos, para os devidos fins, que <strong>{student.full_name}</strong>, matrícula <strong>{student.enrollment_id}</strong>, está regularmente matriculado(a) no <strong>{student.grade || 'ano/turma não informado'}</strong> desta unidade escolar.</p>;
    if (template === 'COMPARECIMENTO') return <p>Declaramos que <strong>{student.full_name}</strong>, matrícula <strong>{student.enrollment_id}</strong>, compareceu a esta unidade escolar em <strong>{format(parseISO(date), 'dd/MM/yyyy')}</strong>{arrival ? <>, no horário de entrada às <strong>{arrival}</strong></> : null}{departure ? <> e saída às <strong>{departure}</strong></> : null}.</p>;
    return <p className="whitespace-pre-wrap">{body || 'Digite o conteúdo do comunicado no campo indicado.'}</p>;
  };

  const printDocument = () => {
    if (!student) return;
    printElementAsPDF(`school-document-${student.id}`, `${templateLabels[template].replace(/\s+/g, '_')}_${student.enrollment_id}_${date}`);
  };

  return (
    <main className="min-h-screen px-4 py-6 md:px-10 md:py-8">
      <header className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Secretaria • Documentos padronizados</p>
        <h1 className="mt-2 font-headline text-3xl font-extrabold text-on-surface">Modelos de documentos</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Preencha um modelo com os dados cadastrados e imprima ou salve em PDF para conferência e assinatura.</p>
      </header>

      <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5">
        <form onSubmit={searchStudents} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-xs font-bold text-gray-600">Aluno<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nome ou matrícula" className="mt-1.5 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" /></label>
          <button disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white"><span className="material-symbols-outlined">search</span>Buscar</button>
        </form>
        {results.length > 0 && <div className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200">{results.map(item => <button key={item.id} type="button" onClick={() => { setStudent(item); setResults([]); setError(''); }} className="flex w-full justify-between px-4 py-3 text-left hover:bg-primary/5"><span><strong className="block text-sm">{item.full_name}</strong><span className="text-xs text-gray-500">RM {item.enrollment_id} · {item.grade || 'Sem turma'}</span></span><span className="material-symbols-outlined text-primary">chevron_right</span></button>)}</div>}
        {error && <p role="alert" className="mt-3 text-sm font-bold text-rose-700">{error}</p>}
      </section>

      {student && <>
        <section className="mb-5 grid gap-3 rounded-2xl border border-gray-200 bg-white p-5 md:grid-cols-2 md:items-end">
          <label className="text-xs font-bold text-gray-600">Modelo<select value={template} onChange={event => setTemplate(event.target.value as TemplateType)} className="mt-1.5 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm">{Object.entries(templateLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {template !== 'COMUNICADO' ? <label className="text-xs font-bold text-gray-600">Data<input type="date" value={date} onChange={event => setDate(event.target.value)} className="mt-1.5 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" /></label> : <label className="text-xs font-bold text-gray-600">Data de emissão<input type="date" value={date} onChange={event => setDate(event.target.value)} className="mt-1.5 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" /></label>}
          {template === 'COMPARECIMENTO' && <div className="grid grid-cols-2 gap-3 md:col-span-2"><label className="text-xs font-bold text-gray-600">Entrada<input type="time" value={arrival} onChange={event => setArrival(event.target.value)} className="mt-1.5 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" /></label><label className="text-xs font-bold text-gray-600">Saída<input type="time" value={departure} onChange={event => setDeparture(event.target.value)} className="mt-1.5 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" /></label></div>}
          {template === 'COMUNICADO' && <label className="text-xs font-bold text-gray-600 md:col-span-2">Texto do comunicado<textarea required rows={4} value={body} onChange={event => setBody(event.target.value)} placeholder="Escreva a mensagem para o responsável" className="mt-1.5 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" /></label>}
          <button type="button" onClick={printDocument} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white md:col-span-2 md:justify-self-end"><span className="material-symbols-outlined">picture_as_pdf</span>Imprimir / Salvar PDF</button>
        </section>

        <article id={`school-document-${student.id}`} className="mx-auto max-w-[180mm] border border-gray-200 bg-white px-8 py-10 text-gray-900 shadow-sm md:px-14 md:py-14">
          <header className="mb-12 border-b-2 border-gray-900 pb-6 text-center">
            <img src="/ceti-logo.png" alt="Brasão do CETI" className="mx-auto mb-4 h-16 w-16 object-contain" />
            <p className="text-xs font-bold uppercase">Governo do Estado da Bahia</p>
            <p className="mt-1 text-xs font-bold uppercase">Secretaria da Educação</p>
            <h2 className="mt-2 text-sm font-black uppercase">Colégio Estadual de Tempo Integral de Nova Itarana</h2>
            <h1 className="mt-8 text-xl font-black uppercase">{templateLabels[template]}</h1>
          </header>
          <section className="min-h-[90mm] text-justify text-base leading-8">{documentBody()}</section>
          <p className="mt-8 text-right text-sm">Nova Itarana - BA, {format(parseISO(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.</p>
          <footer className="mt-20 grid grid-cols-2 gap-12 text-center text-xs"><div className="border-t border-gray-900 pt-2">{student.guardian_name || 'Responsável legal'}<br />Responsável</div><div className="border-t border-gray-900 pt-2">Direção / Secretaria<br />Assinatura e carimbo</div></footer>
          <p className="mt-12 border-t border-gray-200 pt-3 text-center text-[9px] text-gray-500">Documento gerado pelo sistema CETI. Conferir os dados e colher assinatura antes do uso oficial.</p>
        </article>
      </>}
    </main>
  );
};
