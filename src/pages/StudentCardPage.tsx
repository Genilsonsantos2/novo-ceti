import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useParams } from 'react-router-dom';
import { StudentBadge } from '../components/StudentBadge';

import { ExportActions } from '../components/ExportActions';

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
    let query = supabase.from('students').select('*, student_authorizations(*)');
    
    if (studentId) {
      query = query.eq('id', studentId);
    } else {
      query = query.limit(1);
    }

    const { data, error } = await query.single();

    if (error) console.error(error);
    else setStudent(data);
    setLoading(false);
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
      </div>
    </div>
  );

  return (
    <main className="max-w-3xl mx-auto p-6 pb-32">
      <div className="mb-8">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 opacity-70">Identidade do Aluno</p>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">Cartão de {student.full_name}</h1>
        <p className="text-on-surface-variant font-medium mt-1">Versão para impressão física - Padrão PVC (86×54mm)</p>
      </div>

      {/* Preview Section */}
      <div className="bg-gradient-to-br from-surface-container to-surface/50 rounded-3xl p-8 mb-8">
        <div className="flex flex-col items-center gap-6">
          {/* Card Preview */}
          <div className="flex justify-center p-4 bg-white/50 backdrop-blur-sm rounded-2xl" id="student-card-export">
            <StudentBadge student={student} showPhoto={showPhoto} />
          </div>

          {/* Display Options */}
          <div className="flex gap-2 glass-card rounded-2xl p-3">
            <button
              onClick={() => setShowPhoto(!showPhoto)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold transition-all ${
                showPhoto 
                  ? 'bg-primary shadow-lg shadow-primary/30 text-white' 
                  : 'bg-white/10 text-on-surface-variant hover:bg-white/20'
              }`}
            >
              <span className="material-symbols-outlined">photo_camera</span>
              {showPhoto ? 'Com Foto' : 'Sem Foto'}
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-10">
        <ExportActions 
          elementId="student-card-export" 
          filename={`Cartao_${student.full_name.replace(/\s+/g, '_')}`}
        />
      </div>
      
      {/* Info Card */}
      <div className="glass-card rounded-2xl p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-xl">info</span>
        </div>
        <div>
          <h3 className="font-bold text-sm text-on-surface mb-2">Orientações de Impressão</h3>
          <ul className="text-xs text-on-surface-variant leading-relaxed space-y-1">
            <li>• <strong>Tamanho:</strong> A6 (86 × 54 mm) - Cartão padrão</li>
            <li>• <strong>Papel:</strong> Recomendamos papel couchê 300g</li>
            <li>• <strong>Gráficos:</strong> Ative "Gráficos de Fundo" na impressora</li>
            <li>• <strong>Qualidade:</strong> Use a configuração de qualidade máxima</li>
          </ul>
        </div>
      </div>
    </main>
  );
};
