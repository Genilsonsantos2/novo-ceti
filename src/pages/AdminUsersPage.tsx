import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const AdminUsersPage: React.FC = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'PORTEIRO' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) console.error(error);
    else setProfiles(data || []);
    setLoading(false);
  };

  const updateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      console.error(error);
      alert('Erro ao atualizar papel.');
    } else {
      fetchProfiles();
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Use a temporary client to avoid logging out the current admin
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
        // The profile is usually created via trigger in Supabase, 
        // but we need to update the role since the default might be 'ALUNO'
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role: newUser.role, full_name: newUser.name })
          .eq('id', authData.user.id);

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
            onClick={() => setShowAddModal(true)}
            className="flex-1 md:flex-none justify-center bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            Novo Operador
          </button>
          <div className="glass-card px-4 py-3 rounded-xl hidden lg:flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">shield_person</span>
            <span className="text-xs font-bold text-on-surface-variant">{profiles.length} usuários</span>
          </div>
        </div>
      </header>

      {/* Users List - Responsive Layout */}
      <div className="glass-card rounded-[2rem] overflow-hidden border border-white/20">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/50 border-b border-white/30">
              <tr>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Usuário</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Papel Atual</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Definir Papel</th>
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
                      ${p.role === 'DIRETOR' ? 'bg-logo-red/10 text-logo-red' : 
                        p.role === 'PORTEIRO' ? 'bg-secondary/10 text-secondary' : 
                        'bg-outline/10 text-outline'
                      }`}>
                      <span className="material-symbols-outlined text-xs" style={{fontVariationSettings: "'FILL' 1"}}>
                        {p.role === 'DIRETOR' ? 'shield' : p.role === 'PORTEIRO' ? 'door_front' : 'person'}
                      </span>
                      {p.role || 'ALUNO'}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <select 
                      className="bg-white/50 border border-white/80 rounded-xl px-4 py-2.5 text-xs font-black uppercase text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all cursor-pointer hover:bg-white/70"
                      value={p.role || 'ALUNO'}
                      onChange={(e) => updateRole(p.id, e.target.value)}
                    >
                      <option value="ALUNO">👁 ALUNO</option>
                      <option value="PORTEIRO">🚪 PORTEIRO</option>
                      <option value="DIRETOR">🛡 DIRETOR</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden divide-y divide-white/30">
          {loading ? (
            <div className="p-12 text-center text-outline font-medium">Carregando...</div>
          ) : profiles.map((p) => (
            <div key={p.id} className="p-5 flex flex-col gap-4 bg-white/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                  {p.full_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-on-surface text-base truncate">{p.full_name || 'Sem nome'}</div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                      p.role === 'DIRETOR' ? 'bg-logo-red/10 text-logo-red' : 'bg-secondary/10 text-secondary'
                    }`}>
                      {p.role || 'ALUNO'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black uppercase text-outline tracking-widest ml-2">Alterar Cargo:</label>
                <div className="grid grid-cols-3 gap-2">
                  {['ALUNO', 'PORTEIRO', 'DIRETOR'].map((role) => (
                    <button
                      key={role}
                      onClick={() => updateRole(p.id, role)}
                      className={`py-2.5 rounded-xl text-[9px] font-black uppercase transition-all active:scale-95 ${
                        (p.role || 'ALUNO') === role 
                          ? 'bg-primary text-white shadow-md shadow-primary/20' 
                          : 'bg-white/50 text-outline border border-white'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL NOVO USUÁRIO */}
      {showAddModal && (
        <div className="fixed inset-0 bg-on-surface/30 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-[2.5rem] p-8 md:p-10 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-container rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-white text-xl">person_add</span>
              </div>
              <div>
                <h3 className="font-headline font-extrabold text-xl text-primary tracking-tight">Novo Operador</h3>
                <p className="text-xs text-outline font-medium">Cadastre um novo porteiro ou diretor</p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">Nome Completo</label>
                <input 
                  type="text" required
                  value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}
                  className="w-full px-5 py-3.5 bg-white/50 rounded-xl border border-white/80 focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="Ex: João Silva"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">E-mail de Acesso</label>
                <input 
                  type="email" required
                  value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-5 py-3.5 bg-white/50 rounded-xl border border-white/80 focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="porteiro@ceti.com"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">Senha Temporária</label>
                <input 
                  type="password" required minLength={6}
                  value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-5 py-3.5 bg-white/50 rounded-xl border border-white/80 focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">Papel do Sistema</label>
                <select 
                  value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-5 py-3.5 bg-white/50 rounded-xl border border-white/80 focus:ring-2 focus:ring-primary outline-none transition-all"
                >
                  <option value="PORTEIRO">🚪 PORTEIRO</option>
                  <option value="DIRETOR">🛡 DIRETOR</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3.5 glass-card rounded-xl font-bold hover:scale-[1.02] transition-all text-on-surface-variant"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" disabled={creating}
                  className="flex-1 bg-primary text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span> Criando...</>
                  ) : (
                    <><span className="material-symbols-outlined text-base">person_add</span> Cadastrar</>
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
