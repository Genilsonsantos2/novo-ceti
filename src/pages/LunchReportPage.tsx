import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const LunchReportPage: React.FC = () => {
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

    if (error) {
      console.error(error);
    } else {
      setStudents(data || []);
    }
    setLoading(false);
  };

  const handlePrint = () => window.print();

  if (loading) return null;

  return (
    <div className="min-h-screen bg-white md:bg-gray-50 p-0 md:p-8 print:p-0 print:min-h-0">
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden px-4">
        <h1 className="text-xl font-black text-primary uppercase">Relatório Almoço</h1>
        <button onClick={handlePrint} className="bg-primary text-white px-6 py-2 rounded-xl font-bold">Imprimir</button>
      </div>

      <div className="max-w-[210mm] mx-auto bg-white print:shadow-none shadow-xl border border-gray-100 print:border-none rounded-xl overflow-hidden relative" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        
        <div className="bg-[#001e40] text-white px-8 py-6 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-4">
            <img src="/ceti-logo.png" alt="Logo" className="h-12 w-12 object-contain bg-white rounded-lg p-1" />
            <div>
              <h2 className="text-[10px] font-bold opacity-60 uppercase tracking-widest leading-none">Governo da Bahia</h2>
              <h1 className="text-xl font-black uppercase leading-tight tracking-tight mt-1">CETI - Nova Itarana</h1>
              <p className="text-white/40 font-bold text-[9px] uppercase tracking-[0.2em] mt-0.5">Colégio Estadual de Tempo Integral</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-black uppercase">Relatório de Almoço</p>
            <p className="text-white/60 text-xs font-bold">{today}</p>
          </div>
        </div>

        <div className="p-6 space-y-8 relative z-10">
          {(Object.entries(
            students.reduce((acc: Record<string, any[]>, student) => {
              const grade = student.grade || 'SEM TURMA';
              if (!acc[grade]) acc[grade] = [];
              acc[grade].push(student);
              return acc;
            }, {})
          ) as [string, any[]][]).map(([grade, gradeStudents]) => (
            <div key={grade} className="break-inside-avoid">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-lg font-black text-gray-950 uppercase bg-gray-50 px-4 py-1.5 rounded-lg border-l-4 border-primary">{grade}</h3>
                <div className="flex-1 h-[1px] bg-gray-200"></div>
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100/50">
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-700 border-b-2 border-gray-200">Aluno</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-gray-700 border-b-2 border-gray-200 w-32">Almoço</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-gray-700 border-b-2 border-gray-200">Assinatura / Visto</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeStudents.map((student) => (
                    <tr key={student.id} className="border-b border-gray-100 break-inside-avoid">
                      <td className="px-4 py-4">
                        <div className="font-black text-black text-sm uppercase leading-none">{student.full_name}</div>
                        <div className="text-[8px] text-gray-400 font-bold mt-1 uppercase">RM: {student.enrollment_id}</div>
                      </td>
                      <td className="px-2 py-4 text-center">
                        <div className="flex justify-center">
                          <div className="w-8 h-8 border-2 border-gray-300 rounded flex items-center justify-center text-[8px] font-black text-gray-300">OK</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-8 border-b border-gray-200 w-full min-w-[200px]"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 px-10 py-12 border-t mt-4 relative z-10">
          <div className="grid grid-cols-2 gap-24">
            <div className="text-center">
              <div className="h-px bg-black mb-2 w-full"></div>
              <p className="text-[10px] font-black uppercase tracking-widest">Responsável Merenda</p>
            </div>
            <div className="text-center">
              <div className="h-px bg-black mb-2 w-full"></div>
              <p className="text-[10px] font-black uppercase tracking-widest">Direção / Coordenação</p>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            width: 100% !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            font-family: Arial, Helvetica, sans-serif !important;
          }
          .print\\:hidden { display: none !important; }
          @page { 
            size: A4 portrait; 
            /* ABNT Margins: Top 3cm, Left 3cm, Right 2cm, Bottom 2cm */
            margin: 30mm 20mm 20mm 30mm !important;
          }
          .max-w-\\[210mm\\] { 
            width: 100% !important; 
            max-width: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important;
            border: none !important; 
            box-shadow: none !important;
          }
          td, th, p, h1, h2, h3 { color: black !important; }
          .bg-\\[\\#001e40\\] { background-color: #001e40 !important; color: white !important; }
          .bg-gray-100 { background-color: #f3f4f6 !important; }
          .break-inside-avoid { break-inside: avoid !important; }
          * { box-sizing: border-box !important; }
        }
      `}} />
    </div>
  );
};

