import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TermDevolutivaModal } from '../components/TermDevolutivaModal';

export const DevolutivaPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const processStats = useMemo(() => ({
    total: students.length,
    regularizados: students.filter((student) => student.term_attachments?.length > 0).length,
    pendentes: students.filter((student) => !student.term_attachments?.length).length,
  }), [students]);

  useEffect(() => {
    if (searchTerm.length >= 3) {
      const timer = window.setTimeout(searchStudents, 300);
      return () => window.clearTimeout(timer);
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
    <div className="flex-1 px-4 md:px-10 py-6 md:py-8 min-h-screen">
      <header className="relative overflow-hidden rounded-[2rem] bg-[#071b33] text-white p-6 md:p-9 mb-7 shadow-2xl shadow-[#071b33]/20">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[24px] border-[#c79b52]/20" />
        <div className="absolute right-10 -bottom-28 h-52 w-52 rounded-full border border-white/10" />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className="material-symbols-outlined text-[#d7b16a] text-2xl">account_balance</span>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#d7b16a]">Secretaria • Núcleo de registros</p>
            </div>
            <h2 className="font-headline font-extrabold text-3xl md:text-4xl tracking-tight">Central de Processos</h2>
            <p className="text-blue-100/70 font-medium mt-2 max-w-xl">Gestão, conferência e protocolo dos termos de autorização dos estudantes.</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-100/70 border border-white/15 rounded-xl px-3 py-2 w-fit">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" /> Sistema operacional
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Processos em consulta', value: processStats.total, icon: 'folder_copy', tone: 'text-primary bg-primary/10' },
            { label: 'Termos regularizados', value: processStats.regularizados, icon: 'verified', tone: 'text-emerald-700 bg-emerald-100' },
            { label: 'Aguardando devolutiva', value: processStats.pendentes, icon: 'pending_actions', tone: 'text-amber-700 bg-amber-100' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-2xl px-4 py-4 flex items-center gap-3 border border-white/30">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.tone}`}><span className="material-symbols-outlined">{stat.icon}</span></div>
              <div><p className="text-2xl font-black text-on-surface leading-none">{stat.value}</p><p className="text-[9px] font-black uppercase tracking-wider text-outline mt-1">{stat.label}</p></div>
            </div>
          ))}
        </div>

        <div className="glass-card p-5 md:p-6 rounded-3xl border border-white/30 shadow-xl mb-7">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b2843d]">Pesquisa de autos</p>
              <h3 className="font-headline text-lg font-extrabold text-on-surface mt-1">Localizar processo do estudante</h3>
            </div>
            <span className="material-symbols-outlined text-outline/50 hidden sm:block">manage_search</span>
          </div>
          <div className="flex items-center gap-4 px-5 py-4 bg-white/70 dark:bg-zinc-900/60 rounded-2xl border border-gray-200 dark:border-zinc-700 focus-within:border-[#b2843d] focus-within:ring-4 focus-within:ring-[#b2843d]/10 transition-all">
            <span className="material-symbols-outlined text-primary text-2xl">search</span>
            <input
              type="text"
              placeholder="Digite o nome ou matrícula do aluno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-lg font-bold text-gray-700 w-full outline-none placeholder:text-gray-400"
              autoFocus
            />
            {searchTerm && <button type="button" onClick={() => setSearchTerm('')} className="text-outline hover:text-primary" title="Limpar pesquisa"><span className="material-symbols-outlined">close</span></button>}
          </div>
          <p className="text-[10px] text-outline font-bold uppercase tracking-widest mt-3 ml-2 opacity-70">
            {searchTerm.length < 3 ? 'Busque por nome completo ou número da matrícula (RM)' : loading ? 'Atualizando consulta...' : `${students.length} processo(s) localizado(s)`}
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
                className="glass-card p-5 md:p-6 rounded-2xl border border-white/30 hover:border-[#c79b52]/70 hover:bg-[#c79b52]/5 transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-5"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img 
                      src={student.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${student.full_name}`} 
                      alt="" 
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-sm"
                    />
                    {student.term_attachments && student.term_attachments.length > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm border-2 border-white">
                        <span className="material-symbols-outlined text-[10px] font-bold">verified</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#b2843d] mb-1">PROC. RM-{student.enrollment_id || 'PENDENTE'}</p>
                    <h4 className="font-headline font-extrabold text-gray-900 dark:text-white notranslate" translate="no">{student.full_name}</h4>
                    <p className="text-xs text-outline font-medium mt-1">Matrícula <span className="font-mono font-bold text-on-surface">{student.enrollment_id || 'Não informada'}</span> <span className="mx-1">•</span> {student.grade || 'Turma não informada'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 sm:min-w-[225px]">
                  <span className={`text-[9px] font-black uppercase tracking-wider ${student.term_attachments?.length ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {student.term_attachments?.length ? 'Autos regularizados' : 'Aguardando termo'}
                  </span>
                  <button
                    onClick={() => setSelectedStudent(student)}
                    className="px-4 py-3 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-wider shadow-lg shadow-primary/20 hover:bg-[#b2843d] active:scale-95 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">gavel</span>
                    Abrir autos
                  </button>
                </div>
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
