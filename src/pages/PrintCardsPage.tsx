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

  if (loading) return <div className="p-10 text-center font-bold">Carregando lote para impressão...</div>;

  return (
    <div className="min-h-screen bg-surface">
      {/* Print Controls - Hidden during actual printing */}
      <div className="print:hidden p-6 bg-surface-container-high border-b border-outline-variant flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div>
          <h1 className="font-headline font-extrabold text-2xl text-primary">Modo de Impressão Lote</h1>
          <p className="text-sm font-medium text-outline">Configure a impressora para folha A4 e sem margens (se possível).</p>
        </div>
        <div className="flex gap-4">
          <Link to="/students" className="px-6 py-2 rounded-xl bg-surface-container-highest text-on-surface font-bold hover:bg-outline-variant transition-colors">
            Voltar
          </Link>
          <button 
            onClick={() => window.print()}
            className="px-6 py-2 rounded-xl bg-primary text-white font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            Imprimir {students.length} Cartões
          </button>
        </div>
      </div>

      {/* Print Grid - Displayed block by block */}
      <div className="p-8 print:p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4 max-w-7xl mx-auto print:max-w-none">
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
