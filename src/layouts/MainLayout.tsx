import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, DollarSign, 
  Route as RouteIcon, UserCheck, FileText, 
  Shield, Menu, X, Smartphone, Key, LogOut,
  ChevronRight, Sparkles, Receipt, Building2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { UserProfileModal } from '../components/UserProfileModal';

export const MainLayout: React.FC = () => {
  const { currentUser, role, hasPermission, logout } = useAuth();
  const { companyConfig } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // Cerrar el drawer móvil automáticamente al cambiar de ruta
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const getRoleBadgeStyle = (r: string) => {
    switch (r) {
      case 'ADMIN':
        return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
      case 'SUPERVISOR':
        return 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
      case 'COBRADOR':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    }
  };

  const hasAnyAdminOrAuditModule = hasPermission('view_routes') || hasPermission('view_users') || hasPermission('view_reports') || hasPermission('view_company_settings');

  const appName = companyConfig.nombre || 'PRESTAPP';
  const appSlogan = companyConfig.slogan || 'Gestión Financiera';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      
      {/* TOP NAVBAR */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3 flex items-center justify-between shadow-lg">
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Abrir Menú de Navegación"
            className="lg:hidden p-2 text-slate-300 hover:text-white rounded-xl bg-slate-800/80 border border-slate-700 hover:bg-slate-700 transition active:scale-95 flex items-center gap-1.5"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-emerald-400" /> : <Menu className="w-5 h-5 text-emerald-400" />}
            <span className="text-xs font-bold sm:hidden">Menú</span>
          </button>

          <div 
            onClick={() => navigate(hasPermission('view_dashboard') ? '/' : '/field-route')} 
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            {companyConfig.logo_url ? (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center overflow-hidden p-1 shadow-md group-hover:scale-105 transition">
                <img 
                  src={companyConfig.logo_url} 
                  alt="Logo" 
                  className="max-h-full max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-lg sm:text-xl shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
                {appName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-base sm:text-lg text-white leading-none tracking-tight truncate max-w-[170px] sm:max-w-xs">{appName}</h1>
              <p className="text-[9px] sm:text-[10px] text-emerald-400 font-semibold uppercase tracking-widest mt-0.5 truncate max-w-[170px] sm:max-w-xs">{appSlogan}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Badge Usuario Activo */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-white font-bold max-w-[120px] truncate">{currentUser?.nombre}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${getRoleBadgeStyle(role)}`}>
              {role}
            </span>
          </div>

          {/* Botón Mi Perfil / Cambiar Clave */}
          <button
            onClick={() => setShowProfileModal(true)}
            title="Mi Perfil / Cambiar Contraseña"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 rounded-xl border border-purple-800/50 transition active:scale-95"
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Mi Perfil</span>
          </button>

          {/* Botón Cerrar Sesión */}
          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/60 rounded-xl border border-red-800/50 transition active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Salir</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        
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
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${getRoleBadgeStyle(role)}`}>
                    {role}
                  </span>
                </div>
              </div>
            </div>

            <nav className="space-y-1">
              <span className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Menú Principal
              </span>

              {hasPermission('view_dashboard') && (
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                      isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`
                  }
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Tablero (Dashboard)
                </NavLink>
              )}

              {hasPermission('view_field_route') && (
                <NavLink
                  to="/field-route"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                      isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`
                  }
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  {role === 'ADMIN' ? 'Cobro en Campo (Ruta)' : 'Mi Recorrido del Día'}
                </NavLink>
              )}

              {hasPermission('view_customers') && (
                <NavLink
                  to="/customers"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                      isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`
                  }
                >
                  <Users className="w-4 h-4" />
                  {role === 'ADMIN' ? 'Clientes' : 'Mis Clientes'}
                </NavLink>
              )}

              {hasPermission('view_loans') && (
                <NavLink
                  to="/loans"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                      isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`
                  }
                >
                  <DollarSign className="w-4 h-4" />
                  {role === 'ADMIN' ? 'Préstamos' : 'Mis Préstamos'}
                </NavLink>
              )}

              {hasPermission('view_expenses') && (
                <NavLink
                  to="/expenses"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                      isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`
                  }
                >
                  <Receipt className="w-4 h-4 text-amber-400" />
                  {role === 'ADMIN' ? 'Gastos Operativos' : 'Mis Gastos'}
                </NavLink>
              )}

              {hasAnyAdminOrAuditModule && (
                <>
                  <span className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider block pt-4 mb-2">
                    {role === 'ADMIN' ? 'Administración' : 'Auditoría y Gestión'}
                  </span>

                  {hasPermission('view_routes') && (
                    <NavLink
                      to="/routes"
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                          isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`
                      }
                    >
                      <RouteIcon className="w-4 h-4" />
                      Rutas y Zonas
                    </NavLink>
                  )}

                  {hasPermission('view_users') && (
                    <NavLink
                      to="/users"
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                          isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`
                      }
                    >
                      <UserCheck className="w-4 h-4" />
                      Gestión de Usuarios
                    </NavLink>
                  )}

                  {hasPermission('view_reports') && (
                    <NavLink
                      to="/reports"
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                          isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`
                      }
                    >
                      <FileText className="w-4 h-4" />
                      Reportes
                    </NavLink>
                  )}

                  {hasPermission('view_company_settings') && (
                    <NavLink
                      to="/settings"
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                          isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`
                      }
                    >
                      <Building2 className="w-4 h-4 text-emerald-400" />
                      Configuración Empresa
                    </NavLink>
                  )}
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
              PRESTAPP • Supabase Online
            </div>
          </div>
        </aside>

        {/* MOBILE SLIDEOUT DRAWER / SIDEBAR (ACCESO TOTAL A TODOS LOS MÓDULOS) */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop Blur */}
            <div 
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-in fade-in"
            />

            {/* Slideout Panel */}
            <div className="relative w-4/5 max-w-sm bg-slate-900 border-r border-slate-800 h-full flex flex-col justify-between p-5 z-10 shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-250">
              
              <div className="space-y-5">
                {/* Header del Drawer */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-lg shadow-md shadow-emerald-500/20">
                      P
                    </div>
                    <div>
                      <h2 className="font-extrabold text-base text-white leading-none">PRESTAPP</h2>
                      <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Menú Completo</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Perfil del Usuario en Drawer */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-base">
                      {currentUser?.nombre.charAt(0)}
                    </div>
                    <div className="overflow-hidden flex-1">
                      <p className="text-xs font-extrabold text-white truncate">{currentUser?.nombre}</p>
                      <p className="text-[11px] text-slate-400 truncate">{currentUser?.correo || currentUser?.documento}</p>
                      <div className="mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${getRoleBadgeStyle(role)}`}>
                          {role === 'ADMIN' ? 'ADMINISTRADOR TOTAL' : role === 'SUPERVISOR' ? 'SUPERVISOR / AUDITOR' : 'COBRADOR EN RUTA'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Links de Navegación Móvil */}
                <nav className="space-y-4">
                  <div>
                    <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Operaciones y Cobranza
                    </span>
                    <div className="space-y-1">
                      {hasPermission('view_dashboard') && (
                        <NavLink
                          to="/"
                          end
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
                              isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                            }`
                          }
                        >
                          <div className="flex items-center gap-3">
                            <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                            <span>Dashboard / Métricas</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        </NavLink>
                      )}

                      {hasPermission('view_field_route') && (
                        <NavLink
                          to="/field-route"
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
                              isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                            }`
                          }
                        >
                          <div className="flex items-center gap-3">
                            <Smartphone className="w-4 h-4 text-emerald-400" />
                            <span>Cobro en Campo (Ruta)</span>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-extrabold">Hoy</span>
                        </NavLink>
                      )}

                      {hasPermission('view_customers') && (
                        <NavLink
                          to="/customers"
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
                              isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                            }`
                          }
                        >
                          <div className="flex items-center gap-3">
                            <Users className="w-4 h-4 text-blue-400" />
                            <span>Clientes</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        </NavLink>
                      )}

                      {hasPermission('view_loans') && (
                        <NavLink
                          to="/loans"
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
                              isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                            }`
                          }
                        >
                          <div className="flex items-center gap-3">
                            <DollarSign className="w-4 h-4 text-emerald-400" />
                            <span>Préstamos y Cartera</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        </NavLink>
                      )}

                      {hasPermission('view_expenses') && (
                        <NavLink
                          to="/expenses"
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
                              isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                            }`
                          }
                        >
                          <div className="flex items-center gap-3">
                            <Receipt className="w-4 h-4 text-amber-400" />
                            <span>{role === 'ADMIN' ? 'Gastos Operativos' : 'Mis Gastos'}</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        </NavLink>
                      )}
                    </div>
                  </div>

                  {hasAnyAdminOrAuditModule && (
                    <div>
                      <span className="px-3 text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" /> {role === 'ADMIN' ? 'Módulos de Administración' : 'Auditoría y Gestión'}
                      </span>
                      <div className="space-y-1 bg-purple-950/20 p-1.5 rounded-2xl border border-purple-900/30">
                        {hasPermission('view_routes') && (
                          <NavLink
                            to="/routes"
                            onClick={() => setMobileMenuOpen(false)}
                            className={({ isActive }) =>
                              `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
                                isActive ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                              }`
                            }
                          >
                            <div className="flex items-center gap-3">
                              <RouteIcon className="w-4 h-4 text-purple-400" />
                              <span>Rutas y Zonas</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          </NavLink>
                        )}

                        {hasPermission('view_users') && (
                          <NavLink
                            to="/users"
                            onClick={() => setMobileMenuOpen(false)}
                            className={({ isActive }) =>
                              `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
                                isActive ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                              }`
                            }
                          >
                            <div className="flex items-center gap-3">
                              <UserCheck className="w-4 h-4 text-purple-400" />
                              <span>Cobradores y Usuarios</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          </NavLink>
                        )}

                        {hasPermission('view_reports') && (
                          <NavLink
                            to="/reports"
                            onClick={() => setMobileMenuOpen(false)}
                            className={({ isActive }) =>
                              `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
                                isActive ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                              }`
                            }
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="w-4 h-4 text-purple-400" />
                              <span>Reportes y Liquidación</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          </NavLink>
                        )}

                        {hasPermission('view_company_settings') && (
                          <NavLink
                            to="/settings"
                            onClick={() => setMobileMenuOpen(false)}
                            className={({ isActive }) =>
                              `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
                                isActive ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                              }`
                            }
                          >
                            <div className="flex items-center gap-3">
                              <Building2 className="w-4 h-4 text-purple-400" />
                              <span>Configuración Empresa</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          </NavLink>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Ajustes y Cuenta
                    </span>
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setShowProfileModal(true);
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs text-purple-300 hover:text-white hover:bg-slate-800 transition"
                      >
                        <div className="flex items-center gap-3">
                          <Key className="w-4 h-4 text-purple-400" />
                          <span>Mi Perfil & Contraseña</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    </div>
                  </div>
                </nav>
              </div>

              {/* Botón Salir en Drawer Móvil */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 font-bold text-xs border border-red-800/50 transition active:scale-95 shadow-md"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión Segura
                </button>
              </div>

            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8 pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* NAVIGATION BAR MÓVIL (INFERIOR) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 px-2 py-1.5 flex justify-around items-center shadow-2xl">
        {hasPermission('view_dashboard') ? (
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-[10px] font-bold transition flex-1 ${
                isActive ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </NavLink>
        ) : null}

        {hasPermission('view_field_route') && (
          <NavLink
            to="/field-route"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-[10px] font-bold transition flex-1 ${
                isActive ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Smartphone className="w-5 h-5" />
            <span>Ruta</span>
          </NavLink>
        )}

        {hasPermission('view_customers') && (
          <NavLink
            to="/customers"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-[10px] font-bold transition flex-1 ${
                isActive ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Users className="w-5 h-5" />
            <span>Clientes</span>
          </NavLink>
        )}

        {hasPermission('view_loans') && (
          <NavLink
            to="/loans"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-[10px] font-bold transition flex-1 ${
                isActive ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <DollarSign className="w-5 h-5" />
            <span>Préstamos</span>
          </NavLink>
        )}

        {/* Botón Más / Menú para desplegar el drawer con módulos de Admin (Rutas, Cobradores, Reportes, etc.) */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-[10px] font-bold transition flex-1 ${
            mobileMenuOpen ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span>{role === 'ADMIN' ? 'Admin / Más' : 'Más'}</span>
        </button>
      </nav>

      {showProfileModal && (
        <UserProfileModal onClose={() => setShowProfileModal(false)} />
      )}

    </div>
  );
};

export default MainLayout;
