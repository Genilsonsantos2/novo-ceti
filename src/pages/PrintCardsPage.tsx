import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { StudentBadge } from '../components/StudentBadge';
import { PrintControls } from '../components/students/PrintControls';

export const PrintCardsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPhoto, setShowPhoto] = useState(true);
  const [gridView, setGridView] = useState<'2' | '3'>('2');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ids = params.get('ids');
    if (ids) setSelectedIds(ids.split(','));
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('*, term_attachments(id)')
      .order('full_name');

    if (error) console.error(error);
    else setStudents(data || []);
    setLoading(false);
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesGrade = !selectedGrade || s.grade === selectedGrade;
      const matchesIds = selectedIds.length === 0 || selectedIds.includes(s.id);
      const hasReturnedTerm = (s.term_attachments && s.term_attachments.length > 0) || s.term_returned_physical;
      return matchesGrade && matchesIds && hasReturnedTerm;
    });
  }, [students, selectedGrade, selectedIds]);

  const uniqueGrades = useMemo(() => {
    return Array.from(new Set(students.map(s => s.grade).filter(Boolean))).sort() as string[];
  }, [students]);

  const handleConfirmPrint = async () => {
    if (!window.confirm(`Deseja marcar os ${filteredStudents.length} alunos deste lote como "Impressos"?`)) return;
    const { error } = await supabase
      .from('students')
      .update({ is_printed: true })
      .in('id', filteredStudents.map(s => s.id));
    
    if (error) alert('Erro ao atualizar: ' + error.message);
    else {
      alert('Status de impressão atualizado com sucesso!');
      fetchStudents();
    }
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
      <PrintControls 
        selectedGrade={selectedGrade}
        setSelectedGrade={setSelectedGrade}
        uniqueGrades={uniqueGrades}
        showPhoto={showPhoto}
        setShowPhoto={setShowPhoto}
        gridView={gridView}
        setGridView={setGridView}
        totalFiltered={filteredStudents.length}
        onConfirmPrint={handleConfirmPrint}
      />

      <div className="p-8 print:p-0 print:m-0" id="print-cards-grid">
        <div className={`grid gap-8 print:grid-cols-2 print:gap-x-4 print:gap-y-6 max-w-full mx-auto print:max-w-none ${
          gridView === '2' 
            ? 'grid-cols-1 md:grid-cols-2' 
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
          {filteredStudents.length > 0 ? (
            filteredStudents.map((s) => (
              <div key={s.id} className="print:break-inside-avoid flex justify-center">
                <StudentBadge student={s} showPhoto={showPhoto} />
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center glass-card rounded-[2rem] border-2 border-dashed">
              <span className="material-symbols-outlined text-5xl text-gray-200 block mb-4">person_off</span>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Nenhum aluno encontrado com termo entregue.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
