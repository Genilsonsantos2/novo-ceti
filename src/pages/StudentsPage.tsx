import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ full_name: '', enrollment_id: '', grade: '', photo_url: '' });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPhotoPreview(base64);
        setNewStudent({ ...newStudent, photo_url: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Generate a simple unique QR Code ID (could be better UUID in prod)
    const qrCodeId = `QR-${newStudent.enrollment_id}-${Date.now().toString().slice(-4)}`;

    // Use uploaded photo or generate placeholder
    const photoUrl = newStudent.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${newStudent.full_name}&backgroundColor=random`;

    const { error } = await supabase.from('students').insert({
      full_name: newStudent.full_name,
      enrollment_id: newStudent.enrollment_id,
      grade: newStudent.grade,
      qr_code_id: qrCodeId,
      is_authorized: true,
      photo_url: photoUrl,
    });

    if (error) {
      console.error(error);
      alert('Erro ao cadastrar aluno: ' + error.message);
    } else {
      setShowModal(false);
      setNewStudent({ full_name: '', enrollment_id: '', grade: '', photo_url: '' });
      setPhotoPreview(null);
      fetchStudents();
    }
    setSaving(false);
  };

  return (
    <div className="flex-1 px-6 md:px-10 py-8 min-h-screen relative">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 opacity-70">Administração</p>
          <h2 className="font-headline font-extrabold text-3xl text-primary tracking-tight">Gestão de Alunos</h2>
          <p className="text-on-surface-variant font-medium mt-1">Controle de autorizações e matrículas</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link 
            to="/print-cards"
            className="flex-1 md:flex-none justify-center glass-card px-5 py-3 rounded-2xl font-bold hover:scale-[1.02] transition-all duration-300 active:scale-95 flex items-center gap-2 text-sm"
          >
            <span className="material-symbols-outlined text-base">print</span>
            Imprimir Lote
          </Link>
          <button 
            onClick={() => setShowModal(true)}
            className="flex-1 md:flex-none justify-center bg-gradient-to-r from-primary to-primary-container text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-300 active:scale-95 flex items-center gap-2 text-sm"
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            Novo Aluno
          </button>
        </div>
      </header>

      {/* Student count badge */}
      <div className="mb-6 flex items-center gap-3">
        <div className="glass-card px-4 py-2 rounded-xl inline-flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base">group</span>
          <span className="text-xs font-bold text-on-surface-variant">{students.length} aluno{students.length !== 1 ? 's' : ''} cadastrado{students.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Students List - Card-based for mobile, table-like for desktop */}
      <div className="glass-card rounded-[2rem] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/50 border-b border-white/30">
            <tr>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Aluno</th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline hidden md:table-cell">Matrícula</th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Status</th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/30">
            {loading ? (
              <tr><td colSpan={4} className="px-8 py-16 text-center">
                <span className="material-symbols-outlined text-4xl text-outline animate-spin block mb-3">progress_activity</span>
                <span className="text-outline font-medium">Carregando alunos...</span>
              </td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={4} className="px-8 py-16 text-center">
                <span className="material-symbols-outlined text-5xl text-outline/30 block mb-3">school</span>
                <span className="text-outline font-medium">Nenhum aluno cadastrado. Clique em "Novo Aluno" para começar!</span>
              </td></tr>
            ) : students.map((s) => (
              <tr key={s.id} className="hover:bg-white/40 transition-all duration-200 group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img src={s.photo_url} className="w-11 h-11 rounded-xl object-cover ring-2 ring-white shadow-sm group-hover:shadow-md transition-all" alt="" />
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${s.is_authorized ? 'bg-tertiary-fixed' : 'bg-error'}`}></div>
                    </div>
                    <div>
                      <div className="font-bold text-on-surface text-sm">{s.full_name}</div>
                      <div className="text-[11px] text-outline font-medium">{s.grade}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5 font-mono text-xs font-bold text-on-surface-variant hidden md:table-cell">{s.enrollment_id}</td>
                <td className="px-8 py-5">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    s.is_authorized ? 'bg-tertiary-fixed/20 text-on-tertiary-container' : 'bg-error/10 text-error'
                  }`}>
                    <span className="material-symbols-outlined text-xs" style={{fontVariationSettings: "'FILL' 1"}}>{s.is_authorized ? 'check_circle' : 'block'}</span>
                    {s.is_authorized ? 'Ativo' : 'Bloqueado'}
                  </span>
                </td>
                <td className="px-8 py-5">
                  <div className="flex gap-2 items-center">
                    <button 
                      onClick={() => toggleAuthorization(s.id, s.is_authorized)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all hover:scale-105 flex items-center gap-1 ${
                        s.is_authorized 
                          ? 'bg-error/10 text-error hover:bg-error/20' 
                          : 'bg-tertiary-fixed/20 text-on-tertiary-container hover:bg-tertiary-fixed/30'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">{s.is_authorized ? 'lock' : 'lock_open'}</span>
                      {s.is_authorized ? 'Revogar' : 'Autorizar'}
                    </button>
                    <Link 
                      to={`/id/${s.id}`} 
                      className="text-xs font-bold px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all hover:scale-105 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">id_card</span>
                      Cartão
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL NOVO ALUNO */}
      {showModal && (
        <div className="fixed inset-0 bg-on-surface/30 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-container rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-white text-xl">person_add</span>
              </div>
              <div>
                <h3 className="font-headline font-extrabold text-xl text-primary tracking-tight">Novo Aluno</h3>
                <p className="text-xs text-outline font-medium">Preencha os dados abaixo</p>
              </div>
            </div>
            
            <form onSubmit={handleCreateStudent} className="space-y-4">
              {/* Photo Upload */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">Foto do Aluno</label>
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden" 
                    id="photo-input"
                  />
                  <label htmlFor="photo-input" className="flex items-center justify-center gap-2 w-full py-8 bg-white/30 hover:bg-white/50 border-2 border-dashed border-primary/40 rounded-xl cursor-pointer transition-all hover:border-primary/60">
                    {photoPreview ? (
                      <div className="flex flex-col items-center gap-2">
                        <img src={photoPreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
                        <span className="text-[10px] font-bold text-primary">Clique para alterar</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-3xl text-outline/50">camera_alt</span>
                        <span className="text-[10px] font-bold text-outline">Clique ou arraste uma foto</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">Nome Completo</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/40 text-lg">person</span>
                  <input 
                    type="text" required
                    value={newStudent.full_name} onChange={e => setNewStudent({...newStudent, full_name: e.target.value})}
                    className="w-full pl-12 pr-4 py-3.5 bg-white/50 rounded-xl border border-white/80 focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all text-on-surface font-medium"
                    placeholder="Nome do Aluno"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">Matrícula (RM)</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/40 text-lg">tag</span>
                  <input 
                    type="text" required
                    value={newStudent.enrollment_id} onChange={e => setNewStudent({...newStudent, enrollment_id: e.target.value})}
                    className="w-full pl-12 pr-4 py-3.5 bg-white/50 rounded-xl border border-white/80 focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all text-on-surface font-medium"
                    placeholder="123456"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">Série / Turma</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/40 text-lg">class</span>
                  <input 
                    type="text" required
                    value={newStudent.grade} onChange={e => setNewStudent({...newStudent, grade: e.target.value})}
                    className="w-full pl-12 pr-4 py-3.5 bg-white/50 rounded-xl border border-white/80 focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all text-on-surface font-medium"
                    placeholder="3º Ano A"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3.5 glass-card rounded-xl font-bold hover:scale-[1.02] transition-all text-on-surface-variant"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" disabled={saving}
                  className="flex-1 bg-gradient-to-r from-primary to-primary-container text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span> Salvando...</>
                  ) : (
                    <><span className="material-symbols-outlined text-base">save</span> Cadastrar</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
