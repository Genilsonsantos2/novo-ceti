import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const AdminLayout: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-transparent">
      {/* Sidebar */}
      <aside className="w-64 glass-panel border-r border-white/20 flex flex-col hidden md:flex fixed h-[calc(100vh-2rem)] z-10 top-4 left-4 rounded-[2rem] overflow-hidden">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center p-2 border border-white/50 relative overflow-hidden group">
              {/* Logo Quadrant Accents */}
              <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-logo-orange/10 group-hover:bg-logo-orange/20 transition-colors"></div>
              <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-logo-green/10 group-hover:bg-logo-green/20 transition-colors"></div>
              <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-logo-red/10 group-hover:bg-logo-red/20 transition-colors"></div>
              <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-logo-blue/10 group-hover:bg-logo-blue/20 transition-colors"></div>
              
              <img src="/ceti-logo.png" alt="CETI Logo" className="w-full h-full object-contain relative z-10" />
            </div>
            <div>
              <h1 className="font-headline font-extrabold text-2xl text-primary tracking-tighter leading-none">CETI</h1>
              <p className="text-[10px] text-outline font-bold uppercase tracking-widest mt-1 opacity-80">Nova Itarana</p>
            </div>
          </div>
          <div className="px-1 py-0.5 bg-primary/5 rounded-full inline-block border border-primary/10">
            <p className="text-[8px] text-primary font-black uppercase tracking-[0.2em] px-2">{profile?.role}</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          {profile?.role === 'DIRETOR' && (
            <>
              <NavLink 
                to="/dashboard" 
                className={({isActive}) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all duration-300 ${isActive ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]' : 'text-on-surface hover:bg-white/50 hover:scale-[1.01]'}`}
              >
                <span className="material-symbols-outlined text-lg">space_dashboard</span>
                Dashboard
              </NavLink>

              <NavLink 
                to="/students" 
                className={({isActive}) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all duration-300 ${isActive ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]' : 'text-on-surface hover:bg-white/50 hover:scale-[1.01]'}`}
              >
                <span className="material-symbols-outlined text-lg">badge</span>
                Alunos
              </NavLink>

              <NavLink 
                to="/admin/users" 
                className={({isActive}) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all duration-300 ${isActive ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]' : 'text-on-surface hover:bg-white/50 hover:scale-[1.01]'}`}
              >
                <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                Usuários
              </NavLink>
            </>
          )}

          {(profile?.role === 'DIRETOR' || profile?.role === 'PORTEIRO') && (
            <>
              <NavLink 
                to="/scanner" 
                className={({isActive}) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all duration-300 ${isActive ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]' : 'text-on-surface hover:bg-white/50 hover:scale-[1.01]'}`}
              >
                <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                Portaria
              </NavLink>

              <NavLink 
                to="/exit-report" 
                className={({isActive}) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all duration-300 ${isActive ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]' : 'text-on-surface hover:bg-white/50 hover:scale-[1.01]'}`}
              >
                <span className="material-symbols-outlined text-lg">description</span>
                Relatório Geral
              </NavLink>

              <NavLink 
                to="/lunch-report" 
                className={({isActive}) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all duration-300 ${isActive ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]' : 'text-on-surface hover:bg-white/50 hover:scale-[1.01]'}`}
              >
                <span className="material-symbols-outlined text-lg">restaurant</span>
                Relatório Almoço
              </NavLink>
            </>
          )}

          <NavLink 
            to="/id" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all duration-300 ${isActive ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]' : 'text-on-surface hover:bg-white/50 hover:scale-[1.01]'}`}
          >
            <span className="material-symbols-outlined text-lg">id_card</span>
            Meu Cartão
          </NavLink>
        </nav>

        <div className="p-4 border-t border-white/20">
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-error-container/50 text-on-error-container font-bold hover:bg-error-container transition-all"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-[18rem] w-full mt-4 mr-4 mb-4">
        {/* Mobile Header (Floating styling for mobile too) */}
        <div className="md:hidden glass-panel mx-4 mb-4 rounded-2xl px-6 py-4 flex items-center justify-between sticky top-4 z-40">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
               <span className="material-symbols-outlined text-white text-sm">school</span>
             </div>
             <h1 className="font-headline font-extrabold text-lg text-primary tracking-tight">CETI</h1>
           </div>
           <button onClick={handleSignOut} className="text-error bg-error-container p-2 rounded-lg">
             <span className="material-symbols-outlined text-sm block">logout</span>
           </button>
        </div>
        
        {/* Wrapped Outlet inside a subtle fade animation so pages transition in smoothly */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 w-full h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
