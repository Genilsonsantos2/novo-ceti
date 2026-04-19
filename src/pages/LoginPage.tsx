import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6">
      <div className="w-full max-w-md bg-white rounded-[2rem] p-10 shadow-[0px_12px_32px_rgba(25,28,30,0.06)]">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary-container rounded-2xl mx-auto mb-4 flex items-center justify-center">
             <span className="material-symbols-outlined text-white text-3xl">school</span>
          </div>
          <h1 className="font-headline text-2xl font-extrabold text-primary tracking-tight">CETI NOVA ITARANA</h1>
          <p className="text-outline font-medium text-sm mt-1">Acesso Institucional</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-2">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-6 py-4 bg-surface-container-high rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 bg-surface-container-high rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-error text-xs font-bold text-center bg-error-container p-3 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <p className="text-center text-[10px] text-outline mt-8 uppercase tracking-[0.2em]">
          Controle de Acesso Digital
        </p>
      </div>
    </div>
  );
};
