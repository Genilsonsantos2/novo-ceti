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
      // Fallback for ALUNO role seeing their own ID, or just first student for now
      query = query.limit(1);
    }

    const { data, error } = await query.single();

    if (error) console.error(error);
    else setStudent(data);
    setLoading(false);
  };

  if (loading) return <div className="p-10 text-center">Carregando carteirinha...</div>;
  if (!student) return <div className="p-10 text-center text-error">Estudante não encontrado.</div>;

  return (
    <main className="max-w-5xl mx-auto p-6 pb-32">
      <div className="mb-10 text-center lg:text-left">
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary">Prévia do Cartão Digital</h1>
        <p className="text-outline font-medium mt-1">Este é o formato final com o QR Code unificado pronto para impressão</p>
      </div>

      <div className="flex justify-center lg:justify-start">
        <StudentBadge student={student} />
      </div>
      
      <div className="mt-10 lg:w-1/2 flex items-center gap-4 bg-tertiary-container text-on-tertiary-container p-6 rounded-3xl">
        <span className="material-symbols-outlined text-4xl">info</span>
        <p className="text-sm font-medium">O QR Code agora fica permanentemente atrelado à parte frontal da identidade impressa, facilitando a rápida aprovação na portaria do colégio.</p>
      </div>
    </main>
  );
};
