import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const ProvisionalExitReportPage: React.FC = () => {
  const [names, setNames] = useState<string[]>(['']);
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const addName = () => setNames([...names, '']);
  const removeName = (index: number) => {
    const newNames = names.filter((_, i) => i !== index);
    setNames(newNames.length ? newNames : ['']);
  };
  const updateName = (index: number, val: string) => {
    const newNames = [...names];
    newNames[index] = val;
    setNames(newNames);
  };

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-white p-0 md:p-8">
      {/* Action Bar (Hidden on print) */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center print:hidden px-4 md:px-0">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">Relatório Provisório de Saída</h1>
          <p className="text-on-surface-variant font-medium">Adicione nomes manualmente para liberação imediata</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={addName}
            className="bg-secondary text-white px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-all"
          >
            <span className="material-symbols-outlined">add</span>
            Adicionar Aluno
          </button>
          <button 
            onClick={handlePrint}
            className="bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-all"
          >
            <span className="material-symbols-outlined">print</span>
            Imprimir
          </button>
        </div>
      </div>

      {/* Manual Entry Section (Hidden on print) */}
      <div className="max-w-4xl mx-auto mb-10 print:hidden px-4 md:px-0">
        <div className="glass-card rounded-[2rem] p-8 space-y-4">
          <h3 className="font-bold text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">edit_note</span>
            Lista Provisória
          </h3>
          {names.map((name, index) => (
            <div key={index} className="flex gap-3">
              <input 
                type="text" 
                value={name}
                onChange={(e) => updateName(index, e.target.value)}
                placeholder="Digite o nome completo do aluno..."
                className="flex-1 bg-white border-2 border-gray-100 rounded-xl px-5 py-3 font-bold focus:border-primary outline-none transition-all"
              />
              <button 
                onClick={() => removeName(index)}
                className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Report Sheet */}
      <div className="max-w-4xl mx-auto bg-white print:shadow-none shadow-xl border border-gray-100 print:border-none rounded-[2.5rem] overflow-hidden">
        {/* Header */}
        <div className="bg-[#001228] text-white px-10 py-12 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-20 h-20 bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center">
              <img src="/ceti-logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase">CETI - Nova Itarana</h2>
              <p className="text-white/60 font-bold text-xs uppercase tracking-[0.2em] mt-1">Colégio Estadual de Tempo Integral</p>
              <div className="inline-block mt-3 px-3 py-1 bg-white/10 rounded-full border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary-fixed">RELATÓRIO PROVISÓRIO DE LIBERAÇÃO</span>
              </div>
            </div>
          </div>
          <div className="text-right relative z-10">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Data do Relatório</p>
            <p className="text-xl font-black text-white">{today}</p>
          </div>
        </div>

        {/* Info Bar */}
        <div className="bg-gray-50/50 border-b border-gray-100 px-10 py-5">
          <p className="text-[11px] font-black text-gray-500 uppercase leading-relaxed text-justify">
            Atenção Porteiro: Os nomes abaixo estão autorizados provisoriamente para saída no dia de hoje ({today}). 
            Favor colher assinatura e marcar o horário de saída e retorno conforme o procedimento padrão.
          </p>
        </div>

        {/* Report Table */}
        <div className="p-0">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/30">
                <th className="px-10 py-6 text-left text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Nome Completo do Aluno</th>
                <th className="px-10 py-6 text-center text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Saída</th>
                <th className="px-10 py-6 text-center text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Entrada</th>
                <th className="px-10 py-6 text-left text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Assinatura / Obs</th>
              </tr>
            </thead>
            <tbody>
              {names.map((name, idx) => (
                <tr key={idx} className="border-b border-gray-50 break-inside-avoid">
                  <td className="px-10 py-8">
                    <div className="font-black text-gray-900 text-lg uppercase">{name || '__________________________________'}</div>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <div className="w-12 h-12 border-2 border-gray-300 rounded-xl mx-auto"></div>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <div className="w-12 h-12 border-2 border-gray-300 rounded-xl mx-auto"></div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="h-10 border-b-2 border-gray-200 w-full min-w-[250px]"></div>
                  </td>
                </tr>
              ))}
              {/* Extra empty rows for manual handwriting if needed */}
              {[...Array(5)].map((_, i) => (
                <tr key={`extra-${i}`} className="border-b border-gray-50 break-inside-avoid opacity-40">
                  <td className="px-10 py-8">
                    <div className="h-8 border-b-2 border-gray-200 w-full"></div>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <div className="w-12 h-12 border-2 border-gray-300 rounded-xl mx-auto"></div>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <div className="w-12 h-12 border-2 border-gray-300 rounded-xl mx-auto"></div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="h-10 border-b-2 border-gray-200 w-full min-w-[250px]"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-10 py-20 border-t-2 border-gray-100">
          <div className="grid grid-cols-2 gap-32">
            <div className="text-center">
              <div className="h-px bg-gray-950 mb-3 w-full"></div>
              <p className="text-[12px] font-black text-gray-900 uppercase tracking-[0.2em]">Responsável pela Portaria</p>
            </div>
            <div className="text-center">
              <div className="h-px bg-gray-950 mb-3 w-full"></div>
              <p className="text-[12px] font-black text-gray-900 uppercase tracking-[0.2em]">Visto da Direção</p>
            </div>
          </div>
          <div className="mt-16 text-center opacity-40">
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">GERADO EM {format(new Date(), "HH:mm:ss")}</p>
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
          td { color: black !important; }
        }
      `}} />
    </div>
  );
};
