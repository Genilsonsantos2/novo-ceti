import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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
    <div className="flex-1 px-6 md:px-10 py-8 pb-32 bg-surface min-h-screen">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface tracking-tight mb-2">Monitor de Saídas</h2>
          <p className="text-on-surface-variant font-body">Visão em tempo real do tráfego discente autorizado.</p>
        </div>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-surface-container-lowest rounded-[2rem] p-8 flex flex-col justify-between h-48 border-none shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary-fixed">person</span>
            </div>
            <span className="text-outline text-xs font-bold uppercase tracking-widest">Atualmente</span>
          </div>
          <div>
            <p className="text-4xl font-headline font-extrabold text-primary">{stats.ausentes}</p>
            <p className="text-on-surface-variant text-sm font-medium">Estudantes Ausentes</p>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-[2rem] p-8 flex flex-col justify-between h-48 border-none shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-2xl bg-secondary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-on-secondary-fixed">assignment_turned_in</span>
            </div>
            <span className="text-outline text-xs font-bold uppercase tracking-widest">Válidas</span>
          </div>
          <div>
            <p className="text-4xl font-headline font-extrabold text-secondary">{stats.ativas}</p>
            <p className="text-on-surface-variant text-sm font-medium">Autorizações Ativas</p>
          </div>
        </div>

        <div className="bg-error-container rounded-[2rem] p-8 flex flex-col justify-between h-48 border-none shadow-[0px_12px_32px_rgba(25,28,30,0.06)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-on-error-container/5 rounded-full -mr-12 -mt-12"></div>
          <div className="flex justify-between items-start z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/40 backdrop-blur-md flex items-center justify-center">
              <span className="material-symbols-outlined text-on-error-container" style={{fontVariationSettings: "'FILL' 1"}}>warning</span>
            </div>
            <span className="text-on-error-container text-xs font-bold uppercase tracking-widest">Crítico</span>
          </div>
          <div className="z-10">
            <p className="text-4xl font-headline font-extrabold text-on-error-container">{stats.atrasos}</p>
            <p className="text-on-error-container text-sm font-bold">Retornos Atrasados</p>
          </div>
        </div>
      </div>

      {/* Access Logs List */}
      <div className="space-y-6">
        <h3 className="font-headline font-bold text-xl text-on-surface mb-4">Atividade Recente</h3>
        {loading ? (
          <p className="text-center py-10 text-outline">Carregando dados...</p>
        ) : logs.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-[1.5rem] p-10 text-center border-2 border-dashed border-outline-variant">
            <p className="text-outline font-medium">Nenhuma atividade registrada hoje.</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="bg-white rounded-[1.5rem] p-6 flex items-center gap-6 shadow-[0px_12px_32px_rgba(25,28,30,0.04)]">
              <img 
                src={log.students?.photo_url || "https://via.placeholder.com/150"} 
                className="w-14 h-14 rounded-2xl object-cover"
                alt="Foto"
              />
              <div className="flex-1">
                <h4 className="font-headline font-bold text-on-surface">{log.students?.full_name}</h4>
                <p className="text-xs text-outline font-medium">ID: #{log.students?.enrollment_id} • {log.students?.grade}</p>
              </div>
              <div className="text-right">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase ${
                  log.type === 'OUT' ? 'bg-error-container text-on-error-container' : 'bg-tertiary-fixed text-on-tertiary-fixed'
                }`}>
                  {log.type === 'OUT' ? 'Saída' : 'Entrada'}
                </span>
                <p className="text-xs font-bold text-on-surface mt-2">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
