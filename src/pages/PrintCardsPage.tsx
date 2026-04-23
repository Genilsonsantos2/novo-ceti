import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { StudentBadge } from '../components/StudentBadge';
import { Link } from 'react-router-dom';

import { ExportActions } from '../components/ExportActions';

export const PrintCardsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPhoto, setShowPhoto] = useState(true);
  const [gridView, setGridView] = useState<'2' | '3'>('2');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('full_name');

    if (error) console.error(error);
    else setStudents(data || []);
    setLoading(false);
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <span className="material-symbols-outlined text-5xl text-outline animate-spin block mb-3">progress_activity</span>
        <p className="text-outline font-medium">Carregando lote de impressão...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface">
      {/* Print Controls - Hidden during actual printing */}
      <div className="print:hidden p-6 glass-panel border-b border-white/20 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 sticky top-0 z-50 shadow-xl rounded-b-[2rem] mx-2 bg-white/80 backdrop-blur-md">
        <div className="flex-1">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1 opacity-70">Lote</p>
          <h1 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight">Impressão de Cartões</h1>
          <p className="text-sm font-medium text-on-surface-variant flex items-center gap-1 mt-1">
            <span className="material-symbols-outlined text-sm">settings</span>
            Configure para folha A4 e ative "Gráficos de plano de fundo"
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
          {/* Display Options */}
          <div className="flex gap-2 glass-card rounded-2xl p-3 items-center border border-gray-200 bg-white/50">
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

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1 md:flex-none">
            <Link to="/students" className="px-6 py-3.5 rounded-2xl border border-gray-200 bg-white text-gray-600 font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">arrow_back</span>
              Voltar
            </Link>
            
            <ExportActions 
              elementId="print-cards-grid" 
              filename={`Lote_Cartoes_${students.length}_alunos`}
              className="flex-1 md:flex-initial"
            />
          </div>
        </div>
      </div>

      {/* Print Grid - Displayed block by block */}
      <div className="p-8 print:p-0" id="print-cards-grid">
        <div className={`grid gap-8 print:grid-cols-2 print:gap-4 max-w-full mx-auto print:max-w-none ${
          gridView === '2' 
            ? 'grid-cols-1 md:grid-cols-2' 
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
          {students.map((s) => (
            <div key={s.id} className="print:break-inside-avoid flex justify-center">
              <StudentBadge student={s} showPhoto={showPhoto} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
