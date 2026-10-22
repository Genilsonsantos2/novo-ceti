import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { differenceInCalendarDays, format, subDays } from 'date-fns';
import { isWorkflowProcessStale } from '../utils/workflow';
import { getAutomationSearchTarget } from '../utils/automation';

interface DashboardAbsence {
  id: string;
  student_id: string | null;
  date: string;
  type: 'FALTA_JUSTIFICADA' | 'ABONO';
  is_intermittent: boolean;
  reason: string | null;
  sigeduc_synced: boolean;
  students: { full_name: string; grade: string | null }[] | null;
}

interface DashboardWorkflowProcess {
  id: string;
  process_number: string;
  subject: string;
  student_name: string | null;
  guest_name: string | null;
  status: string;
  priority: string;
  updated_at: string;
}

interface DashboardOccurrence {
  id: string;
  occurred_at: string;
  has_card: boolean;
  reason: string;
}

interface AlertItem {
  id: string;
  severity: 'Alta' | 'Média' | 'Baixa';
  title: string;
  description: string;
  actionLabel: string;
  href: string;
}

interface AutomationTaskReview {
  task_key: string;
  reviewed_by: string | null;
  reviewed_by_name: string;
  reviewed_at: string;
}

export const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pendentesSigeduc: 0, faltasHoje: 0, abonosHoje: 0, intermitentes: 0, totalAlunos: 0, ocorrenciasHoje: 0, semCarteira30Dias: 0 });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [studentsAtRisk, setStudentsAtRisk] = useState(0);
  const [loading, setLoading] = useState(true);
  const [automationQuery, setAutomationQuery] = useState('');
  const [taskReviews, setTaskReviews] = useState<Record<string, AutomationTaskReview>>({});
  const [taskReviewError, setTaskReviewError] = useState('');
  const [taskReviewLoading, setTaskReviewLoading] = useState(true);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState('');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  );
  const taskDate = format(new Date(), 'yyyy-MM-dd');
  const pendingTasksCount = alerts.filter(alert => !taskReviews[alert.id]).length;
  const highPriorityTasks = alerts.filter(alert => alert.severity === 'Alta').length;

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    setTaskReviewLoading(true);
    setTaskReviews({});

    const fetchTaskReviews = async () => {
      const { data, error } = await supabase
        .from('automation_task_reviews')
        .select('task_key, reviewed_by, reviewed_by_name, reviewed_at')
        .eq('task_date', taskDate);
      if (!isMounted) return;
      if (error) {
        console.error('Erro ao carregar tarefas compartilhadas:', error);
        setTaskReviewLoading(false);
        setTaskReviewError(error.message.includes('automation_task_reviews')
          ? 'A sincronização das tarefas ainda não foi configurada. Execute supabase_automation_tasks_migration.sql no Supabase.'
          : `Não foi possível sincronizar as tarefas: ${error.message}`);
        return;
      }
      setTaskReviewError('');
      setTaskReviews(Object.fromEntries((data || []).map(review => [review.task_key, review as AutomationTaskReview])));
      setTaskReviewLoading(false);
    };

    void fetchTaskReviews();
    const channel = supabase
      .channel('automation-task-reviews')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'automation_task_reviews', filter: `task_date=eq.${taskDate}` },
        () => { void fetchTaskReviews(); }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [taskDate, user]);

  const toggleTaskReviewed = async (task: AlertItem) => {
    if (!user || savingTaskId) return;
    setSavingTaskId(task.id);
    setTaskReviewError('');

    const existingReview = taskReviews[task.id];
    const query = supabase.from('automation_task_reviews');
    const result = existingReview
      ? await query.delete().eq('task_date', taskDate).eq('task_key', task.id)
      : await query.upsert({
          task_date: taskDate,
          task_key: task.id,
          reviewed_by: user.id,
          reviewed_by_name: profile?.full_name || user.email || 'Gestor',
          reviewed_at: new Date().toISOString(),
        }, { onConflict: 'task_date,task_key' });

    if (result.error) {
      console.error('Erro ao atualizar tarefa compartilhada:', result.error);
      setTaskReviewError(`Não foi possível atualizar a tarefa: ${result.error.message}`);
      setSavingTaskId(null);
      return;
    }
    const { data, error } = await query
      .select('task_key, reviewed_by, reviewed_by_name, reviewed_at')
      .eq('task_date', taskDate);
    if (error) {
      console.error('Erro ao atualizar a lista de tarefas compartilhadas:', error);
      setTaskReviewError(`Tarefa salva, mas não foi possível atualizar a lista: ${error.message}`);
    } else {
      setTaskReviews(Object.fromEntries((data || []).map(review => [review.task_key, review as AutomationTaskReview])));
    }
    setSavingTaskId(null);
  };

  const enableTaskNotifications = async () => {
    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported');
      return;
    }
    setNotificationError('');
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'denied') {
        setNotificationError('Avisos bloqueados pelo navegador. Altere a permissão nas configurações do site.');
      }
    } catch (error) {
      console.error('Não foi possível solicitar permissão para lembretes:', error);
      setNotificationError('O navegador não permitiu ativar os lembretes.');
    }
  };

  useEffect(() => {
    if (
      loading ||
      taskReviewLoading ||
      pendingTasksCount === 0 ||
      notificationPermission !== 'granted' ||
      typeof Notification === 'undefined' ||
      !user
    ) return;

    const notificationKey = `ceti-automation-notification:${user.id}:${taskDate}`;
    try {
      if (localStorage.getItem(notificationKey)) return;
      new Notification('CETI: roteiro diário', {
        body: `Você tem ${pendingTasksCount} ação(ões) prioritária(s) para revisar.`,
        tag: notificationKey,
      });
      localStorage.setItem(notificationKey, 'sent');
    } catch (error) {
      console.error('Não foi possível exibir ou registrar o lembrete diário:', error);
      setNotificationError('Não foi possível exibir o lembrete neste dispositivo.');
    }
  }, [loading, taskReviewLoading, pendingTasksCount, notificationPermission, taskDate, user]);

  useEffect(() => {
    fetchStats();

    const absencesSubscription = supabase
      .channel('public:student_absences_dash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_absences' }, () => {
        fetchStats();
      })
      .subscribe();

    const occurrencesSubscription = supabase
      .channel('public:gate_occurrences_dash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_occurrences' }, () => {
        fetchStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_processes' }, () => {
        fetchStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_movements' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(absencesSubscription);
      supabase.removeChannel(occurrencesSubscription);
    };
  }, []);

  const fetchStats = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd');

    const [
      { data: absenceData, error: absenceError },
      { count: totalAlunos },
      { data: occurrenceData, error: occurrenceError },
      { data: workflowData, error: workflowError },
    ] = await Promise.all([
      supabase
        .from('student_absences')
        .select('id, student_id, date, type, is_intermittent, reason, sigeduc_synced, students(full_name, grade)')
        .gte('date', ninetyDaysAgo),
      supabase.from('students').select('*', { count: 'exact', head: true }),
      supabase
        .from('gate_occurrences')
        .select('id, occurred_at, has_card, reason')
        .gte('occurred_at', `${ninetyDaysAgo}T00:00:00`),
      supabase
        .from('workflow_processes')
        .select('id, process_number, subject, student_name, guest_name, status, priority, updated_at')
        .in('status', ['RECEBIDO', 'EM_ANALISE', 'PENDENTE', 'DECISAO']),
    ]);

    if (absenceError) {
      console.error('Erro ao montar alertas do dashboard:', absenceError);
    }
    if (occurrenceError && !occurrenceError.message.includes("Could not find the table 'public.gate_occurrences'")) {
      console.error('Erro ao buscar ocorrências do dashboard:', occurrenceError);
    }
    if (workflowError) {
      console.error('Erro ao buscar processos para o dashboard:', workflowError);
    }

    const absences = (absenceData || []) as DashboardAbsence[];
    const occurrences = (occurrenceData || []) as DashboardOccurrence[];
    const stalledProcesses = ((workflowData || []) as DashboardWorkflowProcess[])
      .filter(process => isWorkflowProcessStale(process))
      .sort((first, second) => {
        const firstUpdatedAt = new Date(first.updated_at).getTime();
        const secondUpdatedAt = new Date(second.updated_at).getTime();
        return firstUpdatedAt - secondUpdatedAt;
      });
    const validUntilToday = absences.filter(absence => absence.date <= today);
    const recentAbsences = validUntilToday.filter(absence => absence.date >= format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const lastSevenDays = validUntilToday.filter(absence => absence.date >= format(subDays(new Date(), 7), 'yyyy-MM-dd'));
    const pendingSync = validUntilToday.filter(absence => !absence.sigeduc_synced);
    const missingReason = validUntilToday.filter(absence => !absence.reason?.trim());
    const todayOccurrences = occurrences.filter(occurrence => occurrence.occurred_at.slice(0, 10) === today);
    const recentOccurrencesWithoutCard = occurrences.filter(occurrence => !occurrence.has_card);

    const countsByStudent = recentAbsences.reduce<Record<string, { count: number; lastSeven: number; name: string; grade: string }>>((acc, absence) => {
      if (!absence.student_id) return acc;
      const current = acc[absence.student_id] || {
        count: 0,
        lastSeven: 0,
        name: absence.students?.[0]?.full_name || 'Aluno sem identificação',
        grade: absence.students?.[0]?.grade || 'Turma não informada',
      };
      current.count += 1;
      if (absence.date >= format(subDays(new Date(), 7), 'yyyy-MM-dd')) current.lastSeven += 1;
      acc[absence.student_id] = current;
      return acc;
    }, {});

    const riskStudents = Object.entries(countsByStudent)
      .filter(([, item]) => item.count >= 3)
      .sort(([, first], [, second]) => second.count - first.count);

    const generatedAlerts: AlertItem[] = [];
    if (riskStudents.length > 0) {
      const [, student] = riskStudents[0];
      generatedAlerts.push({
        id: 'recurrence',
        severity: riskStudents.length >= 3 ? 'Alta' : 'Média',
        title: `${riskStudents.length} aluno(s) com recorrência`,
        description: `${student.name} lidera a lista com ${student.count} registros nos últimos 30 dias (${student.lastSeven} na última semana).`,
        actionLabel: 'Revisar histórico',
        href: '/absences?aba=historico&filtro=reincidentes',
      });
    }
    if (stalledProcesses.length > 0) {
      const oldestProcess = stalledProcesses[0];
      const ownerName = oldestProcess.student_name || oldestProcess.guest_name || 'Solicitação avulsa';
      generatedAlerts.push({
        id: 'stalled-processes',
        severity: stalledProcesses.some(process => process.priority === 'URGENTE') ? 'Alta' : 'Média',
        title: `${stalledProcesses.length} processo(s) sem movimentação recente`,
        description: `${oldestProcess.process_number} · ${oldestProcess.subject} (${ownerName}) está sem atualização há ${differenceInCalendarDays(new Date(), new Date(oldestProcess.updated_at))} dia(s).`,
        actionLabel: 'Revisar processos',
        href: '/workflow?atencao=parados',
      });
    }
    if (missingReason.length > 0) {
      generatedAlerts.push({
        id: 'missing-reason',
        severity: 'Alta',
        title: `${missingReason.length} registro(s) sem justificativa`,
        description: 'Esses lançamentos precisam de revisão antes de serem considerados válidos.',
        actionLabel: 'Completar justificativas',
        href: '/absences?aba=historico&filtro=sem-justificativa',
      });
    }
    if (pendingSync.length > 0) {
      generatedAlerts.push({
        id: 'pending-sync',
        severity: pendingSync.length >= 10 ? 'Alta' : 'Média',
        title: `${pendingSync.length} registro(s) pendente(s) no Sigeduc`,
        description: 'A baixa ainda não foi confirmada e pode exigir ação administrativa.',
        actionLabel: 'Ver pendências',
        href: '/absences?aba=historico&filtro=sigeduc-pending',
      });
    }
    if (lastSevenDays.length > recentAbsences.length / 2 && lastSevenDays.length >= 3) {
      generatedAlerts.push({
        id: 'trend',
        severity: 'Média',
        title: 'Aumento recente de ausências',
        description: `${lastSevenDays.length} registros ocorreram na última semana. Vale investigar a tendência por turma.`,
        actionLabel: 'Abrir relatórios',
        href: '/absences?aba=relatorios&filtro=tendencia',
      });
    }
    if (todayOccurrences.length > 0) {
      generatedAlerts.push({
        id: 'gate-occurrences',
        severity: todayOccurrences.some(occurrence => !occurrence.has_card) ? 'Alta' : 'Média',
        title: `${todayOccurrences.length} ocorrência(s) na portaria hoje`,
        description: `${todayOccurrences.filter(occurrence => !occurrence.has_card).length} registro(s) envolveram aluno sem carteira apresentada.`,
        actionLabel: 'Ver ocorrências',
        href: '/occurrences',
      });
    }

    setStats({
      pendentesSigeduc: pendingSync.filter(absence => absence.date <= today).length,
      faltasHoje: validUntilToday.filter(absence => absence.date === today && absence.type === 'FALTA_JUSTIFICADA').length,
      abonosHoje: validUntilToday.filter(absence => absence.date === today && absence.type === 'ABONO').length,
      intermitentes: recentAbsences.filter(absence => absence.is_intermittent).length,
      totalAlunos: totalAlunos || 0,
      ocorrenciasHoje: todayOccurrences.length,
      semCarteira30Dias: recentOccurrencesWithoutCard.length
    });
    const severityOrder = { Alta: 0, Média: 1, Baixa: 2 };
    setAlerts(generatedAlerts.sort((first, second) => severityOrder[first.severity] - severityOrder[second.severity]));
    setStudentsAtRisk(riskStudents.length);
    
    setLoading(false);
  };

  return (
    <div className="flex-1 px-6 md:px-10 py-8 pb-32 min-h-screen">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 opacity-70">Painel Administrativo</p>
          <h2 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight">Gestão Central</h2>
          <p className="text-on-surface-variant font-body mt-1">Visão geral do controle de Faltas e Abonos do Sigeduc.</p>
        </div>
        <div className="flex items-center gap-2 bg-primary/5 rounded-2xl px-4 py-2.5 border border-primary/10">
          <span className="material-symbols-outlined text-primary text-lg">groups</span>
          <p className="text-sm font-bold text-primary">{stats.totalAlunos} <span className="text-xs font-medium text-primary/70">alunos cadastrados</span></p>
        </div>
      </div>

      <section className="glass-card mb-8 rounded-[2rem] border border-primary/15 p-5 md:p-6">
        <form
          className="flex flex-col gap-3 md:flex-row"
          onSubmit={event => {
            event.preventDefault();
            navigate(getAutomationSearchTarget(automationQuery));
          }}
        >
          <label htmlFor="automation-search" className="sr-only">Busca inteligente</label>
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">auto_awesome</span>
            <input
              id="automation-search"
              value={automationQuery}
              onChange={event => setAutomationQuery(event.target.value)}
              placeholder="Busque ou pergunte: faltas de hoje, processos parados, aluno por nome..."
              className="w-full rounded-xl border border-primary/15 bg-white/70 py-3.5 pl-12 pr-4 text-sm text-on-surface outline-none transition focus:border-primary"
            />
          </div>
          <button type="submit" className="rounded-xl bg-primary px-6 py-3 font-bold text-white transition hover:brightness-110">
            Buscar no sistema
          </button>
        </form>
        <p className="mt-2 text-xs text-on-surface-variant">
          A busca interpreta atalhos em português e leva você aos filtros correspondentes. Ex.: “faltas de hoje”, “pendências Sigeduc” ou “processos parados”.
        </p>
      </section>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
          
          <Link to="/absences?aba=historico&filtro=sigeduc-pending" className="glass-card rounded-[2rem] p-8 flex flex-col justify-between h-48 group hover:scale-[1.02] transition-all duration-500 border-l-4 border-l-rose-500 relative overflow-hidden">
            <div className="absolute inset-0 bg-rose-500/5 group-hover:bg-rose-500/10 transition-colors"></div>
            <div className="flex justify-between items-start relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-rose-500/20 transition-all duration-500">
                <span className="material-symbols-outlined text-rose-500 text-2xl">sync_problem</span>
              </div>
              {stats.pendentesSigeduc > 0 && (
                <span className="text-rose-500 text-[10px] font-bold uppercase tracking-widest animate-pulse bg-rose-50 px-2 py-1 rounded-full border border-rose-200">
                  Atenção
                </span>
              )}
            </div>
            <div className="relative z-10">
              <p className="text-5xl font-headline font-extrabold text-rose-500">{stats.pendentesSigeduc}</p>
              <p className="text-on-surface-variant text-sm font-medium mt-1">Pendentes de Baixa (Sigeduc)</p>
            </div>
          </Link>

          <Link to="/absences?aba=historico&filtro=hoje-faltas" className="glass-card rounded-[2rem] p-8 flex flex-col justify-between h-48 group hover:scale-[1.02] transition-all duration-500 border-l-4 border-l-blue-500">
            <div className="flex justify-between items-start">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-blue-500/10 transition-all duration-500">
                <span className="material-symbols-outlined text-blue-500 text-2xl">person_off</span>
              </div>
              <span className="text-outline text-[10px] font-bold uppercase tracking-widest">Hoje</span>
            </div>
            <div>
              <p className="text-5xl font-headline font-extrabold text-blue-500">{stats.faltasHoje}</p>
              <p className="text-on-surface-variant text-sm font-medium mt-1">Faltas Justificadas (Hoje)</p>
            </div>
          </Link>

          <Link to="/absences?aba=historico&filtro=hoje-abonos" className="glass-card rounded-[2rem] p-8 flex flex-col justify-between h-48 group hover:scale-[1.02] transition-all duration-500 border-l-4 border-l-emerald-500">
            <div className="flex justify-between items-start">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-emerald-500/10 transition-all duration-500">
                <span className="material-symbols-outlined text-emerald-500 text-2xl">event_available</span>
              </div>
              <span className="text-outline text-[10px] font-bold uppercase tracking-widest">Hoje</span>
            </div>
            <div>
              <p className="text-5xl font-headline font-extrabold text-emerald-500">{stats.abonosHoje}</p>
              <p className="text-on-surface-variant text-sm font-medium mt-1">Abonos (Hoje)</p>
            </div>
          </Link>

          <Link to="/absences?aba=historico&filtro=intermitentes-ativos" className="glass-card rounded-[2rem] p-8 flex flex-col justify-between h-48 group hover:scale-[1.02] transition-all duration-500 border-l-4 border-l-violet-500">
            <div className="flex justify-between items-start">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-violet-500/10 transition-all duration-500">
                <span className="material-symbols-outlined text-violet-500 text-2xl">autorenew</span>
              </div>
              <span className="text-outline text-[10px] font-bold uppercase tracking-widest">30 dias</span>
            </div>
            <div>
              <p className="text-5xl font-headline font-extrabold text-violet-500">{stats.intermitentes}</p>
              <p className="text-on-surface-variant text-sm font-medium mt-1">Acompanhamentos intermitentes</p>
            </div>
          </Link>

        </div>
      )}

      {!loading && (
        <section className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Link to="/occurrences" className="glass-card rounded-[2rem] p-6 flex items-center justify-between group border-l-4 border-l-amber-500 hover:scale-[1.01] transition-all">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Portaria hoje</p>
              <p className="mt-2 text-4xl font-headline font-extrabold text-amber-600">{stats.ocorrenciasHoje}</p>
              <p className="mt-1 text-sm font-medium text-on-surface-variant">Ocorrências registradas</p>
            </div>
            <span className="material-symbols-outlined text-4xl text-amber-500/50 group-hover:text-amber-500 transition-colors">report</span>
          </Link>
          <Link to="/occurrences" className="glass-card rounded-[2rem] p-6 flex items-center justify-between group border-l-4 border-l-rose-500 hover:scale-[1.01] transition-all">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-rose-700">Atenção da portaria</p>
              <p className="mt-2 text-4xl font-headline font-extrabold text-rose-600">{stats.semCarteira30Dias}</p>
              <p className="mt-1 text-sm font-medium text-on-surface-variant">Sem carteira nos últimos 30 dias</p>
            </div>
            <span className="material-symbols-outlined text-4xl text-rose-500/50 group-hover:text-rose-500 transition-colors">badge</span>
          </Link>
        </section>
      )}

      {!loading && (
        <section className="mb-12 grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="glass-card rounded-[2rem] border border-amber-200/70 bg-amber-50/50 p-6 md:p-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Análise automática</p>
                <h3 className="mt-2 font-headline text-2xl font-extrabold text-amber-950">Painel de alertas</h3>
                <p className="mt-1 text-sm text-amber-900/70">Sinais calculados a partir dos últimos 90 dias de registros.</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white/70 px-4 py-3 text-right">
                <p className="text-2xl font-black text-amber-700">{studentsAtRisk}</p>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-900/60">alunos em atenção</p>
              </div>
            </div>

            {alerts.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
                Nenhum alerta relevante foi encontrado no período analisado.
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map(alert => (
                  <div key={alert.id} className="flex flex-col gap-4 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${alert.severity === 'Alta' ? 'bg-rose-500' : alert.severity === 'Média' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-slate-800">{alert.title}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Risco {alert.severity}</span>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{alert.description}</p>
                      </div>
                    </div>
                    <Link to={alert.href} className="shrink-0 text-sm font-bold text-amber-800 hover:text-amber-950">{alert.actionLabel} <span aria-hidden="true">-&gt;</span></Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card rounded-[2rem] p-6 md:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/70">Automação diária</p>
                <h3 className="mt-2 font-headline text-2xl font-extrabold text-on-surface">Roteiro de prioridades</h3>
              </div>
              <span className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-black text-primary">
                {pendingTasksCount} pendente(s)
              </span>
            </div>
            <p className="mt-2 text-sm text-on-surface-variant">
              {alerts.length === 0
                ? 'Nenhuma ação prioritária foi identificada com os dados disponíveis.'
                : `${alerts.length} ação(ões) sugerida(s); ${alerts.length - pendingTasksCount} revisada(s) hoje.`}
            </p>
            <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
              <p className="font-bold">Resumo inteligente do dia</p>
              <p className="mt-1 text-xs leading-relaxed">
                {alerts.length === 0
                  ? 'Com os registros disponíveis, não há ações prioritárias sugeridas agora.'
                  : `Foram identificadas ${alerts.length} ação(ões) para revisão${highPriorityTasks ? `, incluindo ${highPriorityTasks} de prioridade alta` : ''}. ${pendingTasksCount ? `${pendingTasksCount} ainda aguardam conferência da equipe.` : 'Todas as ações foram revisadas.'}`}
                {' '}Este resumo é calculado localmente a partir de contagens e alertas do sistema; não usa IA externa.
              </p>
            </div>
            {taskReviewError && (
              <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                {taskReviewError}
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/10 bg-primary/5 p-4">
              <div>
                <p className="text-sm font-bold text-on-surface">Lembrete diário neste dispositivo</p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {notificationPermission === 'granted'
                    ? 'Avisos do navegador ativados; o lembrete não inclui nomes de estudantes.'
                    : notificationPermission === 'denied'
                      ? 'Permissão bloqueada pelo navegador.'
                      : notificationPermission === 'unsupported'
                        ? 'Este navegador não oferece notificações.'
                        : 'Ative para receber um aviso genérico quando houver ações prioritárias.'}
                </p>
              </div>
              {notificationPermission !== 'unsupported' && notificationPermission !== 'granted' && (
                <button
                  type="button"
                  onClick={enableTaskNotifications}
                  className="rounded-lg border border-primary/20 bg-white px-4 py-2 text-xs font-bold text-primary hover:bg-primary/5"
                >
                  Ativar lembrete
                </button>
              )}
              {notificationPermission === 'granted' && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                  <span className="material-symbols-outlined text-base">notifications_active</span>
                  Ativado
                </span>
              )}
            </div>
            {notificationError && <p role="alert" className="mt-2 text-xs text-rose-700">{notificationError}</p>}
            <div className="mt-5 space-y-3">
              {taskReviewLoading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Carregando o progresso compartilhado da equipe...
                </div>
              ) : alerts.length === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  Painel em dia. As sugestões são recalculadas quando os registros mudam.
                </div>
              ) : alerts.map(alert => {
                const review = taskReviews[alert.id];
                const isReviewed = !!review;
                return (
                  <div key={alert.id} className={`rounded-xl border p-4 ${isReviewed ? 'border-emerald-200 bg-emerald-50/70' : 'border-primary/10 bg-primary/5'}`}>
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => void toggleTaskReviewed(alert)}
                        disabled={!!savingTaskId}
                        aria-pressed={isReviewed}
                        aria-label={isReviewed ? `Desmarcar revisão: ${alert.title}` : `Marcar como revisado: ${alert.title}`}
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition disabled:cursor-wait disabled:opacity-60 ${isReviewed ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent hover:border-primary'}`}
                      >
                        <span className="material-symbols-outlined text-base">check</span>
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`font-bold ${isReviewed ? 'text-emerald-900' : 'text-on-surface'}`}>
                          {alert.title}
                          {isReviewed && <span className="ml-2 text-[10px] font-black uppercase tracking-wide text-emerald-700">Revisado por {review.reviewed_by_name}</span>}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{alert.description}</p>
                        {isReviewed && <p className="mt-1 text-[10px] text-emerald-700">às {new Date(review.reviewed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>}
                        <Link to={alert.href} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                          {alert.actionLabel}<span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-on-surface-variant">
              Marcar como revisado salva o progresso neste navegador para sua conta e para hoje; isso não altera registros nem substitui a validação da equipe.
            </p>
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <div className="glass-card rounded-[2rem] p-8">
        <h3 className="font-headline font-bold text-xl text-on-surface mb-6">Acesso Rápido</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/absences" className="p-4 rounded-xl bg-white/40 border border-white/60 hover:bg-white/80 transition-all flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
              <span className="material-symbols-outlined">event_busy</span>
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">Registrar Falta</p>
              <p className="text-xs text-gray-500 mt-0.5">Criar novo registro no sistema</p>
            </div>
          </Link>
          
          <Link to="/students" className="p-4 rounded-xl bg-white/40 border border-white/60 hover:bg-white/80 transition-all flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
              <span className="material-symbols-outlined">badge</span>
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">Alunos</p>
              <p className="text-xs text-gray-500 mt-0.5">Gerenciar base de alunos</p>
            </div>
          </Link>

          <Link to="/devolutiva" className="p-4 rounded-xl bg-white/40 border border-white/60 hover:bg-white/80 transition-all flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
              <span className="material-symbols-outlined">attach_file</span>
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">Devolutiva</p>
              <p className="text-xs text-gray-500 mt-0.5">Anexar termos de alunos</p>
            </div>
          </Link>

          <Link to="/occurrences" className="p-4 rounded-xl bg-white/40 border border-white/60 hover:bg-white/80 transition-all flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all">
              <span className="material-symbols-outlined">report</span>
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">Ocorrências</p>
              <p className="text-xs text-gray-500 mt-0.5">Consultar registros da portaria</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};
