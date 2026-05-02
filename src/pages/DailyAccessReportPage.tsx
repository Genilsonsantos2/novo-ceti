import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export const DailyAccessReportPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('access_logs')
      .select('*, students(full_name, enrollment_id, grade, photo_url, exit_type)')
      .gte('timestamp', start.toISOString())
      .order('timestamp', { ascending: true });

    if (error) console.error(error);
    else setLogs(data || []);
    setLoading(false);
  };

  const saidas = logs.filter(l => l.type === 'OUT');
  const entradas = logs.filter(l => l.type === 'IN');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Controls - hidden in print */}
      <div className="print:hidden p-6 bg-white border-b shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1 opacity-70">Relatório</p>
          <h1 className="font-headline font-extrabold text-2xl text-gray-900">Movimentações do Dia</h1>
          <p className="text-sm text-gray-500 mt-1">{today}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            Imprimir Relatório
          </button>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Voltar
          </Link>
        </div>
      </div>

      {/* Printable Document */}
      <div id="daily-report" className="max-w-[210mm] mx-auto bg-white shadow-lg mt-6 mb-12 print:shadow-none print:mt-0 print:mb-0 print:max-w-none">
        <div className="p-10 print:p-[15mm]">
          {/* Header */}
          <div className="text-center mb-8 pb-5 border-b-2 border-gray-900">
            <div className="flex justify-center mb-4">
              <img src="/ceti-logo.png" alt="CETI Logo" className="h-14 w-auto object-contain" />
            </div>
            <h1 className="text-xl font-black uppercase text-gray-900">GOVERNO DO ESTADO DA BAHIA</h1>
            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-widest">SECRETARIA DA EDUCAÇÃO</h2>
            <h3 className="text-base font-black text-primary uppercase mt-1">COLÉGIO ESTADUAL DE TEMPO INTEGRAL DE NOVA ITARANA</h3>
            <div className="mt-4 inline-block px-6 py-2 border-2 border-gray-900 rounded">
              <p className="text-lg font-black uppercase tracking-wider">Relatório de Movimentação Diária</p>
              <p className="text-sm font-bold text-gray-500">{today}</p>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-3xl font-black text-gray-900">{logs.length}</p>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Total de Registros</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl border border-red-100">
              <p className="text-3xl font-black text-red-600">{saidas.length}</p>
              <p className="text-xs font-bold text-red-400 uppercase tracking-wider mt-1">Saídas Registradas</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
              <p className="text-3xl font-black text-green-600">{entradas.length}</p>
              <p className="text-xs font-bold text-green-400 uppercase tracking-wider mt-1">Entradas Registradas</p>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-5xl text-gray-300 animate-spin block mb-3">progress_activity</span>
              <p className="text-gray-400 font-medium">Carregando registros...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
              <span className="material-symbols-outlined text-5xl text-gray-200 block mb-3">inbox</span>
              <p className="text-gray-400 font-medium">Nenhuma movimentação registrada hoje.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-900">
                  <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-gray-900">#</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-gray-900">Horário</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-gray-900">Aluno</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-gray-900">Matrícula</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-gray-900">Turma</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-gray-900">Tipo</th>
                  <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-gray-900">Autorização</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={log.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="py-2.5 px-3 text-xs text-gray-400 font-mono">{index + 1}</td>
                    <td className="py-2.5 px-3 text-sm font-bold text-gray-900 font-mono">
                      {format(new Date(log.timestamp), 'HH:mm')}
                    </td>
                    <td className="py-2.5 px-3 text-sm font-bold text-gray-900">{log.students?.full_name || '—'}</td>
                    <td className="py-2.5 px-3 text-xs text-gray-500 font-mono">{log.students?.enrollment_id || '—'}</td>
                    <td className="py-2.5 px-3 text-xs text-gray-600">{log.students?.grade || '—'}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        log.type === 'OUT' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {log.type === 'OUT' ? '↑ Saída' : '↓ Entrada'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">
                        {log.students?.exit_type === 'lunch' ? 'Almoço' : 
                         log.students?.exit_type === 'gym' ? 'Academia' : 
                         log.students?.exit_type === 'both' ? 'Almoço+Acad' : 
                         log.students?.exit_type === 'term' ? 'Termo Assinado' : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Footer */}
          <div className="mt-10 pt-4 border-t border-gray-200 flex justify-between items-center">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">
              Sistema CETI v2.7 • Relatório gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
            </p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">
              Página 1 de 1
            </p>
          </div>

          {/* Signature line */}
          <div className="mt-12 grid grid-cols-2 gap-16 print:mt-8">
            <div className="text-center">
              <div className="border-t border-gray-900 pt-2">
                <p className="text-xs font-black uppercase text-gray-900">Porteiro(a) Responsável</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest">Assinatura</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-900 pt-2">
                <p className="text-xs font-black uppercase text-gray-900">Direção CETI</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest">Ciente</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 portrait; margin: 0 !important; }
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
          .print\\:hidden { display: none !important; }
          #daily-report { max-width: 100% !important; margin: 0 !important; box-shadow: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}} />
    </div>
  );
};
