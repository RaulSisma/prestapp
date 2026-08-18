import React, { useState, useMemo } from 'react';
import { X, Calculator, Calendar, DollarSign, Percent } from 'lucide-react';
import { Customer, PaymentFrequency } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

interface LoanModalProps {
  customer: Customer | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const LoanModal: React.FC<LoanModalProps> = ({ customer, onClose, onSuccess }) => {
  const { addLoan, customers, routes } = useData();
  const { currentUser, role } = useAuth();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customer ? customer.id : '');
  const [monto, setMonto] = useState<number>(500000);
  const [interes, setInteres] = useState<number>(20);
  const [cuotasTotales, setCuotasTotales] = useState<number>(30);
  const [tipoPago, setTipoPago] = useState<PaymentFrequency>('DIARIO');
  const [fechaInicio, setFechaInicio] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filtrar clientes permitidos según el rol del usuario (Cobrador solo ve sus rutas asignadas)
  const availableCustomers = useMemo(() => {
    if (role === 'ADMIN' || !currentUser) {
      return customers;
    }
    const myRouteIds = routes.filter(r => r.usuario_id === currentUser.id).map(r => r.id);
    return customers.filter(c => myRouteIds.includes(c.ruta_id));
  }, [customers, routes, currentUser, role]);

  // Cálculos automáticos
  const montoTotal = Math.round(monto * (1 + interes / 100));
  const valorCuota = cuotasTotales > 0 ? Math.round(montoTotal / cuotasTotales) : 0;
  const gananciaInteres = montoTotal - monto;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || monto <= 0 || cuotasTotales <= 0) return;

    setIsSubmitting(true);
    try {
      await addLoan({
        cliente_id: selectedCustomerId,
        monto,
        interes,
        cuotas_totales: cuotasTotales,
        tipo_pago: tipoPago,
        fecha_inicio: fechaInicio
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error registrando préstamo:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Nuevo Préstamo</h3>
              <p className="text-xs text-slate-400">Calculadora de Cuotas y Amortización</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Selección de Cliente */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Cliente Beneficiario
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">-- Seleccionar Cliente --</option>
              {availableCustomers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.barrio} - Tel: {c.telefono})
                </option>
              ))}
            </select>
            {role === 'COBRADOR' && (
              <p className="text-[11px] text-slate-400 mt-1">
                * Como cobrador, solo puedes otorgar préstamos a clientes de tus rutas asignadas.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Monto Prestado */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Monto del Préstamo ($)
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="50000"
                  step="50000"
                  value={monto}
                  onChange={(e) => setMonto(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold text-base focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Tasa de Interés */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Interés Total (%)
              </label>
              <div className="relative">
                <Percent className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={interes}
                  onChange={(e) => setInteres(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold text-base focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Tipo de Pago */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Frecuencia de Pago
              </label>
              <select
                value={tipoPago}
                onChange={(e) => setTipoPago(e.target.value as PaymentFrequency)}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="DIARIO">Diario</option>
                <option value="SEMANAL">Semanal</option>
                <option value="QUINCENAL">Quincenal</option>
                <option value="MENSUAL">Mensual</option>
              </select>
            </div>

            {/* Cuotas Totales */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Número de Cuotas
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={cuotasTotales}
                onChange={(e) => setCuotasTotales(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold text-base focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Fecha de Inicio */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Fecha de Desembolso
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Panel de Resumen del Cálculo */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
            <div className="flex justify-between items-center text-sm text-slate-300">
              <span>Ganancia por Interés ({interes}%):</span>
              <span className="font-semibold text-emerald-400">+${gananciaInteres.toLocaleString('es-CO')}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-slate-300">
              <span>Total a Cobrar:</span>
              <span className="font-extrabold text-white text-base">${montoTotal.toLocaleString('es-CO')}</span>
            </div>
            <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
              <span className="text-xs uppercase font-bold text-slate-400">Valor Cuota ({tipoPago}):</span>
              <span className="font-extrabold text-xl text-emerald-400">${valorCuota.toLocaleString('es-CO')}</span>
            </div>
          </div>

          {/* Botón de Acción */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !selectedCustomerId}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base shadow-lg shadow-blue-600/25 transition active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Registrando Préstamo...' : 'Aprobar y Generar Préstamo'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
