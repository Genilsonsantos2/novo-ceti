import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const AdminUsersPage: React.FC = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="flex-1 px-6 md:px-10 py-8 min-h-screen">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 opacity-70">Segurança</p>
          <h2 className="font-headline font-extrabold text-3xl text-primary tracking-tight">Gestão de Usuários</h2>
          <p className="text-on-surface-variant font-medium mt-1">Controle de acessos e papéis do sistema</p>
        </div>
        <div className="glass-card px-4 py-2 rounded-xl inline-flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base">shield_person</span>
          <span className="text-xs font-bold text-on-surface-variant">{profiles.length} usuário{profiles.length !== 1 ? 's' : ''}</span>
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
    </div>
  );
};
