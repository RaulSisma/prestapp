import React, { useState } from 'react';
import { X, DollarSign, CreditCard, Sparkles } from 'lucide-react';
import { Loan, Customer, Payment } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ThermalReceiptModal } from './ThermalReceiptModal';

interface PaymentModalProps {
  loan: Loan | null;
  customer: Customer | null;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ loan, customer, onClose }) => {
  const { recordPayment, recordExtraAbono } = useData();
  const { currentUser } = useAuth();

  const [paymentType, setPaymentType] = useState<'CUOTA_REGULAR' | 'ABONO_EXTRA'>('CUOTA_REGULAR');
  const [amount, setAmount] = useState<number>(loan ? loan.valor_cuota : 0);
  const [observaciones, setObservaciones] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [generatedPayment, setGeneratedPayment] = useState<Payment | null>(null);

  if (!loan || !customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    setIsSubmitting(true);
    try {
      if (paymentType === 'ABONO_EXTRA') {
        const abono = await recordExtraAbono({
          prestamo_id: loan.id,
          valor: amount,
          observaciones
        });

        const paymentReceiptObj: Payment = {
          id: abono.id,
          prestamo_id: loan.id,
          fecha: abono.fecha,
          valor: abono.valor,
          tipo: 'ABONO_EXTRA',
          observaciones: abono.observaciones,
          registrado_por: currentUser?.id || '',
          customerName: customer.nombre,
          loanBalanceAfter: Math.max(0, loan.saldo - amount)
        };
        setGeneratedPayment(paymentReceiptObj);
      } else {
        const payment = await recordPayment({
          prestamo_id: loan.id,
          valor: amount,
          tipo: 'CUOTA_REGULAR',
          num_cuota: loan.cuotas_pagadas + 1,
          observaciones,
          registrado_por: currentUser?.id || ''
        });
        setGeneratedPayment(payment);
      }
    } catch (err) {
      console.error('Error registrando pago:', err);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/50">
          <div>
            <h3 className="font-bold text-lg text-white">Registrar Cobro / Abono</h3>
            <p className="text-xs text-slate-400">Cliente: <span className="text-emerald-400 font-medium">{customer.nombre}</span></p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen del Préstamo */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-800/60 border border-slate-800">
            <div>
              <span className="text-xs text-slate-400 block">Saldo Actual</span>
              <span className="text-lg font-extrabold text-red-400">
                ${loan.saldo.toLocaleString('es-CO')}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Valor Cuota</span>
              <span className="text-lg font-bold text-emerald-400">
                ${loan.valor_cuota.toLocaleString('es-CO')}
              </span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-700/50 flex justify-between text-xs text-slate-300">
              <span>Progreso: {loan.cuotas_pagadas} de {loan.cuotas_totales} cuotas</span>
              <span className="font-semibold text-blue-400">
                {Math.round((loan.cuotas_pagadas / loan.cuotas_totales) * 100)}%
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Tipo de Transacción
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('CUOTA_REGULAR');
                    setAmount(loan.valor_cuota);
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition ${
                    paymentType === 'CUOTA_REGULAR'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                      : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Cuota Regular
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('ABONO_EXTRA');
                    setAmount(Math.min(50000, loan.saldo));
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition ${
                    paymentType === 'ABONO_EXTRA'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                      : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Abono Extra
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Valor del Pago ($ COP)
              </label>
              <div className="relative">
                <DollarSign className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="1000"
                  max={loan.saldo}
                  step="1000"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold text-lg focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setAmount(loan.valor_cuota)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                >
                  Cuota Completa (${loan.valor_cuota.toLocaleString()})
                </button>
                {loan.valor_cuota / 2 > 1000 && (
                  <button
                    type="button"
                    onClick={() => setAmount(Math.round(loan.valor_cuota / 2))}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                  >
                    Media Cuota (${Math.round(loan.valor_cuota / 2).toLocaleString()})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAmount(loan.saldo)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-red-950/40 text-red-300 hover:bg-red-900/50 border border-red-800/50"
                >
                  Liquidar Saldo (${loan.saldo.toLocaleString()})
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Observaciones (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Pago realizado por un familiar"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting || amount <= 0}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-base shadow-lg shadow-emerald-500/25 transition active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Registrando...' : 'Confirmar y Generar Recibo'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
