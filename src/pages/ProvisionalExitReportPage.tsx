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
    <div className="min-h-screen bg-white md:bg-gray-50 p-0 md:p-8">
      {/* Action Bar (Hidden on print) */}
      <div className="max-w-[210mm] mx-auto mb-8 flex justify-between items-center print:hidden px-4 md:px-0">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">Relatório Provisório</h1>
          <p className="text-on-surface-variant font-medium">Os nomes são salvos automaticamente.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={clearAll} className="bg-red-50 text-red-500 px-5 py-3 rounded-2xl font-bold hover:bg-red-500 hover:text-white transition-all">Limpar</button>
          <button onClick={addStudent} className="bg-secondary text-white px-5 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-all">Novo</button>
          <button onClick={handlePrint} className="bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-all">
            <span className="material-symbols-outlined">print</span>
            Imprimir
          </button>
        </div>
      </div>

      {/* Manual Entry Section (Hidden on print) */}
      <div className="max-w-[210mm] mx-auto mb-10 print:hidden px-4 md:px-0">
        <div className="glass-card rounded-[2rem] p-8 space-y-4 border-2 border-primary/10">
          {students.map((student, index) => (
            <div key={index} className="flex gap-3 items-center">
              <input 
                type="text" 
                value={student.name}
                onChange={(e) => updateStudent(index, 'name', e.target.value)}
                placeholder="Nome completo..."
                className="flex-[2] bg-white border-2 border-gray-100 rounded-xl px-4 py-3 font-bold outline-none"
              />
              <input 
                type="text" 
                value={student.grade}
                onChange={(e) => updateStudent(index, 'grade', e.target.value)}
                placeholder="Turma"
                className="flex-1 bg-white border-2 border-gray-100 rounded-xl px-4 py-3 font-bold outline-none"
              />
              <button onClick={() => removeStudent(index)} className="text-red-500 hover:scale-110 transition-all"><span className="material-symbols-outlined">close</span></button>
            </div>
          ))}
        </div>
      </div>

      {/* Report Sheet - Optimized for A4 Printing */}
      <div 
        className="max-w-[210mm] mx-auto bg-white print:m-0 print:p-0 print:shadow-none shadow-xl border border-gray-100 print:border-none rounded-[2rem] overflow-hidden"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        {/* Header */}
        <div className="bg-[#001228] text-white px-10 py-10 flex justify-between items-center relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-20 h-20 bg-white p-2 rounded-xl flex items-center justify-center">
              <img src="/ceti-logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase leading-tight">CETI - Nova Itarana</h2>
              <p className="text-white/60 font-bold text-xs uppercase tracking-widest">Colégio Estadual de Tempo Integral</p>
              <p className="text-[10px] font-black uppercase bg-white/10 px-3 py-1 rounded-full mt-2 inline-block">Autorização Provisória de Saída</p>
            </div>
          </div>
          <div className="text-right relative z-10">
            <p className="text-white/40 text-[10px] font-bold uppercase mb-1 tracking-widest">Data</p>
            <p className="text-xl font-black text-white">{today}</p>
          </div>
        </div>

        {/* Content Grouped by Grade */}
        <div className="p-8 space-y-10">
          {Object.entries(groupedStudents).map(([grade, students]) => (
            <div key={grade} className="break-inside-avoid page-break-after-auto">
              <div className="flex items-center gap-4 mb-4">
                <h3 className="text-xl font-black text-gray-950 uppercase bg-gray-100 px-5 py-2 rounded-lg border-l-8 border-primary">{grade}</h3>
                <div className="flex-1 h-[1px] bg-gray-200"></div>
                <span className="text-[12px] font-bold text-gray-500 uppercase">{students.length} Alunos</span>
              </div>

              <table className="w-full border-collapse border-spacing-0">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-6 py-4 text-left text-[11px] font-black uppercase text-gray-700 border-b-2 border-gray-300">Aluno</th>
                    <th className="px-6 py-4 text-center text-[11px] font-black uppercase text-gray-700 border-b-2 border-gray-300">S/E</th>
                    <th className="px-6 py-4 text-left text-[11px] font-black uppercase text-gray-700 border-b-2 border-gray-300">Assinatura / Obs</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => (
                    <tr key={idx} className="border-b border-gray-200 break-inside-avoid">
                      <td className="px-6 py-6 w-[45%]">
                        <div className="font-black text-black text-base uppercase leading-tight">{student.name}</div>
                      </td>
                      <td className="px-4 py-6 w-[15%] text-center">
                        <div className="flex justify-center gap-2">
                          <div className="w-8 h-8 border border-gray-400 rounded"></div>
                          <div className="w-8 h-8 border border-gray-400 rounded"></div>
                        </div>
                      </td>
                      <td className="px-6 py-6 w-[40%]">
                        <div className="h-8 border-b-2 border-gray-200 w-full"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {Object.keys(groupedStudents).length === 0 && (
            <div className="py-20 text-center opacity-30 print:hidden">
              <p className="font-black uppercase tracking-widest text-lg">Nenhum aluno na lista</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-10 py-16 border-t-2 border-gray-200 mt-auto">
          <div className="grid grid-cols-2 gap-20">
            <div className="text-center">
              <div className="h-[2px] bg-black mb-2 w-full"></div>
              <p className="text-[11px] font-black text-black uppercase">Portaria</p>
            </div>
            <div className="text-center">
              <div className="h-[2px] bg-black mb-2 w-full"></div>
              <p className="text-[11px] font-black text-black uppercase">Direção</p>
            </div>
          </div>
          <p className="mt-12 text-center text-[8px] font-bold uppercase tracking-widest opacity-30">CETI Access v2.0 - {format(new Date(), "HH:mm")}</p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; margin: 0; padding: 0; width: 100% !important; height: auto !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          @page { margin: 1cm; size: A4; }
          .break-inside-avoid { break-inside: avoid !important; }
          
          /* Prevent cutting off on right side */
          .max-w-\\[210mm\\] { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
          
          /* Force colors */
          .bg-\\[\\#001228\\] { background-color: #001228 !important; color: white !important; }
          .text-white { color: white !important; }
          .bg-gray-100 { background-color: #f3f4f6 !important; }
          .bg-gray-50 { background-color: #f9fafb !important; }
          td, th, p, h2, h3 { color: black !important; }
          .border-l-8 { border-left-width: 8px !important; border-left-style: solid !important; border-left-color: #001e40 !important; }
        }
      `}} />
    </div>
  );
};
