import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';

export const AbsencesReportPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  
  const [absences, setAbsences] = useState<any[]>([]);
  const [loadingAbsences, setLoadingAbsences] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Form states
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [recordType, setRecordType] = useState('FALTA_JUSTIFICADA');
  const [recordDate, setRecordDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [recordReason, setRecordReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (searchTerm.length >= 3) {
      searchStudents();
    } else if (searchTerm.length === 0) {
      setStudents([]);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchAbsences();
    
    // Subscribe to real-time changes
    const subscription = supabase
      .channel('public:student_absences')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_absences' }, () => {
        fetchAbsences();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [startDate, endDate]);

  const searchStudents = async () => {
    setLoadingSearch(true);
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .or(`full_name.ilike.%${searchTerm}%,enrollment_id.ilike.%${searchTerm}%`)
      .limit(5);

    if (error) {
      console.error('Erro ao pesquisar alunos:', error);
    } else {
      setStudents(data || []);
    }
    setLoadingSearch(false);
  };

  const fetchAbsences = async () => {
    setLoadingAbsences(true);
    const { data, error } = await supabase
      .from('student_absences')
      .select('*, students(full_name, enrollment_id, grade, photo_url), auth_users:created_by(email)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar faltas:', error);
    } else {
      setAbsences(data || []);
    }
    setLoadingAbsences(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setIsSubmitting(true);
    const { data: userData } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('student_absences')
      .insert([
        {
          student_id: selectedStudent.id,
          type: recordType,
          date: recordDate,
          reason: recordReason,
          created_by: userData.user?.id
        }
      ]);

    if (error) {
      alert('Erro ao registrar: ' + error.message);
    } else {
      setSelectedStudent(null);
      setSearchTerm('');
      setRecordReason('');
      setRecordDate(format(new Date(), 'yyyy-MM-dd'));
      alert('Registrado com sucesso!');
    }
    setIsSubmitting(false);
  };

  const handleSyncSigeduc = async (id: string) => {
    const { error } = await supabase
      .from('student_absences')
      .update({ sigeduc_synced: true })
      .eq('id', id);
      
    if (error) {
      alert('Erro ao atualizar status: ' + error.message);
    }
  };

  const pendentesCount = absences.filter(a => !a.sigeduc_synced).length;
  const faltasCount = absences.filter(a => a.type === 'FALTA_JUSTIFICADA').length;
  const abonosCount = absences.filter(a => a.type === 'ABONO').length;

  return (
    <div className="flex-1 px-6 md:px-10 py-8 min-h-screen pb-32">
      <header className="mb-8">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 opacity-70">Controle Operacional</p>
        <h2 className="font-headline font-extrabold text-3xl text-primary tracking-tight">Gestão de Faltas e Abonos</h2>
        <p className="text-on-surface-variant font-medium mt-1">Monitore e garanta a sincronização com o Sigeduc</p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card rounded-[2rem] p-6 border-l-4 border-l-rose-500 relative overflow-hidden group">
          <div className="absolute inset-0 bg-rose-500/5 group-hover:bg-rose-500/10 transition-colors"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-outline text-[10px] font-bold uppercase tracking-widest">Pendentes Sigeduc</p>
              <p className="text-4xl font-headline font-extrabold text-rose-500 mt-1">{pendentesCount}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-rose-500 text-2xl">sync_problem</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-[2rem] p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-outline text-[10px] font-bold uppercase tracking-widest">Faltas no Período</p>
              <p className="text-4xl font-headline font-extrabold text-blue-500 mt-1">{faltasCount}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-500 text-2xl">person_off</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-[2rem] p-6 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-outline text-[10px] font-bold uppercase tracking-widest">Abonos no Período</p>
              <p className="text-4xl font-headline font-extrabold text-emerald-500 mt-1">{abonosCount}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-500 text-2xl">event_available</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Registration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 rounded-[2rem] border border-white/20 shadow-xl relative overflow-hidden">
            <h3 className="font-bold text-lg text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">person_add</span>
              Novo Registro
            </h3>
            
            {!selectedStudent ? (
              <div>
                <div className="flex items-center gap-3 px-4 py-3 bg-white/60 rounded-xl border border-gray-200 focus-within:border-primary transition-all mb-4">
                  <span className="material-symbols-outlined text-primary text-xl">search</span>
                  <input
                    type="text"
                    placeholder="Pesquisar aluno..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none text-sm font-bold text-gray-700 w-full outline-none"
                  />
                </div>
                
                {loadingSearch && <p className="text-xs text-center text-gray-500 my-4">Buscando...</p>}
                
                <div className="space-y-2">
                  {students.map(student => (
                    <div 
                      key={student.id} 
                      onClick={() => setSelectedStudent(student)}
                      className="p-3 bg-white/40 rounded-xl border border-gray-100 hover:border-primary/40 hover:bg-primary/5 cursor-pointer flex items-center gap-3 transition-all"
                    >
                      <img src={student.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${student.full_name}`} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      <div>
                        <p className="text-xs font-bold text-gray-800 line-clamp-1">{student.full_name}</p>
                        <p className="text-[10px] text-gray-500">{student.grade}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-xl border border-primary/20">
                  <div className="flex items-center gap-3">
                    <img src={selectedStudent.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedStudent.full_name}`} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    <div>
                      <p className="text-sm font-bold text-primary line-clamp-1">{selectedStudent.full_name}</p>
                      <p className="text-[10px] text-primary/70">{selectedStudent.grade}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-red-500">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Tipo de Registro</label>
                  <select 
                    value={recordType} 
                    onChange={e => setRecordType(e.target.value)}
                    className="w-full px-4 py-3 bg-white/60 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm font-bold text-gray-700"
                  >
                    <option value="FALTA_JUSTIFICADA">Falta Justificada</option>
                    <option value="ABONO">Abono</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Data</label>
                  <input 
                    type="date" 
                    value={recordDate}
                    onChange={e => setRecordDate(e.target.value)}
                    className="w-full px-4 py-3 bg-white/60 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm font-bold text-gray-700"
                    required
                  />
                </div>
                
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Motivo / Justificativa</label>
                  <textarea 
                    value={recordReason}
                    onChange={e => setRecordReason(e.target.value)}
                    placeholder="Ex: Atestado médico, Problemas de saúde, etc."
                    className="w-full px-4 py-3 bg-white/60 rounded-xl border border-gray-200 outline-none focus:border-primary text-sm text-gray-700 resize-none h-24"
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Registrar'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Records Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 rounded-[2rem] border border-white/20 shadow-xl min-h-[500px]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">fact_check</span>
                Controle de Registros
              </h3>
              
              <div className="flex items-center gap-3">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="px-3 py-2 bg-white/60 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 outline-none"
                />
                <span className="text-gray-400">até</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="px-3 py-2 bg-white/60 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 outline-none"
                />
              </div>
            </div>

            {loadingAbsences ? (
              <div className="flex justify-center py-20">
                <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
              </div>
            ) : absences.length === 0 ? (
              <div className="text-center py-20 opacity-40">
                <span className="material-symbols-outlined text-6xl mb-2">event_available</span>
                <p className="font-bold uppercase tracking-widest text-sm">Nenhum registro no período</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200/50">
                      <th className="py-3 px-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Aluno</th>
                      <th className="py-3 px-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Tipo/Data</th>
                      <th className="py-3 px-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Sigeduc</th>
                      <th className="py-3 px-4 text-[10px] font-black uppercase text-gray-400 tracking-wider text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {absences.map((record) => (
                      <tr key={record.id} className="border-b border-gray-100/50 hover:bg-white/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img src={record.students?.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${record.students?.full_name}`} alt="" className="w-8 h-8 rounded-lg object-cover" />
                            <div>
                              <p className="text-sm font-bold text-gray-800 line-clamp-1">{record.students?.full_name}</p>
                              <p className="text-[10px] text-gray-500">
                                {record.students?.grade} {record.auth_users?.email ? `• Reg: ${record.auth_users.email.split('@')[0]}` : ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-xs font-bold text-gray-700">
                            {record.type === 'FALTA_JUSTIFICADA' ? 'Falta Just.' : 'Abono'}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {format(parseISO(record.date), 'dd/MM/yyyy')}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          {record.sigeduc_synced ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-200">
                              <span className="material-symbols-outlined text-[12px]">check_circle</span>
                              Baixado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-widest border border-rose-200 animate-pulse">
                              <span className="material-symbols-outlined text-[12px]">warning</span>
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!record.sigeduc_synced && (
                            <button 
                              onClick={() => handleSyncSigeduc(record.id)}
                              className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                            >
                              Baixar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
