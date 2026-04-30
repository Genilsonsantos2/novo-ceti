import React from 'react';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const AdminUsersPage: React.FC = () => {
  const [profiles, setProfiles] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [newUser, setNewUser] = React.useState({ name: '', email: '', password: '', role: 'PORTEIRO' });
  const [editingUser, setEditingUser] = React.useState<any>(null);
  const [creating, setCreating] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);

  React.useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Erro ao buscar perfis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUpdating(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: editingUser.full_name,
          role: editingUser.role 
        })
        .eq('id', editingUser.id);

      if (error) throw error;
      
      setShowEditModal(false);
      setEditingUser(null);
      fetchProfiles();
    } catch (error: any) {
      alert('Erro ao atualizar usuário: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja remover o acesso deste usuário?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      fetchProfiles();
    } catch (error: any) {
      alert('Erro ao excluir usuário: ' + error.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      );

      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.name,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({ 
            id: authData.user.id,
            full_name: newUser.name,
            role: newUser.role,
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.warn('User created but profile role update failed:', profileError);
        }
        
        alert('Usuário cadastrado com sucesso!');
        setShowAddModal(false);
        setNewUser({ name: '', email: '', password: '', role: 'PORTEIRO' });
        fetchProfiles();
      }
    } catch (err: any) {
      alert('Erro ao criar usuário: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 px-6 md:px-10 py-8 min-h-screen">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 opacity-70">Segurança</p>
          <h2 className="font-headline font-extrabold text-3xl text-primary tracking-tight">Gestão de Usuários</h2>
          <p className="text-on-surface-variant font-medium mt-1">Controle de acessos e papéis do sistema</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={fetchProfiles}
            className="p-3 bg-white/50 rounded-2xl text-primary hover:bg-white transition-all active:scale-95 border border-white/20"
            title="Atualizar Lista"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex-1 md:flex-none justify-center bg-primary text-white px-6 py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 hover:scale-[1.02] transition-all active:scale-95 flex items-center gap-3 border-b-4 border-primary-container"
          >
            <span className="material-symbols-outlined text-xl">person_add</span>
            <span className="tracking-tight">Cadastrar Usuário</span>
          </button>
          <div className="glass-card px-4 py-3 rounded-xl hidden lg:flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">shield_person</span>
            <span className="text-xs font-bold text-on-surface-variant">{profiles.length} usuários</span>
          </div>
        </div>
      </header>

      <div className="glass-card rounded-[2rem] overflow-hidden border border-white/20">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/50 border-b border-white/30">
              <tr>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Usuário</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Papel Atual</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/30">
              {loading ? (
                <tr><td colSpan={3} className="px-8 py-16 text-center">
                  <span className="material-symbols-outlined text-4xl text-outline animate-spin block mb-3">progress_activity</span>
                  <span className="text-outline font-medium">Carregando usuários...</span>
                </td></tr>
              ) : profiles.length === 0 ? (
                <tr><td colSpan={3} className="px-8 py-16 text-center">
                  <span className="material-symbols-outlined text-5xl text-outline/30 block mb-3">person_off</span>
                  <span className="text-outline font-medium">Nenhum usuário encontrado.</span>
                </td></tr>
              ) : profiles.map((p) => (
                <tr key={p.id} className="hover:bg-white/40 transition-all duration-200 group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold uppercase text-lg group-hover:shadow-md transition-all">
                        {p.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="font-bold text-on-surface text-sm">{p.full_name || 'Usuário sem nome'}</div>
                        <div className="text-[11px] text-outline font-mono">{p.id.split('-')[0]}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                      ${p.role === 'ADM' ? 'bg-primary/10 text-primary' : 
                        p.role === 'DIRETOR' ? 'bg-logo-red/10 text-logo-red' : 
                        p.role === 'PORTEIRO' ? 'bg-secondary/10 text-secondary' : 
                        'bg-outline/10 text-outline'
                      }`}>
                      <span className="material-symbols-outlined text-xs" style={{fontVariationSettings: "'FILL' 1"}}>
                        {p.role === 'ADM' ? 'workspace_premium' : p.role === 'DIRETOR' ? 'shield' : p.role === 'PORTEIRO' ? 'door_front' : 'person'}
                      </span>
                      {p.role || 'ALUNO'}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setEditingUser(p); setShowEditModal(true); }}
                        className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(p.id)}
                        className="p-2 rounded-xl bg-logo-red/10 text-logo-red hover:bg-logo-red hover:text-white transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-white/30">
          {loading ? (
            <div className="p-12 text-center text-outline font-medium">Carregando...</div>
          ) : profiles.map((p) => (
            <div key={p.id} className="p-5 flex flex-col gap-4 bg-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                    {p.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-on-surface text-base truncate">{p.full_name || 'Sem nome'}</div>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                      p.role === 'ADM' ? 'bg-primary/10 text-primary' :
                      p.role === 'DIRETOR' ? 'bg-logo-red/10 text-logo-red' : 'bg-secondary/10 text-secondary'
                    }`}>
                      {p.role || 'ALUNO'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingUser(p); setShowEditModal(true); }} className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><span className="material-symbols-outlined text-base">edit</span></button>
                  <button onClick={() => handleDeleteUser(p.id)} className="w-10 h-10 rounded-xl bg-logo-red/10 text-logo-red flex items-center justify-center"><span className="material-symbols-outlined text-base">delete</span></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-on-surface/30 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-[2.5rem] p-8 md:p-10 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-container rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-white text-xl">person_add</span>
              </div>
              <div>
                <h3 className="font-headline font-extrabold text-xl text-primary tracking-tight">Cadastrar Novo Usuário</h3>
                <p className="text-xs text-outline font-medium">Crie uma conta para um novo colaborador</p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">Nome Completo</label>
                <input type="text" required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full px-5 py-3.5 bg-white/50 rounded-xl border border-white/80 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">E-mail de Acesso</label>
                <input type="email" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full px-5 py-3.5 bg-white/50 rounded-xl border border-white/80 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">Senha Temporária</label>
                <input type="password" required minLength={6} value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full px-5 py-3.5 bg-white/50 rounded-xl border border-white/80 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">Papel do Sistema</label>
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full px-5 py-3.5 bg-white/50 rounded-xl border border-white/80 outline-none transition-all">
                  <option value="PORTEIRO">🚪 PORTEIRO</option>
                  <option value="DIRETOR">🛡 DIRETOR</option>
                  <option value="ADM">👑 ADMINISTRADOR</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3.5 glass-card rounded-xl font-bold">Cancelar</button>
                <button type="submit" disabled={creating} className="flex-1 bg-primary text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/20 disabled:opacity-50">{creating ? 'Criando...' : 'Cadastrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-on-surface/30 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-[2.5rem] p-8 md:p-10 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-container rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-white text-xl">edit</span>
              </div>
              <div>
                <h3 className="font-headline font-extrabold text-xl text-primary tracking-tight">Editar Usuário</h3>
                <p className="text-xs text-outline font-medium">Atualize os dados do operador</p>
              </div>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">Nome Completo</label>
                <input type="text" required value={editingUser.full_name} onChange={e => setEditingUser({...editingUser, full_name: e.target.value})} className="w-full px-5 py-3.5 bg-white/50 rounded-xl border border-white/80 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">Papel do Sistema</label>
                <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})} className="w-full px-5 py-3.5 bg-white/50 rounded-xl border border-white/80 outline-none transition-all">
                  <option value="ALUNO">👁 ALUNO</option>
                  <option value="PORTEIRO">🚪 PORTEIRO</option>
                  <option value="DIRETOR">🛡 DIRETOR</option>
                  <option value="ADM">👑 ADMINISTRADOR</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-3.5 glass-card rounded-xl font-bold">Cancelar</button>
                <button type="submit" disabled={updating} className="flex-1 bg-primary text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/20 disabled:opacity-50">{updating ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
