import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
  subject: string;
  description: string | null;
  priority: WorkflowPriority;
  status: WorkflowStatus;
  responsible_name: string | null;
  operator_name: string;
  created_at: string;
  updated_at: string;
  workflow_movements?: WorkflowMovement[];
}

const getStatus = (status: WorkflowStatus) => statusOptions.find(option => option.value === status) || statusOptions[0];
const formatDate = (date: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date));

export const WorkflowPage: React.FC = () => {
  const { user, profile } = useAuth();
  const operatorName = profile?.full_name || user?.email || 'Operador não identificado';
  const [processes, setProcesses] = useState<WorkflowProcess[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<WorkflowProcess | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [showNewProcess, setShowNewProcess] = useState(false);
  const [movementNote, setMovementNote] = useState('');
  const [nextStatus, setNextStatus] = useState<WorkflowStatus>('EM_ANALISE');
  const [newProcess, setNewProcess] = useState({ processNumber: '', subject: '', responsibleName: '', priority: 'NORMAL' as WorkflowPriority, description: '' });

  const fetchProcesses = async (keepSelected = true) => {
    setLoading(true);
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
      if (keepSelected && selectedProcess) {
        setSelectedProcess(nextProcesses.find(process => process.id === selectedProcess.id) || null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProcesses(false);
    const channel = supabase
      .channel('workflow-processes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_processes' }, () => fetchProcesses())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_movements' }, () => fetchProcesses())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredProcesses = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();
    return processes.filter(process => {
      const matchesStatus = statusFilter === 'TODOS' || process.status === statusFilter;
      const matchesSearch = !normalizedSearch || [process.process_number, process.subject, process.responsible_name, process.operator_name]
        .some(value => value?.toLowerCase().includes(normalizedSearch));
      return matchesStatus && matchesSearch;
    });
  }, [processes, search, statusFilter]);

  const countByStatus = (status: WorkflowStatus) => processes.filter(process => process.status === status).length;

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newProcess.processNumber.trim() || !newProcess.subject.trim()) return;
    setSaving(true);
    setError('');
    const { data, error: insertError } = await supabase
      .from('workflow_processes')
      .insert({
        process_number: newProcess.processNumber.trim(),
        subject: newProcess.subject.trim(),
        description: newProcess.description.trim() || null,
        responsible_name: newProcess.responsibleName.trim() || null,
        priority: newProcess.priority,
        status: 'RECEBIDO',
        operator_id: user?.id,
        operator_name: operatorName,
      })
      .select()
      .single();

    if (insertError || !data) {
      setError(insertError?.message.includes('duplicate') ? 'Já existe um processo para essa matrícula.' : insertError?.message || 'Não foi possível abrir o processo.');
      setSaving(false);
      return;
    }

    const { error: movementError } = await supabase.from('workflow_movements').insert({
      process_id: data.id,
      to_status: 'RECEBIDO',
      note: 'Processo aberto e distribuído para análise.',
      operator_id: user?.id,
      operator_name: operatorName,
    });
    if (movementError) setError(`Processo criado, mas o histórico inicial não foi registrado: ${movementError.message}`);
    setNewProcess({ processNumber: '', subject: '', responsibleName: '', priority: 'NORMAL', description: '' });
    setShowNewProcess(false);
    await fetchProcesses(false);
    setSelectedProcess({ ...data, workflow_movements: [] } as WorkflowProcess);
    setSaving(false);
  };

  const handleMovement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProcess || !movementNote.trim()) return;
    setSaving(true);
    setError('');
    const { error: movementError } = await supabase.from('workflow_movements').insert({
      process_id: selectedProcess.id,
      from_status: selectedProcess.status,
      to_status: nextStatus,
      note: movementNote.trim(),
      operator_id: user?.id,
      operator_name: operatorName,
    });
    if (movementError) {
      setError(`Não foi possível registrar a movimentação: ${movementError.message}`);
      setSaving(false);
      return;
    }
    const { error: updateError } = await supabase.from('workflow_processes').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', selectedProcess.id);
    if (updateError) setError(`Movimentação registrada, mas o status não foi atualizado: ${updateError.message}`);
    setMovementNote('');
    await fetchProcesses();
    setSaving(false);
  };

  return (
    <div className="flex-1 px-6 py-8 md:px-10 md:py-10 pb-32 min-h-screen">
      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70">Tramitação administrativa</p>
          <h2 className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">Acompanhamento de processos</h2>
          <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">Fila de trabalho no modelo judicial, com matrícula como número do processo e histórico de cada ato praticado.</p>
        </div>
        <button onClick={() => setShowNewProcess(true)} className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:scale-[1.02]">
          <span className="material-symbols-outlined">add_circle</span>
          Abrir processo
        </button>
      </header>

      {error && <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span className="material-symbols-outlined">error</span><p>{error}</p></div>}

      <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {statusOptions.map(status => (
          <button key={status.value} onClick={() => setStatusFilter(statusFilter === status.value ? 'TODOS' : status.value)} className={`glass-card rounded-2xl p-4 text-left ${statusFilter === status.value ? 'ring-2 ring-primary' : ''}`}>
            <p className="text-2xl font-black text-on-surface">{countByStatus(status.value)}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">{status.label}</p>
          </button>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="glass-card overflow-hidden rounded-[2rem]">
          <div className="flex flex-col gap-3 border-b border-white/60 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div><h3 className="font-headline text-xl font-extrabold text-on-surface">Fila de processos</h3><p className="mt-1 text-xs text-on-surface-variant">{filteredProcesses.length} processo(s) encontrado(s)</p></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative"><span className="sr-only">Pesquisar processos</span><span className="material-symbols-outlined absolute left-3 top-2.5 text-lg text-outline">search</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Matrícula, assunto..." className="w-full rounded-xl border border-primary/10 bg-white/60 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary sm:w-56" /></label>
              <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-xl border border-primary/10 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-primary"><option value="TODOS">Todos os status</option>{statusOptions.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select>
            </div>
          </div>
          {loading ? <div className="flex justify-center p-16"><span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span></div> : filteredProcesses.length === 0 ? <div className="p-12 text-center"><span className="material-symbols-outlined text-5xl text-primary/30">folder_open</span><p className="mt-3 font-bold text-on-surface">Nenhum processo na fila</p><p className="mt-1 text-sm text-on-surface-variant">Abra um processo para iniciar o acompanhamento.</p></div> : <div className="divide-y divide-white/60">{filteredProcesses.map(process => { const status = getStatus(process.status); return <button key={process.id} onClick={() => { setSelectedProcess(process); setNextStatus(process.status === 'RECEBIDO' ? 'EM_ANALISE' : process.status); }} className={`flex w-full items-center gap-4 p-5 text-left transition hover:bg-primary/5 ${selectedProcess?.id === process.id ? 'bg-primary/5' : ''}`}><div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex"><span className="material-symbols-outlined">folder_managed</span></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-sm font-extrabold text-primary">{process.process_number}</p><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${status.color}`}>{status.label}</span></div><p className="mt-1 truncate font-bold text-on-surface">{process.subject}</p><p className="mt-1 text-xs text-on-surface-variant">Atualizado em {formatDate(process.updated_at)} · Operado por {process.operator_name}</p></div><span className="material-symbols-outlined text-outline">chevron_right</span></button>; })}</div>}
        </section>

        <aside className="glass-card rounded-[2rem] p-6">
          {!selectedProcess ? <div className="flex min-h-[360px] flex-col items-center justify-center text-center"><span className="material-symbols-outlined text-5xl text-primary/30">fact_check</span><h3 className="mt-4 font-headline text-xl font-extrabold text-on-surface">Detalhes do processo</h3><p className="mt-2 max-w-xs text-sm text-on-surface-variant">Selecione um processo na fila para consultar os autos e registrar a próxima movimentação.</p></div> : <div><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-lg font-extrabold text-primary">{selectedProcess.process_number}</p><p className="mt-1 text-xs text-on-surface-variant">Autuado em {formatDate(selectedProcess.created_at)}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${getStatus(selectedProcess.status).color}`}>{getStatus(selectedProcess.status).label}</span></div><h3 className="mt-5 font-headline text-xl font-extrabold text-on-surface">{selectedProcess.subject}</h3>{selectedProcess.description && <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{selectedProcess.description}</p>}<div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-primary/5 p-3"><p className="font-bold uppercase tracking-wide text-primary/70">Prioridade</p><p className="mt-1 font-bold text-on-surface">{priorityOptions.find(item => item.value === selectedProcess.priority)?.label}</p></div><div className="rounded-xl bg-primary/5 p-3"><p className="font-bold uppercase tracking-wide text-primary/70">Responsável</p><p className="mt-1 truncate font-bold text-on-surface">{selectedProcess.responsible_name || 'A definir'}</p></div></div><div className="mt-7"><h4 className="text-xs font-black uppercase tracking-[0.16em] text-on-surface-variant">Histórico de movimentações</h4><div className="mt-4 max-h-64 space-y-4 overflow-y-auto pr-1">{(selectedProcess.workflow_movements || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(movement => <div key={movement.id} className="relative border-l-2 border-primary/20 pl-4"><span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" /><p className="text-xs font-bold text-on-surface">{getStatus(movement.to_status).label} · {formatDate(movement.created_at)}</p><p className="mt-1 text-sm text-on-surface-variant">{movement.note}</p><p className="mt-1 text-[11px] font-semibold text-primary/70">Operado por {movement.operator_name}</p></div>)}</div></div><form onSubmit={handleMovement} className="mt-7 border-t border-white/60 pt-5"><p className="text-xs font-black uppercase tracking-[0.16em] text-on-surface-variant">Registrar ato</p><div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"><select value={nextStatus} onChange={event => setNextStatus(event.target.value as WorkflowStatus)} className="rounded-xl border border-primary/10 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-primary">{statusOptions.filter(status => status.value !== selectedProcess.status).map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select><input value={operatorName} readOnly className="rounded-xl border border-primary/10 bg-primary/5 px-3 py-2.5 text-xs font-semibold text-on-surface-variant" /></div><textarea required value={movementNote} onChange={event => setMovementNote(event.target.value)} placeholder="Descreva o despacho, encaminhamento ou providência..." rows={3} className="mt-3 w-full resize-none rounded-xl border border-primary/10 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-primary" /><button disabled={saving} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"><span className="material-symbols-outlined text-lg">forward</span>{saving ? 'Registrando...' : 'Registrar movimentação'}</button></form></div>}
        </aside>
      </div>

      {showNewProcess && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"><form onSubmit={handleCreate} className="glass-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] p-6 md:p-8"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70">Nova autuação</p><h3 className="mt-2 font-headline text-2xl font-extrabold text-on-surface">Abrir processo administrativo</h3></div><button type="button" onClick={() => setShowNewProcess(false)} className="rounded-xl p-2 text-outline hover:bg-primary/10" aria-label="Fechar"><span className="material-symbols-outlined">close</span></button></div><div className="mt-7 grid gap-4 md:grid-cols-2"><label className="text-sm font-bold text-on-surface">Número do processo / matrícula<input required value={newProcess.processNumber} onChange={event => setNewProcess({ ...newProcess, processNumber: event.target.value })} placeholder="Ex.: 202400123" className="mt-2 w-full rounded-xl border border-primary/10 bg-white/70 px-3 py-3 font-mono text-sm outline-none focus:border-primary" /></label><label className="text-sm font-bold text-on-surface">Servidor responsável<input value={newProcess.responsibleName} onChange={event => setNewProcess({ ...newProcess, responsibleName: event.target.value })} placeholder="Nome do servidor" className="mt-2 w-full rounded-xl border border-primary/10 bg-white/70 px-3 py-3 text-sm outline-none focus:border-primary" /></label><label className="text-sm font-bold text-on-surface md:col-span-2">Assunto<input required value={newProcess.subject} onChange={event => setNewProcess({ ...newProcess, subject: event.target.value })} placeholder="Ex.: Solicitação de averbação" className="mt-2 w-full rounded-xl border border-primary/10 bg-white/70 px-3 py-3 text-sm outline-none focus:border-primary" /></label><label className="text-sm font-bold text-on-surface">Prioridade<select value={newProcess.priority} onChange={event => setNewProcess({ ...newProcess, priority: event.target.value as WorkflowPriority })} className="mt-2 w-full rounded-xl border border-primary/10 bg-white/70 px-3 py-3 text-sm outline-none focus:border-primary">{priorityOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><div className="rounded-xl bg-primary/5 p-3 text-xs text-on-surface-variant"><p className="font-bold text-primary">Operador da autuação</p><p className="mt-1">{operatorName}</p><p className="mt-1">O servidor logado ficará registrado no histórico.</p></div><label className="text-sm font-bold text-on-surface md:col-span-2">Descrição inicial<textarea value={newProcess.description} onChange={event => setNewProcess({ ...newProcess, description: event.target.value })} rows={3} placeholder="Informações iniciais do requerimento..." className="mt-2 w-full resize-none rounded-xl border border-primary/10 bg-white/70 px-3 py-3 text-sm outline-none focus:border-primary" /></label></div><div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowNewProcess(false)} className="rounded-xl px-5 py-3 text-sm font-bold text-on-surface-variant hover:bg-primary/5">Cancelar</button><button disabled={saving} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Autuando...' : 'Autuar processo'}</button></div></form></div>}
    </div>
  );
};
