import React, { useState } from 'react';
import { 
  DollarSign, Plus, Search, 
  CheckCircle2, AlertTriangle, Clock, RefreshCw, Trash2
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Loan, Customer } from '../types';
import { LoanModal } from '../components/LoanModal';
import { PaymentModal } from '../components/PaymentModal';
import { RefinanceLoanModal } from '../components/RefinanceLoanModal';

export const LoansPage: React.FC = () => {
  const { loans, customers, routes, deleteLoan } = useData();
  const { currentUser, role, hasPermission } = useAuth();

  // Filtrar clientes permitidos según el rol del usuario
  const isGlobalViewer = role === 'ADMIN' || role === 'SUPERVISOR';
  const allowedRoutes = isGlobalViewer 
    ? routes 
    : routes.filter(r => r.usuario_id === currentUser?.id);
  const allowedRouteIds = allowedRoutes.map(r => r.id);
  const allowedCustomerIds = customers
    .filter(c => allowedRouteIds.includes(c.ruta_id))
    .map(c => c.id);

  const scopedLoans = isGlobalViewer
    ? loans
    : loans.filter(l => allowedCustomerIds.includes(l.cliente_id));

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  
  const [showLoanModal, setShowLoanModal] = useState<boolean>(false);
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<{
    loan: Loan;
    customer: Customer;
  } | null>(null);
  const [selectedLoanForRefinance, setSelectedLoanForRefinance] = useState<{
    loan: Loan;
    customer: Customer;
  } | null>(null);
  const [loanToDelete, setLoanToDelete] = useState<{
    loan: Loan;
    customer?: Customer;
  } | null>(null);
  const [isDeletingLoan, setIsDeletingLoan] = useState<boolean>(false);

  const filteredLoans = scopedLoans.filter(loan => {
    const customer = customers.find(c => c.id === loan.cliente_id);
    const matchesSearch = customer ? customer.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || customer.barrio.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const matchesStatus = filterStatus === 'TODOS' || loan.estado === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-2 sm:px-0">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5 flex-wrap">
            {role === 'ADMIN' ? 'Administración de Préstamos' : 'Préstamos de mis Rutas'}
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              {scopedLoans.length} Totales
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {role === 'ADMIN' ? 'Control global de cartera, saldos y cuotas.' : 'Préstamos activos asignados a tu zona de cobro.'}
          </p>
        </div>

        {hasPermission('create_loan') && (
          <button
            onClick={() => setShowLoanModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nuevo Préstamo
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar préstamo por nombre de cliente o barrio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs sm:text-sm font-semibold text-white focus:outline-none"
        >
          <option value="TODOS">Todos los Estados</option>
          <option value="ACTIVO">Activos</option>
          <option value="EN_MORA">En Mora</option>
          <option value="REFINANCIADO">Refinanciados</option>
          <option value="PAGADO">Pagados Completos</option>
        </select>
      </div>

      <div className="space-y-4">
        {filteredLoans.length === 0 ? (
          <div className="p-8 text-center glass-panel rounded-3xl border border-slate-800 text-slate-400 text-xs sm:text-sm">
            No se encontraron préstamos asignados a tus clientes.
          </div>
        ) : (
          filteredLoans.map(loan => {
            const customer = customers.find(c => c.id === loan.cliente_id);
            const route = routes.find(r => r.id === customer?.ruta_id);

            const progressPct = Math.min(100, Math.round(((loan.monto_total - loan.saldo) / loan.monto_total) * 100));

            return (
              <div 
                key={loan.id}
                className="glass-card p-4 sm:p-5 rounded-3xl border border-slate-800/80 hover:border-slate-700 transition space-y-4"
              >
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base sm:text-lg text-white">{customer?.nombre || 'Cliente Desconocido'}</h3>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {route?.nombre || 'Sin Ruta'}
                      </span>
                      {loan.es_refinanciacion && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                          Crédito Refinanciado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Inicio: {loan.fecha_inicio} • Frecuencia: <span className="text-emerald-400 font-semibold">{loan.tipo_pago}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {loan.estado === 'PAGADO' ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Pagado Completo
                      </span>
                    ) : loan.estado === 'REFINANCIADO' ? (
                      <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30 flex items-center gap-1">
                        <RefreshCw className="w-3.5 h-3.5" /> Refinanciado (Saldo $0)
                      </span>
                    ) : loan.estado === 'EN_MORA' ? (
                      <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> En Mora
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/30 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Activo
                      </span>
                    )}

                    {hasPermission('delete_loan') && (
                      <button
                        onClick={() => setLoanToDelete({ loan, customer })}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition active:scale-95"
                        title="Eliminar Préstamo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Monto Inicial</span>
                    <span className="text-sm sm:text-base font-bold text-white">${loan.monto.toLocaleString('es-CO')}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total con Interés</span>
                    <span className="text-sm sm:text-base font-bold text-slate-200">${loan.monto_total.toLocaleString('es-CO')}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Valor Cuota</span>
                    <span className="text-sm sm:text-base font-extrabold text-emerald-400">${loan.valor_cuota.toLocaleString('es-CO')}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Saldo Restante</span>
                    <span className="text-sm sm:text-base font-extrabold text-red-400">${loan.saldo.toLocaleString('es-CO')}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Avance: {loan.cuotas_pagadas} de {loan.cuotas_totales} cuotas</span>
                    <span className="font-bold text-emerald-400">{progressPct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {loan.estado !== 'PAGADO' && loan.estado !== 'REFINANCIADO' && customer && (
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                    {loan.saldo > 0 && hasPermission('edit_loan') && (
                      <button
                        onClick={() => setSelectedLoanForRefinance({ loan, customer })}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 font-bold text-xs transition active:scale-95"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Refinanciar
                      </button>
                    )}
                    {hasPermission('record_payment') && (
                      <button
                        onClick={() => setSelectedLoanForPayment({ loan, customer })}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md transition active:scale-95"
                      >
                        <DollarSign className="w-4 h-4" /> Registrar Pago / Abono
                      </button>
                    )}
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {showLoanModal && (
        <LoanModal
          customer={null}
          onClose={() => setShowLoanModal(false)}
        />
      )}

      {selectedLoanForPayment && (
        <PaymentModal
          loan={selectedLoanForPayment.loan}
          customer={selectedLoanForPayment.customer}
          onClose={() => setSelectedLoanForPayment(null)}
        />
      )}

      {selectedLoanForRefinance && (
        <RefinanceLoanModal
          loan={selectedLoanForRefinance.loan}
          customer={selectedLoanForRefinance.customer}
          onClose={() => setSelectedLoanForRefinance(null)}
        />
      )}

      {/* MODAL CONFIRMAR ELIMINACIÓN DE PRÉSTAMO */}
      {loanToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base sm:text-lg">¿Eliminar Préstamo?</h3>
                <p className="text-xs text-slate-400">Se anulará el crédito y todos sus pagos registrados</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Cliente:</span>
                <span className="font-bold text-white">{loanToDelete.customer?.nombre || 'Cliente'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Monto Inicial:</span>
                <span className="text-slate-200 font-bold">${loanToDelete.loan.monto.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Saldo Pendiente:</span>
                <span className="text-red-400 font-extrabold">${loanToDelete.loan.saldo.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cuotas Pagadas:</span>
                <span className="text-emerald-400 font-bold">{loanToDelete.loan.cuotas_pagadas} de {loanToDelete.loan.cuotas_totales}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingLoan}
                onClick={async () => {
                  setIsDeletingLoan(true);
                  try {
                    await deleteLoan(loanToDelete.loan.id);
                    setLoanToDelete(null);
                  } catch (err) {
                    console.error('Error al eliminar préstamo:', err);
                  } finally {
                    setIsDeletingLoan(false);
                  }
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeletingLoan ? 'Eliminando...' : 'Sí, Eliminar Préstamo'}
              </button>
              <button
                type="button"
                disabled={isDeletingLoan}
                onClick={() => setLoanToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
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

export default LoansPage;
