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
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-[50%] left-[50%] w-[300px] h-[300px] bg-tertiary-fixed/10 rounded-full blur-[80px] animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="w-full max-w-md">
        <div className="glass-panel rounded-[2.5rem] p-10 shadow-2xl">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-container rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-500 hover:scale-105">
               <span className="material-symbols-outlined text-white text-4xl">school</span>
            </div>
            <h1 className="font-headline text-3xl font-extrabold text-primary tracking-tight">CETI</h1>
            <p className="text-outline font-bold text-xs mt-2 uppercase tracking-[0.3em]">Nova Itarana</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">E-mail Institucional</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/50 text-lg">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-white/50 rounded-2xl border border-white/80 focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all text-on-surface font-medium"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">Senha de Acesso</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/50 text-lg">lock</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-white/50 rounded-2xl border border-white/80 focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all text-on-surface font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 bg-error/10 text-error p-4 rounded-2xl border border-error/20">
                <span className="material-symbols-outlined text-lg" style={{fontVariationSettings: "'FILL' 1"}}>error</span>
                <p className="text-xs font-bold">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-primary-container text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                  Entrando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">login</span>
                  Entrar no Sistema
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-outline/60 mt-6 uppercase tracking-[0.25em] font-bold">
          Controle de Acesso Digital • 2026
        </p>
      </div>
    </div>
  );
};
