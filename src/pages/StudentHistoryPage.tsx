import React, { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { printElementAsPDF } from '../utils/exportUtils';

interface Student {
  id: string;
  full_name: string;
  enrollment_id: string;
  grade: string | null;
  photo_url: string | null;
}

interface HistoryEntry {
  id: string;
  occurredAt: string;
  category: 'FREQUENCIA' | 'OCORRENCIA' | 'PROCESSO';
  title: string;
  description: string;
  operator?: string | null;
}

const today = format(new Date(), 'yyyy-MM-dd');
const thirtyDaysAgo = format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

export const StudentHistoryPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const searchStudents = async (event: React.FormEvent) => {
    event.preventDefault();
    const query = search.trim();
    if (query.length < 2) {
      setError('Digite pelo menos dois caracteres do nome ou da matrícula.');
      setStudents([]);
      return;
    }

    setLoadingStudents(true);
    setError('');
    const [nameResult, enrollmentResult] = await Promise.all([
      supabase.from('students').select('id, full_name, enrollment_id, grade, photo_url').ilike('full_name', `%${query}%`).order('full_name').limit(8),
      supabase.from('students').select('id, full_name, enrollment_id, grade, photo_url').ilike('enrollment_id', `%${query}%`).order('full_name').limit(8),
    ]);

    const queryError = nameResult.error || enrollmentResult.error;
    if (queryError) {
      setError(`Não foi possível buscar alunos: ${queryError.message}`);
      setStudents([]);
    } else {
      const uniqueStudents = new Map<string, Student>();
      [...(nameResult.data || []), ...(enrollmentResult.data || [])].forEach(student => uniqueStudents.set(student.id, student as Student));
      setStudents(Array.from(uniqueStudents.values()).slice(0, 10));
      if (uniqueStudents.size === 0) setError('Nenhum aluno encontrado para essa busca.');
    }
    setLoadingStudents(false);
  };

  const loadHistory = async () => {
    if (!selectedStudent) return;
    if (!startDate || !endDate || startDate > endDate) {
      setError('Informe um intervalo válido: a data inicial deve ser anterior ou igual à final.');
      return;
    }

    setLoadingHistory(true);
    setHasSearched(true);
    setError('');
    setWarnings([]);

    const localStart = new Date(`${startDate}T00:00:00`).toISOString();
    const localEnd = new Date(`${endDate}T23:59:59.999`).toISOString();
    const [absenceResult, occurrenceResult, processResult] = await Promise.all([
      supabase.from('student_absences').select('id, type, date, reason, is_intermittent, sigeduc_synced, created_at, created_by').eq('student_id', selectedStudent.id).gte('date', startDate).lte('date', endDate).order('date', { ascending: false }),
      supabase.from('gate_occurrences').select('id, reason, details, occurred_at, created_by').eq('student_id', selectedStudent.id).gte('occurred_at', localStart).lte('occurred_at', localEnd).order('occurred_at', { ascending: false }),
      supabase.from('workflow_processes').select('id, process_number, subject, description, status, priority, created_at, workflow_movements(id, from_status, to_status, note, operator_name, created_at)').eq('student_id', selectedStudent.id),
    ]);

    const nextWarnings: string[] = [];
    if (absenceResult.error) nextWarnings.push(`Faltas e abonos: ${absenceResult.error.message}`);
    if (occurrenceResult.error) nextWarnings.push(`Ocorrências da portaria: ${occurrenceResult.error.message}`);
    if (processResult.error) nextWarnings.push(`Processos: ${processResult.error.message}`);

    const timeline: HistoryEntry[] = [];
    (absenceResult.data || []).forEach(record => timeline.push({
      id: `absence-${record.id}`,
      occurredAt: `${record.date}T12:00:00`,
      category: 'FREQUENCIA',
      title: record.type === 'FALTA_JUSTIFICADA' ? 'Falta registrada' : 'Abono registrado',
      description: [record.reason || 'Sem observação registrada', record.is_intermittent ? 'Acompanhamento intermitente' : '', record.sigeduc_synced ? 'Baixado no Sigeduc' : 'Pendente no Sigeduc'].filter(Boolean).join(' · '),
    }));
    (occurrenceResult.data || []).forEach(record => timeline.push({
      id: `occurrence-${record.id}`,
      occurredAt: record.occurred_at,
      category: 'OCORRENCIA',
      title: record.reason,
      description: record.details || 'Ocorrência registrada na portaria.',
    }));

    const rangeStart = new Date(`${startDate}T00:00:00`).getTime();
    const rangeEnd = new Date(`${endDate}T23:59:59.999`).getTime();
    (processResult.data || []).forEach(process => {
      if (new Date(process.created_at).getTime() >= rangeStart && new Date(process.created_at).getTime() <= rangeEnd) {
        timeline.push({
          id: `process-${process.id}`,
          occurredAt: process.created_at,
          category: 'PROCESSO',
          title: `Processo ${process.process_number}: ${process.subject}`,
          description: [process.description, `Status atual: ${process.status}`, `Prioridade: ${process.priority}`].filter(Boolean).join(' · '),
        });
      }
      (process.workflow_movements || []).forEach((movement: any) => {
        const movementTime = new Date(movement.created_at).getTime();
        if (movementTime < rangeStart || movementTime > rangeEnd) return;
        timeline.push({
          id: `movement-${movement.id}`,
          occurredAt: movement.created_at,
          category: 'PROCESSO',
          title: `Movimentação: ${movement.from_status || 'Abertura'} → ${movement.to_status}`,
          description: movement.note || `Processo ${process.process_number}: ${process.subject}`,
          operator: movement.operator_name,
        });
      });
    });

    timeline.sort((first, second) => new Date(second.occurredAt).getTime() - new Date(first.occurredAt).getTime());
    setEntries(timeline);
    setWarnings(nextWarnings);
    setLoadingHistory(false);
  };

  const counts = useMemo(() => ({
    frequency: entries.filter(entry => entry.category === 'FREQUENCIA').length,
    occurrences: entries.filter(entry => entry.category === 'OCORRENCIA').length,
    processes: entries.filter(entry => entry.category === 'PROCESSO').length,
  }), [entries]);

  const categoryLabel = (category: HistoryEntry['category']) => ({
    FREQUENCIA: 'Frequência',
    OCORRENCIA: 'Portaria',
    PROCESSO: 'Processo',
  }[category]);

  return (
    <main className="student-history-print-root min-h-screen px-4 py-6 md:px-10 md:py-8">
      <header className="mb-7 print:hidden">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Secretaria • Histórico integrado</p>
        <h1 className="mt-2 font-headline text-3xl font-extrabold text-on-surface">Histórico do aluno</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Consulte em uma linha do tempo os registros de frequência, portaria e tramitação.</p>
      </header>

      <section className="mb-6 rounded-2xl border border-primary/10 bg-white/80 p-5 shadow-sm print:hidden">
        <form onSubmit={searchStudents} className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex-1 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            Aluno ou matrícula
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome completo ou RM" className="mt-2 w-full rounded-xl border border-primary/15 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-primary" />
          </label>
          <button disabled={loadingStudents} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
            <span className="material-symbols-outlined text-lg">search</span>{loadingStudents ? 'Buscando...' : 'Buscar aluno'}
          </button>
        </form>
        {students.length > 0 && (
          <div className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
            {students.map(student => (
              <button key={student.id} type="button" onClick={() => { setSelectedStudent(student); setEntries([]); setHasSearched(false); setStudents([]); setError(''); }} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-primary/5">
                <span><span className="block text-sm font-bold text-on-surface">{student.full_name}</span><span className="mt-0.5 block text-xs text-on-surface-variant">RM {student.enrollment_id} · {student.grade || 'Turma não informada'}</span></span>
                <span className="material-symbols-outlined text-primary">chevron_right</span>
              </button>
            ))}
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-sm font-bold text-rose-700">{error}</p>}
      </section>

      {selectedStudent && (
        <>
          <section className="mb-5 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm print:hidden md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-3">
              {selectedStudent.photo_url ? <img src={selectedStudent.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" /> : <span className="material-symbols-outlined flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">person</span>}
              <div><p className="font-bold text-on-surface">{selectedStudent.full_name}</p><p className="text-xs text-on-surface-variant">RM {selectedStudent.enrollment_id} · {selectedStudent.grade || 'Turma não informada'}</p></div>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs font-bold text-on-surface-variant">De<input type="date" value={startDate} max={endDate} onChange={event => setStartDate(event.target.value)} className="mt-1 block rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800" /></label>
              <label className="text-xs font-bold text-on-surface-variant">Até<input type="date" value={endDate} min={startDate} onChange={event => setEndDate(event.target.value)} className="mt-1 block rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800" /></label>
              <button type="button" onClick={loadHistory} disabled={loadingHistory} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"><span className="material-symbols-outlined text-base">calendar_month</span>{loadingHistory ? 'Consultando...' : 'Consultar período'}</button>
              <button type="button" onClick={() => printElementAsPDF('student-history-report', `Historico_${selectedStudent.enrollment_id}_${startDate}_a_${endDate}`)} disabled={!hasSearched} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-primary/20 bg-white px-4 py-2 text-sm font-bold text-primary disabled:opacity-40"><span className="material-symbols-outlined text-base">picture_as_pdf</span>Imprimir / Salvar PDF</button>
            </div>
          </section>

          {warnings.length > 0 && <div role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 print:hidden"><p className="font-bold">Algumas fontes não puderam ser consultadas:</p>{warnings.map(warning => <p key={warning} className="mt-1">{warning}</p>)}</div>}

          <section id="student-history-report" className="student-history-report rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-7 print:rounded-none print:border-0 print:p-0 print:shadow-none">
            <div className="hidden items-center gap-4 border-b-2 border-gray-900 pb-4 print:flex">
              <img src="/ceti-logo.png" alt="Brasão do CETI" className="h-16 w-16 object-contain" />
              <div className="flex-1 text-center"><p className="text-[10px] font-bold uppercase text-gray-600">Secretaria da Educação • CETI Nova Itarana</p><h2 className="mt-1 text-lg font-black uppercase text-gray-950">Relatório individual do aluno</h2></div>
              <p className="text-right text-[10px] text-gray-600">Emissão<br />{format(new Date(), 'dd/MM/yyyy')}</p>
            </div>
            <div className="mb-5 border-b border-gray-200 pb-4 print:mt-4">
              <h2 className="text-xl font-extrabold text-gray-900">{selectedStudent.full_name}</h2>
              <p className="mt-1 text-sm text-gray-600">Matrícula: {selectedStudent.enrollment_id} · Turma: {selectedStudent.grade || 'Não informada'}</p>
              <p className="mt-1 text-xs font-semibold text-gray-600">Período: {format(parseISO(startDate), 'dd/MM/yyyy')} a {format(parseISO(endDate), 'dd/MM/yyyy')}</p>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-2 md:gap-3">
              {[{ label: 'Frequência', value: counts.frequency }, { label: 'Portaria', value: counts.occurrences }, { label: 'Processos e movimentos', value: counts.processes }].map(item => <div key={item.label} className="rounded-lg border border-gray-200 bg-gray-50 p-3 print:bg-white"><p className="text-xl font-black text-gray-900">{item.value}</p><p className="text-[10px] font-bold uppercase text-gray-600">{item.label}</p></div>)}
            </div>

            {loadingHistory ? <p className="py-10 text-center text-sm text-gray-500">Carregando histórico...</p> : !hasSearched ? <p className="py-10 text-center text-sm text-gray-500 print:hidden">Selecione o período e consulte para montar o histórico.</p> : entries.length === 0 ? <p className="py-10 text-center text-sm text-gray-500">Nenhum registro encontrado no período.</p> : (
              <ol className="divide-y divide-gray-200">
                {entries.map(entry => (
                  <li key={entry.id} className="flex gap-3 py-4 print:break-inside-avoid">
                    <span className="mt-0.5 material-symbols-outlined text-xl text-primary print:hidden">{entry.category === 'FREQUENCIA' ? 'event_busy' : entry.category === 'OCORRENCIA' ? 'report' : 'account_tree'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><p className="font-bold text-gray-900">{entry.title}</p><time className="whitespace-nowrap text-xs font-semibold text-gray-600">{format(parseISO(entry.occurredAt), entry.category === 'FREQUENCIA' ? 'dd/MM/yyyy' : 'dd/MM/yyyy HH:mm')}</time></div>
                      <p className="mt-1 text-xs font-bold uppercase text-primary">{categoryLabel(entry.category)}{entry.operator ? ` · ${entry.operator}` : ''}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{entry.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <footer className="mt-12 hidden grid-cols-2 gap-16 pt-6 print:grid">
              <div className="border-t border-gray-700 pt-2 text-center text-[10px] font-bold uppercase">Responsável pelo relatório</div>
              <div className="border-t border-gray-700 pt-2 text-center text-[10px] font-bold uppercase">Direção / Coordenação</div>
            </footer>
          </section>
        </>
      )}

      <style>{`@media print {
        @page { size: A4 portrait; margin: 14mm; }
        html, body { background: #fff !important; }
        body * { visibility: hidden !important; }
        .student-history-report, .student-history-report * { visibility: visible !important; }
        .student-history-report { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; color: #111827 !important; }
        .student-history-print-root { min-height: 0 !important; padding: 0 !important; }
        .student-history-report li { break-inside: avoid; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }`}</style>
    </main>
  );
};