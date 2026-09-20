import React, { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Student {
  id: string;
  full_name: string;
  enrollment_id: string;
  grade: string | null;
}

interface Occurrence {
  id: string;
  student_id: string | null;
  student_name: string;
  enrollment_id: string | null;
  grade: string | null;
  has_card: boolean;
  reason: string;
  details: string | null;
  occurred_at: string;
}

const reasons = ['Tentativa de saída sem autorização', 'Carteira não apresentada', 'Carteira irregular ou danificada', 'Outro'];

export const OccurrencesPage: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [hasCard, setHasCard] = useState(false);
  const [reason, setReason] = useState(reasons[0]);
  const [details, setDetails] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualGrade, setManualGrade] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterCard, setFilterCard] = useState<'ALL' | 'WITH' | 'WITHOUT'>('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    fetchOccurrences();
  }, [startDate, endDate]);

  const fetchStudents = async () => {
    const { data, error } = await supabase.from('students').select('id, full_name, enrollment_id, grade').order('full_name');
    if (!error) setStudents(data || []);
  };

  const fetchOccurrences = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gate_occurrences')
      .select('*')
      .gte('occurred_at', `${startDate}T00:00:00`)
      .lte('occurred_at', `${endDate}T23:59:59`)
      .order('occurred_at', { ascending: false });
    if (!error) setOccurrences(data || []);
    else console.error('Erro ao buscar ocorrências:', error);
    setLoading(false);
  };

  const studentResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query || selectedStudent) return [];
    return students.filter(student =>
      student.full_name.toLowerCase().includes(query) || student.enrollment_id.toLowerCase().includes(query)
    ).slice(0, 6);
  }, [search, students, selectedStudent]);

  const visibleOccurrences = useMemo(() => occurrences.filter(item => {
    if (filterCard === 'WITH' && !item.has_card) return false;
    if (filterCard === 'WITHOUT' && item.has_card) return false;
    return true;
  }), [occurrences, filterCard]);

  const chooseStudent = (student: Student) => {
    setSelectedStudent(student);
    setSearch(student.full_name);
    setManualName('');
    setManualGrade('');
  };

  const clearStudent = () => {
    setSelectedStudent(null);
    setSearch('');
  };

  const saveOccurrence = async (event: React.FormEvent) => {
    event.preventDefault();
    const studentName = selectedStudent?.full_name || manualName.trim();
    if (!studentName) {
      setMessage('Informe o aluno ou selecione um cadastro.');
      return;
    }

    setSaving(true);
    setMessage('');
    const { error } = await supabase.from('gate_occurrences').insert({
      student_id: selectedStudent?.id || null,
      student_name: studentName,
      enrollment_id: selectedStudent?.enrollment_id || null,
      grade: selectedStudent?.grade || manualGrade.trim() || null,
      has_card: hasCard,
      reason,
      details: details.trim() || null,
      created_by: user?.id || null,
    });

    if (error) {
      console.error(error);
      const tableMissing = error.message.includes("Could not find the table 'public.gate_occurrences'") || error.code === '42P01';
      setMessage(tableMissing
        ? 'A tabela ainda não foi criada no Supabase. Execute supabase_occurrences_migration.sql no SQL Editor e recarregue a página.'
        : `Não foi possível salvar: ${error.message}`);
    } else {
      setMessage('Ocorrência registrada.');
      clearStudent();
      setManualName('');
      setManualGrade('');
      setHasCard(false);
      setReason(reasons[0]);
      setDetails('');
      fetchOccurrences();
    }
    setSaving(false);
  };

  const withCardCount = visibleOccurrences.filter(item => item.has_card).length;
  const withoutCardCount = visibleOccurrences.length - withCardCount;

  return (
    <main className="flex-1 px-4 md:px-10 py-6 md:py-8 min-h-screen">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 opacity-70">Portaria e direção</p>
          <h1 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight">Ocorrências</h1>
          <p className="text-on-surface-variant font-medium mt-1">Registre tentativas de saída e situações envolvendo a carteira estudantil.</p>
        </div>
        <button onClick={() => window.print()} className="flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-base">print</span> Imprimir relatório
        </button>
      </header>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.4fr)] gap-6 print:hidden">
        <form onSubmit={saveOccurrence} className="glass-card rounded-[2rem] p-6 border border-white/30 h-fit">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center"><span className="material-symbols-outlined">report</span></div>
            <div><h2 className="font-headline font-extrabold text-xl text-on-surface">Nova ocorrência</h2><p className="text-xs text-outline font-medium">Preenchimento da portaria</p></div>
          </div>

          <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Aluno cadastrado</label>
          <div className="relative">
            <input value={search} onChange={event => { setSearch(event.target.value); setSelectedStudent(null); }} placeholder="Nome ou matrícula..." className="w-full px-4 py-3 bg-white/70 border border-outline/20 rounded-xl font-bold outline-none focus:border-primary" />
            {selectedStudent && <button type="button" onClick={clearStudent} className="absolute right-3 top-3 text-outline hover:text-error"><span className="material-symbols-outlined text-lg">close</span></button>}
            {studentResults.length > 0 && <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-outline/10 rounded-xl shadow-xl z-20 overflow-hidden">{studentResults.map(student => <button type="button" key={student.id} onClick={() => chooseStudent(student)} className="w-full text-left px-4 py-3 hover:bg-primary/5 border-b border-outline/10 last:border-0"><span className="block font-bold text-sm text-on-surface">{student.full_name}</span><span className="text-xs text-outline">RM {student.enrollment_id} {student.grade ? `• ${student.grade}` : ''}</span></button>)}</div>}
          </div>
          {!selectedStudent && <div className="grid grid-cols-2 gap-3 mt-3"><input value={manualName} onChange={event => setManualName(event.target.value)} placeholder="Nome não cadastrado" className="px-3 py-2.5 bg-white/70 border border-outline/20 rounded-xl text-sm font-bold outline-none focus:border-primary" /><input value={manualGrade} onChange={event => setManualGrade(event.target.value)} placeholder="Turma (opcional)" className="px-3 py-2.5 bg-white/70 border border-outline/20 rounded-xl text-sm font-bold outline-none focus:border-primary" /></div>}
          {selectedStudent && <p className="mt-2 text-xs font-bold text-primary">Cadastro selecionado: RM {selectedStudent.enrollment_id}</p>}

          <div className="mt-5"><label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Carteira apresentada?</label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setHasCard(true)} className={`py-3 rounded-xl font-black text-sm border ${hasCard ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white/60 text-outline border-outline/20'}`}>Sim</button><button type="button" onClick={() => setHasCard(false)} className={`py-3 rounded-xl font-black text-sm border ${!hasCard ? 'bg-rose-500 text-white border-rose-500' : 'bg-white/60 text-outline border-outline/20'}`}>Não</button></div></div>
          <div className="mt-5"><label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Motivo</label><select value={reason} onChange={event => setReason(event.target.value)} className="w-full px-4 py-3 bg-white/70 border border-outline/20 rounded-xl font-bold outline-none focus:border-primary">{reasons.map(item => <option key={item}>{item}</option>)}</select></div>
          <div className="mt-5"><label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Observação</label><textarea value={details} onChange={event => setDetails(event.target.value)} rows={3} placeholder="Detalhes relevantes para a direção..." className="w-full px-4 py-3 bg-white/70 border border-outline/20 rounded-xl font-medium outline-none focus:border-primary resize-none" /></div>
          <button disabled={saving} className="w-full mt-5 py-3.5 bg-primary text-white rounded-xl font-black uppercase tracking-wide disabled:opacity-50">{saving ? 'Salvando...' : 'Registrar ocorrência'}</button>
          {message && <p className={`mt-3 text-sm font-bold ${message.startsWith('Não') ? 'text-error' : 'text-emerald-600'}`}>{message}</p>}
        </form>

        <section className="glass-card rounded-[2rem] p-6 border border-white/30 h-fit">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5"><div><h2 className="font-headline font-extrabold text-xl text-on-surface">Relatório para a direção</h2><p className="text-xs text-outline font-medium">Filtre o período e a situação da carteira.</p></div><div className="flex flex-wrap gap-2"><input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="px-3 py-2 bg-white/70 border border-outline/20 rounded-lg text-sm font-bold" /><input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="px-3 py-2 bg-white/70 border border-outline/20 rounded-lg text-sm font-bold" /><select value={filterCard} onChange={event => setFilterCard(event.target.value as typeof filterCard)} className="px-3 py-2 bg-white/70 border border-outline/20 rounded-lg text-sm font-bold"><option value="ALL">Todas</option><option value="WITH">Com carteira</option><option value="WITHOUT">Sem carteira</option></select></div></div>
          <div className="grid grid-cols-3 gap-3 mb-5"><div className="bg-primary/5 rounded-xl p-3"><p className="text-2xl font-black text-primary">{visibleOccurrences.length}</p><p className="text-[10px] font-black uppercase tracking-widest text-outline">Total</p></div><div className="bg-emerald-500/10 rounded-xl p-3"><p className="text-2xl font-black text-emerald-600">{withCardCount}</p><p className="text-[10px] font-black uppercase tracking-widest text-outline">Com carteira</p></div><div className="bg-rose-500/10 rounded-xl p-3"><p className="text-2xl font-black text-rose-600">{withoutCardCount}</p><p className="text-[10px] font-black uppercase tracking-widest text-outline">Sem carteira</p></div></div>
          <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b border-outline/10"><th className="py-3 pr-3 text-[10px] font-black uppercase tracking-widest text-outline">Data/hora</th><th className="py-3 pr-3 text-[10px] font-black uppercase tracking-widest text-outline">Aluno</th><th className="py-3 pr-3 text-[10px] font-black uppercase tracking-widest text-outline">Carteira</th><th className="py-3 text-[10px] font-black uppercase tracking-widest text-outline">Motivo</th></tr></thead><tbody>{loading ? <tr><td colSpan={4} className="py-12 text-center text-outline font-bold">Carregando...</td></tr> : visibleOccurrences.length === 0 ? <tr><td colSpan={4} className="py-12 text-center text-outline font-bold">Nenhuma ocorrência no período.</td></tr> : visibleOccurrences.map(item => <tr key={item.id} className="border-b border-outline/10"><td className="py-3 pr-3 text-xs font-mono font-bold text-outline whitespace-nowrap">{format(parseISO(item.occurred_at), 'dd/MM/yyyy HH:mm')}</td><td className="py-3 pr-3"><p className="font-black text-sm text-on-surface uppercase">{item.student_name}</p><p className="text-[10px] text-outline">{item.enrollment_id ? `RM ${item.enrollment_id}` : 'Não cadastrado'} {item.grade ? `• ${item.grade}` : ''}</p></td><td className="py-3 pr-3"><span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase ${item.has_card ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{item.has_card ? 'Sim' : 'Não'}</span></td><td className="py-3 text-xs font-bold text-on-surface-variant">{item.reason}{item.details && <span className="block text-[10px] text-outline font-medium mt-1">{item.details}</span>}</td></tr>)}</tbody></table></div>
        </section>
      </section>

      <style>{`@media print { body { background: white !important; } .print\\:hidden { display: none !important; } main { padding: 0 !important; } main > section { display: block !important; } main > section > form { display: none !important; } main > section > section { box-shadow: none !important; border: 0 !important; } }`}</style>
    </main>
  );
};
