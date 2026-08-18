import React, { useState } from 'react';
import { Calendar, Search, Printer, Eye, Trash2, UserCheck } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Payment, Loan, Customer } from '../types';
import { ThermalReceiptModal } from '../components/ThermalReceiptModal';

export const ReportsPage: React.FC = () => {
  const { payments, loans, customers, routes, users, deletePayment } = useData();
  const { role } = useAuth();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [activeReceiptModal, setActiveReceiptModal] = useState<{
    payment: Payment;
    loan: Loan;
    customer: Customer;
  } | null>(null);

  const filteredPayments = payments.filter(p => {
    const loan = loans.find(l => l.id === p.prestamo_id);
    const customer = customers.find(c => c.id === loan?.cliente_id);
    const route = routes.find(r => r.id === customer?.ruta_id);
    const collector = users.find(u => u.id === p.registrado_por) || users.find(u => u.id === route?.usuario_id);

    const customerName = customer?.nombre || p.customerName || '';
    const collectorName = collector?.nombre || p.collectorName || '';

    const matchesDate = p.fecha.startsWith(filterDate);
    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          collectorName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  });

  const totalCollectedOnDate = filteredPayments.reduce((sum, p) => sum + p.valor, 0);

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

  const handleDeleteDirect = async (payment: Payment, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`⚠️ ¿Estás seguro de ANULAR y eliminar este pago de $${payment.valor.toLocaleString('es-CO')}?\n\nEl saldo del cliente se restaurará.`)) {
      await deletePayment(payment.id);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-2 sm:px-0">
      
      {/* HEADER ADAPTATIVO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5 flex-wrap">
            Reportes y Arqueo de Caja
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              Auditoría
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Consolidado histórico de cobros diarios con detalle de cobradores y comprobantes. Clic en cualquier registro para ver el recibo.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm border border-slate-700 transition"
        >
          <Printer className="w-4 h-4" />
          Imprimir Reporte
        </button>
      </div>

      {/* FILTROS MOBILES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative col-span-1 sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, cobrador o ID recibo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="relative">
          <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white focus:outline-none"
          />
        </div>
      </div>

      {/* RESUMEN ARQUEO */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Recaudado en Fecha ({filterDate}):</span>
          <h2 className="text-2xl sm:text-3xl font-black text-emerald-400 mt-0.5">
            ${totalCollectedOnDate.toLocaleString('es-CO')}
          </h2>
        </div>
        <div className="text-xs text-slate-400">
          Total de transacciones: <span className="font-bold text-white text-sm">{filteredPayments.length}</span>
        </div>
      </div>

      {/* TABLA ADAPTATIVO CON RESOLUCIÓN DINÁMICA DE CLIENTE, COBRADOR Y SALDO */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[700px]">
            <thead className="bg-slate-900/80 text-[11px] uppercase text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">ID Recibo</th>
                <th className="px-4 py-3.5">Hora</th>
                <th className="px-4 py-3.5">Cliente</th>
                <th className="px-4 py-3.5">Cobrador Registrado</th>
                <th className="px-4 py-3.5">Tipo Pago</th>
                <th className="px-4 py-3.5 text-right">Valor Pagado</th>
                <th className="px-4 py-3.5 text-right">Saldo Posterior</th>
                <th className="px-4 py-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500 italic">
                    No hay cobros registrados en la fecha seleccionada.
                  </td>
                </tr>
              ) : (
                filteredPayments.map(payment => {
                  const formattedTime = new Date(payment.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
                  
                  // Resolución dinámica precisa de datos
                  const loan = loans.find(l => l.id === payment.prestamo_id);
                  const customer = customers.find(c => c.id === loan?.cliente_id);
                  const route = routes.find(r => r.id === customer?.ruta_id);
                  const collector = users.find(u => u.id === payment.registrado_por) || users.find(u => u.id === route?.usuario_id);

                  const customerName = customer?.nombre || payment.customerName || 'Cliente';
                  const collectorName = collector?.nombre || payment.collectorName || 'Cobrador Registrado';
                  const loanBalanceAfter = payment.loanBalanceAfter ?? (loan ? loan.saldo : 0);

                  return (
                    <tr 
                      key={payment.id} 
                      onClick={() => handleOpenReceipt(payment)}
                      className="hover:bg-slate-900/60 cursor-pointer transition"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-400">
                        #{payment.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {formattedTime}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">
                        {customerName}
                      </td>
                      <td className="px-4 py-3 font-medium text-emerald-400">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{collectorName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          payment.tipo === 'ABONO_EXTRA'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {payment.tipo === 'ABONO_EXTRA' ? 'Abono Extra' : `Cuota #${payment.num_cuota || 1}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-emerald-400 text-sm sm:text-base">
                        ${payment.valor.toLocaleString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-400">
                        ${loanBalanceAfter.toLocaleString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenReceipt(payment); }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                            title="Ver Recibo Térmico"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {role === 'ADMIN' && (
                            <button
                              onClick={(e) => handleDeleteDirect(payment, e)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                              title="Anular Pago (Solo Admin)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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

export default ReportsPage;
