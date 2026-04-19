import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*, student_authorizations(*)');

    if (error) console.error(error);
    else setStudents(data);
    setLoading(false);
  };

  const toggleAuthorization = async (studentId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('students')
      .update({ is_authorized: !currentStatus })
      .eq('id', studentId);

    if (error) console.error(error);
    else fetchStudents();
  };

  return (
    <div className="flex-1 px-6 md:px-10 py-8 bg-surface min-h-screen">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h2 className="font-headline font-extrabold text-3xl text-primary tracking-tight">Gestão de Alunos</h2>
          <p className="text-outline font-medium">Controle de autorizações e matrículas</p>
        </div>
        <button className="bg-primary text-white px-6 py-3 rounded-full font-bold shadow-md hover:shadow-lg transition-all active:scale-95">
          Novo Aluno
        </button>
      </header>

      <div className="bg-white rounded-[2rem] overflow-hidden shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
        <table className="w-full text-left">
          <thead className="bg-surface-container-high border-b border-outline-variant">
            <tr>
              <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-outline">Aluno</th>
              <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-outline">Matrícula</th>
              <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-outline">Status</th>
              <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-outline">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {loading ? (
              <tr><td colSpan={4} className="px-8 py-10 text-center text-outline">Carregando alunos...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={4} className="px-8 py-10 text-center text-outline">Nenhum aluno cadastrado.</td></tr>
            ) : students.map((s) => (
              <tr key={s.id} className="hover:bg-surface-container-low transition-colors">
                <td className="px-8 py-4">
                  <div className="flex items-center gap-4">
                    <img src={s.photo_url} className="w-10 h-10 rounded-xl object-cover" alt="" />
                    <div>
                      <div className="font-bold text-on-surface">{s.full_name}</div>
                      <div className="text-xs text-outline">{s.grade}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-4 font-mono text-sm">{s.enrollment_id}</td>
                <td className="px-8 py-4">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase ${
                    s.is_authorized ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-error-container text-on-error-container'
                  }`}>
                    {s.is_authorized ? 'Autorizado' : 'Bloqueado'}
                  </span>
                </td>
                <td className="px-8 py-4">
                  <button 
                    onClick={() => toggleAuthorization(s.id, s.is_authorized)}
                    className="text-primary text-xs font-bold hover:underline"
                  >
                    {s.is_authorized ? 'Revogar Saída' : 'Autorizar Saída'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
