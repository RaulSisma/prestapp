import React, { useState } from 'react';
import { 
  MapPin, Plus, UserCheck,
  ArrowRightLeft, X, Edit2, Trash2, AlertCircle, CheckCircle
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Route } from '../types';

export const RoutesPage: React.FC = () => {
  const { routes, users, customers, loans, addRoute, updateRoute, deleteRoute, reassignCustomerRoute } = useData();
  const { hasPermission } = useAuth();

  const [showAddRouteModal, setShowAddRouteModal] = useState<boolean>(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [showReassignModal, setShowReassignModal] = useState<boolean>(false);
  const [routeToDelete, setRouteToDelete] = useState<Route | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Form para crear/editar ruta
  const [formNombre, setFormNombre] = useState<string>('');
  const [formUsuarioId, setFormUsuarioId] = useState<string>(users.filter(u => u.rol === 'COBRADOR')[0]?.id || '');
  const [formDescripcion, setFormDescripcion] = useState<string>('');

  // Form para reasignar cliente
  const [reassignCustomerId, setReassignCustomerId] = useState<string>('');
  const [reassignNewRouteId, setReassignNewRouteId] = useState<string>('');

  const collectors = users.filter(u => u.rol === 'COBRADOR');

  const handleOpenAddModal = () => {
    setFormNombre('');
    setFormUsuarioId(collectors[0]?.id || '');
    setFormDescripcion('');
    setEditingRoute(null);
    setShowAddRouteModal(true);
  };

  const handleOpenEditModal = (route: Route) => {
    setEditingRoute(route);
    setFormNombre(route.nombre);
    setFormUsuarioId(route.usuario_id);
    setFormDescripcion(route.descripcion || '');
    setShowAddRouteModal(true);
  };

  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre || !formUsuarioId) return;

    if (editingRoute) {
      await updateRoute(editingRoute.id, {
        nombre: formNombre,
        usuario_id: formUsuarioId,
        descripcion: formDescripcion
      });
      setNotification({ type: 'success', text: `Ruta ${formNombre} actualizada correctamente.` });
    } else {
      await addRoute({
        nombre: formNombre,
        usuario_id: formUsuarioId,
        descripcion: formDescripcion
      });
      setNotification({ type: 'success', text: `Ruta ${formNombre} creada con éxito.` });
    }

    setShowAddRouteModal(false);
    setEditingRoute(null);
  };

  const handleDeleteRoute = (route: Route) => {
    const routeClientsCount = customers.filter(c => c.ruta_id === route.id).length;
    if (routeClientsCount > 0) {
      setNotification({
        type: 'error',
        text: `No se puede eliminar la ruta "${route.nombre}" porque tiene ${routeClientsCount} cliente(s) asignado(s). Transfiéralos a otra ruta primero.`
      });
      return;
    }
    setRouteToDelete(route);
  };

  const handleConfirmDelete = async () => {
    if (!routeToDelete) return;
    setIsDeleting(true);
    try {
      const target = routeToDelete;
      const result = await deleteRoute(target.id);
      if (result.success) {
        setNotification({ type: 'success', text: `Ruta "${target.nombre}" eliminada correctamente.` });
        setRouteToDelete(null);
      } else {
        setNotification({ type: 'error', text: result.message || 'Error eliminando la ruta.' });
      }
    } catch {
      setNotification({ type: 'error', text: 'Error inesperado al eliminar la ruta.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReassignCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignCustomerId || !reassignNewRouteId) return;

    await reassignCustomerRoute(reassignCustomerId, reassignNewRouteId);
    setNotification({ type: 'success', text: 'Cliente reasignado a la nueva ruta correctamente.' });
    setShowReassignModal(false);
    setReassignCustomerId('');
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-2 sm:px-0">
      
      {/* HEADER ADAPTATIVO MÓVIL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5 flex-wrap">
            Gestión de Rutas y Zonas
            <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-400 font-bold border border-purple-500/30">
              {routes.length} Rutas
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Asignación de zonas geográficas a cobradores, edición y transferencias de clientes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {hasPermission('reassign_routes') && (
            <button
              onClick={() => setShowReassignModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm border border-slate-700 transition"
            >
              <ArrowRightLeft className="w-4 h-4 text-blue-400" />
              Reasignar Cliente
            </button>
          )}

          {hasPermission('manage_routes') && (
            <button
              onClick={handleOpenAddModal}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Nueva Ruta
            </button>
          )}
        </div>
      </div>

      {/* NOTIFICACIÓN ALERTA */}
      {notification && (
        <div className={`p-4 rounded-2xl text-xs sm:text-sm flex items-center justify-between border ${
          notification.type === 'error' 
            ? 'bg-red-950/70 border-red-800 text-red-300' 
            : 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* GRID DE RUTAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {routes.map(route => {
          const collector = users.find(u => u.id === route.usuario_id);
          const routeClients = customers.filter(c => c.ruta_id === route.id);
          const clientIds = routeClients.map(c => c.id);
          const routeLoans = loans.filter(l => clientIds.includes(l.cliente_id) && l.estado !== 'PAGADO');
          const totalPortfolio = routeLoans.reduce((sum, l) => sum + l.saldo, 0);
          const hasClients = routeClients.length > 0;

          return (
            <div 
              key={route.id}
              className="glass-card p-5 sm:p-6 rounded-3xl border border-slate-800/80 space-y-4 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-white">{route.nombre}</h3>
                    <p className="text-xs text-slate-400">{route.descripcion || 'Sin descripción'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {(hasPermission('manage_routes') || hasPermission('reassign_routes')) && (
                    <button
                      onClick={() => handleOpenEditModal(route)}
                      className="p-2 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                      title="Editar Ruta o Reasignar Cobrador"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {hasPermission('delete_routes') && (
                    <button
                      onClick={() => handleDeleteRoute(route)}
                      className={`p-2 rounded-xl transition ${
                        hasClients 
                          ? 'text-slate-600 cursor-not-allowed' 
                          : 'text-slate-400 hover:text-red-400 hover:bg-slate-800'
                      }`}
                      title={hasClients ? 'No se puede eliminar (tiene clientes asignados)' : 'Eliminar Ruta'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* COBRADOR ASIGNADO */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-xs text-slate-300">Cobrador Asignado:</span>
                </div>
                <span className="text-xs font-bold text-white truncate max-w-[120px] text-right">{collector?.nombre || 'No asignado'}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Clientes</span>
                  <span className="text-base sm:text-lg font-black text-white">{routeClients.length}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cartera Zona</span>
                  <span className="text-sm sm:text-base font-black text-emerald-400">
                    ${totalPortfolio.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* MODAL CREAR / EDITAR RUTA */}
      {showAddRouteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center px-5 sm:px-6 py-4 border-b border-slate-800">
              <h3 className="font-bold text-white text-base sm:text-lg">
                {editingRoute ? 'Editar Ruta y Reasignar Cobrador' : 'Crear Nueva Ruta de Cobranza'}
              </h3>
              <button onClick={() => setShowAddRouteModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoute} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de la Ruta *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Ruta Sur, Ruta Mercado..."
                  value={formNombre}
                  onChange={e => setFormNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Cobrador Asignado a esta Ruta *</label>
                <select
                  value={formUsuarioId}
                  onChange={e => setFormUsuarioId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                >
                  {collectors.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descripción / Zonas</label>
                <input
                  type="text"
                  placeholder="Ej: Barrios El Prado, San José..."
                  value={formDescripcion}
                  onChange={e => setFormDescripcion(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition"
                >
                  {editingRoute ? 'Guardar Cambios' : 'Crear Ruta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REASIGNAR CLIENTE */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center px-5 sm:px-6 py-4 border-b border-slate-800">
              <h3 className="font-bold text-white text-base sm:text-lg">Reasignar Cliente a Otra Ruta</h3>
              <button onClick={() => setShowReassignModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReassignCustomer} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Seleccionar Cliente *</label>
                <select
                  value={reassignCustomerId}
                  onChange={e => setReassignCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">-- Seleccionar --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.barrio})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nueva Ruta de Destino *</label>
                <select
                  value={reassignNewRouteId}
                  onChange={e => setReassignNewRouteId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">-- Seleccionar --</option>
                  {routes.map(r => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition"
                >
                  Transferir Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINACIÓN DE RUTA */}
      {routeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">¿Eliminar Ruta?</h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Estás a punto de eliminar la ruta <strong className="text-white font-semibold">"{routeToDelete.nombre}"</strong>. Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setRouteToDelete(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-red-600/25 transition disabled:opacity-50"
                >
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RoutesPage;
