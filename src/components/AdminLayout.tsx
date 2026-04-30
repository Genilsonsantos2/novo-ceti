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
      <aside className="w-64 glass-panel border-r border-white/20 flex flex-col hidden md:flex fixed h-[calc(100vh-2rem)] z-10 top-4 left-4 rounded-[2rem] overflow-hidden print:hidden">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-primary rounded-2xl shadow-xl flex items-center justify-center border border-white/50 relative overflow-hidden group">
              <span className="material-symbols-outlined text-white text-2xl">school</span>
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
          {(profile?.role === 'ADM' || profile?.role === 'DIRETOR') && (
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
                to="/devolutiva" 
                className={({isActive}) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all duration-300 ${isActive ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]' : 'text-on-surface hover:bg-white/50 hover:scale-[1.01]'}`}
              >
                <span className="material-symbols-outlined text-lg">attach_file</span>
                Devolutiva
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

          {(profile?.role === 'ADM' || profile?.role === 'DIRETOR' || profile?.role === 'PORTEIRO') && (
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

              <NavLink 
                to="/provisional-report" 
                className={({isActive}) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all duration-300 ${isActive ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]' : 'text-on-surface hover:bg-white/50 hover:scale-[1.01]'}`}
              >
                <span className="material-symbols-outlined text-lg">edit_note</span>
                Relatório Provisório
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
      <main className="flex-1 md:ml-[18rem] w-full md:mt-4 md:mr-4 md:mb-4 print:ml-0 print:m-0 print:p-0">
        {/* Mobile Header */}
        <div className="md:hidden glass-panel mx-4 mt-4 mb-4 rounded-2xl px-6 py-4 flex items-center justify-between sticky top-4 z-40 print:hidden">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
               <span className="material-symbols-outlined text-white text-sm">school</span>
             </div>
             <h1 className="font-headline font-extrabold text-lg text-primary tracking-tight">CETI</h1>
           </div>
           <div className="flex items-center gap-3">
             <div className="text-right">
               <p className="text-[8px] font-black uppercase text-primary tracking-widest leading-none">{profile?.role}</p>
               <p className="text-[10px] font-bold text-outline leading-tight">{profile?.full_name?.split(' ')[0]}</p>
             </div>
             <button onClick={handleSignOut} className="w-8 h-8 flex items-center justify-center bg-logo-red/10 text-logo-red rounded-lg">
               <span className="material-symbols-outlined text-base">logout</span>
             </button>
           </div>
        </div>
        
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 w-full h-full pb-24 md:pb-0 print:p-0 print:m-0 print:animate-none">
          <Outlet />
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-6 left-4 right-4 h-20 glass-panel rounded-[2rem] border border-white/40 shadow-2xl z-50 flex items-center justify-around px-2 print:hidden">
          {(profile?.role === 'ADM' || profile?.role === 'DIRETOR') && (
            <NavLink to="/dashboard" className={({isActive}) => `flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${isActive ? 'text-primary scale-110' : 'text-outline hover:text-primary/70'}`}>
              <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>space_dashboard</span>
              <span className="text-[8px] font-black uppercase tracking-tighter">Início</span>
            </NavLink>
          )}

          {(profile?.role === 'ADM' || profile?.role === 'DIRETOR' || profile?.role === 'PORTEIRO') && (
            <NavLink 
              to="/scanner" 
              className={({isActive}) => `flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${isActive ? 'text-primary scale-110' : 'text-outline hover:text-primary/70'}`}
            >
              {({ isActive }) => (
                <>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center -mt-8 shadow-lg border-4 border-[#f7f9fc] ${isActive ? 'bg-primary text-white' : 'bg-white text-primary'}`}>
                    <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>qr_code_scanner</span>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-tighter mt-1">Portaria</span>
                </>
              )}
            </NavLink>
          )}

          {(profile?.role === 'ADM' || profile?.role === 'DIRETOR') && (
            <NavLink to="/students" className={({isActive}) => `flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${isActive ? 'text-primary scale-110' : 'text-outline hover:text-primary/70'}`}>
              <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>groups</span>
              <span className="text-[8px] font-black uppercase tracking-tighter">Alunos</span>
            </NavLink>
          )}

          <NavLink to="/exit-report" className={({isActive}) => `flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${isActive ? 'text-primary scale-110' : 'text-outline hover:text-primary/70'}`}>
            <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>description</span>
            <span className="text-[8px] font-black uppercase tracking-tighter">Relatos</span>
          </NavLink>

          <NavLink to="/id" className={({isActive}) => `flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${isActive ? 'text-primary scale-110' : 'text-outline hover:text-primary/70'}`}>
            <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>account_circle</span>
            <span className="text-[8px] font-black uppercase tracking-tighter">Perfil</span>
          </NavLink>
        </nav>
      </main>
    </div>
  );
};
