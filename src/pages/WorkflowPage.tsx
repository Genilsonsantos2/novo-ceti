import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useOfflineWorkflow } from '../hooks/useOfflineWorkflow';

const statusOptions = [
  { value: 'RECEBIDO', label: 'Recebido', color: 'bg-sky-100 text-sky-700' },
  { value: 'EM_ANALISE', label: 'Em análise', color: 'bg-amber-100 text-amber-700' },
  { value: 'PENDENTE', label: 'Pendente', color: 'bg-rose-100 text-rose-700' },
  { value: 'DECISAO', label: 'Para decisão', color: 'bg-violet-100 text-violet-700' },
  { value: 'CONCLUIDO', label: 'Concluído', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'ARQUIVADO', label: 'Arquivado', color: 'bg-slate-200 text-slate-600' },
];

const priorityOptions = [
  { value: 'BAIXA', label: 'Baixa' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'URGENTE', label: 'Urgente' },
];

type WorkflowStatus = typeof statusOptions[number]['value'];
type WorkflowPriority = typeof priorityOptions[number]['value'];
type SearchField = 'TODOS' | 'NOME' | 'MATRICULA' | 'ASSUNTO';
type DeadlineFilter = 'TODOS' | 'OVERDUE' | 'TODAY' | 'ON_TIME';

interface WorkflowMovement {
  id: string;
  from_status: WorkflowStatus | null;
  to_status: WorkflowStatus;
  note: string;
  operator_name: string;
  created_at: string;
}

interface WorkflowProcess {
  id: string;
  process_number: string;
  student_id: string | null;
  student_name: string | null;
  guest_enrollment_id: string | null;
  guest_name: string | null;
  subject: string;
  description: string | null;
  priority: WorkflowPriority;
  status: WorkflowStatus;
  responsible_name: string | null;
  due_at: string | null;
  operator_name: string;
  created_at: string;
  updated_at: string;
  workflow_movements?: WorkflowMovement[];
}

interface Student {
  id: string;
  enrollment_id: string;
  full_name: string;
}

const getStatus = (status: WorkflowStatus) => statusOptions.find(option => option.value === status) || statusOptions[0];
const getProcessPersonName = (process: WorkflowProcess) => process.student_name || process.guest_name || 'Solicitante não identificado';
const getProcessEnrollment = (process: WorkflowProcess) => process.process_number || process.guest_enrollment_id || 'Matrícula não informada';
const getInitials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
const formatDate = (date: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date));
const getDeadlineState = (dueAt: string | null, status: WorkflowStatus) => {
  if (!dueAt || status === 'CONCLUIDO' || status === 'ARQUIVADO') return 'NO_DEADLINE';
  const dueTime = new Date(dueAt).getTime();
  const now = Date.now();
  if (dueTime < now) return 'OVERDUE';
  if (dueTime <= now + 24 * 60 * 60 * 1000) return 'TODAY';
  return 'ON_TIME';
};
const getSuggestedDeadline = (priority: WorkflowPriority) => {
  const daysByPriority: Record<WorkflowPriority, number> = { URGENTE: 2, ALTA: 5, NORMAL: 10, BAIXA: 15 };
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + daysByPriority[priority]);
  deadline.setHours(23, 59, 59, 0);
  return deadline.toISOString();
};

