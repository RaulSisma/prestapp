import React, { useState } from 'react';
import { 
  X, DollarSign, Calendar, Clock, 
  Wallet, ArrowRightLeft, AlertCircle, CheckCircle2
} from 'lucide-react';
import { Loan, Customer, Payment, TransactionMethod } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ThermalReceiptModal } from './ThermalReceiptModal';

interface PaymentModalProps {
  loan: Loan | null;
  customer: Customer | null;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ loan, customer, onClose }) => {
  const { recordPayment, recordPostponement } = useData();
  const { currentUser } = useAuth();

  // Modo: 'PAGAR' (Registrar Abono/Cobro) o 'APLAZAR' (No Estuvo / Posponer)
  const [modalMode, setModalMode] = useState<'PAGAR' | 'APLAZAR'>('PAGAR');

  // Campos para Registrar Pago
  const [transactionMethod, setTransactionMethod] = useState<TransactionMethod>('EFECTIVO');
  const [amount, setAmount] = useState<number>(loan ? loan.valor_cuota : 0);
  const [observaciones, setObservaciones] = useState<string>('');

  // Campos para Aplazar / No Estuvo
  const [postponeReason, setPostponeReason] = useState<string>('CLIENTE_AUSENTE');
  const [customPostponeReason, setCustomPostponeReason] = useState<string>('');
  const [nextVisitDate, setNextVisitDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [postponeNote, setPostponeNote] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [postponeSuccessMessage, setPostponeSuccessMessage] = useState<string | null>(null);
  const [generatedPayment, setGeneratedPayment] = useState<Payment | null>(null);

  if (!loan || !customer) return null;

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    setIsSubmitting(true);
    try {
      const payment = await recordPayment({
        prestamo_id: loan.id,
        valor: amount,
        tipo: 'CUOTA_REGULAR',
        metodo_pago: transactionMethod,
        num_cuota: loan.cuotas_pagadas + 1,
        observaciones,
        registrado_por: currentUser?.id || ''
      });
      setGeneratedPayment(payment);
    } catch (err) {
      console.error('Error registrando pago:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostpone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const reasonsMap: Record<string, string> = {
      CLIENTE_AUSENTE: 'Cliente ausente / No se encontraba en el domicilio',
      SOLICITO_PRORROGA: 'Cliente solicitó prórroga o plazo',
      SIN_FONDOS: 'Sin fondos / Dinero incompleto hoy',
      OTRO: customPostponeReason || 'Motivo personalizado'
    };

    const reasonText = reasonsMap[postponeReason] || postponeReason;

    try {
      await recordPostponement({
        prestamo_id: loan.id,
        cliente_id: customer.id,
        motivo: reasonText,
        nueva_fecha: nextVisitDate,
        observaciones: postponeNote,
        registrado_por: currentUser?.id || ''
      });

      setPostponeSuccessMessage(`Aplazamiento registrado con éxito. Se programó visita para ${nextVisitDate} (+1 fecha en plan de pagos).`);
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Error registrando aplazamiento:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (generatedPayment) {
    return (
      <ThermalReceiptModal
        payment={generatedPayment}
        loan={{ ...loan, saldo: Math.max(0, loan.saldo - amount) }}
        customer={customer}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-white">
              {modalMode === 'PAGAR' ? 'Registrar Cobro / Abono' : 'Aplazar Cobro / No Pagó Hoy'}
            </h3>
            <p className="text-xs text-slate-400">
              Cliente: <span className="text-emerald-400 font-semibold">{customer.nombre}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS DE ACCIÓN: PAGAR vs APLAZAR */}
        <div className="p-3 bg-slate-950/50 border-b border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={() => { setModalMode('PAGAR'); setPostponeSuccessMessage(null); }}
            className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              modalMode === 'PAGAR'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Registrar Abono ($)
          </button>

          <button
            type="button"
            onClick={() => { setModalMode('APLAZAR'); setPostponeSuccessMessage(null); }}
            className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              modalMode === 'APLAZAR'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            Aplazar / No Estuvo
          </button>
        </div>

        {/* Resumen del Préstamo */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Saldo Actual</span>
              <span className="text-base sm:text-lg font-extrabold text-red-400">
                ${loan.saldo.toLocaleString('es-CO')}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Valor Cuota</span>
              <span className="text-base sm:text-lg font-bold text-emerald-400">
                ${loan.valor_cuota.toLocaleString('es-CO')}
              </span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-700/50 flex justify-between text-xs text-slate-300">
              <span>Progreso: {loan.cuotas_pagadas} de {loan.cuotas_totales} cuotas</span>
              <span className="font-bold text-blue-400">
                {Math.round((loan.cuotas_pagadas / loan.cuotas_totales) * 100)}%
              </span>
            </div>
          </div>

          {postponeSuccessMessage ? (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{postponeSuccessMessage}</span>
            </div>
          ) : modalMode === 'PAGAR' ? (
            /* FORMULARIO DE COBRO */
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              
              {/* TIPO DE TRANSACCIÓN (EFECTIVO O TRANSFERENCIA) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Tipo de Transacción
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTransactionMethod('EFECTIVO')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs sm:text-sm font-bold transition ${
                      transactionMethod === 'EFECTIVO'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                    Efectivo
                  </button>

                  <button
                    type="button"
                    onClick={() => setTransactionMethod('TRANSFERENCIA')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs sm:text-sm font-bold transition ${
                      transactionMethod === 'TRANSFERENCIA'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                        : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    Transferencia
                  </button>
                </div>
              </div>

              {/* VALOR DEL PAGO ($ COP) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Valor del Pago ($ COP)
                </label>
                <div className="relative">
                  <DollarSign className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    min="1000"
                    max={loan.saldo}
                    step="1000"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white font-black text-lg focus:outline-none focus:border-emerald-500 transition"
                    placeholder="Monto a abonar"
                    required
                  />
                </div>
              </div>

              {/* OBSERVACIONES */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observaciones (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Pago de cuota del día, recibido en tienda"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || amount <= 0}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm sm:text-base shadow-lg shadow-emerald-500/25 transition active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Registrando...' : 'Confirmar y Generar Recibo'}
                </button>
              </div>
            </form>
          ) : (
            /* FORMULARIO DE APLAZAMIENTO / NO ESTUVO */
            <form onSubmit={handlePostpone} className="space-y-4">
              
              <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Al registrar el aplazamiento se dejará constancia de visita, no sumará mora injustificada y reprogramará la fecha sumando <strong>+1 día/cuota</strong> al plan.
                </span>
              </div>

              {/* MOTIVO DE APLAZAMIENTO */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Motivo de Aplazamiento
                </label>
                <select
                  value={postponeReason}
                  onChange={(e) => setPostponeReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="CLIENTE_AUSENTE">Cliente ausente / No se encontraba en el domicilio</option>
                  <option value="SOLICITO_PRORROGA">Cliente solicitó prórroga para otra fecha</option>
                  <option value="SIN_FONDOS">Sin fondos / Dinero incompleto hoy</option>
                  <option value="OTRO">Otro motivo específico</option>
                </select>
              </div>

              {postponeReason === 'OTRO' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Describe el motivo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Especifica la razón del aplazamiento..."
                    value={customPostponeReason}
                    onChange={(e) => setCustomPostponeReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* NUEVA FECHA DE VISITA */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  Nueva Fecha Prometida de Cobro (+1)
                </label>
                <input
                  type="date"
                  required
                  value={nextVisitDate}
                  onChange={(e) => setNextVisitDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* NOTA ADICIONAL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nota / Comentario del Cobrador (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Se habló con la esposa, cancela mañana sin falta"
                  value={postponeNote}
                  onChange={(e) => setPostponeNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm sm:text-base shadow-lg shadow-amber-500/25 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  {isSubmitting ? 'Guardando...' : 'Registrar Aplazamiento (+1 Fecha)'}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};

export default PaymentModal;
