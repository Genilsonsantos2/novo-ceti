import React from 'react';
import { exportToPDF, exportToWord } from '../utils/exportUtils';

interface ExportActionsProps {
  elementId: string;
  filename: string;
  onPrint?: () => void;
  className?: string;
}

export const ExportActions: React.FC<ExportActionsProps> = ({ 
  elementId, 
  filename, 
  onPrint = () => window.print(),
  className = "" 
}) => {
  return (
    <div className={`flex flex-wrap gap-3 print:hidden ${className}`}>
      <button 
        onClick={onPrint}
        className="flex-1 min-w-[140px] bg-primary text-white px-6 py-3.5 rounded-2xl font-black shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-xl">print</span>
        IMPRIMIR
      </button>

      <button 
        onClick={() => exportToPDF(elementId, filename)}
        className="flex-1 min-w-[140px] bg-white/80 backdrop-blur-md border border-gray-200 text-gray-700 px-6 py-3.5 rounded-2xl font-black shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-xl text-red-500">picture_as_pdf</span>
        SALVAR PDF
      </button>

      <button 
        onClick={() => exportToWord(elementId, filename)}
        className="flex-1 min-w-[140px] bg-white/80 backdrop-blur-md border border-gray-200 text-gray-700 px-6 py-3.5 rounded-2xl font-black shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-xl text-blue-600">description</span>
        SALVAR WORD
      </button>
    </div>
  );
};
