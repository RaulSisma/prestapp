import React, { useState } from 'react';
import { 
  X, RefreshCw, AlertTriangle, CheckCircle2, 
  Calendar, DollarSign, Percent, Hash, Clock
} from 'lucide-react';
import { Loan, Customer, PaymentFrequency } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

interface RefinanceLoanModalProps {
  loan: Loan;
  customer: Customer;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RefinanceLoanModal: React.FC<RefinanceLoanModalProps> = ({
  loan,
  customer,
  onClose,
  onSuccess
}) => {
  const { refinanceLoan, postponements } = useData();
  const { currentUser } = useAuth();

  const customerPostponements = (postponements || []).filter(p => p.cliente_id === customer.id);
  const loanPostponements = customerPostponements.filter(p => p.prestamo_id === loan.id);

  const [additionalCapital, setAdditionalCapital] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(loan.interes || 20);
  const [totalQuotas, setTotalQuotas] = useState<number>(loan.cuotas_totales || 30);
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>(loan.tipo_pago || 'DIARIO');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('Refinanciación de crédito por acuerdo de pago');
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cálculos en tiempo real
  const currentPendingBalance = loan.saldo;
  const newBaseCapital = currentPendingBalance + additionalCapital;
  const newTotalWithInterest = Math.round(newBaseCapital * (1 + (interestRate / 100)));
  const calculatedQuotaValue = totalQuotas > 0 ? Math.round(newTotalWithInterest / totalQuotas) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newBaseCapital <= 0) {
      setErrorMsg('El capital a refinanciar debe ser mayor a $0.');
      return;
    }
    if (totalQuotas <= 0) {
      setErrorMsg('El número de cuotas debe ser al menos 1.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await refinanceLoan({
        prestamo_anterior_id: loan.id,
        cliente_id: customer.id,
        saldo_anterior: currentPendingBalance,
        capital_adicional: additionalCapital,
        nuevo_monto: newBaseCapital,
        interes: interestRate,
        cuotas_totales: totalQuotas,
        tipo_pago: paymentFrequency,
        fecha_inicio: startDate,
        observaciones: notes,
        registrado_por: currentUser?.id
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la refinanciación.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg leading-tight">
                Refinanciar Préstamo
              </h3>
              <p className="text-xs text-slate-400">
                {customer.nombre} • Saldo actual: <span className="text-red-400 font-bold">${currentPendingBalance.toLocaleString('es-CO')}</span>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Banner Informativo de Trazabilidad y Rendimiento en BD */}
          <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-800/40 text-xs text-purple-200/90 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-purple-300">
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              <span>Trazabilidad y Rendimiento Conservados en Base de Datos</span>
            </div>
            <p className="leading-relaxed text-[11px] text-slate-300">
              El préstamo actual #{loan.id.slice(0, 8)} pasará a estado <span className="font-bold text-purple-300">REFINANCIADO</span> (saldo $0). 
              Los <span className="font-bold text-amber-300">{loanPostponements.length} aplazamientos/incumplimientos</span> registrados se conservan permanentemente en BD para el score histórico del cliente.
            </p>
          </div>

          {/* Resumen Préstamo Base */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-800/50 border border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Saldo a Refinanciar</span>
              <span className="text-sm sm:text-base font-black text-red-400">${currentPendingBalance.toLocaleString('es-CO')}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Cuotas Pagadas Previas</span>
              <span className="text-sm sm:text-base font-bold text-emerald-400">{loan.cuotas_pagadas} de {loan.cuotas_totales}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Aplazamientos en BD</span>
              <span className="text-sm sm:text-base font-bold text-amber-400">{loanPostponements.length} Registrados</span>
            </div>
          </div>

          {/* Campos de Configuración del Nuevo Préstamo */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Condiciones del Nuevo Crédito
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Capital Adicional */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  Capital Adicional a Entregar (Opcional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={additionalCapital || ''}
                  placeholder="$0 (Solo refinanciar saldo)"
                  onChange={(e) => setAdditionalCapital(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500"
                />
                <span className="text-[10px] text-slate-500 block">
                  Nuevo Capital Base: ${(newBaseCapital).toLocaleString('es-CO')}
                </span>
              </div>

              {/* Tasa de Interés */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-purple-400" />
                  Tasa de Interés (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              {/* Cuotas Totales */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-blue-400" />
                  Número de Cuotas
                </label>
                <input
                  type="number"
                  min="1"
                  max="360"
                  value={totalQuotas}
                  onChange={(e) => setTotalQuotas(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              {/* Frecuencia de Pago */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Frecuencia de Pago
                </label>
                <select
                  value={paymentFrequency}
                  onChange={(e) => setPaymentFrequency(e.target.value as PaymentFrequency)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="DIARIO">Diario</option>
                  <option value="SEMANAL">Semanal</option>
                  <option value="QUINCENAL">Quincenal</option>
                  <option value="MENSUAL">Mensual</option>
                </select>
              </div>

              {/* Fecha de Inicio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-400" />
                  Fecha de Inicio Primer Cobro
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              {/* Observaciones */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Motivo / Observaciones
                </label>
                <input
                  type="text"
                  value={notes}
                  placeholder="Ej: Acuerdo de pago y extensión de plazo"
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

            </div>
          </div>

          {/* Liquidación Proyectada del Nuevo Préstamo */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900 border border-purple-500/40 space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-slate-700/60 pb-2">
              <span className="text-slate-400">Total Liquidado con Interés:</span>
              <span className="font-black text-white text-base">${newTotalWithInterest.toLocaleString('es-CO')}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Nuevo Valor por Cuota ({paymentFrequency.toLowerCase()}):</span>
              <span className="font-extrabold text-emerald-400 text-base sm:text-lg">${calculatedQuotaValue.toLocaleString('es-CO')}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Plan de pago:</span>
              <span>{totalQuotas} cuotas de ${calculatedQuotaValue.toLocaleString('es-CO')}</span>
            </div>
          </div>

          {/* BOTONES */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-extrabold text-xs shadow-lg shadow-purple-500/20 transition active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Procesando Refinanciación...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Confirmar Refinanciación
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default RefinanceLoanModal;
