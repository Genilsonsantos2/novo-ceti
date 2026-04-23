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
        className="max-w-[210mm] mx-auto bg-white print:m-0 print:p-0 print:shadow-none shadow-xl border border-gray-100 print:border-none rounded-[1rem] overflow-hidden relative"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        {/* Header - Compacted for Print */}
        <div className="bg-[#001e40] text-white px-8 py-6 flex justify-between items-center relative overflow-hidden z-10">
          <div className="flex items-center gap-4 relative z-10">
            <img src="/ceti-logo.png" alt="Logo" className="h-12 w-12 object-contain bg-white rounded-lg p-1" />
            <div>
              <h2 className="text-sm font-bold opacity-60 uppercase tracking-widest leading-none">Governo da Bahia</h2>
              <h1 className="text-xl font-black uppercase leading-tight tracking-tight mt-1">CETI - Nova Itarana</h1>
              <p className="text-white/40 font-bold text-[9px] uppercase tracking-[0.2em] mt-0.5">Colégio Estadual de Tempo Integral</p>
            </div>
            <div className="bg-white/10 px-3 py-1 rounded-full mt-2 inline-block">
              <span className="text-[10px] font-black uppercase">Relatório Provisório de Acessos</span>
            </div>
          </div>
          <div className="text-right relative z-10">
            <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Emissão</p>
            <p className="text-lg font-black text-white">{today}</p>
          </div>
        </div>

        {/* Content Grouped by Grade - Compacted Spacing */}
        <div className="p-6 space-y-6 relative z-10">
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
                      <td className="px-4 py-5 w-[45%]">
                        <div className="font-black text-black text-sm uppercase leading-none">{student.name}</div>
                      </td>
                      <td className="px-2 py-5 w-[15%] text-center">
                        <div className="flex justify-center gap-2">
                          <div className="w-7 h-7 border border-gray-400 rounded flex items-center justify-center text-[7px] text-gray-300 font-bold">IN</div>
                          <div className="w-7 h-7 border border-gray-400 rounded flex items-center justify-center text-[7px] text-gray-300 font-bold">OUT</div>
                        </div>
                      </td>
                      <td className="px-4 py-5 w-[40%]">
                        <div className="h-7 border-b border-gray-200 w-full"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Footer - Compacted */}
        <div className="bg-gray-50 px-10 py-12 border-t border-gray-200 mt-4 relative z-10">
          <div className="grid grid-cols-2 gap-24">
            <div className="text-center">
              <div className="h-px bg-black mb-2 w-full"></div>
              <p className="text-[10px] font-black uppercase tracking-widest">Portaria</p>
            </div>
            <div className="text-center">
              <div className="h-px bg-black mb-2 w-full"></div>
              <p className="text-[10px] font-black uppercase tracking-widest">Direção</p>
            </div>
          </div>
          <p className="mt-8 text-center text-[7px] font-bold uppercase opacity-30 tracking-[0.3em]">SISTEMA CETI v2.0 - {format(new Date(), "HH:mm")}</p>
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
          .break-inside-avoid { break-inside: avoid !important; }
          * { box-sizing: border-box !important; }
        }
      `}} />
    </div>
  );
};

