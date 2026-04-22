import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProvisionalStudent {
  name: string;
  grade: string;
}

export const ProvisionalExitReportPage: React.FC = () => {
  const [students, setStudents] = useState<ProvisionalStudent[]>([{ name: '', grade: '' }]);
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

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

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-white p-0 md:p-8">
      {/* Action Bar (Hidden on print) */}
      <div className="max-w-5xl mx-auto mb-8 flex justify-between items-center print:hidden px-4 md:px-0">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">Relatório Provisório de Saída</h1>
          <p className="text-on-surface-variant font-medium">Controle manual para alunos não cadastrados</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={addStudent}
            className="bg-secondary text-white px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-all"
          >
            <span className="material-symbols-outlined">person_add</span>
            Adicionar Linha
          </button>
          <button 
            onClick={handlePrint}
            className="bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-all"
          >
            <span className="material-symbols-outlined">print</span>
            Imprimir Relatório
          </button>
        </div>
      </div>

      {/* Manual Entry Section (Hidden on print) */}
      <div className="max-w-5xl mx-auto mb-10 print:hidden px-4 md:px-0">
        <div className="glass-card rounded-[2rem] p-8 space-y-4">
          <h3 className="font-bold text-primary mb-4 flex items-center gap-2 uppercase tracking-widest text-xs">
            <span className="material-symbols-outlined">edit_note</span>
            Preenchimento da Lista
          </h3>
          {students.map((student, index) => (
            <div key={index} className="flex gap-3">
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
                placeholder="Turma (Ex: 3A)"
                className="flex-1 bg-white border-2 border-gray-100 rounded-xl px-5 py-3 font-bold focus:border-primary outline-none transition-all"
              />
              <button 
                onClick={() => removeStudent(index)}
                className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shrink-0"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          ))}
        </div>
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
              <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">CETI - Nova Itarana</h2>
              <p className="text-white/60 font-bold text-sm uppercase tracking-[0.2em] mt-2">Colégio Estadual de Tempo Integral</p>
              <div className="inline-block mt-4 px-4 py-1.5 bg-white/10 rounded-full border border-white/10">
                <span className="text-[12px] font-black uppercase tracking-widest text-primary-fixed">AUTORIZAÇÃO PROVISÓRIA DE SAÍDA</span>
              </div>
            </div>
          </div>
          <div className="text-right relative z-10">
            <p className="text-white/40 text-[11px] font-black uppercase tracking-widest mb-1">Data do Relatório</p>
            <p className="text-2xl font-black text-white">{today}</p>
          </div>
        </div>

        {/* Info Bar */}
        <div className="bg-gray-50/50 border-b-2 border-gray-100 px-10 py-6">
          <p className="text-[12px] font-black text-gray-950 uppercase leading-relaxed text-justify">
            Atenção Porteiro: Os alunos listados abaixo estão autorizados provisoriamente para saída no dia de hoje ({today}). 
            Favor colher assinatura e registrar os horários.
          </p>
        </div>

        {/* Report Table */}
        <div className="p-0">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/30">
                <th className="px-10 py-6 text-left text-[12px] font-black uppercase tracking-[0.2em] text-gray-500 border-b-2 border-gray-100">Nome do Aluno</th>
                <th className="px-10 py-6 text-left text-[12px] font-black uppercase tracking-[0.2em] text-gray-500 border-b-2 border-gray-100">Série/Turma</th>
                <th className="px-10 py-6 text-center text-[12px] font-black uppercase tracking-[0.2em] text-gray-500 border-b-2 border-gray-100">Saída</th>
                <th className="px-10 py-6 text-center text-[12px] font-black uppercase tracking-[0.2em] text-gray-500 border-b-2 border-gray-100">Entrada</th>
                <th className="px-10 py-6 text-left text-[12px] font-black uppercase tracking-[0.2em] text-gray-500 border-b-2 border-gray-100">Assinatura / Obs</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => (
                <tr key={idx} className="border-b-2 border-gray-50 break-inside-avoid">
                  <td className="px-10 py-8">
                    <div className="font-black text-gray-900 text-xl uppercase tracking-tight">{student.name || '__________________________________'}</div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="font-black text-gray-700 text-lg uppercase tracking-tight">{student.grade || '_______'}</div>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <div className="w-14 h-14 border-2 border-gray-400 rounded-xl mx-auto"></div>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <div className="w-14 h-14 border-2 border-gray-400 rounded-xl mx-auto"></div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="h-10 border-b-2 border-gray-200 w-full min-w-[200px]"></div>
                  </td>
                </tr>
              ))}
              {/* Extra empty rows for handwriting */}
              {[...Array(3)].map((_, i) => (
                <tr key={`extra-${i}`} className="border-b-2 border-gray-50 break-inside-avoid opacity-30">
                  <td className="px-10 py-8">
                    <div className="h-8 border-b-2 border-gray-200 w-full"></div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="h-8 border-b-2 border-gray-200 w-24"></div>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <div className="w-14 h-14 border-2 border-gray-300 rounded-xl mx-auto"></div>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <div className="w-14 h-14 border-2 border-gray-300 rounded-xl mx-auto"></div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="h-10 border-b-2 border-gray-200 w-full min-w-[200px]"></div>
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
              <div className="h-0.5 bg-gray-950 mb-4 w-full"></div>
              <p className="text-[14px] font-black text-gray-900 uppercase tracking-[0.3em]">Responsável pela Portaria</p>
            </div>
            <div className="text-center">
              <div className="h-0.5 bg-gray-950 mb-4 w-full"></div>
              <p className="text-[14px] font-black text-gray-900 uppercase tracking-[0.3em]">Visto da Direção</p>
            </div>
          </div>
          <div className="mt-20 text-center opacity-30">
            <p className="text-[10px] font-black uppercase tracking-[0.6em]">CETI ACCESS SYSTEM v2.0 - GERADO EM {format(new Date(), "HH:mm:ss")}</p>
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
