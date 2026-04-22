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
    <div className="min-h-screen bg-white md:bg-gray-50 p-0 md:p-8 print:p-0 print:min-h-0">
      {/* Action Bar (Hidden on print) */}
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden px-4 md:px-0">
        <div>
          <h1 className="text-xl font-black text-primary uppercase">Relatório Provisório</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={clearAll} className="bg-red-50 text-red-500 px-4 py-2 rounded-xl font-bold text-sm">Limpar</button>
          <button onClick={addStudent} className="bg-secondary text-white px-4 py-2 rounded-xl font-bold text-sm">Novo</button>
          <button onClick={handlePrint} className="bg-primary text-white px-6 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">print</span>
            Imprimir
          </button>
        </div>
      </div>

      {/* Manual Entry Section (Hidden on print) */}
      <div className="max-w-[210mm] mx-auto mb-6 print:hidden px-4 md:px-0">
        <div className="glass-card rounded-[1.5rem] p-6 space-y-3 border border-primary/10">
          {students.map((student, index) => (
            <div key={index} className="flex gap-2 items-center">
              <input 
                type="text" 
                value={student.name}
                onChange={(e) => updateStudent(index, 'name', e.target.value)}
                placeholder="Nome..."
                className="flex-[2] bg-white border border-gray-200 rounded-lg px-4 py-2 font-bold outline-none text-sm"
              />
              <input 
                type="text" 
                value={student.grade}
                onChange={(e) => updateStudent(index, 'grade', e.target.value)}
                placeholder="Turma"
                className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2 font-bold outline-none text-sm"
              />
              <button onClick={() => removeStudent(index)} className="text-red-400"><span className="material-symbols-outlined text-sm">close</span></button>
            </div>
          ))}
        </div>
      </div>

      {/* Report Sheet */}
      <div 
        className="max-w-[210mm] mx-auto bg-white print:m-0 print:p-0 print:shadow-none shadow-xl border border-gray-100 print:border-none rounded-[1rem] overflow-hidden"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        {/* Header - Compacted for Print */}
        <div className="bg-[#001228] text-white px-8 py-6 flex justify-between items-center relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-4">
            <img src="/ceti-logo.png" alt="Logo" className="w-16 h-16 object-contain bg-white p-1 rounded-lg" />
            <div>
              <h2 className="text-xl font-black uppercase leading-tight tracking-tight">CETI - Nova Itarana</h2>
              <p className="text-white/60 font-bold text-[9px] uppercase tracking-widest">Colégio Estadual de Tempo Integral</p>
              <div className="bg-white/10 px-3 py-0.5 rounded-full mt-1 inline-block">
                <span className="text-[9px] font-black uppercase">Relatório Provisório</span>
              </div>
            </div>
          </div>
          <div className="text-right relative z-10">
            <p className="text-white/40 text-[8px] font-bold uppercase tracking-widest">Emissão</p>
            <p className="text-lg font-black text-white">{today}</p>
          </div>
        </div>

        {/* Content Grouped by Grade - Compacted Spacing */}
        <div className="p-6 space-y-6">
          {Object.entries(groupedStudents).map(([grade, students]) => (
            <div key={grade} className="break-inside-avoid">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-lg font-black text-gray-950 uppercase bg-gray-50 px-4 py-1.5 rounded-lg border-l-4 border-primary">{grade}</h3>
                <div className="flex-1 h-[1px] bg-gray-200"></div>
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100/50">
                    <th className="px-4 py-3 text-left text-[9px] font-black uppercase text-gray-700 border-b border-gray-200">Aluno</th>
                    <th className="px-4 py-3 text-center text-[9px] font-black uppercase text-gray-700 border-b border-gray-200">Acesso</th>
                    <th className="px-4 py-3 text-left text-[9px] font-black uppercase text-gray-700 border-b border-gray-200">Assinatura / Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => (
                    <tr key={idx} className="border-b border-gray-100 break-inside-avoid">
                      <td className="px-4 py-3 w-[45%]">
                        <div className="font-black text-black text-sm uppercase leading-none">{student.name}</div>
                      </td>
                      <td className="px-2 py-3 w-[15%] text-center">
                        <div className="flex justify-center gap-1.5">
                          <div className="w-6 h-6 border border-gray-400 rounded"></div>
                          <div className="w-6 h-6 border border-gray-400 rounded"></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 w-[40%]">
                        <div className="h-6 border-b border-gray-200 w-full"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Footer - Compacted */}
        <div className="bg-gray-50 px-10 py-10 border-t border-gray-200 mt-4">
          <div className="grid grid-cols-2 gap-20">
            <div className="text-center">
              <div className="h-px bg-black mb-1 w-full"></div>
              <p className="text-[10px] font-black uppercase">Portaria</p>
            </div>
            <div className="text-center">
              <div className="h-px bg-black mb-1 w-full"></div>
              <p className="text-[10px] font-black uppercase">Direção</p>
            </div>
          </div>
          <p className="mt-6 text-center text-[7px] font-bold uppercase opacity-30 tracking-widest">SISTEMA CETI v2.0 - {format(new Date(), "HH:mm")}</p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; margin: 0; padding: 0 !important; width: 100% !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print\\:hidden { display: none !important; }
          @page { margin: 0.5cm; size: A4; }
          .break-inside-avoid { break-inside: avoid !important; }
          .max-w-\\[210mm\\] { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
          td, th, p, h2, h3 { color: black !important; }
          .bg-\\[\\#001228\\] { background-color: #001228 !important; color: white !important; }
        }
      `}} />
    </div>
  );
};
