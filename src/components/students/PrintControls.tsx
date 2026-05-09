import React from 'react';
import { Link } from 'react-router-dom';
import { ExportActions } from '../ExportActions';

interface PrintControlsProps {
  selectedGrade: string;
  setSelectedGrade: (grade: string) => void;
  uniqueGrades: string[];
  showPhoto: boolean;
  setShowPhoto: (show: boolean) => void;
  gridView: '2' | '3';
  setGridView: (view: '2' | '3') => void;
  totalFiltered: number;
  onConfirmPrint: () => void;
}

export const PrintControls: React.FC<PrintControlsProps> = ({
  selectedGrade,
  setSelectedGrade,
  uniqueGrades,
  showPhoto,
  setShowPhoto,
  gridView,
  setGridView,
  totalFiltered,
  onConfirmPrint,
}) => {
  return (
    <div className="print:hidden p-6 glass-panel border-b border-white/20 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 sticky top-0 z-50 shadow-xl rounded-b-[2rem] mx-2 bg-white/80 backdrop-blur-md">
      <div className="flex-1">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1 opacity-70">Lote de Impressão</p>
        <h1 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight">Cartões de Identificação</h1>
        <p className="text-sm font-medium text-on-surface-variant flex items-center gap-1 mt-1">
          <span className="material-symbols-outlined text-sm">settings</span>
          A4 • Escala: 100% • {totalFiltered} alunos filtrados
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
        <div className="flex flex-wrap gap-2 glass-card rounded-2xl p-3 items-center border border-gray-200 bg-white/50">
          <div className="flex items-center gap-2 px-2 bg-gray-100 rounded-xl border border-gray-200">
            <span className="material-symbols-outlined text-gray-500 text-sm">filter_list</span>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-gray-600 focus:ring-0 py-2 w-full md:w-auto outline-none cursor-pointer"
            >
              <option value="">Todas as Turmas</option>
              {uniqueGrades.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowPhoto(!showPhoto)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              showPhoto 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">photo_camera</span>
            {showPhoto ? 'Com Foto' : 'Sem Foto'}
          </button>
          
          <button
            onClick={() => setGridView(gridView === '2' ? '3' : '2')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
          >
            <span className="material-symbols-outlined text-base">grid_view</span>
            Grade {gridView}x
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-1 md:flex-none">
          <Link to="/students" className="px-6 py-3.5 rounded-2xl border border-gray-200 bg-white text-gray-600 font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">arrow_back</span>
            Voltar
          </Link>
          
          <ExportActions 
            elementId="print-cards-grid" 
            filename={`Lote_Cartoes_${selectedGrade || 'Todas_Turmas'}`}
            className="flex-1 md:flex-initial"
          />

          <button
            onClick={onConfirmPrint}
            className="px-6 py-3.5 rounded-2xl bg-green-600 text-white font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-200"
          >
            <span className="material-symbols-outlined">done_all</span>
            Marcar Impresso
          </button>
        </div>
      </div>
    </div>
  );
};
