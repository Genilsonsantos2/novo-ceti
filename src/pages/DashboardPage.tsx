import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { format, subDays } from 'date-fns';

interface DashboardAbsence {
  id: string;
  student_id: string | null;
  date: string;
  type: 'FALTA_JUSTIFICADA' | 'ABONO';
  reason: string | null;
  sigeduc_synced: boolean;
  students: { full_name: string; grade: string | null }[] | null;
}

interface AlertItem {
  id: string;
  severity: 'Alta' | 'Média' | 'Baixa';
  title: string;
  description: string;
  actionLabel: string;
  href: string;
}

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({ pendentesSigeduc: 0, faltasHoje: 0, abonosHoje: 0, totalAlunos: 0 });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [studentsAtRisk, setStudentsAtRisk] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();

    const absencesSubscription = supabase
      .channel('public:student_absences_dash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_absences' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(absencesSubscription);
    };
  }, []);

  const fetchStats = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd');

    const [{ data: absenceData, error: absenceError }, { count: totalAlunos }] = await Promise.all([
      supabase
        .from('student_absences')
        .select('id, student_id, date, type, reason, sigeduc_synced, students(full_name, grade)')
        .gte('date', ninetyDaysAgo),
      supabase.from('students').select('*', { count: 'exact', head: true }),
    ]);

    if (absenceError) {
      console.error('Erro ao montar alertas do dashboard:', absenceError);
    }

    const absences = (absenceData || []) as DashboardAbsence[];
    const validUntilToday = absences.filter(absence => absence.date <= today);
    const recentAbsences = validUntilToday.filter(absence => absence.date >= format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const lastSevenDays = validUntilToday.filter(absence => absence.date >= format(subDays(new Date(), 7), 'yyyy-MM-dd'));
    const pendingSync = validUntilToday.filter(absence => !absence.sigeduc_synced);
    const missingReason = validUntilToday.filter(absence => !absence.reason?.trim());

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
        href: '/absences',
      });
    }
    if (missingReason.length > 0) {
      generatedAlerts.push({
        id: 'missing-reason',
        severity: 'Alta',
        title: `${missingReason.length} registro(s) sem justificativa`,
        description: 'Esses lançamentos precisam de revisão antes de serem considerados válidos.',
        actionLabel: 'Completar justificativas',
        href: '/absences',
      });
    }
    if (pendingSync.length > 0) {
      generatedAlerts.push({
        id: 'pending-sync',
        severity: pendingSync.length >= 10 ? 'Alta' : 'Média',
        title: `${pendingSync.length} registro(s) pendente(s) no Sigeduc`,
        description: 'A baixa ainda não foi confirmada e pode exigir ação administrativa.',
        actionLabel: 'Ver pendências',
        href: '/absences',
      });
    }
    if (lastSevenDays.length > recentAbsences.length / 2 && lastSevenDays.length >= 3) {
      generatedAlerts.push({
        id: 'trend',
        severity: 'Média',
        title: 'Aumento recente de ausências',
        description: `${lastSevenDays.length} registros ocorreram na última semana. Vale investigar a tendência por turma.`,
        actionLabel: 'Abrir relatórios',
        href: '/absences',
      });
    }

    setStats({
      pendentesSigeduc: pendingSync.filter(absence => absence.date <= today).length,
      faltasHoje: validUntilToday.filter(absence => absence.date === today && absence.type === 'FALTA_JUSTIFICADA').length,
      abonosHoje: validUntilToday.filter(absence => absence.date === today && absence.type === 'ABONO').length,
      totalAlunos: totalAlunos || 0
    });
    setAlerts(generatedAlerts);
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

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          
          <Link to="/absences" className="glass-card rounded-[2rem] p-8 flex flex-col justify-between h-48 group hover:scale-[1.02] transition-all duration-500 border-l-4 border-l-rose-500 relative overflow-hidden">
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

          <Link to="/absences" className="glass-card rounded-[2rem] p-8 flex flex-col justify-between h-48 group hover:scale-[1.02] transition-all duration-500 border-l-4 border-l-blue-500">
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

          <Link to="/absences" className="glass-card rounded-[2rem] p-8 flex flex-col justify-between h-48 group hover:scale-[1.02] transition-all duration-500 border-l-4 border-l-emerald-500">
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

        </div>
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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/70">Leitura rápida</p>
            <h3 className="mt-2 font-headline text-2xl font-extrabold text-on-surface">Próximas ações</h3>
            <div className="mt-6 space-y-4 text-sm">
              <Link to="/absences" className="flex items-center justify-between rounded-xl border border-primary/10 bg-primary/5 p-4 font-semibold text-on-surface hover:bg-primary/10">
                <span>Revisar registros pendentes</span><span className="material-symbols-outlined text-primary">arrow_forward</span>
              </Link>
              <Link to="/students" className="flex items-center justify-between rounded-xl border border-primary/10 bg-primary/5 p-4 font-semibold text-on-surface hover:bg-primary/10">
                <span>Consultar alunos em atenção</span><span className="material-symbols-outlined text-primary">arrow_forward</span>
              </Link>
              <p className="text-xs leading-relaxed text-on-surface-variant">Os alertas são recomendações baseadas nos dados disponíveis e precisam de validação da equipe.</p>
            </div>
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
        </div>
      </div>
    </div>
  );
};
