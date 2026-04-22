import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const ExitReportPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  useEffect(() => {
    fetchAuthorizedStudents();
  }, []);

  const fetchAuthorizedStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('is_authorized', true)
      .order('full_name');

    if (error) console.error(error);
    else setStudents(data || []);
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-0 md:p-8">
      {/* Action Bar (Hidden on print) */}
      <div className="max-w-5xl mx-auto mb-8 flex justify-between items-center print:hidden px-4 md:px-0">
        <div>
          <h1 className="text-2xl font-black text-primary">Relatório de Saída Diária</h1>
          <p className="text-on-surface-variant font-medium">Lista de alunos autorizados para controle da portaria</p>
        </div>
        <button 
          onClick={handlePrint}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-all"
        >
          <span className="material-symbols-outlined">print</span>
          Imprimir Relatório
        </button>
      </div>

      {/* Report Sheet */}
      <div className="max-w-5xl mx-auto bg-white print:shadow-none shadow-xl border border-gray-100 print:border-none rounded-[2rem] overflow-hidden">
        {/* Report Header */}
        <div className="bg-gray-50 border-b-2 border-gray-100 px-10 py-10 flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
              <img src="/ceti-logo.png" alt="CETI Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">CETI - Colégio Estadual de Tempo Integral</h2>
              <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Controle de Saída e Entrada - Portaria</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Data do Relatório</div>
            <div className="text-gray-900 font-black text-lg">{today}</div>
          </div>
        </div>

        {/* Report Table */}
        <div className="p-0">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Aluno</th>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Série/Turma</th>
                <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Saída</th>
                <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Entrada</th>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Assinatura / Obs</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-4">
                    <div className="font-bold text-gray-900 text-sm">{student.full_name}</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">{student.enrollment_id}</div>
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-tight">{student.grade}</span>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <div className="w-8 h-8 border-2 border-gray-200 rounded-lg mx-auto flex items-center justify-center">
                      {/* Space for doorman to mark X */}
                    </div>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <div className="w-8 h-8 border-2 border-gray-200 rounded-lg mx-auto flex items-center justify-center">
                      {/* Space for doorman to mark X */}
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="h-8 border-b border-gray-200 w-full min-w-[150px]"></div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-gray-400 font-medium">
                    Nenhum aluno autorizado encontrado para hoje.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-10 py-10 mt-10 border-t-2 border-gray-100">
          <div className="grid grid-cols-2 gap-20">
            <div className="text-center">
              <div className="h-0.5 bg-gray-200 mb-2 w-full"></div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assinatura do Porteiro de Turno</p>
            </div>
            <div className="text-center">
              <div className="h-0.5 bg-gray-200 mb-2 w-full"></div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Visto da Direção / Coordenação</p>
            </div>
          </div>
          <div className="mt-10 text-center">
            <p className="text-[8px] text-gray-300 font-bold uppercase tracking-[0.3em]">Sistema de Gestão de Acesso CETI - Gerado em {format(new Date(), "HH:mm:ss")}</p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { shadow: none !important; box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          @page { margin: 1cm; }
        }
      `}} />
    </div>
  );
};
