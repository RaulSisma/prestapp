import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, DollarSign, 
  Route as RouteIcon, UserCheck, FileText, 
  RotateCcw, Shield, Menu, X, Smartphone, Key, LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { UserProfileModal } from '../components/UserProfileModal';

export const MainLayout: React.FC = () => {
  const { currentUser, role, logout } = useAuth();
  const { resetDemoData } = useData();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleResetData = () => {
    if (window.confirm('¿Deseas restablecer los datos de prueba del sistema?')) {
      resetDemoData();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      
      {/* TOP NAVBAR */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3 flex items-center justify-between shadow-lg">
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <div 
            onClick={() => navigate(role === 'ADMIN' ? '/' : '/field-route')} 
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-xl shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
              P
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-white leading-none tracking-tight">PRESTAPP</h1>
              <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-widest mt-0.5">Gestión Financiera</p>
            </div>
          </div>
        </div>

        {/* ROLE SWITCHER & ACTIONS */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Badge Usuario Activo */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-white font-bold">{currentUser?.nombre}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              {role}
            </span>
          </div>

          {/* Botón Mi Perfil / Cambiar Clave */}
          <button
            onClick={() => setShowProfileModal(true)}
            title="Mi Perfil / Cambiar Contraseña"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 rounded-xl border border-purple-800/50 transition"
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mi Perfil</span>
          </button>

          {/* Botón Cerrar Sesión */}
          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/60 rounded-xl border border-red-800/50 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>

          {/* Reset Demo Data Button */}
          <button
            onClick={handleResetData}
            title="Restablecer datos de prueba"
            className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl border border-slate-800 hover:border-slate-700 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden lg:flex flex-col w-64 bg-slate-900/60 border-r border-slate-800/80 p-4 justify-between">
          <div className="space-y-6">
            
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                  {currentUser?.nombre.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">{currentUser?.nombre}</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {role}
                  </span>
                </div>
              </div>
            </div>

            <nav className="space-y-1">
              <span className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Menú Principal
              </span>

              {role === 'ADMIN' && (
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                      isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`
                  }
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Tablero (Dashboard)
                </NavLink>
              )}

              <NavLink
                to="/field-route"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                    isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`
                }
              >
                <Smartphone className="w-4 h-4 text-emerald-400 animate-pulse" />
                {role === 'ADMIN' ? 'Cobro en Campo (Ruta)' : 'Mi Recorrido del Día'}
              </NavLink>

              <NavLink
                to="/customers"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                    isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`
                }
              >
                <Users className="w-4 h-4" />
                {role === 'ADMIN' ? 'Clientes' : 'Mis Clientes'}
              </NavLink>

              <NavLink
                to="/loans"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                    isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`
                }
              >
                <DollarSign className="w-4 h-4" />
                {role === 'ADMIN' ? 'Préstamos' : 'Mis Préstamos'}
              </NavLink>

              {role === 'ADMIN' && (
                <>
                  <span className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider block pt-4 mb-2">
                    Administración
                  </span>

                  <NavLink
                    to="/routes"
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                        isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`
                    }
                  >
                    <RouteIcon className="w-4 h-4" />
                    Rutas y Zonas
                  </NavLink>

                  <NavLink
                    to="/users"
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                        isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`
                    }
                  >
                    <UserCheck className="w-4 h-4" />
                    Cobradores
                  </NavLink>

                  <NavLink
                    to="/reports"
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                        isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`
                    }
                  >
                    <FileText className="w-4 h-4" />
                    Reportes
                  </NavLink>
                </>
              )}
            </nav>

          </div>

          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-950/30 hover:bg-red-900/50 text-red-400 font-semibold text-xs border border-red-800/40 transition"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>

            <div className="text-[11px] text-slate-500 text-center border-t border-slate-800 pt-3">
              PRESTAPP v2.4 Pro • Supabase Online
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 pb-20 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* NAVIGATION BAR MÓVIL (DIFERENCIADA POR ROL) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-2 flex justify-around items-center">
        {role === 'ADMIN' && (
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-semibold transition ${
                isActive ? 'text-emerald-400' : 'text-slate-400'
              }`
            }
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </NavLink>
        )}

        <NavLink
          to="/field-route"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-semibold transition ${
              isActive ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`
          }
        >
          <Smartphone className="w-5 h-5 text-emerald-400 animate-bounce" />
          Ruta Día
        </NavLink>

        <NavLink
          to="/customers"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-semibold transition ${
              isActive ? 'text-emerald-400' : 'text-slate-400'
            }`
          }
        >
          <Users className="w-5 h-5" />
          Clientes
        </NavLink>

        <NavLink
          to="/loans"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-semibold transition ${
              isActive ? 'text-emerald-400' : 'text-slate-400'
            }`
          }
        >
          <DollarSign className="w-5 h-5" />
          Préstamos
        </NavLink>
      </nav>

      {showProfileModal && (
        <UserProfileModal onClose={() => setShowProfileModal(false)} />
      )}

    </div>
  );
};

export default MainLayout;