export const WorkflowPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { isOnline, enqueue, cacheProcesses, getCachedProcesses, cacheStudents, getCachedStudents } = useOfflineWorkflow();
  const operatorName = profile?.full_name || user?.email || 'Operador não identificado';
  const [processes, setProcesses] = useState<WorkflowProcess[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<WorkflowProcess | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('TODOS');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>('TODOS');
  const [showNewProcess, setShowNewProcess] = useState(false);
  const [movementNote, setMovementNote] = useState('');
  const [nextStatus, setNextStatus] = useState<WorkflowStatus>('EM_ANALISE');
  const [students, setStudents] = useState<Student[]>([]);
  const [newProcess, setNewProcess] = useState({ processNumber: '', studentId: '', guestEnrollmentId: '', guestName: '', subject: '', responsibleName: '', priority: 'NORMAL' as WorkflowPriority, description: '', dueAt: '' });

  const fetchProcesses = async (keepSelected = true) => {
    setLoading(true);
    const cached = await getCachedProcesses<WorkflowProcess>();
    if (!navigator.onLine && cached.length > 0) {
      setProcesses(cached);
      setLoading(false);
      return;
    }
    const { data, error: queryError } = await supabase
      .from('workflow_processes')
      .select('*, workflow_movements(*)')
      .order('updated_at', { ascending: false });

    if (queryError) {
      setError(queryError.message.includes('workflow_processes')
        ? 'A estrutura do acompanhamento ainda não foi criada. Execute o arquivo supabase_workflow_migration.sql no Supabase.'
        : `Não foi possível carregar os processos: ${queryError.message}`);
      setProcesses([]);
    } else {
      const nextProcesses = (data || []) as WorkflowProcess[];
      setProcesses(nextProcesses);
      await cacheProcesses(nextProcesses);
      if (keepSelected && selectedProcess) {
        setSelectedProcess(nextProcesses.find(process => process.id === selectedProcess.id) || null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProcesses(false);
    getCachedStudents<Student>().then(setStudents);
    const channel = supabase
      .channel('workflow-processes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_processes' }, () => fetchProcesses())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_movements' }, () => fetchProcesses())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!navigator.onLine) return;
    supabase.from('students').select('id, enrollment_id, full_name').order('full_name').then(({ data }) => {
      if (data) {
        setStudents(data as Student[]);
        cacheStudents(data);
      }
    });
  }, [isOnline, cacheStudents, getCachedStudents]);

  const filteredProcesses = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();
    return processes.filter(process => {
      const matchesStatus = statusFilter === 'TODOS' || process.status === statusFilter;
      const matchesDeadline = deadlineFilter === 'TODOS' || getDeadlineState(process.due_at, process.status) === deadlineFilter;
      const searchValues: Record<SearchField, string[]> = {
        TODOS: [process.process_number, getProcessPersonName(process), process.subject, process.responsible_name || '', process.operator_name],
        NOME: [getProcessPersonName(process)],
        MATRICULA: [process.process_number, process.guest_enrollment_id || ''],
        ASSUNTO: [process.subject],
      };
      const matchesSearch = !normalizedSearch || searchValues[searchField]
        .some(value => value.toLowerCase().includes(normalizedSearch));
      return matchesStatus && matchesDeadline && matchesSearch;
    });
  }, [processes, search, searchField, statusFilter, deadlineFilter]);

  const searchPlaceholder = {
    TODOS: 'Nome, matrícula ou assunto...',
    NOME: 'Digite o nome do aluno...',
    MATRICULA: 'Digite a matrícula ou processo...',
    ASSUNTO: 'Digite o assunto do processo...',
  }[searchField];

  const countByStatus = (status: WorkflowStatus) => processes.filter(process => process.status === status).length;
  const completedCount = countByStatus('CONCLUIDO');
  const overdueCount = processes.filter(process => getDeadlineState(process.due_at, process.status) === 'OVERDUE').length;
  const dueTodayCount = processes.filter(process => getDeadlineState(process.due_at, process.status) === 'TODAY').length;
  const onTimeCount = processes.filter(process => getDeadlineState(process.due_at, process.status) === 'ON_TIME').length;

  const exportProcesses = () => {
    const headers = ['Processo', 'Nome do aluno', 'Matrícula', 'Assunto', 'Prioridade', 'Status', 'Prazo', 'Última atualização'];
    const rows = filteredProcesses.map(process => [
      `PROC. RM-${process.process_number}`,
      getProcessPersonName(process),
      getProcessEnrollment(process),
      process.subject,
      priorityOptions.find(option => option.value === process.priority)?.label || process.priority,
      getStatus(process.status).label,
      process.due_at ? formatDate(process.due_at) : 'Sem prazo',
      formatDate(process.updated_at),
    ]);
    const csv = [headers, ...rows].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' }));
    link.download = `Central_de_Processos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const selectedStudent = students.find(student => student.id === newProcess.studentId);
    const processNumber = selectedStudent?.enrollment_id || newProcess.guestEnrollmentId.trim() || newProcess.processNumber.trim();
    const subjectName = selectedStudent?.full_name || newProcess.guestName.trim();
    if (!processNumber || !subjectName || !newProcess.subject.trim()) return;
    setSaving(true);
    setError('');
    const processId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const processPayload = {
      id: processId,
      process_number: processNumber,
      student_id: selectedStudent?.id || null,
      student_name: selectedStudent?.full_name || null,
      guest_enrollment_id: selectedStudent ? null : newProcess.guestEnrollmentId.trim(),
      guest_name: selectedStudent ? null : newProcess.guestName.trim(),
      subject: newProcess.subject.trim(),
      description: newProcess.description.trim() || null,
      responsible_name: newProcess.responsibleName.trim() || null,
      priority: newProcess.priority,
      status: 'RECEBIDO',
      due_at: newProcess.dueAt ? new Date(`${newProcess.dueAt}T23:59:59`).toISOString() : getSuggestedDeadline(newProcess.priority),
      operator_id: user?.id || null,
      operator_name: operatorName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const movementPayload = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      process_id: processId,
      from_status: null,
      to_status: 'RECEBIDO',
      note: 'Processo aberto e distribuído para análise.',
      operator_id: user?.id || null,
      operator_name: operatorName,
      created_at: new Date().toISOString(),
    };

    if (!isOnline) {
      await enqueue('workflow_processes', processPayload);
      await enqueue('workflow_movements', movementPayload);
      const nextProcesses = [processPayload as WorkflowProcess, ...processes];
      setProcesses(nextProcesses);
      await cacheProcesses(nextProcesses);
      setSelectedProcess({ ...processPayload, workflow_movements: [movementPayload as WorkflowMovement] } as WorkflowProcess);
    } else {
      const { data, error: insertError } = await supabase.from('workflow_processes').insert(processPayload).select().single();
      if (insertError || !data) {
        setError(insertError?.message.includes('duplicate') ? 'Já existe um processo para essa matrícula.' : insertError?.message || 'Não foi possível abrir o processo.');
        setSaving(false);
        return;
      }
      const { error: movementError } = await supabase.from('workflow_movements').insert(movementPayload);
      if (movementError) setError(`Processo criado, mas o histórico inicial não foi registrado: ${movementError.message}`);
      await fetchProcesses(false);
      setSelectedProcess({ ...data, workflow_movements: [movementPayload] } as WorkflowProcess);
    }
    setNewProcess({ processNumber: '', studentId: '', guestEnrollmentId: '', guestName: '', subject: '', responsibleName: '', priority: 'NORMAL', description: '', dueAt: '' });
    setShowNewProcess(false);
    setSaving(false);
  };

  const handleMovement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProcess || !movementNote.trim()) return;
    setSaving(true);
    setError('');
    const movementPayload = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      process_id: selectedProcess.id,
      from_status: selectedProcess.status,
      to_status: nextStatus,
      note: movementNote.trim(),
      operator_id: user?.id || null,
      operator_name: operatorName,
      created_at: new Date().toISOString(),
    };
    const processUpdate = {
      id: selectedProcess.id,
      process_number: selectedProcess.process_number,
      student_id: selectedProcess.student_id,
      student_name: selectedProcess.student_name,
      guest_enrollment_id: selectedProcess.guest_enrollment_id,
      guest_name: selectedProcess.guest_name,
      subject: selectedProcess.subject,
      description: selectedProcess.description,
      priority: selectedProcess.priority,
      status: nextStatus,
      due_at: selectedProcess.due_at,
      responsible_name: selectedProcess.responsible_name,
      operator_id: user?.id || null,
      operator_name: operatorName,
      created_at: selectedProcess.created_at,
      updated_at: new Date().toISOString(),
    };
    if (!isOnline) {
      await enqueue('workflow_movements', movementPayload);
      await enqueue('workflow_processes', { ...processUpdate });
      const nextProcesses = processes.map(process => process.id === selectedProcess.id ? processUpdate : process);
      setProcesses(nextProcesses);
      setSelectedProcess({ ...processUpdate, workflow_movements: [...(selectedProcess.workflow_movements || []), movementPayload] });
      await cacheProcesses(nextProcesses);
    } else {
      const { error: movementError } = await supabase.from('workflow_movements').insert(movementPayload);
      if (movementError) {
        setError(`Não foi possível registrar a movimentação: ${movementError.message}`);
        setSaving(false);
        return;
      }
      const { error: updateError } = await supabase.from('workflow_processes').update({ status: nextStatus, updated_at: processUpdate.updated_at }).eq('id', selectedProcess.id);
      if (updateError) setError(`Movimentação registrada, mas o status não foi atualizado: ${updateError.message}`);
    }
    setMovementNote('');
    await fetchProcesses();
    setSaving(false);
  };

  const handleDeleteProcess = async () => {
    if (!selectedProcess || deleting) return;
    if (!isOnline) {
      setError('Conecte-se à internet para excluir um processo com segurança.');
      return;
    }
    const confirmed = window.confirm(`Excluir o processo de ${getProcessPersonName(selectedProcess)}? Esta ação também removerá o histórico de movimentações e não pode ser desfeita.`);
    if (!confirmed) return;
    setDeleting(true);
    setError('');
    const { error: deleteError } = await supabase
      .from('workflow_processes')
      .delete()
      .eq('id', selectedProcess.id);
    if (deleteError) {
      setError(`Não foi possível excluir o processo: ${deleteError.message}`);
    } else {
      setProcesses(current => current.filter(process => process.id !== selectedProcess.id));
      setSelectedProcess(null);
    }
    setDeleting(false);
  };

  return (
    <div className="flex-1 px-4 py-6 md:px-10 md:py-10 pb-32 min-h-screen">
      <header className="relative mb-8 overflow-hidden rounded-[2rem] bg-[#071b33] px-6 py-7 text-white shadow-2xl shadow-[#071b33]/20 md:px-9 md:py-8">
        <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full border-[26px] border-[#d5ae68]/15" />
        <div className="absolute right-16 -bottom-32 h-64 w-64 rounded-full border border-white/10" />
        <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-5 flex items-center gap-3 text-[#d5ae68]"><span className="material-symbols-outlined">account_balance</span><p className="text-[10px] font-black uppercase tracking-[0.28em]">Secretaria • Núcleo de registros</p></div>
            <h2 className="font-headline text-3xl font-extrabold tracking-tight md:text-5xl">Central de Processos</h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-blue-100/70">Autuação, tramitação e acompanhamento dos estudantes em uma visão executiva, com cada processo identificado por nome e matrícula.</p>
          </div>
          <button onClick={() => setShowNewProcess(true)} className="relative flex items-center justify-center gap-2 rounded-xl bg-[#d5ae68] px-5 py-3.5 text-sm font-black text-[#071b33] shadow-xl shadow-black/20 transition hover:bg-[#e4c484] hover:-translate-y-0.5">
            <span className="material-symbols-outlined">add_circle</span>
            Abrir novo processo
          </button>
        </div>
        <div className="relative mt-7 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 sm:grid-cols-4">
          {[{ label: 'Total na central', value: processes.length, icon: 'folder_copy' }, { label: 'Em andamento', value: processes.length - completedCount, icon: 'pending_actions' }, { label: 'Concluídos', value: completedCount, icon: 'verified' }, { label: 'Atrasados', value: overdueCount, icon: 'schedule' }].map(metric => <div key={metric.label} className="flex items-center gap-2"><span className="material-symbols-outlined text-[#d5ae68]">{metric.icon}</span><div><p className="text-xl font-black leading-none">{metric.value}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-blue-100/50">{metric.label}</p></div></div>)}
        </div>
      </header>

      {error && <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span className="material-symbols-outlined">error</span><p>{error}</p></div>}

      <section className="glass-card mb-8 rounded-[2rem] p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <label className="flex-1 text-sm font-bold text-on-surface">Origem da solicitação
            <select value={newProcess.studentId} onChange={event => { const student = students.find(item => item.id === event.target.value); setNewProcess({ ...newProcess, studentId: event.target.value, processNumber: student?.enrollment_id || '', guestEnrollmentId: '', guestName: '' }); }} className="mt-2 w-full rounded-xl border border-primary/10 bg-white/70 px-3 py-3 text-sm outline-none focus:border-primary">
              <option value="">Aluno não cadastrado / solicitação avulsa</option>
              {students.map(student => <option key={student.id} value={student.id}>{student.enrollment_id} - {student.full_name}</option>)}
            </select>
          </label>
          {!newProcess.studentId && <>
            <label className="flex-1 text-sm font-bold text-on-surface">Matrícula informada
              <input value={newProcess.guestEnrollmentId} onChange={event => setNewProcess({ ...newProcess, guestEnrollmentId: event.target.value, processNumber: event.target.value })} placeholder="Matrícula não localizada" className="mt-2 w-full rounded-xl border border-primary/10 bg-white/70 px-3 py-3 font-mono text-sm outline-none focus:border-primary" />
            </label>
            <label className="flex-1 text-sm font-bold text-on-surface">Nome informado
              <input value={newProcess.guestName} onChange={event => setNewProcess({ ...newProcess, guestName: event.target.value })} placeholder="Nome do solicitante" className="mt-2 w-full rounded-xl border border-primary/10 bg-white/70 px-3 py-3 text-sm outline-none focus:border-primary" />
            </label>
          </>}
        </div>
        <p className="mt-3 text-xs text-on-surface-variant">O processo será autuado com o número da matrícula. Sem cadastro, a solicitação ficará identificada como avulsa e será sincronizada quando a conexão voltar.</p>
      </section>

      <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {statusOptions.map(status => (
          <button key={status.value} onClick={() => setStatusFilter(statusFilter === status.value ? 'TODOS' : status.value)} className={`group relative overflow-hidden rounded-2xl border bg-white/75 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-zinc-900/70 ${statusFilter === status.value ? 'border-[#b2843d] ring-2 ring-[#d5ae68]/30' : 'border-white/60 dark:border-zinc-800'}`}>
            <div className={`absolute inset-x-0 top-0 h-1 ${status.color.split(' ')[0]}`} />
            <p className="text-2xl font-black text-on-surface">{countByStatus(status.value)}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-on-surface-variant">{status.label}</p>
          </button>
        ))}
      </section>

      <section className="mb-8 rounded-2xl border border-[#d5ae68]/30 bg-[#fffaf0] p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9a6d28]">Prazos de tramitação</p><p className="mt-1 text-sm font-bold text-[#071b33]">Filtre a fila pelas tarefas que exigem atenção agora.</p></div>
          <div className="flex flex-wrap gap-2">
            {[{ value: 'TODOS' as DeadlineFilter, label: 'Todos', count: processes.length }, { value: 'OVERDUE' as DeadlineFilter, label: 'Atrasados', count: overdueCount }, { value: 'TODAY' as DeadlineFilter, label: 'Vencem hoje', count: dueTodayCount }, { value: 'ON_TIME' as DeadlineFilter, label: 'No prazo', count: onTimeCount }].map(filter => <button key={filter.value} type="button" onClick={() => setDeadlineFilter(filter.value)} className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wide transition ${deadlineFilter === filter.value ? 'bg-[#071b33] text-white shadow-md' : 'border border-[#d5ae68]/40 bg-white/70 text-[#8b6222] hover:bg-white'}`}>{filter.label} <span className="ml-1 opacity-70">{filter.count}</span></button>)}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="glass-card overflow-hidden rounded-[2rem] border border-white/70 shadow-xl shadow-slate-200/40 dark:border-zinc-800 dark:shadow-black/20">
          <div className="border-b border-white/60 p-5 md:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div><div className="flex items-center gap-2"><span className="material-symbols-outlined text-[#b2843d]">manage_search</span><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b2843d]">Pesquisa inteligente</p></div><h3 className="mt-1 font-headline text-xl font-extrabold text-on-surface">Fila de processos</h3><p className="mt-1 text-xs text-on-surface-variant">{filteredProcesses.length} processo(s) encontrado(s) · identificação por nome e matrícula</p></div>
              <div className="flex gap-2"><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-xl border border-primary/10 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-primary"><option value="TODOS">Todos os status</option>{statusOptions.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select><button type="button" onClick={exportProcesses} className="inline-flex items-center gap-1.5 rounded-xl border border-[#b2843d]/30 bg-[#fffaf0] px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-[#8b6222] transition hover:bg-[#f7e8c5]" title="Exportar resultados"><span className="material-symbols-outlined text-base">download</span><span className="hidden sm:inline">Exportar</span></button></div>
            </div>
            <div className="mt-5 flex flex-col gap-3 lg:flex-row">
              <div className="flex shrink-0 overflow-x-auto rounded-xl border border-primary/10 bg-slate-100/70 p-1 dark:bg-zinc-900/70">
                {[
                  { value: 'TODOS' as SearchField, label: 'Todos', icon: 'travel_explore' },
                  { value: 'NOME' as SearchField, label: 'Nome do aluno', icon: 'person_search' },
                  { value: 'MATRICULA' as SearchField, label: 'Matrícula', icon: 'badge' },
                  { value: 'ASSUNTO' as SearchField, label: 'Assunto', icon: 'description' },
                ].map(option => <button key={option.value} type="button" onClick={() => setSearchField(option.value)} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wide transition ${searchField === option.value ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-white/70'}`}><span className="material-symbols-outlined text-sm">{option.icon}</span>{option.label}</button>)}
              </div>
              <label className="relative min-w-0 flex-1"><span className="sr-only">Pesquisar na fila</span><span className="material-symbols-outlined absolute left-3 top-2.5 text-lg text-outline">search</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder={searchPlaceholder} className="w-full rounded-xl border border-primary/10 bg-white/60 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-[#b2843d] focus:ring-4 focus:ring-[#b2843d]/10" />{search && <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-2.5 text-outline hover:text-primary" aria-label="Limpar pesquisa"><span className="material-symbols-outlined text-lg">close</span></button>}</label>
            </div>
          </div>
          {loading ? <div className="flex justify-center p-16"><span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span></div> : filteredProcesses.length === 0 ? <div className="p-12 text-center"><span className="material-symbols-outlined text-5xl text-primary/30">folder_open</span><p className="mt-3 font-bold text-on-surface">Nenhum processo na fila</p><p className="mt-1 text-sm text-on-surface-variant">Abra um processo para iniciar o acompanhamento.</p></div> : <div className="divide-y divide-white/60">{filteredProcesses.map(process => { const status = getStatus(process.status); const personName = getProcessPersonName(process); const deadlineState = getDeadlineState(process.due_at, process.status); return <button key={process.id} onClick={() => { setSelectedProcess(process); setNextStatus(process.status === 'RECEBIDO' ? 'EM_ANALISE' : process.status); }} className={`group flex w-full items-center gap-4 p-5 text-left transition hover:bg-[#b2843d]/5 ${selectedProcess?.id === process.id ? 'bg-[#b2843d]/10' : ''}`}><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#071b33] text-xs font-black text-[#d5ae68] shadow-md">{getInitials(personName)}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-[11px] font-black tracking-wide text-[#b2843d]">PROC. RM-{process.process_number}</p><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${status.color}`}>{status.label}</span>{process.priority === 'URGENTE' && <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-black uppercase text-red-700">Urgente</span>}{deadlineState === 'OVERDUE' && <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-black uppercase text-rose-700">Atrasado</span>}{deadlineState === 'TODAY' && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-700">Vence hoje</span>}</div><p className="mt-1 truncate font-headline text-base font-extrabold text-on-surface">{personName}</p><p className="mt-1 truncate text-xs font-medium text-on-surface-variant"><span className="font-mono font-bold">RM {getProcessEnrollment(process)}</span> <span className="mx-1 text-outline/50">•</span> {process.subject}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-outline">{process.due_at ? `Prazo ${formatDate(process.due_at)}` : 'Sem prazo definido'} · Atualizado em {formatDate(process.updated_at)}</p></div><span className="material-symbols-outlined text-outline transition group-hover:translate-x-1 group-hover:text-[#b2843d]">chevron_right</span></button>; })}</div>}
        </section>

        <aside className="glass-card rounded-[2rem] border border-white/70 border-t-4 border-t-[#b2843d] p-6 shadow-xl shadow-slate-200/40 dark:border-zinc-800 dark:shadow-black/20">
          {selectedProcess && <div className="mb-6 rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-primary"><span className="material-symbols-outlined text-base">badge</span> Identificação do processo</div><button type="button" onClick={handleDeleteProcess} disabled={deleting} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wide text-rose-700 transition hover:bg-rose-100 disabled:cursor-wait disabled:opacity-50" title="Excluir processo"><span className="material-symbols-outlined text-sm">{deleting ? 'progress_activity' : 'delete'}</span>{deleting ? 'Excluindo' : 'Excluir'}</button></div>
            <p className="mt-3 text-lg font-extrabold text-on-surface">{getProcessPersonName(selectedProcess)}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-on-surface-variant"><span className="rounded-lg bg-white/70 px-2 py-1">Matrícula: {getProcessEnrollment(selectedProcess)}</span><span className="rounded-lg bg-white/70 px-2 py-1">{selectedProcess.student_id ? 'Aluno cadastrado' : 'Solicitação avulsa'}</span></div>
          </div>}
          {!selectedProcess ? <div className="flex min-h-[360px] flex-col items-center justify-center text-center"><span className="material-symbols-outlined text-5xl text-primary/30">fact_check</span><h3 className="mt-4 font-headline text-xl font-extrabold text-on-surface">Detalhes do processo</h3><p className="mt-2 max-w-xs text-sm text-on-surface-variant">Selecione um processo na fila para consultar os autos e registrar a próxima movimentação.</p></div> : <div><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-lg font-extrabold text-primary">{selectedProcess.process_number}</p><p className="mt-1 text-xs text-on-surface-variant">Autuado em {formatDate(selectedProcess.created_at)}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${getStatus(selectedProcess.status).color}`}>{getStatus(selectedProcess.status).label}</span></div><h3 className="mt-5 font-headline text-xl font-extrabold text-on-surface">{selectedProcess.subject}</h3>{selectedProcess.description && <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{selectedProcess.description}</p>}<div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-primary/5 p-3"><p className="font-bold uppercase tracking-wide text-primary/70">Prioridade</p><p className="mt-1 font-bold text-on-surface">{priorityOptions.find(item => item.value === selectedProcess.priority)?.label}</p></div><div className="rounded-xl bg-primary/5 p-3"><p className="font-bold uppercase tracking-wide text-primary/70">Responsável</p><p className="mt-1 truncate font-bold text-on-surface">{selectedProcess.responsible_name || 'A definir'}</p></div></div><div className="mt-7"><h4 className="text-xs font-black uppercase tracking-[0.16em] text-on-surface-variant">Histórico de movimentações</h4><div className="mt-4 max-h-64 space-y-4 overflow-y-auto pr-1">{(selectedProcess.workflow_movements || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(movement => <div key={movement.id} className="relative border-l-2 border-primary/20 pl-4"><span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" /><p className="text-xs font-bold text-on-surface">{getStatus(movement.to_status).label} · {formatDate(movement.created_at)}</p><p className="mt-1 text-sm text-on-surface-variant">{movement.note}</p><p className="mt-1 text-[11px] font-semibold text-primary/70">Operado por {movement.operator_name}</p></div>)}</div></div><form onSubmit={handleMovement} className="mt-7 border-t border-white/60 pt-5"><p className="text-xs font-black uppercase tracking-[0.16em] text-on-surface-variant">Registrar ato</p><div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"><select value={nextStatus} onChange={event => setNextStatus(event.target.value as WorkflowStatus)} className="rounded-xl border border-primary/10 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-primary">{statusOptions.filter(status => status.value !== selectedProcess.status).map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select><input value={operatorName} readOnly className="rounded-xl border border-primary/10 bg-primary/5 px-3 py-2.5 text-xs font-semibold text-on-surface-variant" /></div><textarea required value={movementNote} onChange={event => setMovementNote(event.target.value)} placeholder="Descreva o despacho, encaminhamento ou providência..." rows={3} className="mt-3 w-full resize-none rounded-xl border border-primary/10 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-primary" /><button disabled={saving} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"><span className="material-symbols-outlined text-lg">forward</span>{saving ? 'Registrando...' : 'Registrar movimentação'}</button></form></div>}
        </aside>
      </div>

      {showNewProcess && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"><form onSubmit={handleCreate} className="glass-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] p-6 md:p-8"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70">Nova autuação</p><h3 className="mt-2 font-headline text-2xl font-extrabold text-on-surface">Abrir processo administrativo</h3></div><button type="button" onClick={() => setShowNewProcess(false)} className="rounded-xl p-2 text-outline hover:bg-primary/10" aria-label="Fechar"><span className="material-symbols-outlined">close</span></button></div><div className="mt-7 grid gap-4 md:grid-cols-2"><label className="text-sm font-bold text-on-surface">Número do processo / matrícula<input required value={newProcess.processNumber} onChange={event => setNewProcess({ ...newProcess, processNumber: event.target.value })} placeholder="Ex.: 202400123" className="mt-2 w-full rounded-xl border border-primary/10 bg-white/70 px-3 py-3 font-mono text-sm outline-none focus:border-primary" /></label><label className="text-sm font-bold text-on-surface">Servidor responsável<input value={newProcess.responsibleName} onChange={event => setNewProcess({ ...newProcess, responsibleName: event.target.value })} placeholder="Nome do servidor" className="mt-2 w-full rounded-xl border border-primary/10 bg-white/70 px-3 py-3 text-sm outline-none focus:border-primary" /></label><label className="text-sm font-bold text-on-surface md:col-span-2">Assunto<input required value={newProcess.subject} onChange={event => setNewProcess({ ...newProcess, subject: event.target.value })} placeholder="Ex.: Solicitação de averbação" className="mt-2 w-full rounded-xl border border-primary/10 bg-white/70 px-3 py-3 text-sm outline-none focus:border-primary" /></label><label className="text-sm font-bold text-on-surface">Prioridade<select value={newProcess.priority} onChange={event => setNewProcess({ ...newProcess, priority: event.target.value as WorkflowPriority })} className="mt-2 w-full rounded-xl border border-primary/10 bg-white/70 px-3 py-3 text-sm outline-none focus:border-primary">{priorityOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><div className="rounded-xl bg-primary/5 p-3 text-xs text-on-surface-variant"><p className="font-bold text-primary">Operador da autuação</p><p className="mt-1">{operatorName}</p><p className="mt-1">O servidor logado ficará registrado no histórico.</p></div><label className="text-sm font-bold text-on-surface md:col-span-2">Descrição inicial<textarea value={newProcess.description} onChange={event => setNewProcess({ ...newProcess, description: event.target.value })} rows={3} placeholder="Informações iniciais do requerimento..." className="mt-2 w-full resize-none rounded-xl border border-primary/10 bg-white/70 px-3 py-3 text-sm outline-none focus:border-primary" /></label></div><div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowNewProcess(false)} className="rounded-xl px-5 py-3 text-sm font-bold text-on-surface-variant hover:bg-primary/5">Cancelar</button><button disabled={saving} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Autuando...' : 'Autuar processo'}</button></div></form></div>}
    </div>
  );
};
