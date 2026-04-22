import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { StudentBadge } from '../components/StudentBadge';
import { Link } from 'react-router-dom';

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
      <div className="print:hidden p-6 glass-panel border-b border-white/20 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sticky top-0 z-50 shadow-xl rounded-b-[2rem] mx-2">
        <div className="flex-1">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1 opacity-70">Lote</p>
          <h1 className="font-headline font-extrabold text-2xl text-on-surface">Impressão de Cartões</h1>
          <p className="text-sm font-medium text-on-surface-variant flex items-center gap-1 mt-1">
            <span className="material-symbols-outlined text-sm">settings</span>
            Configure para folha A4 e ative "Gráficos de plano de fundo"
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Display Options */}
          <div className="flex gap-2 glass-card rounded-2xl p-3 items-center">
            <button
              onClick={() => setShowPhoto(!showPhoto)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-sm transition-all ${
                showPhoto 
                  ? 'bg-primary text-white' 
                  : 'bg-white/10 text-on-surface-variant hover:bg-white/20'
              }`}
            >
              <span className="material-symbols-outlined text-base">photo_camera</span>
              Foto
            </button>
            <button
              onClick={() => setGridView(gridView === '2' ? '3' : '2')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-sm bg-white/10 text-on-surface-variant hover:bg-white/20 transition-all"
            >
              <span className="material-symbols-outlined text-base">grid_view</span>
              {gridView}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-1 sm:flex-none">
            <Link to="/students" className="flex-1 sm:flex-none justify-center px-6 py-3 rounded-2xl glass-card font-bold hover:scale-[1.02] transition-all text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined">arrow_back</span>
              Voltar
            </Link>
            <button 
              onClick={() => window.print()}
              className="flex-1 sm:flex-none justify-center px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-white font-bold shadow-lg flex items-center gap-2 hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              <span className="material-symbols-outlined text-lg">print</span>
              Imprimir {students.length}
            </button>
          </div>
        </div>
      </div>

      {/* Print Grid - Displayed block by block */}
      <div className="p-8 print:p-0">
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
