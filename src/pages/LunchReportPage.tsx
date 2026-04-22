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
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-20 h-20 bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center">
              <img src="/ceti-logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase">CETI - Nova Itarana</h2>
              <p className="text-white/60 font-bold text-xs uppercase tracking-[0.2em] mt-1">Colégio Estadual de Tempo Integral</p>
              <div className="inline-block mt-3 px-3 py-1 bg-amber-500/20 rounded-full border border-amber-500/30">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Controle de Almoço Externo</span>
              </div>
            </div>
          </div>
          <div className="text-right relative z-10">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Data do Relatório</p>
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
                    <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">Identificação</th>
                    <th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">Saída (12:00)</th>
                    <th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">Retorno (13:00)</th>
                    <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">Observação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-800 text-sm">{student.full_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] text-gray-400 font-mono tracking-tight">RM: {student.enrollment_id}</div>
                        <div className="text-[10px] text-gray-400 font-mono tracking-tight">CPF: {student.cpf || '---'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-9 h-9 border-2 border-gray-200 rounded-xl mx-auto"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-9 h-9 border-2 border-gray-200 rounded-xl mx-auto"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 border-b border-gray-100 w-full min-w-[120px]"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {Object.keys(studentsByGrade).length === 0 && (
            <div className="py-32 text-center">
               <span className="material-symbols-outlined text-5xl text-gray-200 block mb-4">restaurant_menu</span>
               <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum aluno autorizado para almoço externo</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-10 py-16 border-t-2 border-gray-100">
          <div className="grid grid-cols-2 gap-32">
            <div className="text-center">
              <div className="h-px bg-gray-400 mb-3 w-full"></div>
              <p className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Responsável pela Portaria</p>
              <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">Conferência de Saída e Retorno</p>
            </div>
            <div className="text-center">
              <div className="h-px bg-gray-400 mb-3 w-full"></div>
              <p className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Visto da Direção / Coordenação</p>
              <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">CETI - Unidade Nova Itarana</p>
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
