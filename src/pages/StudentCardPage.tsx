import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useParams } from 'react-router-dom';
import { StudentBadge } from '../components/StudentBadge';

export const StudentCardPage: React.FC = () => {
  const { user } = useAuth();
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

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
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 opacity-70">Identidade Digital</p>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">Cartão de {student.full_name}</h1>
        <p className="text-on-surface-variant font-medium mt-1">Prévia do formato impresso com QR Code e logotipo</p>
      </div>

      {/* Card Preview */}
      <div className="flex justify-center mb-8">
        <StudentBadge student={student} />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-10">
        <button 
          onClick={() => window.print()}
          className="flex-1 bg-gradient-to-r from-primary to-primary-container text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">print</span>
          Imprimir Este Cartão
        </button>
      </div>
      
      {/* Info Card */}
      <div className="glass-card rounded-2xl p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-xl">info</span>
        </div>
        <div>
          <h3 className="font-bold text-sm text-on-surface mb-1">Orientações de Impressão</h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">O cartão já contém o QR Code, logotipo do CETI e dados do aluno. Para impressão, recomendamos papel couchê 300g e ativar "Gráficos de Fundo" nas configurações da impressora.</p>
        </div>
      </div>
    </main>
  );
};
