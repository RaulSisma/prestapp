import React from 'react';
import { X, Printer, CheckCircle, MessageSquare, Trash2, UserCheck } from 'lucide-react';
import { Payment, Loan, Customer } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

interface ThermalReceiptModalProps {
  payment: Payment | null;
  loan: Loan | null;
  customer: Customer | null;
  onClose: () => void;
  onDeleteSuccess?: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  payment,
  loan,
  customer,
  onClose,
  onDeleteSuccess
}) => {
  const { users, routes, customers, loans, deletePayment, companyConfig } = useData();
  const { role } = useAuth();

  if (!payment) return null;

  // Resolución dinámica precisa
  const resolvedLoan = loan || loans.find(l => l.id === payment.prestamo_id);
  const resolvedCustomer = customer || customers.find(c => c.id === resolvedLoan?.cliente_id);
  const resolvedRoute = routes.find(r => r.id === resolvedCustomer?.ruta_id);
  
  const collectorUser = users.find(u => u.id === payment.registrado_por) ||
                        users.find(u => u.id === resolvedRoute?.usuario_id);

  const customerName = resolvedCustomer?.nombre || payment.customerName || 'Cliente';
  const customerPhone = resolvedCustomer?.telefono || '3000000000';
  const collectorName = collectorUser?.nombre || payment.collectorName || 'Cobrador Registrado';
  const loanBalance = payment.loanBalanceAfter ?? (resolvedLoan ? resolvedLoan.saldo : 0);
  const initialMonto = resolvedLoan ? resolvedLoan.monto_total : payment.valor;

  const companyName = companyConfig.nombre || 'PRESTAPP';
  const companySlogan = companyConfig.slogan || 'Manejo Financiero Fácil y Rápido';
  const companyNit = companyConfig.nit || '900.123.456-7';

  const formattedDate = new Date(payment.fecha).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const formattedValor = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(payment.valor);

  const formattedSaldo = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(loanBalance);

  const whatsappMessage = `*COMPROBANTE DE PAGO - ${companyName.toUpperCase()}* 🧾\n` +
    (companySlogan ? `_${companySlogan}_\n` : '') +
    `----------------------------------------\n` +
    `👤 *Cliente:* ${customerName}\n` +
    `👮 *Cobrador:* ${collectorName}\n` +
    `📅 *Fecha:* ${formattedDate}\n` +
    `💵 *Monto Pagado:* ${formattedValor}\n` +
    `📌 *Tipo:* ${payment.tipo === 'ABONO_EXTRA' ? 'Abono Extraordinario a Capital' : `Cuota #${payment.num_cuota || ''}`}\n` +
    `📊 *Nuevo Saldo Pendiente:* ${formattedSaldo}\n` +
    `----------------------------------------\n` +
    `¡Gracias por su pago puntual! 👍`;

  const handleShareWhatsApp = () => {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDeletePayment = async () => {
    if (window.confirm(`⚠️ ¿Estás seguro de ANULAR y eliminar este pago de ${formattedValor}?\n\nEl saldo pendiente del préstamo aumentará nuevamente.`)) {
      await deletePayment(payment.id);
      if (onDeleteSuccess) onDeleteSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-white text-sm sm:text-base">Comprobante de Pago</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div 
            id="thermal-receipt-printable" 
            className="bg-amber-50/95 text-slate-900 p-4 sm:p-5 rounded-lg shadow-inner thermal-font text-xs space-y-3 border border-amber-200"
          >
            <div className="text-center pb-2 border-b border-dashed border-slate-400">
              {companyConfig.logo_url && (
                <div className="w-14 h-14 mx-auto mb-1 flex items-center justify-center">
                  <img 
                    src={companyConfig.logo_url} 
                    alt="Logo" 
                    className="max-h-full max-w-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <h2 className="text-base font-bold tracking-wider uppercase">{companyName}</h2>
              {companySlogan && <p className="text-[10px] text-slate-600 uppercase tracking-widest">{companySlogan}</p>}
              {companyNit && <p className="text-[10px] text-slate-500 mt-0.5">NIT: {companyNit}</p>}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-600">Recibo #:</span>
                <span className="font-bold">{payment.id.substring(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Fecha/Hora:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Cliente:</span>
                <span className="font-bold truncate max-w-[140px] text-right">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Teléfono:</span>
                <span>{customerPhone}</span>
              </div>
              {/* DETALLE DEL COBRADOR RESALTADO */}
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-700 font-semibold flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-700 inline" /> Cobrador:
                </span>
                <span className="font-bold text-slate-900 truncate max-w-[140px] text-right">{collectorName}</span>
              </div>
            </div>

            <div className="border-t border-b border-dashed border-slate-400 py-2 space-y-1">
              <div className="flex justify-between font-bold text-sm">
                <span>VALOR RECIBIDO:</span>
                <span className="text-emerald-700">{formattedValor}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Tipo Transacción:</span>
                <span className="font-semibold">
                  {payment.tipo === 'ABONO_EXTRA' ? 'ABONO EXTRAORDINARIO' : `CUOTA #${payment.num_cuota || 1}`}
                </span>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600">Monto Inicial:</span>
                <span>${initialMonto.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>NUEVO SALDO:</span>
                <span className="text-red-700">{formattedSaldo}</span>
              </div>
            </div>

            {payment.observaciones && (
              <div className="text-[10px] italic text-slate-600 pt-1 border-t border-slate-200">
                Obs: {payment.observaciones}
              </div>
            )}

            <div className="text-center pt-3 border-t border-dashed border-slate-400 text-[10px] text-slate-600">
              <p className="font-semibold">¡Gracias por su pago!</p>
              <p>Conserve este comprobante</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col gap-2">
          <button
            onClick={handleShareWhatsApp}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-600/20 transition active:scale-95 text-xs"
          >
            <MessageSquare className="w-4 h-4" />
            Enviar por WhatsApp
          </button>

          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700 transition text-xs"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-xs font-medium"
            >
              Cerrar
            </button>
          </div>

          {/* BOTÓN SOLO PARA ADMIN: ANULAR / ELIMINAR PAGO */}
          {role === 'ADMIN' && (
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={handleDeletePayment}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-400 border border-red-800/60 text-xs font-semibold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Anular / Eliminar Pago (Solo Admin)
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
