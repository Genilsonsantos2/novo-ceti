import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({ ausentes: 0, ativas: 0, atrasos: 0 });
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchLogs();

    // Real-time subscription
    const accessLogsSubscription = supabase
      .channel('public:access_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'access_logs' }, () => {
        fetchStats();
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(accessLogsSubscription);
    };
  }, []);

  const fetchStats = async () => {
    // Busca logs de hoje para calcular quem saiu e não voltou hoje
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Simplificado para o MVP: Ativas
    const { data: ativasData } = await supabase
      .from('student_authorizations')
      .select('*')
      .eq('status', 'ACTIVE');
      
    // Count atrasos locally
    let lateCount = 0;
    const now = new Date();
    const currentTimeString = now.toLocaleTimeString('pt-BR', { hour12: false }); // "14:30:00"
    
    if (ativasData) {
      ativasData.forEach((auth: any) => {
         // end_time format is typically "HH:MM:SS" or "HH:MM"
         if (auth.end_time && auth.end_time < currentTimeString) {
            lateCount++;
         }
      });
    }
    
    // Para ausentes, usar count de logs de saídas do dia (Simplificação)
    const { count: ausentes } = await supabase
      .from('access_logs')
      .select('*', { count: 'exact' })
      .eq('type', 'OUT')
      .gte('timestamp', today.toISOString());
    
    setStats({
      ausentes: ausentes || 0,
      ativas: ativasData?.length || 0,
      atrasos: lateCount
    });
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('access_logs')
      .select('*, students(*)')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) console.error(error);
    else setLogs(data || []);
    setLoading(false);
  };

  return (
    <div className="flex-1 px-6 md:px-10 py-8 pb-32 min-h-screen">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 opacity-70">Painel Administrativo</p>
          <h2 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight">Monitor de Saídas</h2>
          <p className="text-on-surface-variant font-body mt-1">Visão em tempo real do tráfego discente autorizado.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={async () => {
              const { error } = await supabase.from('access_logs').insert({
                student_id: (await supabase.from('students').select('id').limit(1).single()).data?.id,
                type: 'OUT',
                notes: 'LOG DE TESTE SISTEMA'
              });
              if (error) alert('Erro no Banco: ' + error.message);
              else {
                alert('Registro de teste OK! Se não aparecer no painel, o problema é o filtro de data.');
                fetchStats();
                fetchLogs();
              }
            }}
            className="glass-card px-4 py-3 rounded-2xl flex items-center gap-2 text-xs font-bold text-logo-orange hover:bg-logo-orange/10 transition-all"
          >
            <span className="material-symbols-outlined text-sm">bug_report</span>
            Testar Banco
          </button>
          <Link 
            to="/lunch-report"
            className="glass-card px-6 py-3 rounded-2xl flex items-center gap-2 text-sm font-bold text-primary hover:scale-[1.02] transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-base">restaurant</span>
            Relatório de Almoço
          </Link>
          <Link 
            to="/daily-access-report"
            className="glass-card px-6 py-3 rounded-2xl flex items-center gap-2 text-sm font-bold text-secondary hover:scale-[1.02] transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-base">today</span>
            Relatório do Dia
          </Link>
          <div className="glass-card px-5 py-3 rounded-2xl flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-logo-green animate-pulse"></span>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Ao Vivo</span>
          </div>
        </div>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-card rounded-[2rem] p-8 flex flex-col justify-between h-48 group hover:scale-[1.02] transition-all duration-500 border-l-4 border-l-logo-blue">
          <div className="flex justify-between items-start">
            <div className="w-14 h-14 rounded-2xl bg-logo-blue/10 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-logo-blue/10 transition-all duration-500">
              <span className="material-symbols-outlined text-logo-blue text-2xl">directions_walk</span>
            </div>
            <span className="text-outline text-[10px] font-bold uppercase tracking-widest">Hoje</span>
          </div>
          <div>
            <p className="text-5xl font-headline font-extrabold text-logo-blue">{stats.ausentes}</p>
            <p className="text-on-surface-variant text-sm font-medium mt-1">Saídas Registradas</p>
          </div>
        </div>

        <div className="glass-card rounded-[2rem] p-8 flex flex-col justify-between h-48 group hover:scale-[1.02] transition-all duration-500 border-l-4 border-l-logo-green">
          <div className="flex justify-between items-start">
            <div className="w-14 h-14 rounded-2xl bg-logo-green/10 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-logo-green/10 transition-all duration-500">
              <span className="material-symbols-outlined text-logo-green text-2xl">verified_user</span>
            </div>
            <span className="text-outline text-[10px] font-bold uppercase tracking-widest">Válidas</span>
          </div>
          <div>
            <p className="text-5xl font-headline font-extrabold text-logo-green">{stats.ativas}</p>
            <p className="text-on-surface-variant text-sm font-medium mt-1">Autorizações Ativas</p>
          </div>
        </div>

        <div className="glass-card rounded-[2rem] p-8 flex flex-col justify-between h-48 group hover:scale-[1.02] transition-all duration-500 border-l-4 border-l-logo-red">
          <div className="flex justify-between items-start">
            <div className="w-14 h-14 rounded-2xl bg-logo-red/10 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-logo-red/10 transition-all duration-500">
              <span className="material-symbols-outlined text-logo-red text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>warning</span>
            </div>
            <span className="text-logo-red text-[10px] font-bold uppercase tracking-widest animate-pulse">Atenção</span>
          </div>
          <div>
            <p className="text-5xl font-headline font-extrabold text-logo-red">{stats.atrasos}</p>
            <p className="text-on-surface-variant text-sm font-medium mt-1">Retornos Atrasados</p>
          </div>
        </div>
      </div>

      {/* Access Logs List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-headline font-bold text-xl text-on-surface">Atividade Recente</h3>
          <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Últimos 10</span>
        </div>
        {loading ? (
          <div className="glass-card rounded-[2rem] p-10 text-center">
            <span className="material-symbols-outlined text-4xl text-outline animate-spin mb-4 block">progress_activity</span>
            <p className="text-outline font-medium">Carregando dados...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="glass-card rounded-[2rem] p-10 text-center border-2 border-dashed border-outline-variant/50">
            <span className="material-symbols-outlined text-5xl text-outline/30 mb-4 block">inbox</span>
            <p className="text-outline font-medium">Nenhuma atividade registrada hoje.</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="glass-card rounded-2xl p-5 flex items-center gap-5 group hover:scale-[1.005] transition-all duration-300">
              <div className="relative">
                <img 
                  src={log.students?.photo_url || "https://via.placeholder.com/150"} 
                  className="w-12 h-12 rounded-xl object-cover ring-2 ring-white shadow-sm"
                  alt="Foto"
                />
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${log.type === 'OUT' ? 'bg-logo-red' : 'bg-logo-green'}`}></div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-headline font-bold text-on-surface text-sm truncate">{log.students?.full_name}</h4>
                <p className="text-[11px] text-outline font-medium truncate">
                  #{log.students?.enrollment_id} • {log.students?.grade}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                  log.type === 'OUT' ? 'bg-logo-red/10 text-logo-red' : 'bg-logo-green/10 text-logo-green'
                }`}>
                  <span className="material-symbols-outlined text-xs">{log.type === 'OUT' ? 'logout' : 'login'}</span>
                  {log.type === 'OUT' ? 'Saída' : 'Entrada'}
                </span>
                <p className="text-xs font-bold text-on-surface mt-1.5">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
