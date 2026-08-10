import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({ pendentesSigeduc: 0, faltasHoje: 0, abonosHoje: 0 });
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
    
    // Count pendentes Sigeduc
    const { count: pendentesSigeduc } = await supabase
      .from('student_absences')
      .select('*', { count: 'exact' })
      .eq('sigeduc_synced', false);

    // Count faltas de hoje
    const { count: faltasHoje } = await supabase
      .from('student_absences')
      .select('*', { count: 'exact' })
      .eq('date', today)
      .eq('type', 'FALTA_JUSTIFICADA');

    // Count abonos de hoje
    const { count: abonosHoje } = await supabase
      .from('student_absences')
      .select('*', { count: 'exact' })
      .eq('date', today)
      .eq('type', 'ABONO');

    setStats({
      pendentesSigeduc: pendentesSigeduc || 0,
      faltasHoje: faltasHoje || 0,
      abonosHoje: abonosHoje || 0
    });
    
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

          <div className="glass-card rounded-[2rem] p-8 flex flex-col justify-between h-48 group hover:scale-[1.02] transition-all duration-500 border-l-4 border-l-blue-500">
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
          </div>

          <div className="glass-card rounded-[2rem] p-8 flex flex-col justify-between h-48 group hover:scale-[1.02] transition-all duration-500 border-l-4 border-l-emerald-500">
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
          </div>

        </div>
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
