import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import { useParams } from 'react-router-dom';

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
  if (!student) return <div className="p-10 text-center">Estudante não encontrado.</div>;

  return (
    <main className="max-w-5xl mx-auto p-6 pb-32">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Student ID Card */}
        <div className="w-full lg:w-3/5">
          <div className="mb-6">
            <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary">Identidade Digital</h1>
            <p className="text-outline font-medium">Carteira de Identificação Estudantil</p>
          </div>

          <div className="id-gradient rounded-[2rem] p-8 shadow-[0px_20px_50px_rgba(0,30,64,0.15)] relative overflow-hidden text-white">
            <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-10">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-4xl opacity-80">school</span>
                  <div className="h-8 w-[1px] bg-white/20"></div>
                  <span className="text-xs font-bold tracking-widest uppercase opacity-60">ESTUDANTE</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] uppercase tracking-widest opacity-60">Instituição</span>
                  <span className="font-headline font-bold text-sm">CETI Nova Itarana</span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-8 items-center md:items-end">
                <div className="relative">
                  <div className="w-40 h-52 rounded-2xl overflow-hidden shadow-2xl bg-surface-container-high">
                    <img src={student.photo_url} alt={student.full_name} className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-4 -right-4 bg-tertiary-fixed text-on-tertiary-fixed px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                    ATIVO
                  </div>
                </div>
                <div className="flex-1 space-y-6 text-center md:text-left">
                  <div>
                    <h2 className="font-headline text-2xl font-bold leading-tight uppercase">{student.full_name}</h2>
                    <p className="text-white/60 font-medium tracking-wide mt-1">{student.grade}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] uppercase tracking-widest opacity-60 mb-1">Matrícula</span>
                      <span className="font-bold tracking-wider">{student.enrollment_id}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="w-full lg:w-2/5 space-y-6">
          <div className="bg-surface-container-lowest rounded-[2rem] p-8 shadow-[0px_12px_32px_rgba(25,28,30,0.06)] text-center">
            <p className="text-[10px] uppercase font-bold text-outline tracking-[0.2em] mb-6">APRESENTE PARA SCAN</p>
            <div className="bg-white p-6 rounded-3xl inline-block shadow-inner mb-6 border border-surface-container-high">
              <QRCodeSVG value={student.qr_code_id} size={180} />
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono text-sm text-outline mb-2">ID: {student.qr_code_id}</span>
              <div className="flex items-center gap-1 text-tertiary-fixed-dim text-xs font-bold uppercase">
                <span className="w-2 h-2 rounded-full bg-tertiary-fixed animate-pulse"></span>
                Autenticado
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
