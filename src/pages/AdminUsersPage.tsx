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
    <div className="flex-1 px-6 md:px-10 py-8 bg-surface min-h-screen">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h2 className="font-headline font-extrabold text-3xl text-primary tracking-tight">Gestão de Usuários</h2>
          <p className="text-outline font-medium">Controle de acessos e papéis do sistema</p>
        </div>
      </header>

      <div className="bg-white rounded-[2rem] overflow-hidden shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
        <table className="w-full text-left">
          <thead className="bg-surface-container-high border-b border-outline-variant">
            <tr>
              <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-outline">Usuário</th>
              <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-outline">Papel Atual</th>
              <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-outline">Ações / Definir Papel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {loading ? (
              <tr><td colSpan={3} className="px-8 py-10 text-center text-outline">Carregando usuários...</td></tr>
            ) : profiles.length === 0 ? (
              <tr><td colSpan={3} className="px-8 py-10 text-center text-outline">Nenhum usuário encontrado.</td></tr>
            ) : profiles.map((p) => (
              <tr key={p.id} className="hover:bg-surface-container-low transition-colors">
                <td className="px-8 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold uppercase">
                      {p.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="font-bold text-on-surface">{p.full_name || 'Usuário sem nome'}</div>
                      <div className="text-xs text-outline font-mono mt-1">{p.id.split('-')[0]}...</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-4">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                    ${p.role === 'DIRETOR' ? 'bg-error-container text-on-error-container' : 
                      p.role === 'PORTEIRO' ? 'bg-secondary-fixed text-on-secondary-fixed' : 
                      'bg-surface-variant text-on-surface-variant'
                    }`}>
                    {p.role || 'ALUNO'}
                  </span>
                </td>
                <td className="px-8 py-4">
                  <div className="flex items-center gap-2">
                    <select 
                      className="bg-surface-container-low border border-outline-variant rounded-xl px-3 py-1.5 text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      value={p.role || 'ALUNO'}
                      onChange={(e) => updateRole(p.id, e.target.value)}
                    >
                      <option value="ALUNO">ALUNO (Visualizador)</option>
                      <option value="PORTEIRO">PORTEIRO (Scanner)</option>
                      <option value="DIRETOR">DIRETOR (Admin Total)</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
