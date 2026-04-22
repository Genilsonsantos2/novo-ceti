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
      .order('grade')
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
          <h1 className="text-2xl font-black text-primary tracking-tight">Relatório de Saída Diária</h1>
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
      <div className="max-w-5xl mx-auto bg-white print:shadow-none shadow-xl border border-gray-100 print:border-none rounded-[2.5rem] overflow-hidden">
        {/* Header */}
        <div className="bg-[#001228] text-white px-10 py-12 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-20 h-20 bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center">
              <img src="/ceti-logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase">CETI - Nova Itarana</h2>
              <p className="text-white/60 font-bold text-xs uppercase tracking-[0.2em] mt-1">Colégio Estadual de Tempo Integral</p>
              <div className="inline-block mt-3 px-3 py-1 bg-white/10 rounded-full border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary-fixed">Relatório Geral de Acessos</span>
              </div>
            </div>
          </div>
          <div className="text-right relative z-10">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Data do Relatório</p>
            <p className="text-xl font-black text-white">{today}</p>
          </div>
        </div>

        {/* Info Bar */}
        <div className="bg-gray-50/50 border-b border-gray-100 px-10 py-4 flex justify-between items-center">
          <div className="flex gap-8">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total de Alunos:</span>
              <span className="text-sm font-black text-primary">{students.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Unidade:</span>
              <span className="text-sm font-black text-gray-700">Nova Itarana</span>
            </div>
          </div>
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Controle de Portaria v2.0</div>
        </div>

        {/* Report Table */}
        <div className="p-0">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/30">
                <th className="px-10 py-5 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Dados do Aluno</th>
                <th className="px-10 py-5 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Série/Turma</th>
                <th className="px-10 py-5 text-center text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Saída</th>
                <th className="px-10 py-5 text-center text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Entrada</th>
                <th className="px-10 py-5 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Assinatura / Observações</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors break-inside-avoid">
                  <td className="px-10 py-5">
                    <div className="font-bold text-gray-900 text-sm">{student.full_name}</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5 tracking-tight">RM: {student.enrollment_id} | CPF: {student.cpf || '---'}</div>
                  </td>
                  <td className="px-10 py-5">
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black text-gray-600 uppercase">{student.grade}</span>
                  </td>
                  <td className="px-10 py-5 text-center">
                    <div className="w-9 h-9 border-2 border-gray-200 rounded-xl mx-auto"></div>
                  </td>
                  <td className="px-10 py-5 text-center">
                    <div className="w-9 h-9 border-2 border-gray-200 rounded-xl mx-auto"></div>
                  </td>
                  <td className="px-10 py-5">
                    <div className="h-8 border-b-2 border-gray-100 w-full min-w-[200px]"></div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-10 py-32 text-center">
                    <span className="material-symbols-outlined text-5xl text-gray-200 block mb-4">person_off</span>
                    <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum aluno autorizado encontrado</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-10 py-16 border-t-2 border-gray-100">
          <div className="grid grid-cols-2 gap-32">
            <div className="text-center">
              <div className="h-px bg-gray-400 mb-3 w-full"></div>
              <p className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Responsável pela Portaria</p>
              <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">Conferência de Documentos e Acesso</p>
            </div>
            <div className="text-center">
              <div className="h-px bg-gray-400 mb-3 w-full"></div>
              <p className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Visto da Direção</p>
              <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">Coordenação Geral CETI</p>
            </div>
          </div>
          <div className="mt-16 flex justify-between items-center opacity-40">
            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-[0.4em]">CETI Access System v2.0</p>
            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-[0.4em]">Gerado em: {format(new Date(), "HH:mm:ss")}</p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white; margin: 0; padding: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { shadow: none !important; box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          @page { margin: 1cm; size: A4; }
          .break-inside-avoid { break-inside: avoid; }
        }
      `}} />
    </div>
  );
};
