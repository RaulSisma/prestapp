import React, { useState } from 'react';
import { 
  Phone, MapPin, CheckCircle2, 
  DollarSign, Search, MessageSquare, ShieldAlert,
  GripVertical, ChevronUp, ChevronDown, Clock, ArrowUpDown, Sparkles
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Customer, Loan } from '../types';
import { PaymentModal } from '../components/PaymentModal';

export const CollectorRoute: React.FC = () => {
  const { routes, customers, loans, payments, postponements, reorderCustomersInRoute } = useData();
  const { currentUser, role } = useAuth();

  const myRoutes = role === 'ADMIN' 
    ? routes 
    : routes.filter(r => r.usuario_id === currentUser?.id);

  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    myRoutes.length > 0 ? myRoutes[0].id : (routes[0]?.id || '')
  );

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'TODOS' | 'PENDIENTES' | 'COBRADOS'>('TODOS');
  
  const [activePaymentModal, setActivePaymentModal] = useState<{
    loan: Loan;
    customer: Customer;
  } | null>(null);

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [reorderNotification, setReorderNotification] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const routeCustomers = customers
    .filter(c => c.ruta_id === selectedRouteId)
    .sort((a, b) => a.orden_visita - b.orden_visita);

  const filteredCustomers = routeCustomers.filter(customer => {
    const matchesSearch = customer.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customer.barrio.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customer.direccion.toLowerCase().includes(searchTerm.toLowerCase());
    
    const custLoans = loans.filter(l => l.cliente_id === customer.id && (l.estado === 'ACTIVO' || l.estado === 'EN_MORA'));
    const isPaidToday = custLoans.some(l => 
      payments.some(p => p.prestamo_id === l.id && p.fecha.startsWith(todayStr))
    );

    if (filterStatus === 'PENDIENTES' && isPaidToday) return false;
    if (filterStatus === 'COBRADOS' && !isPaidToday) return false;

    return matchesSearch;
  });

  const totalRouteClients = routeCustomers.length;
  const collectedTodayCount = routeCustomers.filter(c => {
    const custLoans = loans.filter(l => l.cliente_id === c.id);
    return custLoans.some(l => payments.some(p => p.prestamo_id === l.id && p.fecha.startsWith(todayStr)));
  }).length;

  const totalCollectedAmount = payments
    .filter(p => p.fecha.startsWith(todayStr) && routeCustomers.some(c => loans.some(l => l.cliente_id === c.id && l.id === p.prestamo_id)))
    .reduce((sum, p) => sum + p.valor, 0);

  // Reordering functions
  const handleMoveItem = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= routeCustomers.length || fromIndex === toIndex) return;

    const newOrder = [...routeCustomers];
    const [movedItem] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedItem);

    const orderedIds = newOrder.map(c => c.id);
    await reorderCustomersInRoute(selectedRouteId, orderedIds);

    setReorderNotification(`Ruta reordenada: ${movedItem.nombre} ahora es la visita #${toIndex + 1}`);
    setTimeout(() => setReorderNotification(null), 2500);
  };

  // HTML5 Drag Events
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    await handleMoveItem(draggedIndex, dropIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Mobile Touch Drag Helpers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = async (e: React.TouchEvent, currentIndex: number) => {
    if (touchStartY === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchEndY - touchStartY;

    // Si el deslizamiento vertical es notable (mayor a 45px)
    if (deltaY < -45 && currentIndex > 0) {
      // Arrastrado hacia arriba
      await handleMoveItem(currentIndex, currentIndex - 1);
    } else if (deltaY > 45 && currentIndex < routeCustomers.length - 1) {
      // Arrastrado hacia abajo
      await handleMoveItem(currentIndex, currentIndex + 1);
    }

    setTouchStartY(null);
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-12">
      
      {/* HEADER PANEL */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block">
                Recorrido de Cobranza Diario
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                Ordenable
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {myRoutes.find(r => r.id === selectedRouteId)?.nombre || 'Sin Ruta Asignada'}
            </h1>
          </div>

          {myRoutes.length > 1 && (
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-2xl text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
            >
              {myRoutes.map(r => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          )}
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-800/80 text-center">
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Progreso</span>
            <span className="text-base sm:text-lg font-extrabold text-white">
              {collectedTodayCount} / {totalRouteClients}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Recaudado Hoy</span>
            <span className="text-base sm:text-lg font-extrabold text-emerald-400">
              ${totalCollectedAmount.toLocaleString('es-CO')}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Pendientes</span>
            <span className="text-base sm:text-lg font-extrabold text-amber-400">
              {totalRouteClients - collectedTodayCount}
            </span>
          </div>
        </div>

        {/* REORDER NOTIFICATION & INSTRUCTIONS */}
        <div className="pt-2">
          {reorderNotification ? (
            <div className="p-2.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{reorderNotification}</span>
            </div>
          ) : (
            <div className="p-2.5 rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-[11px] sm:text-xs">
                  <strong>Personaliza tu ruta:</strong> Arrastra las tarjetas o usa las flechas <strong>▲ / ▼</strong> para ajustar el orden de cobro a tu conveniencia.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, barrio o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex gap-1 bg-slate-900 p-1 border border-slate-800 rounded-2xl self-start">
          <button
            onClick={() => setFilterStatus('TODOS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterStatus === 'TODOS' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos ({routeCustomers.length})
          </button>
          <button
            onClick={() => setFilterStatus('PENDIENTES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterStatus === 'PENDIENTES' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilterStatus('COBRADOS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterStatus === 'COBRADOS' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cobrados
          </button>
        </div>
      </div>

      {/* CUSTOMERS ROUTE LIST (DRAGGABLE & TOUCH SORTABLE) */}
      <div className="space-y-3.5">
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center glass-panel rounded-3xl border border-slate-800 text-slate-400 text-sm">
            No se encontraron clientes para la búsqueda o filtro seleccionado.
          </div>
        ) : (
          filteredCustomers.map((customer, index) => {
            const customerLoans = loans.filter(l => l.cliente_id === customer.id && l.estado !== 'PAGADO');
            const activeLoan = customerLoans[0];

            const isPaidToday = activeLoan ? payments.some(p => p.prestamo_id === activeLoan.id && p.fecha.startsWith(todayStr)) : false;
            const customerPostponements = postponements?.filter(p => p.cliente_id === customer.id && p.fecha.startsWith(todayStr)) || [];
            const isPostponedToday = !isPaidToday && customerPostponements.length > 0;
            const lastPostponement = customerPostponements[0];

            const isDraggingThis = draggedIndex === index;
            const isDragOverThis = dragOverIndex === index;

            return (
              <div 
                key={customer.id}
                draggable={searchTerm === '' && filterStatus === 'TODOS'}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`glass-card p-4 sm:p-5 rounded-3xl border transition-all duration-200 ${
                  isDraggingThis
                    ? 'opacity-40 scale-[0.98] border-dashed border-emerald-500 bg-slate-900/90'
                    : isDragOverThis
                    ? 'border-emerald-400 ring-2 ring-emerald-500/50 bg-slate-900/90'
                    : isPaidToday 
                    ? 'border-emerald-500/30 bg-emerald-950/10' 
                    : isPostponedToday
                    ? 'border-amber-500/30 bg-amber-950/10'
                    : activeLoan?.estado === 'EN_MORA'
                    ? 'border-red-500/40 bg-red-950/10'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                
                <div className="flex items-start justify-between gap-3">
                  
                  {/* LEFT: DRAG HANDLE & CLIENT INFO */}
                  <div className="flex items-center gap-2.5 sm:gap-3.5">
                    
                    {/* DRAG HANDLE & REORDER BUTTONS */}
                    <div className="flex flex-col items-center justify-center gap-1 shrink-0">
                      {/* Subir */}
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveItem(index, index - 1)}
                        className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:hover:bg-transparent transition"
                        title="Mover arriba en la ruta"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>

                      {/* Grip Handle for Drag & Touch */}
                      <div 
                        onTouchStart={handleTouchStart}
                        onTouchEnd={(e) => handleTouchEnd(e, index)}
                        className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing hover:bg-slate-700 transition"
                        title="Arrastra para cambiar orden"
                      >
                        <span className="text-[10px] font-black text-emerald-400 leading-none block">
                          #{customer.orden_visita || index + 1}
                        </span>
                        <GripVertical className="w-3 h-3 text-slate-400 mt-0.5" />
                      </div>

                      {/* Bajar */}
                      <button
                        type="button"
                        disabled={index === routeCustomers.length - 1}
                        onClick={() => handleMoveItem(index, index + 1)}
                        className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:hover:bg-transparent transition"
                        title="Mover abajo en la ruta"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* CUSTOMER DETAILS */}
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2 truncate">
                        {customer.nombre}
                        {customer.alias && (
                          <span className="text-xs text-slate-400 font-normal truncate">("{customer.alias}")</span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{customer.direccion}</span> • <span className="text-emerald-400 font-medium">{customer.barrio}</span>
                      </p>
                    </div>
                  </div>

                  {/* STATUS BADGES */}
                  <div className="shrink-0 text-right">
                    {isPaidToday ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Pagado Hoy
                      </span>
                    ) : isPostponedToday ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30">
                        <Clock className="w-3.5 h-3.5" /> Pospuesto
                      </span>
                    ) : activeLoan?.estado === 'EN_MORA' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30 animate-pulse">
                        <ShieldAlert className="w-3.5 h-3.5" /> En Mora
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 text-amber-400 text-xs font-bold border border-amber-500/30">
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>

                {/* POSTPONEMENT NOTICE IF ANY */}
                {isPostponedToday && lastPostponement && (
                  <div className="mt-3 p-2.5 rounded-2xl bg-amber-950/40 border border-amber-800/40 text-[11px] text-amber-300 flex items-center justify-between">
                    <span><strong>Nota de Aplazamiento:</strong> {lastPostponement.motivo}</span>
                    {lastPostponement.nueva_fecha && (
                      <span className="font-bold text-amber-200">Reagendado: {lastPostponement.nueva_fecha}</span>
                    )}
                  </div>
                )}

                {/* LOAN FINANCIAL SUMMARY */}
                {activeLoan ? (
                  <div className="mt-3.5 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Valor Cuota</span>
                      <span className="text-base font-extrabold text-emerald-400">
                        ${activeLoan.valor_cuota.toLocaleString('es-CO')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Saldo Pendiente</span>
                      <span className="text-base font-bold text-red-400">
                        ${activeLoan.saldo.toLocaleString('es-CO')}
                      </span>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Avance Cuotas</span>
                      <span className="text-xs font-semibold text-slate-300">
                        {activeLoan.cuotas_pagadas} de {activeLoan.cuotas_totales} ({Math.round((activeLoan.cuotas_pagadas / activeLoan.cuotas_totales)*100)}%)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-slate-500 italic">
                    Sin préstamo activo en este momento.
                  </div>
                )}

                {/* FOOTER ACTIONS: PHONE / WHATSAPP / COBRAR */}
                <div className="mt-3.5 flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
                  <div className="flex gap-2">
                    <a
                      href={`tel:${customer.telefono}`}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="Llamar Cliente"
                    >
                      <Phone className="w-4 h-4" />
                    </a>

                    <a
                      href={`https://wa.me/57${customer.telefono.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/40 transition"
                      title="WhatsApp Directo"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </a>
                  </div>

                  {activeLoan && (
                    <button
                      onClick={() => setActivePaymentModal({ loan: activeLoan, customer })}
                      className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm shadow-md transition active:scale-95 ${
                        isPaidToday
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/20'
                      }`}
                    >
                      <DollarSign className="w-4 h-4" />
                      {isPaidToday ? 'Registrar Otro Pago' : 'Cobrar Cuota ($)'}
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {activePaymentModal && (
        <PaymentModal
          loan={activePaymentModal.loan}
          customer={activePaymentModal.customer}
          onClose={() => setActivePaymentModal(null)}
        />
      )}

    </div>
  );
};

export default CollectorRoute;
