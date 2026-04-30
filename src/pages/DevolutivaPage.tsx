import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TermDevolutivaModal } from '../components/TermDevolutivaModal';

export const DevolutivaPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  useEffect(() => {
    if (searchTerm.length >= 3) {
      searchStudents();
    } else if (searchTerm.length === 0) {
      setStudents([]);
    }
  }, [searchTerm]);

  const searchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('*, term_attachments(id)')
      .or(`full_name.ilike.%${searchTerm}%,enrollment_id.ilike.%${searchTerm}%`)
      .limit(10);

    if (error) {
      console.error('Erro ao pesquisar:', error);
    } else {
      setStudents(data || []);
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 px-6 md:px-10 py-8 min-h-screen">
      <header className="mb-10">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 opacity-70">Secretaria</p>
        <h2 className="font-headline font-extrabold text-3xl text-primary tracking-tight">Devolutiva do Termo</h2>
        <p className="text-on-surface-variant font-medium mt-1">Pesquise o aluno para anexar o termo assinado</p>
      </header>

      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-6 rounded-[2.5rem] border border-white/20 shadow-xl mb-8">
          <div className="flex items-center gap-4 px-5 py-4 bg-white/60 rounded-2xl border border-gray-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all">
            <span className="material-symbols-outlined text-primary text-2xl">search</span>
            <input
              type="text"
              placeholder="Digite o nome ou matrícula do aluno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-lg font-bold text-gray-700 w-full outline-none placeholder:text-gray-400"
              autoFocus
            />
          </div>
          <p className="text-[10px] text-outline font-bold uppercase tracking-widest mt-4 ml-4 opacity-60">
            {searchTerm.length < 3 ? 'Digite pelo menos 3 caracteres' : `Encontrados ${students.length} resultados`}
          </p>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center py-12">
              <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
              <p className="text-sm font-bold text-outline mt-4">Buscando aluno...</p>
            </div>
          ) : students.length > 0 ? (
            students.map((student) => (
              <div 
                key={student.id}
                className="glass-card p-5 rounded-3xl border border-white/20 hover:border-primary/30 hover:bg-primary/5 transition-all group flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img 
                      src={student.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${student.full_name}`} 
                      alt="" 
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-sm"
                    />
                    {student.term_attachments && student.term_attachments.length > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm border-2 border-white">
                        <span className="material-symbols-outlined text-[10px] font-bold">verified</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 notranslate" translate="no">{student.full_name}</h4>
                    <p className="text-xs text-outline font-medium">#{student.enrollment_id} • {student.grade}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedStudent(student)}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-wider shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">attach_file</span>
                  Gerenciar Termos
                </button>
              </div>
            ))
          ) : searchTerm.length >= 3 ? (
            <div className="text-center py-12 glass-card rounded-[2rem] border-dashed border-2 border-gray-200">
              <span className="material-symbols-outlined text-5xl text-gray-300 mb-2">person_search</span>
              <p className="text-gray-500 font-bold">Nenhum aluno encontrado</p>
              <p className="text-gray-400 text-xs">Verifique a grafia ou o número da matrícula</p>
            </div>
          ) : (
            <div className="text-center py-16 opacity-30">
               <span className="material-symbols-outlined text-8xl mb-2">manage_search</span>
               <p className="font-bold uppercase tracking-widest text-sm">Aguardando busca</p>
            </div>
          )}
        </div>
      </div>

      {selectedStudent && (
        <TermDevolutivaModal
          student={selectedStudent}
          onClose={() => {
            setSelectedStudent(null);
            searchStudents(); // Refresh to update attachment count
          }}
        />
      )}
    </div>
  );
};
