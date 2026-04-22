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

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white md:bg-gray-50 p-0 md:p-8">
      {/* Action Bar */}
      <div className="max-w-[210mm] mx-auto mb-8 flex justify-between items-center print:hidden px-4">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">Relatório Geral de Saída</h1>
          <p className="text-on-surface-variant font-medium">Controle total de alunos autorizados</p>
        </div>
        <button onClick={handlePrint} className="bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-all">
          <span className="material-symbols-outlined">print</span>
          Imprimir A4
        </button>
      </div>

      {/* Report Sheet */}
      <div 
        className="max-w-[210mm] mx-auto bg-white print:shadow-none shadow-xl border border-gray-100 print:border-none rounded-[2rem] overflow-hidden"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        {/* Header */}
        <div className="bg-[#001228] text-white px-10 py-10 flex justify-between items-center relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-20 h-20 bg-white p-2 rounded-xl flex items-center justify-center shadow-lg">
              <img src="/ceti-logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase leading-tight tracking-tighter">CETI - Nova Itarana</h2>
              <p className="text-white/60 font-bold text-[10px] uppercase tracking-[0.2em]">Colégio Estadual de Tempo Integral</p>
              <p className="text-[10px] font-black uppercase bg-white/10 px-4 py-1 rounded-full mt-2 inline-block">Relatório Oficial de Acessos</p>
            </div>
          </div>
          <div className="text-right relative z-10">
            <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mb-1">Data de Emissão</p>
            <p className="text-xl font-black text-white">{today}</p>
          </div>
        </div>

        {/* Info Bar */}
        <div className="bg-gray-50 border-b-2 border-gray-100 px-10 py-4 flex justify-between items-center">
          <div className="flex gap-8">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-500 uppercase">Alunos:</span>
              <span className="text-base font-black text-primary">{students.length}</span>
            </div>
          </div>
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Documento Administrativo</div>
        </div>

        {/* Report Table */}
        <div className="p-0">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-gray-700 border-b-2 border-gray-300">Dados do Aluno</th>
                <th className="px-8 py-5 text-center text-[10px] font-black uppercase text-gray-700 border-b-2 border-gray-300">Série</th>
                <th className="px-8 py-5 text-center text-[10px] font-black uppercase text-gray-700 border-b-2 border-gray-300">Portão</th>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-gray-700 border-b-2 border-gray-300">Assinatura / Observações</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-gray-100 break-inside-avoid">
                  <td className="px-8 py-5">
                    <div className="font-black text-black text-base uppercase leading-tight">{student.full_name}</div>
                    <div className="text-[9px] text-gray-500 font-bold mt-1">RM: {student.enrollment_id}</div>
                  </td>
                  <td className="px-4 py-5 text-center">
                    <span className="px-3 py-1 bg-gray-100 rounded text-[10px] font-black text-gray-950 uppercase">{student.grade}</span>
                  </td>
                  <td className="px-4 py-5 text-center">
                    <div className="flex justify-center gap-2">
                      <div className="w-7 h-7 border border-gray-400 rounded"></div>
                      <div className="w-7 h-7 border border-gray-400 rounded"></div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="h-7 border-b-2 border-gray-200 w-full min-w-[200px]"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-10 py-16 border-t-2 border-gray-200 mt-10">
          <div className="grid grid-cols-2 gap-24">
            <div className="text-center">
              <div className="h-0.5 bg-black mb-2 w-full"></div>
              <p className="text-[11px] font-black text-black uppercase">Responsável pela Portaria</p>
            </div>
            <div className="text-center">
              <div className="h-0.5 bg-black mb-2 w-full"></div>
              <p className="text-[11px] font-black text-black uppercase">Direção Geral</p>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; margin: 0; padding: 0; width: 100% !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print\\:hidden { display: none !important; }
          @page { margin: 1cm; size: A4; }
          .break-inside-avoid { break-inside: avoid !important; }
          .max-w-\\[210mm\\] { width: 100% !important; max-width: 100% !important; margin: 0 !important; border: none !important; }
          td, th, p, h2, h3 { color: black !important; }
          .bg-\\[\\#001228\\] { background-color: #001228 !important; color: white !important; }
        }
      `}} />
    </div>
  );
};
