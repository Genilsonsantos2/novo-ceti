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
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-outline-variant flex flex-col hidden md:flex fixed h-full z-10">
        <div className="p-6">
          <h1 className="font-headline font-extrabold text-2xl text-primary tracking-tight">CETI Admin</h1>
          <p className="text-xs text-outline font-medium uppercase tracking-widest mt-1">{profile?.role}</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {profile?.role === 'DIRETOR' && (
            <>
              <NavLink 
                to="/dashboard" 
                className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${isActive ? 'bg-primary-fixed text-on-primary-fixed' : 'text-on-surface hover:bg-surface-container-low'}`}
              >
                <span className="material-symbols-outlined">dashboard</span>
                Dashboard
              </NavLink>

              <NavLink 
                to="/students" 
                className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${isActive ? 'bg-primary-fixed text-on-primary-fixed' : 'text-on-surface hover:bg-surface-container-low'}`}
              >
                <span className="material-symbols-outlined">school</span>
                Alunos
              </NavLink>

              <NavLink 
                to="/admin/users" 
                className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${isActive ? 'bg-primary-fixed text-on-primary-fixed' : 'text-on-surface hover:bg-surface-container-low'}`}
              >
                <span className="material-symbols-outlined">admin_panel_settings</span>
                Usuários
              </NavLink>
            </>
          )}

          {(profile?.role === 'DIRETOR' || profile?.role === 'PORTEIRO') && (
            <NavLink 
              to="/scanner" 
              className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${isActive ? 'bg-primary-fixed text-on-primary-fixed' : 'text-on-surface hover:bg-surface-container-low'}`}
            >
              <span className="material-symbols-outlined">qr_code_scanner</span>
              Scanner
            </NavLink>
          )}

          <NavLink 
            to="/id" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${isActive ? 'bg-primary-fixed text-on-primary-fixed' : 'text-on-surface hover:bg-surface-container-low'}`}
          >
            <span className="material-symbols-outlined">badge</span>
            Identidade Digital
          </NavLink>
        </nav>

        <div className="p-4 border-t border-outline-variant">
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-error-container text-on-error-container font-bold hover:bg-error-container/80 transition-colors"
          >
            <span className="material-symbols-outlined">logout</span>
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 w-full">
        {/* Mobile Header */}
        <div className="md:hidden bg-white px-6 py-4 flex items-center justify-between border-b border-outline-variant sticky top-0 z-10">
           <h1 className="font-headline font-extrabold text-xl text-primary tracking-tight">CETI</h1>
           <button onClick={handleSignOut} className="text-on-error-container">
             <span className="material-symbols-outlined">logout</span>
           </button>
        </div>
        
        <Outlet />
      </main>
    </div>
  );
};
