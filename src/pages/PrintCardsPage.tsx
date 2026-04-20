import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { StudentBadge } from '../components/StudentBadge';
import { Link } from 'react-router-dom';

export const PrintCardsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="print:hidden p-6 glass-panel border-b border-white/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-50 shadow-xl rounded-b-[2rem] mx-2">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1 opacity-70">Lote</p>
          <h1 className="font-headline font-extrabold text-2xl text-on-surface">Impressão de Cartões</h1>
          <p className="text-sm font-medium text-on-surface-variant flex items-center gap-1 mt-1">
            <span className="material-symbols-outlined text-sm">settings</span>
            Configure para folha A4 e ative "Gráficos de plano de fundo"
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link to="/students" className="flex-1 md:flex-none justify-center px-6 py-3 rounded-2xl glass-card font-bold hover:scale-[1.02] transition-all text-on-surface-variant flex items-center gap-2">
            Voltar
          </Link>
          <button 
            onClick={() => window.print()}
            className="flex-1 md:flex-none justify-center px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-white font-bold shadow-lg flex items-center gap-2 hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            <span className="material-symbols-outlined text-lg">print</span>
            Imprimir {students.length} Cartões
          </button>
        </div>
      </div>

      {/* Print Grid - Displayed block by block */}
      <div className="p-8 print:p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 print:grid-cols-2 print:gap-4 max-w-7xl mx-auto print:max-w-none">
          {students.map((s) => (
            /* page-break rules help separate them so they don't get cut in half */
            <div key={s.id} className="print:break-inside-avoid">
              <StudentBadge student={s} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
