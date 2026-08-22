import React, { useState, useMemo } from 'react';
import { 
  Receipt, Plus, DollarSign, Search, 
  Trash2, Tag, CheckCircle2, AlertCircle, 
  Check, User as UserIcon, Clock,
  TrendingDown, Edit3, X, AlertTriangle
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Expense } from '../types';

export const ExpensesPage: React.FC = () => {
  const { 
    expenses, 
    expenseConcepts, 
    addExpense, 
    deleteExpense, 
    addExpenseConcept, 
    updateExpenseConcept, 
    toggleExpenseConceptActive, 
    deleteExpenseConcept,
    users 
  } = useData();

  const { currentUser, role, hasPermission } = useAuth();

  // Permisos
  const canCreateExpense = hasPermission('create_expense');
  const canViewAllExpenses = hasPermission('view_all_expenses');
  const canDeleteAnyExpense = hasPermission('delete_any_expense') || role === 'ADMIN';
  const canDeleteOwnExpense = hasPermission('delete_own_expense') || role === 'ADMIN';
  const canManageConcepts = hasPermission('manage_expense_concepts');

  // Estados de Modales
  const [showNewExpenseModal, setShowNewExpenseModal] = useState<boolean>(false);
  const [showConceptsModal, setShowConceptsModal] = useState<boolean>(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Estados del Formulario de Nuevo Gasto
  const [newConceptId, setNewConceptId] = useState<string>('');
  const [newMonto, setNewMonto] = useState<string>('');
  const [newDescripcion, setNewDescripcion] = useState<string>('');
  const [newFecha, setNewFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newUsuarioId, setNewUsuarioId] = useState<string>(currentUser?.id || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estados de Gestión de Conceptos
  const [newConceptName, setNewConceptName] = useState<string>('');
  const [editingConceptId, setEditingConceptId] = useState<string | null>(null);
  const [editingConceptName, setEditingConceptName] = useState<string>('');

  // Filtros
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterConcept, setFilterConcept] = useState<string>('ALL');
  const [filterUser, setFilterUser] = useState<string>('ALL');
  const [filterPeriod, setFilterPeriod] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL' | 'CUSTOM'>('TODAY');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Conceptos activos para el selector
  const activeConcepts = useMemo(() => {
    return expenseConcepts.filter(c => c.activo);
  }, [expenseConcepts]);

  // Lista de Gastos Filtrada
  const filteredExpenses = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    return expenses.filter(exp => {
      // 1. Filtro de Rol / Permiso de visualización
      if (!canViewAllExpenses && exp.usuario_id !== currentUser?.id) {
        return false;
      }

      // 2. Filtro de Usuario específico (si es admin y filtra)
      if (filterUser !== 'ALL' && exp.usuario_id !== filterUser) {
        return false;
      }

      // 3. Filtro de Concepto
      if (filterConcept !== 'ALL' && exp.concepto_id !== filterConcept) {
        return false;
      }

      // 4. Filtro de Período
      const expDate = new Date(exp.fecha);
      const expDateStr = exp.fecha.split('T')[0];

      if (filterPeriod === 'TODAY') {
        if (expDateStr !== todayStr) return false;
      } else if (filterPeriod === 'WEEK') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        if (expDate < startOfWeek) return false;
      } else if (filterPeriod === 'MONTH') {
        if (expDate.getMonth() !== now.getMonth() || expDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      } else if (filterPeriod === 'CUSTOM') {
        if (customStartDate && expDateStr < customStartDate) return false;
        if (customEndDate && expDateStr > customEndDate) return false;
      }

      // 5. Búsqueda por texto (código, descripción, nombre concepto, nombre cobrador)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const concept = expenseConcepts.find(c => c.id === exp.concepto_id);
        const user = users.find(u => u.id === exp.usuario_id);

        const matchCode = exp.codigo?.toLowerCase().includes(query);
        const matchDesc = exp.descripcion?.toLowerCase().includes(query);
        const matchConcept = concept?.nombre.toLowerCase().includes(query);
        const matchUser = user?.nombre.toLowerCase().includes(query);

        if (!matchCode && !matchDesc && !matchConcept && !matchUser) {
          return false;
        }
      }

      return true;
    });
  }, [
    expenses, 
    expenseConcepts, 
    users, 
    canViewAllExpenses, 
    currentUser, 
    filterUser, 
    filterConcept, 
    filterPeriod, 
    customStartDate, 
    customEndDate, 
    searchQuery
  ]);

  // Cálculos de KPIs
  const todayStr = new Date().toISOString().split('T')[0];
  
  const totalGastosHoy = useMemo(() => {
    return expenses
      .filter(e => e.fecha.startsWith(todayStr) && (canViewAllExpenses || e.usuario_id === currentUser?.id))
      .reduce((sum, e) => sum + e.monto, 0);
  }, [expenses, todayStr, canViewAllExpenses, currentUser]);

  const totalGastosFiltrados = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.monto, 0);
  }, [filteredExpenses]);

  // Manejar Registro de Nuevo Gasto
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConceptId) {
      setFeedback({ type: 'error', message: 'Por favor selecciona un concepto de gasto.' });
      return;
    }

    const valorNum = parseFloat(newMonto.replace(/\D/g, ''));
    if (!valorNum || valorNum <= 0) {
      setFeedback({ type: 'error', message: 'Ingresa un monto válido mayor a $0.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      await addExpense({
        concepto_id: newConceptId,
        monto: valorNum,
        descripcion: newDescripcion.trim(),
        fecha: new Date(newFecha).toISOString(),
        usuario_id: newUsuarioId || currentUser?.id
      });

      setFeedback({ type: 'success', message: '¡Gasto registrado exitosamente!' });
      setShowNewExpenseModal(false);
      setNewMonto('');
      setNewDescripcion('');
      setNewConceptId('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar el gasto';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar Eliminación de Gasto
  const handleDeleteExpense = (expense: Expense) => {
    const isOwn = expense.usuario_id === currentUser?.id;
    const canDelete = canDeleteAnyExpense || (isOwn && canDeleteOwnExpense);

    if (!canDelete) {
      setFeedback({ type: 'error', message: 'No tienes permisos para anular o eliminar este gasto.' });
      return;
    }

    setExpenseToDelete(expense);
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);
    try {
      await deleteExpense(expenseToDelete.id);
      setFeedback({ type: 'success', message: `Gasto ${expenseToDelete.codigo || ''} eliminado correctamente.` });
      setExpenseToDelete(null);
    } catch {
      setFeedback({ type: 'error', message: 'Ocurrió un error al intentar eliminar el gasto.' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Manejar Creación de Nuevo Concepto
  const handleAddConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConceptName.trim()) return;

    try {
      const created = await addExpenseConcept(newConceptName.trim());
      setNewConceptName('');
      setNewConceptId(created.id); // Seleccionar automáticamente en modal
    } catch {
      alert('Error al agregar el concepto');
    }
  };

  // Manejar Actualización de Concepto
  const handleSaveEditConcept = async (id: string) => {
    if (!editingConceptName.trim()) return;
    await updateExpenseConcept(id, { nombre: editingConceptName.trim() });
    setEditingConceptId(null);
    setEditingConceptName('');
  };

  // Manejar Eliminación de Concepto
  const handleDeleteConcept = async (id: string) => {
    const res = await deleteExpenseConcept(id);
    if (res.message) {
      alert(res.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-0">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-emerald-400" />
            Gestión de Gastos Operativos
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Control de egresos, gasolina, viáticos y gastos diarios por usuario y ruta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManageConcepts && (
            <button
              onClick={() => setShowConceptsModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold shadow transition active:scale-95"
            >
              <Tag className="w-4 h-4 text-purple-400" />
              <span>Conceptos ({expenseConcepts.length})</span>
            </button>
          )}

          {canCreateExpense && (
            <button
              onClick={() => {
                setNewConceptId(activeConcepts[0]?.id || '');
                setNewUsuarioId(currentUser?.id || '');
                setShowNewExpenseModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Gasto</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center gap-3 animate-in fade-in duration-200 ${
          feedback.type === 'success' 
            ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300' 
            : 'bg-red-950/70 border-red-800 text-red-300'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* TARJETAS RESUMEN DE GASTOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        
        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Gastos de Hoy</span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-400">
            ${totalGastosHoy.toLocaleString('es-CO')}
          </p>
          <p className="text-[11px] text-slate-400">
            {canViewAllExpenses ? 'Total de todas las rutas hoy' : 'Tus gastos registrados hoy'}
          </p>
        </div>

        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Filtrado</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white">
            ${totalGastosFiltrados.toLocaleString('es-CO')}
          </p>
          <p className="text-[11px] text-slate-400">
            {filteredExpenses.length} registro(s) encontrados
          </p>
        </div>

        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-2 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Conceptos Activos</span>
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-purple-400">
            {activeConcepts.length} Categorías
          </p>
          <p className="text-[11px] text-slate-400">
            Disponibles para clasificación
          </p>
        </div>

      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Búsqueda */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código, detalle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Filtro Período */}
          <div>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value as 'TODAY' | 'WEEK' | 'MONTH' | 'ALL' | 'CUSTOM')}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="TODAY">📅 Solo Hoy</option>
              <option value="WEEK">🗓️ Esta Semana</option>
              <option value="MONTH">📆 Este Mes</option>
              <option value="ALL">♾️ Todos los Tiempos</option>
              <option value="CUSTOM">⚙️ Rango Personalizado</option>
            </select>
          </div>

          {/* Filtro Concepto */}
          <div>
            <select
              value={filterConcept}
              onChange={(e) => setFilterConcept(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">🏷️ Todos los Conceptos</option>
              {expenseConcepts.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} {!c.activo ? '(Inactivo)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Filtro Usuario (Solo si tiene permisos para ver todos) */}
          {canViewAllExpenses ? (
            <div>
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">👤 Todos los Usuarios</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
              <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tus Gastos ({currentUser?.nombre})</span>
            </div>
          )}

        </div>

        {/* Fechas personalizadas */}
        {filterPeriod === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800 text-xs text-slate-300">
            <span className="font-semibold">Desde:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
            />
            <span className="font-semibold">Hasta:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
            />
          </div>
        )}
      </div>

      {/* TABLA / LISTA DE GASTOS */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            <h2 className="font-bold text-sm text-white">Historial de Gastos Registrados</h2>
          </div>
          <span className="text-xs text-slate-400 font-semibold">{filteredExpenses.length} registro(s)</span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-300 font-semibold">No se encontraron gastos en este período.</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Utiliza el botón superior para registrar un nuevo gasto operativo o modifica los filtros de búsqueda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Código / Fecha</th>
                  <th className="px-4 py-3">Concepto</th>
                  <th className="px-4 py-3">Descripción / Detalle</th>
                  <th className="px-4 py-3">Registrado Por</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredExpenses.map((expense) => {
                  const concept = expenseConcepts.find(c => c.id === expense.concepto_id);
                  const user = users.find(u => u.id === expense.usuario_id);
                  const isOwn = expense.usuario_id === currentUser?.id;
                  const canDelete = canDeleteAnyExpense || (isOwn && canDeleteOwnExpense);

                  const formattedDate = new Date(expense.fecha).toLocaleString('es-CO', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  });

                  return (
                    <tr key={expense.id} className="hover:bg-slate-800/30 transition">
                      
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-emerald-400">
                          {expense.codigo || 'GST-S/N'}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/25">
                          <Tag className="w-3 h-3" />
                          {concept?.nombre || 'Concepto no especificado'}
                        </span>
                      </td>

                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-slate-300 text-xs line-clamp-2">
                          {expense.descripcion || 'Sin observaciones'}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <UserIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="font-medium truncate max-w-[130px]">{user?.nombre || 'Usuario'}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{user?.rol || 'COBRADOR'}</span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-black text-amber-400">
                          ${expense.monto.toLocaleString('es-CO')}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {canDelete ? (
                          <button
                            onClick={() => handleDeleteExpense(expense)}
                            title="Eliminar gasto"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-600">—</span>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL REGISTRAR NUEVO GASTO */}
      {showNewExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Registrar Nuevo Gasto</h3>
              </div>
              <button onClick={() => setShowNewExpenseModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              
              {/* Concepto */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                  <span>Concepto de Gasto *</span>
                  {canManageConcepts && (
                    <button
                      type="button"
                      onClick={() => setShowConceptsModal(true)}
                      className="text-[10px] text-purple-400 hover:underline font-normal flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Crear concepto
                    </button>
                  )}
                </label>
                <select
                  required
                  value={newConceptId}
                  onChange={(e) => setNewConceptId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Selecciona un concepto...</option>
                  {activeConcepts.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Monto */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Monto del Gasto (COP) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 20000"
                    value={newMonto}
                    onChange={(e) => setNewMonto(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-amber-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Fecha del Gasto
                </label>
                <input
                  type="date"
                  value={newFecha}
                  onChange={(e) => setNewFecha(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Usuario asignado (si es admin) */}
              {canViewAllExpenses && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Usuario Responsable
                  </label>
                  <select
                    value={newUsuarioId}
                    onChange={(e) => setNewUsuarioId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Descripción */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Descripción / Observaciones
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Tanqueada de moto para ruta sur, factura #849..."
                  value={newDescripcion}
                  onChange={(e) => setNewDescripcion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewExpenseModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Gasto'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL GESTIÓN DE CONCEPTOS */}
      {showConceptsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-base">Conceptos de Gasto</h3>
              </div>
              <button onClick={() => setShowConceptsModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario crear concepto */}
            <form onSubmit={handleAddConcept} className="flex gap-2">
              <input
                type="text"
                placeholder="Nombre del nuevo concepto (ej. Almuerzo)..."
                value={newConceptName}
                onChange={(e) => setNewConceptName(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Agregar
              </button>
            </form>

            {/* Lista de conceptos */}
            <div className="space-y-2 overflow-y-auto flex-1 pr-1 max-h-72">
              {expenseConcepts.map((concept) => (
                <div 
                  key={concept.id} 
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs"
                >
                  {editingConceptId === concept.id ? (
                    <div className="flex-1 flex items-center gap-2 mr-2">
                      <input
                        type="text"
                        value={editingConceptName}
                        onChange={(e) => setEditingConceptName(e.target.value)}
                        className="flex-1 px-2 py-1 bg-slate-900 border border-purple-500 rounded-lg text-xs text-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEditConcept(concept.id)}
                        className="p-1 text-emerald-400 hover:bg-emerald-950 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingConceptId(null)}
                        className="p-1 text-slate-400 hover:bg-slate-800 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpenseConceptActive(concept.id)}
                        title={concept.activo ? 'Desactivar concepto' : 'Activar concepto'}
                        className={`w-3 h-3 rounded-full ${concept.activo ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-600'}`}
                      />
                      <span className={`font-semibold ${concept.activo ? 'text-white' : 'text-slate-500 line-through'}`}>
                        {concept.nombre}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingConceptId(concept.id);
                        setEditingConceptName(concept.nombre);
                      }}
                      title="Editar nombre"
                      className="p-1 text-slate-400 hover:text-white rounded"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteConcept(concept.id)}
                      title="Eliminar concepto"
                      className="p-1 text-slate-400 hover:text-red-400 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowConceptsModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN DE ELIMINACIÓN DE GASTO */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">¿Eliminar este Gasto?</h3>
                <p className="text-[11px] text-slate-400">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Código:</span>
                <span className="font-mono font-bold text-emerald-400">{expenseToDelete.codigo || 'S/N'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Concepto:</span>
                <span className="font-bold text-purple-300">
                  {expenseConcepts.find(c => c.id === expenseToDelete.concepto_id)?.nombre || 'General'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Monto:</span>
                <span className="font-black text-amber-400 text-sm">
                  ${expenseToDelete.monto.toLocaleString('es-CO')} COP
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Fecha:</span>
                <span className="text-slate-200">
                  {new Date(expenseToDelete.fecha).toLocaleString('es-CO', { dateStyle: 'medium' })}
                </span>
              </div>
              {expenseToDelete.descripcion && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400 block mb-1 text-[11px]">Detalle:</span>
                  <p className="text-slate-300 italic text-[11px] bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    "{expenseToDelete.descripcion}"
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteExpense}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/20 transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Eliminando...' : 'Sí, Eliminar Gasto'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ExpensesPage;
