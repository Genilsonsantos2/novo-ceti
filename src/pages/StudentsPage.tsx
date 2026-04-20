import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ full_name: '', enrollment_id: '', grade: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*, student_authorizations(*)');

    if (error) console.error(error);
    else setStudents(data || []);
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

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Generate a simple unique QR Code ID (could be better UUID in prod)
    const qrCodeId = `QR-${newStudent.enrollment_id}-${Date.now().toString().slice(-4)}`;

    const { error } = await supabase.from('students').insert({
      full_name: newStudent.full_name,
      enrollment_id: newStudent.enrollment_id,
      grade: newStudent.grade,
      qr_code_id: qrCodeId,
      is_authorized: true, // true by default
      photo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${newStudent.full_name}`, // placeholder avatar
    });

    if (error) {
      console.error(error);
      alert('Erro ao cadastrar aluno: ' + error.message);
    } else {
      setShowModal(false);
      setNewStudent({ full_name: '', enrollment_id: '', grade: '' });
      fetchStudents();
    }
    setSaving(false);
  };

  return (
    <div className="flex-1 px-6 md:px-10 py-8 bg-surface min-h-screen relative">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-headline font-extrabold text-3xl text-primary tracking-tight">Gestão de Alunos</h2>
          <p className="text-outline font-medium">Controle de autorizações e matrículas</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <Link 
            to="/print-cards"
            className="flex-1 md:flex-none justify-center bg-surface-container-highest text-on-surface px-6 py-3 rounded-full font-bold shadow-sm hover:bg-outline-variant transition-all active:scale-95 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            Imprimir Lote
          </Link>
          <button 
            onClick={() => setShowModal(true)}
            className="flex-1 md:flex-none justify-center bg-primary text-white px-6 py-3 rounded-full font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Novo Aluno
          </button>
        </div>
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
              <tr><td colSpan={4} className="px-8 py-10 text-center text-outline font-medium">Carregando alunos...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={4} className="px-8 py-10 text-center text-outline font-medium">Nenhum aluno cadastrado. Adicione um!</td></tr>
            ) : students.map((s) => (
              <tr key={s.id} className="hover:bg-surface-container-low transition-colors">
                <td className="px-8 py-4">
                  <div className="flex items-center gap-4">
                    <img src={s.photo_url} className="w-10 h-10 rounded-xl object-cover shadow-sm bg-surface-container-highest" alt="" />
                    <div>
                      <div className="font-bold text-on-surface">{s.full_name}</div>
                      <div className="text-xs text-outline font-medium">{s.grade}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-4 font-mono text-sm font-medium">{s.enrollment_id}</td>
                <td className="px-8 py-4">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    s.is_authorized ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-error-container text-on-error-container'
                  }`}>
                    {s.is_authorized ? 'Autorizado' : 'Bloqueado'}
                  </span>
                </td>
                <td className="px-8 py-4 flex gap-4 items-center h-full mt-2">
                  <button 
                    onClick={() => toggleAuthorization(s.id, s.is_authorized)}
                    className="text-primary text-xs font-bold hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">{s.is_authorized ? 'block' : 'check_circle'}</span>
                    {s.is_authorized ? 'Revogar Saída' : 'Autorizar Saída'}
                  </button>
                  <Link 
                    to={`/id/${s.id}`} 
                    className="text-secondary text-xs font-bold hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">badge</span>
                    Ver ID
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL NOVO ALUNO */}
      {showModal && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-headline font-extrabold text-2xl text-primary tracking-tight mb-6">Cadastrar Aluno</h3>
            
            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-2">Nome Completo</label>
                <input 
                  type="text" required
                  value={newStudent.full_name} onChange={e => setNewStudent({...newStudent, full_name: e.target.value})}
                  className="w-full px-4 py-3 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Nome do Aluno"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-2">Matrícula (RM)</label>
                <input 
                  type="text" required
                  value={newStudent.enrollment_id} onChange={e => setNewStudent({...newStudent, enrollment_id: e.target.value})}
                  className="w-full px-4 py-3 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary outline-none"
                  placeholder="123456"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-2">Série / Turma</label>
                <input 
                  type="text" required
                  value={newStudent.grade} onChange={e => setNewStudent({...newStudent, grade: e.target.value})}
                  className="w-full px-4 py-3 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary outline-none"
                  placeholder="3º Ano A"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-on-surface-variant bg-surface-container-highest rounded-xl font-bold hover:bg-outline-variant transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" disabled={saving}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Salvando...' : 'Salvar Aluno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
