import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProvisionalStudent {
  name: string;
  grade: string;
}

export const ProvisionalExitReportPage: React.FC = () => {
  const [students, setStudents] = useState<ProvisionalStudent[]>(() => {
    const saved = localStorage.getItem('ceti_provisional_students');
    return saved ? JSON.parse(saved) : [{ name: '', grade: '' }];
  });

  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  useEffect(() => {
    localStorage.setItem('ceti_provisional_students', JSON.stringify(students));
  }, [students]);

  // Group students by grade for the report
  const groupedStudents = useMemo(() => {
    return students
      .filter(s => s.name.trim() !== '')
      .reduce((acc: Record<string, ProvisionalStudent[]>, student) => {
        const grade = student.grade.trim() || 'SEM TURMA';
        if (!acc[grade]) acc[grade] = [];
        acc[grade].push(student);
        return acc;
      }, {});
  }, [students]);

  const addStudent = () => setStudents([...students, { name: '', grade: '' }]);
  const removeStudent = (index: number) => {
    const newStudents = students.filter((_, i) => i !== index);
    setStudents(newStudents.length ? newStudents : [{ name: '', grade: '' }]);
  };
  const updateStudent = (index: number, field: keyof ProvisionalStudent, val: string) => {
    const newStudents = [...students];
    newStudents[index][field] = val;
    setStudents(newStudents);
  };

  const clearAll = () => {
    if (window.confirm('Deseja limpar toda a lista?')) {
      setStudents([{ name: '', grade: '' }]);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-white p-0 md:p-8">
      {/* Action Bar (Hidden on print) */}
      <div className="max-w-5xl mx-auto mb-8 flex justify-between items-center print:hidden px-4 md:px-0">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">Relatório Provisório por Turma</h1>
          <p className="text-on-surface-variant font-medium">Os nomes são agrupados automaticamente para impressão.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={clearAll}
            className="bg-red-50 text-red-500 px-6 py-3 rounded-2xl font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined">delete_sweep</span>
            Limpar Lista
          </button>
          <button 
            onClick={addStudent}
            className="bg-secondary text-white px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-all"
          >
            <span className="material-symbols-outlined">person_add</span>
            Novo Aluno
          </button>
          <button 
            onClick={handlePrint}
            className="bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-all"
          >
            <span className="material-symbols-outlined">print</span>
            Imprimir por Turma
          </button>
        </div>
      </div>

      {/* Manual Entry Section (Hidden on print) */}
      <div className="max-w-5xl mx-auto mb-10 print:hidden px-4 md:px-0">
        <div className="glass-card rounded-[2rem] p-8 space-y-4 border-2 border-primary/10">
          <h3 className="font-bold text-primary mb-4 flex items-center gap-2 uppercase tracking-widest text-xs">
            <span className="material-symbols-outlined">edit_note</span>
            Cadastro Provisório
          </h3>
          {students.map((student, index) => (
            <div key={index} className="flex gap-3 items-center">
              <span className="text-gray-300 font-black w-6">{index + 1}.</span>
              <input 
                type="text" 
                value={student.name}
                onChange={(e) => updateStudent(index, 'name', e.target.value)}
                placeholder="Nome completo do aluno..."
                className="flex-[2] bg-white border-2 border-gray-100 rounded-xl px-5 py-3 font-bold focus:border-primary outline-none transition-all"
              />
              <input 
                type="text" 
                value={student.grade}
                onChange={(e) => updateStudent(index, 'grade', e.target.value)}
                placeholder="Turma"
                className="flex-1 bg-white border-2 border-gray-100 rounded-xl px-5 py-3 font-bold focus:border-primary outline-none transition-all"
              />
              <button 
                onClick={() => removeStudent(index)}
                className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shrink-0"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Report Sheet */}
      <div 
        className="max-w-5xl mx-auto bg-white print:shadow-none shadow-xl border border-gray-100 print:border-none rounded-[2.5rem] overflow-hidden"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        {/* Header */}
        <div className="bg-[#001228] text-white px-10 py-12 flex justify-between items-center relative overflow-hidden" style={{ backgroundColor: '#001228 !important' }}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-24 h-24 bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center">
              <img src="/ceti-logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">CETI - Nova Itarana</h2>
              <p className="text-white/60 font-bold text-sm uppercase tracking-[0.2em] mt-2">Colégio Estadual de Tempo Integral</p>
              <div className="inline-block mt-4 px-4 py-1.5 bg-white/10 rounded-full border border-white/10">
                <span className="text-[12px] font-black uppercase tracking-widest text-primary-fixed">LISTA PROVISÓRIA AGRUPADA POR TURMA</span>
              </div>
            </div>
          </div>
          <div className="text-right relative z-10">
            <p className="text-white/40 text-[11px] font-black uppercase tracking-widest mb-1">Data do Relatório</p>
            <p className="text-2xl font-black text-white">{today}</p>
          </div>
        </div>

        {/* Content Grouped by Grade */}
        <div className="p-10 space-y-12">
          {Object.entries(groupedStudents).map(([grade, students]) => (
            <div key={grade} className="break-inside-avoid">
              <div className="flex items-center gap-6 mb-6">
                <h3 className="text-2xl font-black text-gray-950 uppercase tracking-tighter bg-gray-100 px-6 py-2 rounded-xl border-l-8 border-primary">{grade}</h3>
                <div className="flex-1 h-[2px] bg-gray-200"></div>
                <span className="text-[14px] font-black text-gray-500 uppercase">{students.length} Alunos</span>
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100" style={{ backgroundColor: '#f3f4f6 !important' }}>
                    <th className="px-10 py-6 text-left text-[12px] font-black uppercase tracking-[0.2em] text-gray-950 border-b-2 border-gray-200">Nome do Aluno</th>
                    <th className="px-10 py-6 text-center text-[12px] font-black uppercase tracking-[0.2em] text-gray-950 border-b-2 border-gray-200">Saída</th>
                    <th className="px-10 py-6 text-center text-[12px] font-black uppercase tracking-[0.2em] text-gray-950 border-b-2 border-gray-200">Entrada</th>
                    <th className="px-10 py-6 text-left text-[12px] font-black uppercase tracking-[0.2em] text-gray-950 border-b-2 border-gray-200">Assinatura / Obs</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => (
                    <tr key={idx} className="border-b-2 border-gray-100 break-inside-avoid">
                      <td className="px-10 py-8">
                        <div className="font-black text-black text-xl uppercase tracking-tight">{student.name}</div>
                      </td>
                      <td className="px-10 py-8 text-center">
                        <div className="w-14 h-14 border-2 border-gray-400 rounded-xl mx-auto"></div>
                      </td>
                      <td className="px-10 py-8 text-center">
                        <div className="w-14 h-14 border-2 border-gray-400 rounded-xl mx-auto"></div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="h-10 border-b-2 border-gray-300 w-full min-w-[250px]"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {Object.keys(groupedStudents).length === 0 && (
            <div className="py-20 text-center opacity-30">
              <span className="material-symbols-outlined text-6xl mb-4">edit_off</span>
              <p className="font-black uppercase tracking-widest text-lg">Nenhum aluno preenchido na lista</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-10 py-20 border-t-4 border-gray-200" style={{ backgroundColor: '#f9fafb !important' }}>
          <div className="grid grid-cols-2 gap-32">
            <div className="text-center">
              <div className="h-0.5 bg-black mb-4 w-full"></div>
              <p className="text-[14px] font-black text-black uppercase tracking-[0.3em]">Porteiro Responsável</p>
            </div>
            <div className="text-center">
              <div className="h-0.5 bg-black mb-4 w-full"></div>
              <p className="text-[14px] font-black text-black uppercase tracking-[0.3em]">Direção Geral CETI</p>
            </div>
          </div>
          <div className="mt-16 text-center opacity-40">
            <p className="text-[10px] font-black uppercase tracking-[0.6em]">CETI ACCESS v2.0 - GERADO EM {format(new Date(), "HH:mm:ss")}</p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          @page { margin: 1cm; size: A4; }
          .break-inside-avoid { break-inside: avoid; }
          
          /* Force backgrounds to show */
          .bg-\\[\\#001228\\] { background-color: #001228 !important; color: white !important; }
          .bg-gray-50 { background-color: #f9fafb !important; }
          .bg-gray-100 { background-color: #f3f4f6 !important; }
          .text-white { color: white !important; }
          
          td, th, h2, h3, p { color: black !important; }
        }
      `}} />
    </div>
  );
};
