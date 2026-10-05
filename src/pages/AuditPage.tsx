import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuditLogRecord {
  id: string;
  process_id: string | null;
  action: string;
  details: Record<string, any> | null;
  operator_name: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  PROCESSO_ABERTO: 'Processo aberto',
  STATUS_ALTERADO: 'Status alterado',
  PROCESSO_EXCLUIDO: 'Processo excluído',
};

const formatValue = (value: any): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(item => formatValue(item)).join(', ');
  if (typeof value === 'object') return Object.entries(value)
    .map(([key, item]) => `${key}: ${formatValue(item)}`)
    .join(' • ');
  return String(value);
};

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('TODOS');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('workflow_audit_logs')
      .select('id, process_id, action, details, operator_name, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar auditoria:', error);
      setLogs([]);
      setLoading(false);
      return;
    }

    setLogs((data || []) as AuditLogRecord[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();

    const auditSubscription = supabase
      .channel('public:workflow_audit_watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_audit_logs' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(auditSubscription);
    };
  }, []);

  const actionOptions = useMemo(() => {
    const uniqueActions = Array.from(new Set(logs.map(log => log.action)));
    return ['TODOS', ...uniqueActions];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const isoDate = log.created_at.slice(0, 10);
      const matchesStart = !startDate || isoDate >= startDate;
      const matchesEnd = !endDate || isoDate <= endDate;
      const matchesAction = actionFilter === 'TODOS' || log.action === actionFilter;

      const haystack = [
        log.action,
        log.operator_name,
        log.process_id,
        log.details ? JSON.stringify(log.details) : '',
      ].join(' ').toLowerCase();

      const matchesSearch = !search || haystack.includes(search.toLowerCase());

      return matchesStart && matchesEnd && matchesAction && matchesSearch;
    });
  }, [logs, search, actionFilter, startDate, endDate]);

  return (
    <div className="flex-1 px-4 py-6 md:px-10 md:py-10 pb-32 min-h-screen">
      <header className="mb-8 rounded-[2rem] bg-[#071b33] px-6 py-7 text-white shadow-2xl shadow-[#071b33]/20 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d5ae68]">Controle interno</p>
            <h1 className="mt-2 font-headline text-3xl font-extrabold">Auditoria de ações</h1>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-blue-50">
            {logs.length} registros no histórico
          </div>
        </div>
      </header>

      <section className="glass-card rounded-[2rem] p-4 md:p-6 mb-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <label className="flex flex-col gap-2 text-sm font-semibold text-on-surface-variant">
            Buscar
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Operador, ação, detalhes..."
              className="rounded-xl border border-primary/10 bg-white/80 px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold text-on-surface-variant">
            Ação
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="rounded-xl border border-primary/10 bg-white/80 px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
            >
              {actionOptions.map(option => (
                <option key={option} value={option}>{option === 'TODOS' ? 'Todas' : ACTION_LABELS[option] || option}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold text-on-surface-variant">
            Início
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-xl border border-primary/10 bg-white/80 px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold text-on-surface-variant">
            Fim
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="rounded-xl border border-primary/10 bg-white/80 px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
            />
          </label>
        </div>
      </section>

      <section className="glass-card rounded-[2rem] p-4 md:p-6 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-8 text-center text-on-surface-variant">
            Nenhuma ação encontrada para esse filtro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-primary/10 text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant">
                  <th className="px-3 py-3">Data</th>
                  <th className="px-3 py-3">Operador</th>
                  <th className="px-3 py-3">Ação</th>
                  <th className="px-3 py-3">Processo</th>
                  <th className="px-3 py-3">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id} className="border-b border-primary/5 align-top text-sm text-on-surface">
                    <td className="px-3 py-3 align-top whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-3 py-3 align-top whitespace-nowrap font-semibold">
                      {log.operator_name || 'Sistema'}
                    </td>
                    <td className="px-3 py-3 align-top whitespace-nowrap">
                      <span className="rounded-full bg-primary/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                        {ACTION_LABELS[log.action] || log.action.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top whitespace-nowrap">
                      {log.details?.process_number || log.process_id || '-'}
                    </td>
                    <td className="px-3 py-3 align-top max-w-xl">
                      <div className="text-xs leading-relaxed text-on-surface-variant">
                        {formatValue(log.details)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
