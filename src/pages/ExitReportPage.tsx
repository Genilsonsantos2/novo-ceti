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

  if (loading) return null;

  return (
    <div className="min-h-screen bg-white md:bg-gray-50 p-0 md:p-8 print:p-0 print:min-h-0">
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden px-4">
        <h1 className="text-xl font-black text-primary uppercase">Relatório Geral</h1>
        <button onClick={handlePrint} className="bg-primary text-white px-6 py-2 rounded-xl font-bold">Imprimir</button>
      </div>

      <div className="max-w-[210mm] mx-auto bg-white print:shadow-none shadow-xl border border-gray-100 print:border-none rounded-xl overflow-hidden" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        <div className="bg-[#001228] text-white px-8 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="/ceti-logo.png" alt="Logo" className="w-14 h-14 bg-white p-1 rounded-lg" />
            <div>
              <h2 className="text-xl font-black uppercase">CETI - Nova Itarana</h2>
              <p className="text-white/60 text-[9px] font-bold uppercase">Relatório Oficial de Acessos</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-black">{today}</p>
          </div>
        </div>

        <div className="p-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-[9px] font-black uppercase text-gray-700 border-b">Aluno</th>
                <th className="px-4 py-3 text-center text-[9px] font-black uppercase text-gray-700 border-b">Turma</th>
                <th className="px-4 py-3 text-center text-[9px] font-black uppercase text-gray-700 border-b">Acesso</th>
                <th className="px-4 py-3 text-left text-[9px] font-black uppercase text-gray-700 border-b">Assinatura</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-gray-50 break-inside-avoid">
                  <td className="px-4 py-3">
                    <div className="font-black text-black text-sm uppercase">{student.full_name}</div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className="text-[10px] font-black">{student.grade}</span>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <div className="w-6 h-6 border border-gray-400 rounded"></div>
                      <div className="w-6 h-6 border border-gray-400 rounded"></div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-6 border-b border-gray-200 w-full min-w-[150px]"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-50 px-10 py-8 border-t mt-4 text-center">
          <div className="grid grid-cols-2 gap-20">
            <div className="border-t border-black pt-1 text-[10px] font-black uppercase tracking-widest">Portaria</div>
            <div className="border-t border-black pt-1 text-[10px] font-black uppercase tracking-widest">Direção</div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; margin: 0; padding: 0 !important; width: 100% !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print\\:hidden { display: none !important; }
          @page { margin: 0.5cm; size: A4; }
          .max-w-\\[210mm\\] { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
          td, th, p, h2, h3 { color: black !important; }
          .bg-\\[\\#001228\\] { background-color: #001228 !important; color: white !important; }
        }
      `}} />
    </div>
  );
};
