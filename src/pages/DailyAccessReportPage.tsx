import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export const DailyAccessReportPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [groupByGrade, setGroupByGrade] = useState(false);

  const displayDate = format(parseISO(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  useEffect(() => {
    fetchLogs();
  }, [selectedDate]);

  const fetchLogs = async () => {
    setLoading(true);
    const start = startOfDay(parseISO(selectedDate));
    const end = endOfDay(parseISO(selectedDate));

    const { data, error } = await supabase
      .from('access_logs')
      .select('*, students(full_name, enrollment_id, grade, photo_url)')
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString())
      .order('timestamp', { ascending: true });

    if (error) console.error(error);
    else setLogs(data || []);
    setLoading(false);
  };

  const filteredLogs = logs.filter(log => 
    !selectedGrade || log.students?.grade === selectedGrade
  );

  const saidas = filteredLogs.filter(l => l.type === 'OUT');
  const entradas = filteredLogs.filter(l => l.type === 'IN');

  const grades = Array.from(new Set(logs.map(l => l.students?.grade).filter(Boolean))).sort();

  const groupedLogs = groupByGrade 
    ? filteredLogs.reduce((acc: Record<string, any[]>, log) => {
        const grade = log.students?.grade || 'Sem Turma';
        if (!acc[grade]) acc[grade] = [];
        acc[grade].push(log);
        return acc;
      }, {})
    : { 'Geral': filteredLogs };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Controls - hidden in print */}
      <div className="print:hidden p-6 bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary text-sm">analytics</span>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Relatório de Movimentação</p>
            </div>
            <h1 className="font-headline font-extrabold text-3xl text-gray-900 tracking-tight">Histórico de Acessos</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Consulte e organize os registros de entrada e saída</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Selecionar Data</label>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Filtrar por Turma</label>
              <select 
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer min-w-[160px]"
              >
                <option value="">Todas as Turmas</option>
                {grades.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end h-full pt-6">
              <button
                onClick={() => setGroupByGrade(!groupByGrade)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 border ${
                  groupByGrade 
                    ? 'bg-primary/10 border-primary text-primary' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{groupByGrade ? 'group_work' : 'list'}</span>
                {groupByGrade ? 'Agrupado por Turma' : 'Lista Única'}
              </button>
            </div>

            <div className="flex items-end h-full pt-6 gap-3">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                Imprimir
              </button>
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">close</span>
                Fechar
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Document */}
      <div id="daily-report" className="max-w-[210mm] mx-auto bg-white shadow-xl mt-8 mb-12 print:shadow-none print:mt-0 print:mb-0 print:max-w-none rounded-[2rem] overflow-hidden border border-gray-100 print:border-none">
        <div className="p-10 print:p-[10mm]">
          {/* Header */}
          <div className="text-center mb-10 pb-6 border-b-2 border-gray-900">
            <div className="flex justify-center mb-6">
              <img src="/ceti-logo.png" alt="CETI Logo" className="h-20 w-auto object-contain" />
            </div>
            <h1 className="text-xl font-black uppercase text-gray-900 tracking-tight">GOVERNO DO ESTADO DA BAHIA</h1>
            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-widest mt-1">SECRETARIA DA EDUCAÇÃO</h2>
            <h3 className="text-base font-black text-primary uppercase mt-1">COLÉGIO ESTADUAL DE TEMPO INTEGRAL DE NOVA ITARANA</h3>
            
            <div className="mt-6 inline-flex flex-col items-center">
              <div className="px-8 py-2 bg-gray-900 text-white rounded-lg">
                <p className="text-lg font-black uppercase tracking-widest">Relatório de Movimentação</p>
              </div>
              <p className="text-sm font-black text-gray-900 mt-2 uppercase tracking-widest">{displayDate}</p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-6 mb-10">
            <div className="text-center p-6 bg-gray-50 rounded-[1.5rem] border border-gray-100">
              <p className="text-4xl font-black text-gray-900">{filteredLogs.length}</p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Total de Registros</p>
            </div>
            <div className="text-center p-6 bg-red-50 rounded-[1.5rem] border border-red-100">
              <p className="text-4xl font-black text-red-600">{saidas.length}</p>
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mt-2">Saídas</p>
            </div>
            <div className="text-center p-6 bg-green-50 rounded-[1.5rem] border border-green-100">
              <p className="text-4xl font-black text-green-600">{entradas.length}</p>
              <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mt-2">Entradas</p>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-6xl text-gray-200 animate-spin block mb-4">progress_activity</span>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Sincronizando registros...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-24 border-2 border-dashed border-gray-100 rounded-[2rem]">
              <span className="material-symbols-outlined text-7xl text-gray-200 block mb-4">history</span>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Nenhum registro encontrado para este filtro.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {(Object.entries(groupedLogs) as [string, any[]][]).map(([groupName, groupItems]) => (
                <div key={groupName} className="break-inside-avoid">
                  {groupByGrade && (
                    <div className="flex items-center gap-4 mb-4">
                      <h4 className="text-base font-black text-white bg-gray-900 px-5 py-1.5 rounded-full uppercase tracking-wider">{groupName}</h4>
                      <div className="flex-1 h-[2px] bg-gray-100"></div>
                      <span className="text-[10px] font-black text-gray-400 uppercase">{groupItems.length} registros</span>
                    </div>
                  )}
                  
                  <table className="w-full text-left border-collapse overflow-hidden rounded-xl">
                    <thead>
                      <tr className="bg-gray-900 text-white">
                        <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest w-16">Horário</th>
                        <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest">Aluno</th>
                        {!groupByGrade && <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest">Turma</th>}
                        <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest">Matrícula</th>
                        <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest w-24">Tipo</th>
                        <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest">Observação</th>
                      </tr>
                    </thead>
                    <tbody className="border-x border-b border-gray-100">
                      {groupItems.map((log, idx) => (
                        <tr key={log.id} className={`border-b border-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                          <td className="py-3.5 px-4 text-xs font-black text-gray-900 font-mono">
                            {format(parseISO(log.timestamp), 'HH:mm')}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-black text-gray-900 text-sm uppercase leading-none">{log.students?.full_name || '—'}</div>
                          </td>
                          {!groupByGrade && (
                            <td className="py-3.5 px-4 text-xs font-bold text-gray-600 uppercase tracking-tight">
                              {log.students?.grade || '—'}
                            </td>
                          )}
                          <td className="py-3.5 px-4 text-[10px] text-gray-400 font-black font-mono tracking-tighter">
                            {log.students?.enrollment_id || '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border ${
                              log.type === 'OUT' 
                                ? 'bg-red-50 text-red-600 border-red-100' 
                                : 'bg-green-50 text-green-600 border-green-100'
                            }`}>
                              {log.type === 'OUT' ? '↑ SAÍDA' : '↓ ENTRADA'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-[10px] font-bold text-gray-500 uppercase leading-tight italic">
                            {log.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* Signatures */}
          <div className="mt-16 pt-12 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-20">
              <div className="text-center">
                <div className="h-px bg-gray-900 mb-3 w-full"></div>
                <p className="text-[11px] font-black uppercase text-gray-900">Responsável pela Portaria</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-1">Carimbo e Assinatura</p>
              </div>
              <div className="text-center">
                <div className="h-px bg-gray-900 mb-3 w-full"></div>
                <p className="text-[11px] font-black uppercase text-gray-900">Direção Geral / Coordenação</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-1">Visto da Direção</p>
              </div>
            </div>
            
            <div className="mt-16 flex justify-between items-center opacity-40 grayscale">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">
                PASSE CETI v3.0 • Sistema de Gestão de Fluxo Escolar • {format(new Date(), "dd/MM/yyyy HH:mm")}
              </p>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">
                Página 01 / 01
              </p>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 portrait; margin: 15mm !important; }
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
          .print\\:hidden { display: none !important; }
          #daily-report { 
            max-width: 100% !important; 
            margin: 0 !important; 
            box-shadow: none !important; 
            border: none !important;
            border-radius: 0 !important;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}} />
    </div>
  );
};
