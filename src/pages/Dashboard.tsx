import React, { useState } from 'react';
import { 
  DollarSign, TrendingUp, AlertTriangle, Users, 
  MapPin, Plus, ShieldCheck, Receipt, Eye, UserCheck 
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { LoanModal } from '../components/LoanModal';
import { ThermalReceiptModal } from '../components/ThermalReceiptModal';
import { Payment, Loan, Customer } from '../types';

export const Dashboard: React.FC = () => {
  const { getDashboardStats, payments, loans, customers, routes, users } = useData();
  const { currentUser, role } = useAuth();
  const [showLoanModal, setShowLoanModal] = useState<boolean>(false);
  const [activeReceiptModal, setActiveReceiptModal] = useState<{
    payment: Payment;
    loan: Loan;
    customer: Customer;
  } | null>(null);

  const stats = getDashboardStats(currentUser?.id, role);

  const formattedCartera = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(stats.carteraTotal);
  const formattedRecaudo = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(stats.recaudoHoy);
  const formattedMora = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(stats.totalEnMora);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayPayments = payments.filter(p => p.fecha.startsWith(todayStr));

  const handleOpenReceipt = (payment: Payment) => {
    const loan = loans.find(l => l.id === payment.prestamo_id);
    const customer = customers.find(c => c.id === loan?.cliente_id) || {
      id: 'unknown',
      ruta_id: '',
      nombre: payment.customerName || 'Cliente',
      telefono: '3000000000',
      direccion: 'Ciudad',
      barrio: 'Zona',
      estado: 'ACTIVO',
      orden_visita: 1
    };

    if (loan) {
      setActiveReceiptModal({
        payment,
        loan,
        customer
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-2 sm:px-0">
      
      {/* HEADER ADAPTATIVO MÓVIL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5 flex-wrap">
            Tablero de Control Financiero
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              En Vivo
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Resumen global de cartera, cobranza en campo y rendimiento por rutas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLoanModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nuevo Préstamo
          </button>
        </div>
      </div>

      {/* TARJETAS KPI ADAPTATIVAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Cartera Total</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white">{formattedCartera}</p>
          <p className="text-xs text-slate-400">{stats.totalPrestamosActivos} préstamos vigentes</p>
        </div>

        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Recaudado Hoy</span>
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-400">{formattedRecaudo}</p>
          <p className="text-xs text-slate-400">Meta diaria: ${stats.metaDia.toLocaleString('es-CO')}</p>
        </div>

        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Cartera en Mora</span>
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-red-400">{formattedMora}</p>
          <p className="text-xs text-red-300 font-medium">{stats.porcentajeMora}% de índice de mora</p>
        </div>

        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Clientes Activos</span>
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white">{stats.totalClientesActivos}</p>
          <p className="text-xs text-slate-400">Registrados en el sistema</p>
        </div>
      </div>

      {/* RECAUDO POR COBRADOR & CUMPLIMIENTO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              Recaudo por Usuarios Cobradores
            </h2>
            <span className="text-xs text-slate-400">Hoy</span>
          </div>

          <div className="space-y-3">
            {stats.recaudoPorCobrador.map(col => (
              <div key={col.cobradorId} className="p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-200 text-xs sm:text-sm">{col.cobradorNombre}</span>
                  <span className="font-bold text-emerald-400 text-sm sm:text-base">
                    ${col.montoRecaudado.toLocaleString('es-CO')}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Clientes cobrados: {col.clientesCobrados} de {col.totalClientes}</span>
                  <span>{col.totalClientes > 0 ? Math.round((col.clientesCobrados / col.totalClientes) * 100) : 0}%</span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${col.totalClientes > 0 ? Math.min(100, Math.round((col.clientesCobrados / col.totalClientes) * 100)) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              Cumplimiento por Rutas
            </h2>
            <span className="text-xs text-slate-400">Sector Geográfico</span>
          </div>

          <div className="space-y-3">
            {stats.recaudoPorRuta.map(rt => (
              <div key={rt.rutaId} className="p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-200 text-xs sm:text-sm">{rt.rutaNombre}</span>
                  <span className="font-bold text-blue-400 text-sm sm:text-base">
                    ${rt.montoRecaudado.toLocaleString('es-CO')}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Cumplimiento cuota meta:</span>
                  <span className="font-bold text-blue-400">{rt.porcentajeCumplimiento}%</span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${rt.porcentajeCumplimiento}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* COBROS RECIENTES DEL DÍA CON BÚSQUEDA DINÁMICA DE CLIENTE Y COBRADOR */}
      <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
            Pagos y Abonos Recibidos Hoy ({todayPayments.length})
          </h2>
          <span className="text-[11px] sm:text-xs text-slate-400 hidden sm:inline">Clic en un cobro para ver recibo</span>
        </div>

        {todayPayments.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">No se han registrado cobros el día de hoy.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {todayPayments.slice(0, 8).map(payment => {
              const loan = loans.find(l => l.id === payment.prestamo_id);
              const customer = customers.find(c => c.id === loan?.cliente_id);
              const route = routes.find(r => r.id === customer?.ruta_id);
              const collector = users.find(u => u.id === payment.registrado_por) || users.find(u => u.id === route?.usuario_id);

              const customerName = customer?.nombre || payment.customerName || 'Cliente';
              const collectorName = collector?.nombre || payment.collectorName || 'Cobrador Registrado';

              return (
                <div 
                  key={payment.id}
                  onClick={() => handleOpenReceipt(payment)}
                  className="py-3 flex items-center justify-between hover:bg-slate-900/40 px-2 sm:px-3 rounded-xl cursor-pointer transition gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs sm:text-sm text-white truncate">{customerName}</h4>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="text-[11px] text-slate-400">
                        {payment.tipo === 'ABONO_EXTRA' ? 'Abono Extra' : `Cuota #${payment.num_cuota || 1}`} • {new Date(payment.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[10px]">
                        <UserCheck className="w-3 h-3 shrink-0" /> Cobrado por: {collectorName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className="font-extrabold text-emerald-400 text-xs sm:text-sm">
                      +${payment.valor.toLocaleString('es-CO')}
                    </span>
                    <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showLoanModal && (
        <LoanModal
          customer={null}
          onClose={() => setShowLoanModal(false)}
        />
      )}

      {activeReceiptModal && (
        <ThermalReceiptModal
          payment={activeReceiptModal.payment}
          loan={activeReceiptModal.loan}
          customer={activeReceiptModal.customer}
          onClose={() => setActiveReceiptModal(null)}
        />
      )}

    </div>
  );
};

export default Dashboard;
