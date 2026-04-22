import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const LunchReportPage: React.FC = () => {
  const [studentsByGrade, setStudentsByGrade] = useState<Record<string, any[]>>({});
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
      const grouped = (data || []).reduce((acc: Record<string, any[]>, student: any) => {
        const grade = student.grade || 'Sem Turma';
        if (!acc[grade]) acc[grade] = [];
        acc[grade].push(student);
        return acc;
      }, {});
      setStudentsByGrade(grouped);
    }
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
    <div className="min-h-screen bg-white p-0 md:p-8">
      {/* Action Bar */}
      <div className="max-w-5xl mx-auto mb-8 flex justify-between items-center print:hidden px-4">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">Relatório de Almoço</h1>
          <p className="text-on-surface-variant font-medium">Organizado por turma para controle da portaria</p>
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
              <h2 className="text-2xl font-black tracking-tighter">CETI - Nova Itarana</h2>
              <p className="text-white/60 font-bold text-xs uppercase tracking-[0.2em] mt-1">Colégio Estadual de Tempo Integral</p>
              <div className="inline-block mt-3 px-3 py-1 bg-white/10 rounded-full border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Controle de Almoço Externo</span>
              </div>
            </div>
          </div>
          <div className="text-right relative z-10">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Documento Gerado em</p>
            <p className="text-xl font-black text-white">{today}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-10 space-y-12">
          {Object.entries(studentsByGrade).map(([grade, students]) => (
            <div key={grade} className="break-inside-avoid">
              <div className="flex items-center gap-4 mb-4">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">{grade}</h3>
                <div className="flex-1 h-[2px] bg-gray-100"></div>
                <span className="text-[10px] font-black text-gray-400 uppercase">{students.length} Alunos</span>
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">Nome do Aluno</th>
                    <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">RM</th>
                    <th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">Saída (12:00)</th>
                    <th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">Retorno (13:00)</th>
                    <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">Observação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-3 font-bold text-gray-800 text-sm">{student.full_name}</td>
                      <td className="px-6 py-3 font-mono text-xs text-gray-400">{student.enrollment_id}</td>
                      <td className="px-6 py-3">
                        <div className="w-8 h-8 border-2 border-gray-200 rounded-lg mx-auto"></div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="w-8 h-8 border-2 border-gray-200 rounded-lg mx-auto"></div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="h-6 border-b border-gray-100 w-full min-w-[120px]"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-10 py-12 border-t-2 border-gray-100">
          <div className="grid grid-cols-2 gap-16">
            <div>
              <div className="h-px bg-gray-300 w-full mb-2"></div>
              <p className="text-center text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Responsável pela Portaria</p>
            </div>
            <div>
              <div className="h-px bg-gray-300 w-full mb-2"></div>
              <p className="text-center text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Direção / Coordenação</p>
            </div>
          </div>
          <div className="mt-12 flex justify-between items-end opacity-30">
            <p className="text-[7px] font-black uppercase tracking-widest">CETI Access System v2.0</p>
            <p className="text-[7px] font-black uppercase tracking-widest">Página {today}</p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white; margin: 0; padding: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          @page { margin: 1cm; size: A4; }
          .break-inside-avoid { break-inside: avoid; }
        }
      `}} />
    </div>
  );
};
