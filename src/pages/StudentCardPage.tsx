import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useParams, Link } from 'react-router-dom';
import { StudentBadge } from '../components/StudentBadge';
import { ExportActions } from '../components/ExportActions';
import { StudentPhotoUpload } from '../components/students/StudentPhotoUpload';

export const StudentCardPage: React.FC = () => {
  const { user } = useAuth();
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPhoto, setShowPhoto] = useState(true);

  useEffect(() => {
    if (user) fetchStudentData();
  }, [user, studentId]);

  const fetchStudentData = async () => {
    let query = supabase.from('students').select('*, student_authorizations(*), term_attachments(id)');
    if (studentId) query = query.eq('id', studentId);
    else query = query.limit(1);

    const { data, error } = await query.single();
    if (error) console.error(error);
    else setStudent(data);
    setLoading(false);
  };

  const handleUploadSuccess = (newUrl: string) => {
    setStudent({ ...student, photo_url: newUrl });
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <span className="material-symbols-outlined text-5xl text-outline animate-spin block mb-3">progress_activity</span>
        <p className="text-outline font-medium">Carregando carteirinha...</p>
      </div>
    </div>
  );

  if (!student) return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <div className="glass-card rounded-3xl p-10 text-center max-w-sm">
        <span className="material-symbols-outlined text-5xl text-error/30 block mb-3">person_off</span>
        <p className="text-error font-bold">Estudante não encontrado.</p>
        <Link to="/students" className="mt-4 inline-block text-primary font-bold">Voltar para lista</Link>
      </div>
    </div>
  );

  const hasReturnedTerm = (student.term_attachments && student.term_attachments.length > 0) || student.term_returned_physical;

  if (!hasReturnedTerm) return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh] p-6">
      <div className="glass-card rounded-[2.5rem] p-10 text-center max-w-md border-amber-200 bg-amber-50/50 shadow-xl">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-600">
          <span className="material-symbols-outlined text-4xl">history_edu</span>
        </div>
        <h2 className="text-2xl font-headline font-extrabold text-amber-900 mb-2">Termo Pendente</h2>
        <p className="text-amber-800 font-medium leading-relaxed">
          A carteirinha digital só estará disponível após a <strong>devolutiva do termo de autorização</strong> assinado.
        </p>
        <Link to="/students" className="mt-8 inline-block px-6 py-2 bg-amber-200 text-amber-900 rounded-xl font-bold hover:bg-amber-300 transition-all">
          Voltar
        </Link>
      </div>
    </div>
  );

  return (
    <main className="max-w-3xl mx-auto p-6 pb-32">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 opacity-70">Identidade do Aluno</p>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface notranslate" translate="no">Cartão de {student.full_name}</h1>
          <p className="text-on-surface-variant font-medium mt-1">Versão para impressão física - Padrão PVC (86×54mm)</p>
        </div>
        <Link to="/students" className="p-3 glass-card rounded-2xl hover:bg-gray-100 transition-all">
          <span className="material-symbols-outlined">close</span>
        </Link>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <StudentPhotoUpload student={student} onUploadSuccess={handleUploadSuccess} />
        <button
          onClick={() => setShowPhoto(!showPhoto)}
          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
            showPhoto ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          <span className="material-symbols-outlined">{showPhoto ? 'visibility' : 'visibility_off'}</span>
          {showPhoto ? 'Ocultar Foto' : 'Mostrar Foto'}
        </button>
      </div>

      <div className="bg-gradient-to-br from-surface-container to-surface/50 rounded-[3rem] p-12 mb-10 border border-white/20 shadow-inner">
        <div className="flex justify-center" id="student-card-export">
          <StudentBadge student={student} showPhoto={showPhoto} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="glass-card rounded-3xl p-6">
          <h3 className="font-bold text-sm text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">download</span>
            Exportar Documento
          </h3>
          <ExportActions 
            elementId="student-card-export" 
            filename={`Cartao_${student.full_name.replace(/\s+/g, '_')}`}
          />
        </div>

        <div className="glass-card rounded-3xl p-6 bg-primary/5 border-primary/10">
          <h3 className="font-bold text-sm text-primary mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined">info</span>
            Orientações
          </h3>
          <ul className="text-xs text-on-surface-variant leading-relaxed space-y-2 font-medium">
            <li>• <strong>PVC Padrão:</strong> 86 × 54 mm</li>
            <li>• <strong>Papel:</strong> Couchê 300g (mínimo)</li>
            <li>• <strong>Impressão:</strong> Alta Qualidade (100% escala)</li>
          </ul>
        </div>
      </div>
    </main>
  );
};
