export type UserRole = 'ADMIN' | 'COBRADOR';

export interface User {
  id: string;
  nombre: string;
  correo: string;
  documento: string;
  password?: string;
  rol: UserRole;
  telefono?: string;
  activo: boolean;
  created_at?: string;
}

export interface Route {
  id: string;
  nombre: string;
  usuario_id: string;
  descripcion?: string;
  created_at?: string;
  collectorName?: string;
  totalClients?: number;
  totalActiveLoans?: number;
  totalBalance?: number;
  todayCollected?: number;
}

export type CustomerStatus = 'ACTIVO' | 'INACTIVO';

export interface Customer {
  id: string;
  ruta_id: string;
  nombre: string;
  documento?: string;
  telefono: string;
  direccion: string;
  barrio: string;
  alias?: string;
  foto_url?: string;
  foto_casa?: string;       // Foto de la casa / fachada
  foto_cliente?: string;    // Foto del cliente
  foto_documento?: string;  // Foto del documento / ID
  estado: CustomerStatus;
  orden_visita: number;
  created_at?: string;
  routeName?: string;
  activeLoansCount?: number;
  totalDebt?: number;
}

export type PaymentFrequency = 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
export type LoanStatus = 'PENDIENTE' | 'ACTIVO' | 'PAGADO' | 'EN_MORA';

export interface Loan {
  id: string;
  cliente_id: string;
  monto: number;
  interes: number;
  monto_total: number;
  saldo: number;
  cuotas_totales: number;
  cuotas_pagadas: number;
  valor_cuota: number;
  fecha_inicio: string;
  tipo_pago: PaymentFrequency;
  estado: LoanStatus;
  created_at?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerBarrio?: string;
  routeId?: string;
  routeName?: string;
  collectorId?: string;
  paidToday?: boolean;
}

export type PaymentType = 'CUOTA_REGULAR' | 'ABONO_EXTRA';

export interface Payment {
  id: string;
  prestamo_id: string;
  fecha: string;
  valor: number;
  tipo: PaymentType;
  num_cuota?: number;
  observaciones?: string;
  registrado_por?: string;
  created_at?: string;
  customerName?: string;
  loanBalanceAfter?: number;
  routeName?: string;
}

export interface ExtraAbono {
  id: string;
  prestamo_id: string;
  fecha: string;
  valor: number;
  observaciones?: string;
  created_at?: string;
}

export interface DashboardStats {
  carteraTotal: number;
  recaudoHoy: number;
  metaDia: number;
  totalClientesActivos: number;
  totalPrestamosActivos: number;
  totalEnMora: number;
  porcentajeMora: number;
  recaudoPorCobrador: Array<{
    cobradorId: string;
    cobradorNombre: string;
    montoRecaudado: number;
    clientesCobrados: number;
    totalClientes: number;
  }>;
  recaudoPorRuta: Array<{
    rutaId: string;
    rutaNombre: string;
    montoRecaudado: number;
    porcentajeCumplimiento: number;
  }>;
}
