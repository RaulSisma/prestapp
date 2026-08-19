import React, { useState } from 'react';
import { 
  X, CheckCircle2, Clock, Calendar, 
  DollarSign, TrendingUp
} from 'lucide-react';
import { Customer, Loan } from '../types';
import { useData } from '../contexts/DataContext';

interface CustomerPaymentHistoryModalProps {
  customer: Customer;
  onClose: () => void;
  onNewPayment?: (loan: Loan) => void;
}

export const CustomerPaymentHistoryModal: React.FC<CustomerPaymentHistoryModalProps> = ({
  customer,
  onClose,
  onNewPayment
}) => {
  const { loans, payments, postponements, routes, users } = useData();

  const customerLoans = loans.filter(l => l.cliente_id === customer.id);
  const [selectedLoanId, setSelectedLoanId] = useState<string>(
    customerLoans.find(l => l.estado === 'ACTIVO' || l.estado === 'EN_MORA')?.id || customerLoans[0]?.id || ''
  );

  const selectedLoan = customerLoans.find(l => l.id === selectedLoanId) || customerLoans[0];
  const customerRoute = routes.find(r => r.id === customer.ruta_id);

  // Pagos del préstamo seleccionado
  const loanPayments = payments
    .filter(p => p.prestamo_id === selectedLoan?.id)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  // Aplazamientos del préstamo seleccionado
  const loanPostponements = (postponements || [])
    .filter(p => p.prestamo_id === selectedLoan?.id)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  // Cálculo de cumplimiento y puntualidad
  const totalAbonado = loanPayments.reduce((sum, p) => sum + p.valor, 0);
  const cuotasPagadas = selectedLoan ? selectedLoan.cuotas_pagadas : 0;
  const totalPostponements = loanPostponements.length;
  
  // Porcentaje de cumplimiento crediticio realista y matemático
  let compliancePercentage = 100;
  let complianceLabel = 'Excelente';
  let complianceColor = 'emerald';

  if (selectedLoan) {
    if (selectedLoan.estado === 'PAGADO') {
      compliancePercentage = Math.max(70, 100 - (totalPostponements * 5));
      complianceLabel = compliancePercentage >= 90 ? 'Excelente' : 'Completado c/ Aplazamientos';
      complianceColor = 'emerald';
    } else if (cuotasPagadas === 0) {
      if (totalPostponements > 0) {
        // Caso específico: Préstamo sin abonos y con cobro(s) aplazado(s)
        compliancePercentage = 0;
        complianceLabel = totalPostponements === 1 ? '1 Aplazamiento / Sin Abonos' : `${totalPostponements} Aplazamientos / Sin Abonos`;
        complianceColor = 'red';
      } else {
        // Préstamo nuevo al día sin cobros fallidos aún
        compliancePercentage = 100;
        complianceLabel = 'Al Día / Nuevo';
        complianceColor = 'emerald';
      }
    } else {
      // Ha pagado al menos 1 cuota: calculamos la tasa de efectividad en las visitas
      const totalVisitas = cuotasPagadas + totalPostponements;
      const tasaPuntualidad = (cuotasPagadas / totalVisitas) * 100;
      
      let baseScore = Math.round(tasaPuntualidad);
      if (selectedLoan.estado === 'EN_MORA') {
        baseScore = Math.max(10, baseScore - 25);
      }

      compliancePercentage = Math.min(100, Math.max(0, baseScore));

      if (compliancePercentage >= 90) {
        complianceLabel = 'Excelente';
        complianceColor = 'emerald';
      } else if (compliancePercentage >= 75) {
        complianceLabel = 'Bueno';
        complianceColor = 'teal';
      } else if (compliancePercentage >= 50) {
        complianceLabel = 'Regular';
        complianceColor = 'amber';
      } else {
        complianceLabel = 'Crítico / En Riesgo';
        complianceColor = 'red';
      }
    }
  }

  // Generación de Proyección de Cuotas Restantes
  const generateProjectedInstallments = () => {
    if (!selectedLoan || selectedLoan.saldo <= 0) return [];
    
    const remainingCount = Math.max(1, selectedLoan.cuotas_totales - selectedLoan.cuotas_pagadas);
    const regularQuotaVal = selectedLoan.valor_cuota;
    const items = [];
    
    let currentDate = new Date();
    // Si la fecha de inicio del préstamo es futura o reciente
    if (selectedLoan.fecha_inicio) {
      const startDate = new Date(selectedLoan.fecha_inicio);
      if (startDate > currentDate) currentDate = startDate;
    }

    let runningBalance = selectedLoan.saldo;

    for (let i = 1; i <= remainingCount && runningBalance > 0; i++) {
      const quotaNum = selectedLoan.cuotas_pagadas + i;
      
      // Proyectar siguiente fecha según frecuencia
      const nextDate = new Date(currentDate);
      if (selectedLoan.tipo_pago === 'DIARIO') {
        nextDate.setDate(nextDate.getDate() + i);
        // Omitir domingos si aplica
        if (nextDate.getDay() === 0) nextDate.setDate(nextDate.getDate() + 1);
      } else if (selectedLoan.tipo_pago === 'SEMANAL') {
        nextDate.setDate(nextDate.getDate() + (i * 7));
      } else if (selectedLoan.tipo_pago === 'QUINCENAL') {
        nextDate.setDate(nextDate.getDate() + (i * 15));
      } else if (selectedLoan.tipo_pago === 'MENSUAL') {
        nextDate.setMonth(nextDate.getMonth() + i);
      }

      const quotaAmount = Math.min(regularQuotaVal, runningBalance);
      runningBalance = Math.max(0, runningBalance - quotaAmount);

      items.push({
        numero: quotaNum,
        fechaEstimada: nextDate.toISOString().split('T')[0],
        valor: quotaAmount,
        saldoRestante: runningBalance
      });
    }

    return items;
  };

  const projectedInstallments = generateProjectedInstallments();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            {customer.foto_cliente ? (
              <img 
                src={customer.foto_cliente} 
                alt={customer.nombre} 
                className="w-11 h-11 rounded-2xl object-cover border border-emerald-500/40 shadow-sm"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-extrabold text-white text-base">
                {customer.nombre.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-lg leading-tight">{customer.nombre}</h3>
                {customer.alias && (
                  <span className="text-xs text-emerald-400 font-medium">("{customer.alias}")</span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>C.C: {customer.documento || 'Sin doc'}</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">{customerRoute?.nombre || 'Ruta General'}</span>
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Selector de Préstamos si tiene varios */}
          {customerLoans.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-semibold text-slate-400 shrink-0">Préstamo:</span>
              {customerLoans.map((l, idx) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLoanId(l.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                    selectedLoan?.id === l.id
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  #{idx + 1} - ${l.monto.toLocaleString('es-CO')} ({l.estado})
                </button>
              ))}
            </div>
          )}

          {!selectedLoan ? (
            <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-800 text-slate-400">
              Este cliente no registra préstamos en el sistema actualmente.
            </div>
          ) : (
            <>
              {/* Panel de Indicadores & Cumplimiento */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Monto Prestado</span>
                  <span className="text-base sm:text-lg font-black text-white">
                    ${selectedLoan.monto.toLocaleString('es-CO')}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Total c/int: ${selectedLoan.monto_total.toLocaleString('es-CO')}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Total Abonado</span>
                  <span className="text-base sm:text-lg font-black text-emerald-400">
                    ${totalAbonado.toLocaleString('es-CO')}
                  </span>
                  <span className="text-[10px] text-emerald-500/80 block mt-0.5">{selectedLoan.cuotas_pagadas} de {selectedLoan.cuotas_totales} cuotas</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Saldo Pendiente</span>
                  <span className="text-base sm:text-lg font-black text-red-400">
                    ${selectedLoan.saldo.toLocaleString('es-CO')}
                  </span>
                  <span className="text-[10px] text-red-400/80 block mt-0.5">Cuota: ${selectedLoan.valor_cuota.toLocaleString('es-CO')}</span>
                </div>

                <div className={`p-3.5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border ${
                  complianceColor === 'emerald' ? 'border-emerald-500/30' :
                  complianceColor === 'teal' ? 'border-teal-500/30' :
                  complianceColor === 'amber' ? 'border-amber-500/30' : 'border-red-500/40'
                }`}>
                  <span className={`text-[11px] font-semibold block uppercase flex items-center gap-1 ${
                    complianceColor === 'emerald' ? 'text-emerald-400' :
                    complianceColor === 'teal' ? 'text-teal-400' :
                    complianceColor === 'amber' ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    <TrendingUp className="w-3.5 h-3.5" /> Cumplimiento
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl sm:text-2xl font-black text-white">{compliancePercentage}%</span>
                    <span className={`text-[10px] font-bold truncate ${
                      complianceColor === 'emerald' ? 'text-emerald-400' :
                      complianceColor === 'teal' ? 'text-teal-400' :
                      complianceColor === 'amber' ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {complianceLabel}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        complianceColor === 'emerald' ? 'bg-emerald-400' :
                        complianceColor === 'teal' ? 'bg-teal-400' :
                        complianceColor === 'amber' ? 'bg-amber-400' : 'bg-red-500'
                      }`}
                      style={{ width: `${compliancePercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Registro de Aplazamientos si hubo */}
              {loanPostponements.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-800/50 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Registro de Cobros Aplazados / Prórrogas ({loanPostponements.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {loanPostponements.map(postp => (
                      <div key={postp.id} className="text-[11px] text-amber-200/90 flex flex-wrap items-center justify-between gap-1 bg-amber-950/40 p-2 rounded-xl border border-amber-800/30">
                        <span className="font-semibold">{new Date(postp.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}: {postp.motivo}</span>
                        {postp.observaciones && <span className="italic text-slate-300">"{postp.observaciones}"</span>}
                        {postp.nueva_fecha && <span className="text-emerald-400 font-bold">Aplazado para: {postp.nueva_fecha}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TABLA 1: CUOTAS ABONADAS / PAGADAS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Cuotas Abonadas (Historial de Pagos)
                  </h4>
                  <span className="text-xs text-slate-400 font-semibold">
                    {loanPayments.length} abonos registrados
                  </span>
                </div>

                {loanPayments.length === 0 ? (
                  <div className="p-5 text-center bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400">
                    Aún no se han registrado abonos para este préstamo.
                  </div>
                ) : (
                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">Cuota #</th>
                            <th className="py-2.5 px-3">Fecha & Hora</th>
                            <th className="py-2.5 px-3">Valor Pagado</th>
                            <th className="py-2.5 px-3">Método</th>
                            <th className="py-2.5 px-3">Cobrador</th>
                            <th className="py-2.5 px-3">Saldo Restante</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-200">
                          {loanPayments.map((p, idx) => {
                            const cobradorUser = users.find(u => u.id === p.registrado_por);
                            const fechaObj = new Date(p.fecha);
                            return (
                              <tr key={p.id} className="hover:bg-slate-800/40 transition">
                                <td className="py-2.5 px-3 font-bold text-white">
                                  #{p.num_cuota || loanPayments.length - idx}
                                </td>
                                <td className="py-2.5 px-3 text-slate-300">
                                  {fechaObj.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                  <span className="text-[10px] text-slate-500 block">
                                    {fechaObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-black text-emerald-400">
                                  ${p.valor.toLocaleString('es-CO')}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    p.metodo_pago === 'TRANSFERENCIA' 
                                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  }`}>
                                    {p.metodo_pago || 'EFECTIVO'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-400">
                                  {cobradorUser?.nombre || 'Cobrador'}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-300">
                                  ${(p.loanBalanceAfter !== undefined ? p.loanBalanceAfter : 0).toLocaleString('es-CO')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* TABLA 2: PROYECCIÓN DE CUOTAS POR CANCELAR */}
              {selectedLoan.saldo > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      Proyección de Cuotas por Cancelar
                    </h4>
                    <span className="text-xs text-blue-400 font-semibold">
                      {projectedInstallments.length} cuotas pendientes
                    </span>
                  </div>

                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
                    <div className="overflow-x-auto max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800 sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3">Cuota #</th>
                            <th className="py-2.5 px-3">Fecha Estimada</th>
                            <th className="py-2.5 px-3">Valor Cuota</th>
                            <th className="py-2.5 px-3">Saldo Proyectado</th>
                            <th className="py-2.5 px-3 text-right">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-200">
                          {projectedInstallments.map((inst, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/30">
                              <td className="py-2 px-3 font-bold text-slate-400">
                                #{inst.numero}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-300">
                                {inst.fechaEstimada}
                              </td>
                              <td className="py-2 px-3 font-bold text-white">
                                ${inst.valor.toLocaleString('es-CO')}
                              </td>
                              <td className="py-2 px-3 text-slate-400">
                                ${inst.saldoRestante.toLocaleString('es-CO')}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-amber-400 border border-slate-700">
                                  Por Cancelar
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
          >
            Cerrar Historial
          </button>

          {selectedLoan && selectedLoan.saldo > 0 && onNewPayment && (
            <button
              onClick={() => {
                onClose();
                onNewPayment(selectedLoan);
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95 flex items-center gap-1.5"
            >
              <DollarSign className="w-4 h-4" />
              Cobrar / Registrar Abono
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default CustomerPaymentHistoryModal;
