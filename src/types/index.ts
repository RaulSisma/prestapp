export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'COBRADOR';

export interface UserPermissions {
  // A. Acceso a Módulos (Vistas en el Menú)
  view_dashboard: boolean;
  view_field_route: boolean;
  view_customers: boolean;
  view_loans: boolean;
  view_routes: boolean;
  view_users: boolean;
  view_reports: boolean;

  // B. Permisos de Acción Específica
  // Clientes
  create_customer: boolean;
  edit_customer: boolean;
  delete_customer: boolean;

  // Préstamos y Pagos
  create_loan: boolean;
  edit_loan: boolean;
  delete_loan: boolean;
  record_payment: boolean;
  delete_payment: boolean;

  // Rutas y Reasignaciones
  manage_routes: boolean;
  reassign_routes: boolean;
  delete_routes: boolean;
}

export const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
  view_dashboard: true,
  view_field_route: true,
  view_customers: true,
  view_loans: true,
  view_routes: true,
  view_users: true,
  view_reports: true,

  create_customer: true,
  edit_customer: true,
  delete_customer: true,

  create_loan: true,
  edit_loan: true,
  delete_loan: true,
  record_payment: true,
  delete_payment: true,

  manage_routes: true,
  reassign_routes: true,
  delete_routes: true,
};

export const DEFAULT_SUPERVISOR_PERMISSIONS: UserPermissions = {
  view_dashboard: true,
  view_field_route: true,
  view_customers: true,
  view_loans: true,
  view_routes: true,
  view_users: false,
  view_reports: true,

  create_customer: true,
  edit_customer: true,
  delete_customer: false,

  create_loan: true,
  edit_loan: true,
  delete_loan: false,
  record_payment: true,
  delete_payment: false,

  manage_routes: true,
  reassign_routes: true,
  delete_routes: false,
};

export const DEFAULT_COBRADOR_PERMISSIONS: UserPermissions = {
  view_dashboard: false,
  view_field_route: true,
  view_customers: true,
  view_loans: true,
  view_routes: false,
  view_users: false,
  view_reports: false,

  create_customer: false,
  edit_customer: false,
  delete_customer: false,

  create_loan: false,
  edit_loan: false,
  delete_loan: false,
  record_payment: true,
  delete_payment: false,

  manage_routes: false,
  reassign_routes: false,
  delete_routes: false,
};

export const getRoleDefaultPermissions = (role: UserRole): UserPermissions => {
  switch (role) {
    case 'ADMIN':
      return { ...DEFAULT_ADMIN_PERMISSIONS };
    case 'SUPERVISOR':
      return { ...DEFAULT_SUPERVISOR_PERMISSIONS };
    case 'COBRADOR':
      return { ...DEFAULT_COBRADOR_PERMISSIONS };
    default:
      return { ...DEFAULT_COBRADOR_PERMISSIONS };
  }
};

export interface User {
  id: string;
  nombre: string;
  correo: string;
  documento: string;
  password?: string;
  rol: UserRole;
  permisos?: Partial<UserPermissions>;
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
export type LoanStatus = 'PENDIENTE' | 'ACTIVO' | 'PAGADO' | 'EN_MORA' | 'REFINANCIADO';

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
  prestamo_origen_id?: string;
  es_refinanciacion?: boolean;
  saldo_refinanciado?: number;
  motivo_refinanciacion?: string;
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
export type TransactionMethod = 'EFECTIVO' | 'TRANSFERENCIA';

export interface Payment {
  id: string;
  prestamo_id: string;
  fecha: string;
  valor: number;
  tipo: PaymentType;
  metodo_pago?: TransactionMethod;
  num_cuota?: number;
  observaciones?: string;
  registrado_por?: string;
  created_at?: string;
  customerName?: string;
  loanBalanceAfter?: number;
  routeName?: string;
}

export interface Postponement {
  id: string;
  prestamo_id: string;
  cliente_id: string;
  fecha: string; // YYYY-MM-DD
  motivo: string; // 'NO_ESTUVO' | 'PIDIO_PLAZO' | 'SIN_FONDOS' | 'OTRO'
  nueva_fecha?: string;
  registrado_por: string;
  observaciones?: string;
  created_at?: string;
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
