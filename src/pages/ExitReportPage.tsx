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
          <p className="text-on-surface-variant font-medium">Controle de portaria com alta legibilidade</p>
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
            <div className="w-24 h-24 bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center">
              <img src="/ceti-logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tighter uppercase">CETI - Nova Itarana</h2>
              <p className="text-white/60 font-bold text-sm uppercase tracking-[0.2em] mt-1">Colégio Estadual de Tempo Integral</p>
              <div className="inline-block mt-3 px-4 py-1.5 bg-white/10 rounded-full border border-white/10">
                <span className="text-[12px] font-black uppercase tracking-widest text-primary-fixed">RELATÓRIO OFICIAL DE ACESSOS</span>
              </div>
            </div>
          </div>
          <div className="text-right relative z-10">
            <p className="text-white/40 text-[11px] font-black uppercase tracking-widest mb-1">Data do Relatório</p>
            <p className="text-2xl font-black text-white">{today}</p>
          </div>
        </div>

        {/* Info Bar */}
        <div className="bg-gray-50/50 border-b-2 border-gray-100 px-10 py-6 flex justify-between items-center">
          <div className="flex gap-12">
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-black text-gray-500 uppercase tracking-widest">Total de Alunos:</span>
              <span className="text-xl font-black text-primary">{students.length}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-black text-gray-500 uppercase tracking-widest">Unidade:</span>
              <span className="text-xl font-black text-gray-900">Nova Itarana</span>
            </div>
          </div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Controle de Portaria v2.0</div>
        </div>

        {/* Report Table */}
        <div className="p-0">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/30">
                <th className="px-10 py-6 text-left text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 border-b-2 border-gray-100">Dados do Aluno</th>
                <th className="px-10 py-6 text-left text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 border-b-2 border-gray-100">Série/Turma</th>
                <th className="px-10 py-6 text-center text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 border-b-2 border-gray-100">Saída</th>
                <th className="px-10 py-6 text-center text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 border-b-2 border-gray-100">Entrada</th>
                <th className="px-10 py-6 text-left text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 border-b-2 border-gray-100">Assinatura / Observações</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b-2 border-gray-50 hover:bg-gray-50/50 transition-colors break-inside-avoid">
                  <td className="px-10 py-8">
                    <div className="font-black text-gray-900 text-lg uppercase tracking-tight">{student.full_name}</div>
                    <div className="text-xs text-gray-500 font-bold mt-1 tracking-wider">RM: {student.enrollment_id} | CPF: {student.cpf || '---'}</div>
                  </td>
                  <td className="px-10 py-8">
                    <span className="px-4 py-2 bg-gray-100 rounded-lg text-[12px] font-black text-gray-900 uppercase">{student.grade}</span>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <div className="w-12 h-12 border-2 border-gray-400 rounded-xl mx-auto flex items-center justify-center font-black text-gray-900">
                      {/* Space for doorman to mark X */}
                    </div>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <div className="w-12 h-12 border-2 border-gray-400 rounded-xl mx-auto flex items-center justify-center font-black text-gray-900">
                      {/* Space for doorman to mark X */}
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="h-10 border-b-2 border-gray-200 w-full min-w-[250px]"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-10 py-20 border-t-4 border-gray-100">
          <div className="grid grid-cols-2 gap-32">
            <div className="text-center">
              <div className="h-0.5 bg-gray-900 mb-4 w-full"></div>
              <p className="text-[12px] font-black text-gray-900 uppercase tracking-[0.3em]">Responsável pela Portaria</p>
              <p className="text-[9px] text-gray-500 font-bold uppercase mt-2">Conferência de Documentos e Acesso</p>
            </div>
            <div className="text-center">
              <div className="h-0.5 bg-gray-900 mb-4 w-full"></div>
              <p className="text-[12px] font-black text-gray-900 uppercase tracking-[0.3em]">Direção Geral CETI</p>
              <p className="text-[9px] text-gray-500 font-bold uppercase mt-2">Validação e Controle Administrativo</p>
            </div>
          </div>
          <div className="mt-20 flex justify-between items-center opacity-30">
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.5em]">CETI ACCESS v2.0 - SISTEMA DE GESTÃO INTELIGENTE</p>
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.5em]">GERADO EM: {format(new Date(), "HH:mm:ss")}</p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white; margin: 0; padding: 0; color: black !important; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          @page { margin: 1cm; size: A4; }
          .break-inside-avoid { break-inside: avoid; }
          td, th, h2, h3, p { color: black !important; }
          .bg-gray-50\\/30 { background-color: #f9fafb !important; }
        }
      `}} />
    </div>
  );
};
