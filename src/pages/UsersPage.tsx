import React, { useState } from 'react';
import { 
  Phone, Mail, X, UserPlus, RotateCcw, 
  FileText, CheckCircle, Edit2, MapPin, Shield,
  Database, Copy, Check, Sparkles
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { 
  UserRole, User, UserPermissions, 
  getRoleDefaultPermissions, DEFAULT_ADMIN_PERMISSIONS 
} from '../types';

export const UsersPage: React.FC = () => {
  const { users, routes, addUser, updateUser, updateRoute, resetUserPassword } = useData();
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Form campos
  const [formNombre, setFormNombre] = useState<string>('');
  const [formCorreo, setFormCorreo] = useState<string>('');
  const [formDocumento, setFormDocumento] = useState<string>('');
  const [formTelefono, setFormTelefono] = useState<string>('');
  const [formRol, setFormRol] = useState<UserRole>('COBRADOR');
  const [formAssignedRouteIds, setFormAssignedRouteIds] = useState<string[]>([]);
  const [formPermisos, setFormPermisos] = useState<UserPermissions>(getRoleDefaultPermissions('COBRADOR'));

  const [notification, setNotification] = useState<string>('');

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormNombre('');
    setFormCorreo('');
    setFormDocumento('');
    setFormTelefono('');
    setFormRol('COBRADOR');
    setFormAssignedRouteIds([]);
    setFormPermisos(getRoleDefaultPermissions('COBRADOR'));
    setShowAddUserModal(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setFormNombre(user.nombre);
    setFormCorreo(user.correo);
    setFormDocumento(user.documento);
    setFormTelefono(user.telefono || '');
    setFormRol(user.rol);
    const userCurrentRouteIds = routes.filter(r => r.usuario_id === user.id).map(r => r.id);
    setFormAssignedRouteIds(userCurrentRouteIds);
    
    // Si el usuario ya tiene permisos guardados, fusionar con el default
    const roleDefault = getRoleDefaultPermissions(user.rol);
    setFormPermisos({
      ...roleDefault,
      ...(user.permisos || {})
    });
    
    setShowAddUserModal(true);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setFormRol(newRole);
    setFormPermisos(getRoleDefaultPermissions(newRole));
  };

  const handleTogglePermission = (key: keyof UserPermissions) => {
    setFormPermisos(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSetAllPermissions = (value: boolean) => {
    const updated: Partial<UserPermissions> = {};
    (Object.keys(DEFAULT_ADMIN_PERMISSIONS) as Array<keyof UserPermissions>).forEach(k => {
      updated[k] = value;
    });
    setFormPermisos(updated as UserPermissions);
  };

  const handleResetToRoleDefault = () => {
    setFormPermisos(getRoleDefaultPermissions(formRol));
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre || !formCorreo || !formDocumento) return;

    if (editingUser) {
      await updateUser(editingUser.id, {
        nombre: formNombre,
        correo: formCorreo,
        documento: formDocumento,
        telefono: formTelefono,
        rol: formRol,
        permisos: formPermisos
      });

      if (formRol === 'COBRADOR') {
        for (const r of routes) {
          const isSelected = formAssignedRouteIds.includes(r.id);
          if (isSelected && r.usuario_id !== editingUser.id) {
            await updateRoute(r.id, { usuario_id: editingUser.id });
          } else if (!isSelected && r.usuario_id === editingUser.id) {
            const otherAdmin = users.find(u => u.rol === 'ADMIN');
            if (otherAdmin) {
              await updateRoute(r.id, { usuario_id: otherAdmin.id });
            }
          }
        }
      }

      setNotification(`Usuario ${formNombre} actualizado con éxito.`);
    } else {
      const newUser = await addUser({
        nombre: formNombre,
        correo: formCorreo,
        documento: formDocumento,
        telefono: formTelefono,
        rol: formRol,
        permisos: formPermisos,
        activo: true
      });

      if (formRol === 'COBRADOR' && formAssignedRouteIds.length > 0) {
        for (const routeId of formAssignedRouteIds) {
          await updateRoute(routeId, { usuario_id: newUser.id });
        }
      }

      setNotification(`Usuario ${formNombre} creado con éxito. Contraseña inicial: ${formDocumento}`);
    }

    setShowAddUserModal(false);
    setEditingUser(null);
  };

  const handleConfirmResetPassword = async () => {
    if (!resetModalUser) return;
    try {
      const defaultPass = await resetUserPassword(resetModalUser.id);
      setNotification(`La contraseña de ${resetModalUser.nombre} ha sido reestablecida a su documento: ${defaultPass}`);
    } catch (err) {
      console.error(err);
    } finally {
      setResetModalUser(null);
    }
  };

  const toggleRouteSelection = (routeId: string) => {
    setFormAssignedRouteIds(prev => 
      prev.includes(routeId) ? prev.filter(id => id !== routeId) : [...prev, routeId]
    );
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'SUPERVISOR':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'COBRADOR':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  const sqlScript = `-- ==========================================================
-- SCRIPT SQL: INTEGRACIÓN DE PERMISOS GRANULARES Y ROLES EN BD
-- Ejecuta este script en el "SQL Editor" de tu panel de Supabase
-- ==========================================================

-- 1. Agregar la columna 'permisos' (tipo JSONB) si la tabla ya existe
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS permisos JSONB DEFAULT NULL;

-- 2. Ajustar la restricción de validación de roles para incluir 'SUPERVISOR'
ALTER TABLE usuarios 
DROP CONSTRAINT IF EXISTS usuarios_rol_check;

ALTER TABLE usuarios 
ADD CONSTRAINT usuarios_rol_check 
CHECK (rol IN ('ADMIN', 'SUPERVISOR', 'COBRADOR'));

-- 3. Crear índice GIN para consultas y filtros eficientes en JSONB
CREATE INDEX IF NOT EXISTS idx_usuarios_permisos ON usuarios USING gin (permisos);

-- 4. Asegurar permisos de acceso deshabilitando RLS o permitiendo lectura/escritura
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- 5. Comentario descriptivo de la columna
COMMENT ON COLUMN usuarios.permisos IS 'Matriz granular de permisos (módulos y acciones) en formato JSONB';`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-2 sm:px-0">
      
      {/* HEADER ADAPTATIVO MÓVIL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5 flex-wrap">
            Cobradores y Usuarios
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              {users.length} Registrados
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Administración de usuarios, roles (Admin, Supervisor, Cobrador), matriz de permisos y contraseñas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setShowSqlModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white font-bold text-xs border border-indigo-500/30 transition shadow-sm"
            title="Ver consultas SQL para actualizar la base de datos Supabase"
          >
            <Database className="w-4 h-4 text-indigo-400" />
            <span>Consultas SQL BD</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* NOTIFICACIÓN ALERTA */}
      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification('')} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* GRID DE USUARIOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {users.map(user => {
          const userRoutes = routes.filter(r => r.usuario_id === user.id);
          const effectivePermissions = {
            ...getRoleDefaultPermissions(user.rol),
            ...(user.permisos || {})
          };

          const activePermissionsCount = Object.values(effectivePermissions).filter(Boolean).length;
          const totalPermissionsCount = Object.keys(DEFAULT_ADMIN_PERMISSIONS).length;

          return (
            <div 
              key={user.id}
              className="glass-card p-5 sm:p-6 rounded-3xl border border-slate-800/80 space-y-4 hover:border-slate-700 transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-base border shrink-0 ${
                      user.rol === 'ADMIN' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                      user.rol === 'SUPERVISOR' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' :
                      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {user.nombre.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-base text-white truncate">{user.nombre}</h3>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadgeStyle(user.rol)}`}>
                        {user.rol}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenEditModal(user)}
                    className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                    title="Editar Usuario y Permisos"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{user.correo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Cédula/ID: <strong className="text-emerald-400 font-mono">{user.documento}</strong></span>
                  </div>
                  {user.telefono && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{user.telefono}</span>
                    </div>
                  )}
                </div>

                {/* Resumen de Permisos */}
                <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-[11px] flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" /> Permisos Activos:
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
                    {activePermissionsCount} / {totalPermissionsCount}
                  </span>
                </div>

                {user.rol === 'COBRADOR' && (
                  <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                      Rutas Asignadas ({userRoutes.length})
                    </span>
                    {userRoutes.length > 0 ? (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {userRoutes.map(r => (
                          <span key={r.id} className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            {r.nombre}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Sin rutas asignadas actualmente.</span>
                    )}
                  </div>
                )}
              </div>

              {/* Botón Reset Contraseña por Admin */}
              <div className="pt-3 border-t border-slate-800">
                <button
                  onClick={() => setResetModalUser(user)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 text-xs font-semibold transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restablecer Contraseña
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* MODAL CREAR / EDITAR USUARIO CON MATRIZ DE PERMISOS GRANULARES */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex justify-between items-center px-5 sm:px-6 py-4 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base sm:text-lg">
                  {editingUser ? `Editar: ${editingUser.nombre}` : 'Registrar Nuevo Usuario'}
                </h3>
                <p className="text-xs text-slate-400">Configuración de credenciales y permisos por checkboxes</p>
              </div>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* DATOS BÁSICOS */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  1. Información Personal y Credenciales
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Carlos Cobrador"
                      value={formNombre}
                      onChange={e => setFormNombre(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Correo Electrónico *</label>
                    <input
                      type="email"
                      required
                      placeholder="carlos@prestapp.com"
                      value={formCorreo}
                      onChange={e => setFormCorreo(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Cédula / Documento (Clave Inicial) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: 1098234567"
                      value={formDocumento}
                      onChange={e => setFormDocumento(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Teléfono Móvil</label>
                    <input
                      type="text"
                      placeholder="300 123 4567"
                      value={formTelefono}
                      onChange={e => setFormTelefono(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Rol Base *</label>
                  <select
                    value={formRol}
                    onChange={e => handleRoleChange(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="COBRADOR">COBRADOR (Operación de campo, cobros y clientes asignados)</option>
                    <option value="SUPERVISOR">SUPERVISOR (Auditoría, control de rutas, reasignaciones y reportes)</option>
                    <option value="ADMIN">ADMINISTRADOR (Control total y configuración global)</option>
                  </select>
                </div>
              </div>

              {/* SELECCIÓN INMEDIATA DE RUTAS ASIGNADAS (SI ES COBRADOR) */}
              {formRol === 'COBRADOR' && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Asignación Inmediata de Rutas ({formAssignedRouteIds.length} seleccionadas)
                  </label>
                  <div className="space-y-2 bg-slate-950 p-3 rounded-2xl border border-slate-800 max-h-36 overflow-y-auto">
                    {routes.length === 0 ? (
                      <span className="text-xs text-slate-500 italic">No hay rutas registradas.</span>
                    ) : (
                      routes.map(r => {
                        const isChecked = formAssignedRouteIds.includes(r.id);
                        return (
                          <label key={r.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleRouteSelection(r.id)}
                                className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700 focus:ring-emerald-500"
                              />
                              <span className="text-xs font-bold text-white">{r.nombre}</span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {r.descripcion || 'Sin zona'}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* MATRIZ DE PERMISOS GRANULARES POR CHECKBOXES */}
              <div className="pt-3 border-t border-slate-800 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> 2. Matriz de Permisos Granulares (Checkboxes)
                    </h4>
                    <p className="text-[11px] text-slate-400">Personaliza exactamente qué puede ver y hacer este usuario</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleResetToRoleDefault}
                      className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 font-medium"
                      title="Restablecer a plantilla del rol"
                    >
                      Plantilla Rol
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAllPermissions(true)}
                      className="text-[10px] px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 rounded-lg border border-emerald-800 font-medium"
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAllPermissions(false)}
                      className="text-[10px] px-2 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-lg border border-red-800 font-medium"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                {/* CATEGORÍA A: ACCESO A MÓDULOS */}
                <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <span className="text-xs font-extrabold text-blue-400 uppercase tracking-wider block">
                    A. Acceso a Módulos (Vistas en el Menú)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formPermisos.view_dashboard}
                        onChange={() => handleTogglePermission('view_dashboard')}
                        className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-slate-200">Dashboard / Métricas</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formPermisos.view_field_route}
                        onChange={() => handleTogglePermission('view_field_route')}
                        className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-slate-200">Cobro en Campo (Ruta)</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formPermisos.view_customers}
                        onChange={() => handleTogglePermission('view_customers')}
                        className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-slate-200">Módulo Clientes</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formPermisos.view_loans}
                        onChange={() => handleTogglePermission('view_loans')}
                        className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-slate-200">Módulo Préstamos</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formPermisos.view_routes}
                        onChange={() => handleTogglePermission('view_routes')}
                        className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-slate-200">Rutas y Zonas</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formPermisos.view_users}
                        onChange={() => handleTogglePermission('view_users')}
                        className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-slate-200">Gestión de Usuarios</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 cursor-pointer sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={formPermisos.view_reports}
                        onChange={() => handleTogglePermission('view_reports')}
                        className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-slate-200">Reportes y Liquidación</span>
                    </label>
                  </div>
                </div>

                {/* CATEGORÍA B: PERMISOS DE ACCIÓN ESPECÍFICA */}
                <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 space-y-4">
                  <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider block">
                    B. Permisos de Acción Específica
                  </span>

                  {/* Acciones Clientes */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 block">Clientes:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formPermisos.create_customer}
                          onChange={() => handleTogglePermission('create_customer')}
                          className="w-3.5 h-3.5 rounded text-emerald-500 bg-slate-800 border-slate-700"
                        />
                        <span className="text-[11px] text-slate-300">Crear Clientes</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formPermisos.edit_customer}
                          onChange={() => handleTogglePermission('edit_customer')}
                          className="w-3.5 h-3.5 rounded text-emerald-500 bg-slate-800 border-slate-700"
                        />
                        <span className="text-[11px] text-slate-300">Editar / Fotos</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formPermisos.delete_customer}
                          onChange={() => handleTogglePermission('delete_customer')}
                          className="w-3.5 h-3.5 rounded text-red-500 bg-slate-800 border-slate-700"
                        />
                        <span className="text-[11px] text-red-300">Eliminar</span>
                      </label>
                    </div>
                  </div>

                  {/* Acciones Préstamos y Pagos */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-900">
                    <span className="text-[11px] font-bold text-slate-400 block">Préstamos y Cobros:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formPermisos.create_loan}
                          onChange={() => handleTogglePermission('create_loan')}
                          className="w-3.5 h-3.5 rounded text-emerald-500 bg-slate-800 border-slate-700"
                        />
                        <span className="text-[11px] text-slate-300">Crear / Aprobar Préstamos</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formPermisos.edit_loan}
                          onChange={() => handleTogglePermission('edit_loan')}
                          className="w-3.5 h-3.5 rounded text-emerald-500 bg-slate-800 border-slate-700"
                        />
                        <span className="text-[11px] text-slate-300">Editar / Refinanciar</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formPermisos.record_payment}
                          onChange={() => handleTogglePermission('record_payment')}
                          className="w-3.5 h-3.5 rounded text-emerald-500 bg-slate-800 border-slate-700"
                        />
                        <span className="text-[11px] text-slate-300">Registrar Pagos / Abonos</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formPermisos.delete_payment}
                          onChange={() => handleTogglePermission('delete_payment')}
                          className="w-3.5 h-3.5 rounded text-red-500 bg-slate-800 border-slate-700"
                        />
                        <span className="text-[11px] text-red-300">Anular / Eliminar Pagos</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={formPermisos.delete_loan}
                          onChange={() => handleTogglePermission('delete_loan')}
                          className="w-3.5 h-3.5 rounded text-red-500 bg-slate-800 border-slate-700"
                        />
                        <span className="text-[11px] text-red-300">Eliminar Préstamos</span>
                      </label>
                    </div>
                  </div>

                  {/* Acciones Rutas y Reasignaciones */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-900">
                    <span className="text-[11px] font-bold text-slate-400 block">Rutas y Reasignación:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formPermisos.manage_routes}
                          onChange={() => handleTogglePermission('manage_routes')}
                          className="w-3.5 h-3.5 rounded text-emerald-500 bg-slate-800 border-slate-700"
                        />
                        <span className="text-[11px] text-slate-300">Crear / Editar Rutas</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formPermisos.reassign_routes}
                          onChange={() => handleTogglePermission('reassign_routes')}
                          className="w-3.5 h-3.5 rounded text-emerald-500 bg-slate-800 border-slate-700"
                        />
                        <span className="text-[11px] text-slate-300">Reasignar Clientes</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formPermisos.delete_routes}
                          onChange={() => handleTogglePermission('delete_routes')}
                          className="w-3.5 h-3.5 rounded text-red-500 bg-slate-800 border-slate-700"
                        />
                        <span className="text-[11px] text-red-300">Eliminar Rutas</span>
                      </label>
                    </div>
                  </div>

                </div>
              </div>

              <div className="pt-2 sticky bottom-0 bg-slate-900 pb-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition active:scale-95"
                >
                  {editingUser ? 'Guardar Usuario y Permisos' : 'Crear Usuario con Permisos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONSULTAS SQL SUPABASE */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Consultas SQL para Supabase / PostgreSQL</h3>
                  <p className="text-[11px] text-slate-400">Ejecuta este script en el SQL Editor de tu Supabase</p>
                </div>
              </div>
              <button onClick={() => setShowSqlModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-72 leading-relaxed">
                {sqlScript}
              </pre>
              <button
                onClick={copySql}
                className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? '¡Copiado!' : 'Copiar SQL'}</span>
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-900/50 text-indigo-200 text-xs leading-relaxed space-y-1">
              <p className="font-bold text-white">¿Qué hace este script SQL?</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                <li>Agrega la columna <code className="text-emerald-400 font-mono">permisos</code> tipo JSONB a la tabla <code className="text-emerald-400 font-mono">usuarios</code>.</li>
                <li>Habilita el rol <code className="text-indigo-300 font-mono">'SUPERVISOR'</code> en el CHECK constraint de la tabla.</li>
                <li>Crea un índice GIN para optimizar la lectura y consultas de permisos en Supabase.</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSqlModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR RESET DE CONTRASEÑA */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <RotateCcw className="w-6 h-6" />
              <h3 className="font-bold text-white text-base sm:text-lg">¿Restablecer Contraseña?</h3>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              ¿Estás seguro de que deseas restablecer la contraseña de <strong className="text-white">{resetModalUser.nombre}</strong>?
            </p>
            <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs">
              La contraseña volverá a ser su número de cédula/documento: <strong className="text-emerald-400 font-mono text-sm block mt-1">{resetModalUser.documento}</strong>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirmResetPassword}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition"
              >
                Sí, Restablecer
              </button>
              <button
                onClick={() => setResetModalUser(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UsersPage;
