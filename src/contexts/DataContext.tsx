import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, Route, Customer, Loan, Payment, ExtraAbono, 
  DashboardStats, PaymentFrequency 
} from '../types';
import { supabase } from '../lib/supabase';

interface DataContextType {
  users: User[];
  routes: Route[];
  customers: Customer[];
  loans: Loan[];
  payments: Payment[];
  abonos: ExtraAbono[];
  
  // Operaciones de Usuario & Contraseña
  addUser: (user: Omit<User, 'id' | 'password'>) => Promise<User>;
  updateUser: (userId: string, data: Partial<User>) => Promise<void>;
  updateUserPassword: (userId: string, newPassword: string) => Promise<void>;
  resetUserPassword: (userId: string) => Promise<string>;
  
  // Operaciones de Rutas & Clientes
  addRoute: (route: Omit<Route, 'id'>) => Promise<Route>;
  updateRoute: (id: string, data: Partial<Route>) => Promise<void>;
  deleteRoute: (routeId: string) => Promise<{ success: boolean; message?: string }>;
  addCustomer: (customer: Omit<Customer, 'id' | 'orden_visita'>) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  reassignCustomerRoute: (customerId: string, newRouteId: string) => Promise<void>;
  reorderCustomersInRoute: (routeId: string, orderedCustomerIds: string[]) => Promise<void>;
  
  // Operaciones de Préstamos & Pagos
  addLoan: (loanData: {
    cliente_id: string;
    monto: number;
    interes: number;
    cuotas_totales: number;
    tipo_pago: PaymentFrequency;
    fecha_inicio?: string;
  }) => Promise<Loan>;
  
  recordPayment: (paymentData: {
    prestamo_id: string;
    valor: number;
    tipo: 'CUOTA_REGULAR' | 'ABONO_EXTRA';
    num_cuota?: number;
    observaciones?: string;
    registrado_por: string;
  }) => Promise<Payment>;

  deletePayment: (paymentId: string) => Promise<void>;

  recordExtraAbono: (abonoData: {
    prestamo_id: string;
    valor: number;
    observaciones?: string;
  }) => Promise<ExtraAbono>;

  getDashboardStats: (currentUserId?: string, role?: 'ADMIN' | 'COBRADOR') => DashboardStats;
  resetDemoData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEY_USERS = 'prestapp_users_v2';
const STORAGE_KEY_ROUTES = 'prestapp_routes_v1';
const STORAGE_KEY_CUSTOMERS = 'prestapp_customers_v3';
const STORAGE_KEY_LOANS = 'prestapp_loans_v5';
const STORAGE_KEY_PAYMENTS = 'prestapp_payments_v5';
const STORAGE_KEY_ABONOS = 'prestapp_abonos_v1';

const INITIAL_USERS: User[] = [
  { id: '11111111-1111-1111-1111-111111111111', nombre: 'Administrador Principal', correo: 'admin@prestapp.com', documento: '1098234567', password: '1098234567', rol: 'ADMIN', telefono: '3001234567', activo: true },
  { id: '22222222-2222-2222-2222-222222222222', nombre: 'Carlos Cobrador (Norte)', correo: 'carlos@prestapp.com', documento: '80123456', password: '80123456', rol: 'COBRADOR', telefono: '3109876543', activo: true },
  { id: '33333333-3333-3333-3333-333333333333', nombre: 'Andrés Cobrador (Centro)', correo: 'andres@prestapp.com', documento: '91234567', password: '91234567', rol: 'COBRADOR', telefono: '3205554433', activo: true },
];

const INITIAL_ROUTES: Route[] = [
  { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', nombre: 'Ruta Norte', usuario_id: '22222222-2222-2222-2222-222222222222', descripcion: 'Barrios del sector Norte y Comercial' },
  { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', nombre: 'Ruta Centro', usuario_id: '33333333-3333-3333-3333-333333333333', descripcion: 'Zona Centro y Mercado Central' },
  { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', nombre: 'Ruta Occidente', usuario_id: '22222222-2222-2222-2222-222222222222', descripcion: 'Sector Residencial Occidente' }
];

const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c1111111-1111-1111-1111-111111111111', ruta_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', nombre: 'Juan Pérez', documento: '1098234567', telefono: '3151112233', direccion: 'Calle 10 # 15-20', barrio: 'La Esperanza', alias: 'Juancho', estado: 'ACTIVO', orden_visita: 1 },
  { id: 'c2222222-2222-2222-2222-222222222222', ruta_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', nombre: 'María Rodríguez', documento: '52890123', telefono: '3184445566', direccion: 'Carrera 7 # 12-40', barrio: 'Los Alpes', alias: 'Doña María', estado: 'ACTIVO', orden_visita: 2 },
  { id: 'c3333333-3333-3333-3333-333333333333', ruta_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', nombre: 'Pedro Gómez', documento: '80123456', telefono: '3127778899', direccion: 'Av. Bolivar # 4-15', barrio: 'Centro', alias: 'Don Pedro', estado: 'ACTIVO', orden_visita: 1 },
  { id: 'c4444444-4444-4444-4444-444444444444', ruta_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', nombre: 'Ana Martínez', documento: '39789012', telefono: '3009990011', direccion: 'Calle 5 # 8-30', barrio: 'El Carmen', alias: 'Anita', estado: 'ACTIVO', orden_visita: 2 },
  { id: 'c5555555-5555-5555-5555-555555555555', ruta_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', nombre: 'José Vargas', documento: '91234567', telefono: '3112223344', direccion: 'Transversal 14 # 25-10', barrio: 'Occidente Real', alias: 'Chepe', estado: 'ACTIVO', orden_visita: 1 },
];

const INITIAL_LOANS: Loan[] = [
  { id: 'p1111111-1111-1111-1111-111111111111', cliente_id: 'c1111111-1111-1111-1111-111111111111', monto: 500000, interes: 20, monto_total: 600000, saldo: 480000, cuotas_totales: 30, cuotas_pagadas: 6, valor_cuota: 20000, fecha_inicio: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0], tipo_pago: 'DIARIO', estado: 'ACTIVO' },
  { id: 'p2222222-2222-2222-2222-222222222222', cliente_id: 'c1111111-1111-1111-1111-111111111111', monto: 300000, interes: 20, monto_total: 360000, saldo: 360000, cuotas_totales: 30, cuotas_pagadas: 0, valor_cuota: 12000, fecha_inicio: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], tipo_pago: 'DIARIO', estado: 'ACTIVO' },
  { id: 'p3333333-3333-3333-3333-333333333333', cliente_id: 'c2222222-2222-2222-2222-222222222222', monto: 1000000, interes: 20, monto_total: 1200000, saldo: 1000000, cuotas_totales: 24, cuotas_pagadas: 4, valor_cuota: 50000, fecha_inicio: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0], tipo_pago: 'DIARIO', estado: 'EN_MORA' },
  { id: 'p4444444-4444-4444-4444-444444444444', cliente_id: 'c3333333-3333-3333-3333-333333333333', monto: 400000, interes: 20, monto_total: 480000, saldo: 320000, cuotas_totales: 24, cuotas_pagadas: 8, valor_cuota: 20000, fecha_inicio: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0], tipo_pago: 'DIARIO', estado: 'ACTIVO' },
  { id: 'p5555555-5555-5555-5555-555555555555', cliente_id: 'c5555555-5555-5555-5555-555555555555', monto: 600000, interes: 20, monto_total: 720000, saldo: 600000, cuotas_totales: 30, cuotas_pagadas: 6, valor_cuota: 24000, fecha_inicio: new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0], tipo_pago: 'DIARIO', estado: 'ACTIVO' },
];

const INITIAL_PAYMENTS: Payment[] = [
  { id: 'pay-1', prestamo_id: 'p1111111-1111-1111-1111-111111111111', fecha: new Date().toISOString(), valor: 20000, tipo: 'CUOTA_REGULAR', num_cuota: 6, observaciones: 'Pago puntual día de hoy', registrado_por: '22222222-2222-2222-2222-222222222222', customerName: 'Juan Pérez', loanBalanceAfter: 480000 },
  { id: 'pay-2', prestamo_id: 'p4444444-4444-4444-4444-444444444444', fecha: new Date().toISOString(), valor: 20000, tipo: 'CUOTA_REGULAR', num_cuota: 8, observaciones: 'Pago completado', registrado_por: '33333333-3333-3333-3333-333333333333', customerName: 'Pedro Gómez', loanBalanceAfter: 320000 }
];

const INITIAL_ABONOS: ExtraAbono[] = [];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [routes, setRoutes] = useState<Route[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ROUTES);
    return saved ? JSON.parse(saved) : INITIAL_ROUTES;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CUSTOMERS);
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [loans, setLoans] = useState<Loan[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LOANS);
    return saved ? JSON.parse(saved) : INITIAL_LOANS;
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PAYMENTS);
    return saved ? JSON.parse(saved) : INITIAL_PAYMENTS;
  });

  const [abonos, setAbonos] = useState<ExtraAbono[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ABONOS);
    return saved ? JSON.parse(saved) : INITIAL_ABONOS;
  });

  useEffect(() => { localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_ROUTES, JSON.stringify(routes)); }, [routes]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_LOANS, JSON.stringify(loans)); }, [loans]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(payments)); }, [payments]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_ABONOS, JSON.stringify(abonos)); }, [abonos]);

  useEffect(() => {
    const fetchSupabaseData = async () => {
      try {
        const { data: remoteUsers } = await supabase.from('usuarios').select('*');
        if (remoteUsers && remoteUsers.length > 0) setUsers(remoteUsers);

        const { data: remoteRoutes } = await supabase.from('rutas').select('*');
        if (remoteRoutes && remoteRoutes.length > 0) setRoutes(remoteRoutes);

        const { data: remoteCustomers } = await supabase.from('clientes').select('*');
        if (remoteCustomers && remoteCustomers.length > 0) setCustomers(remoteCustomers);

        const { data: remoteLoans } = await supabase.from('prestamos').select('*');
        if (remoteLoans && remoteLoans.length > 0) setLoans(remoteLoans);

        const { data: remotePayments } = await supabase.from('pagos').select('*');
        if (remotePayments && remotePayments.length > 0) setPayments(remotePayments);

        const { data: remoteAbonos } = await supabase.from('abonos').select('*');
        if (remoteAbonos && remoteAbonos.length > 0) setAbonos(remoteAbonos);
      } catch (err) {
        console.warn('Supabase fetch error, fallback active:', err);
      }
    };
    fetchSupabaseData();
  }, []);

  const resetDemoData = () => {
    setUsers(INITIAL_USERS);
    setRoutes(INITIAL_ROUTES);
    setCustomers(INITIAL_CUSTOMERS);
    setLoans(INITIAL_LOANS);
    setPayments(INITIAL_PAYMENTS);
    setAbonos(INITIAL_ABONOS);
    localStorage.clear();
  };

  const addUser = async (userData: Omit<User, 'id' | 'password'>): Promise<User> => {
    const newUser: User = {
      ...userData,
      id: crypto.randomUUID(),
      password: userData.documento,
      activo: true,
      created_at: new Date().toISOString()
    };
    setUsers(prev => [...prev, newUser]);
    
    // Payload limpio para Supabase
    const dbPayload = {
      id: newUser.id,
      nombre: newUser.nombre,
      correo: newUser.correo,
      documento: newUser.documento,
      password: newUser.password,
      rol: newUser.rol,
      telefono: newUser.telefono,
      activo: newUser.activo
    };

    const { error } = await supabase.from('usuarios').insert(dbPayload);
    if (error) console.error('Supabase usuarios insert error:', error);
    return newUser;
  };

  const updateUser = async (userId: string, data: Partial<User>): Promise<void> => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));
    const { error } = await supabase.from('usuarios').update(data).eq('id', userId);
    if (error) console.error('Supabase usuarios update error:', error);
  };

  const updateUserPassword = async (userId: string, newPassword: string): Promise<void> => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPassword } : u));
    const { error } = await supabase.from('usuarios').update({ password: newPassword }).eq('id', userId);
    if (error) console.error('Supabase update password error:', error);
  };

  const resetUserPassword = async (userId: string): Promise<string> => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) throw new Error('Usuario no encontrado');

    const defaultPass = targetUser.documento;
    await updateUserPassword(userId, defaultPass);
    return defaultPass;
  };

  const addRoute = async (routeData: Omit<Route, 'id'>): Promise<Route> => {
    const newRoute: Route = {
      ...routeData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    setRoutes(prev => [...prev, newRoute]);

    const dbPayload = {
      id: newRoute.id,
      nombre: newRoute.nombre,
      usuario_id: newRoute.usuario_id,
      descripcion: newRoute.descripcion
    };
    const { error } = await supabase.from('rutas').insert(dbPayload);
    if (error) console.error('Supabase rutas insert error:', error);
    return newRoute;
  };

  const updateRoute = async (id: string, data: Partial<Route>): Promise<void> => {
    setRoutes(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    const { error } = await supabase.from('rutas').update(data).eq('id', id);
    if (error) console.error('Supabase rutas update error:', error);
  };

  const deleteRoute = async (routeId: string): Promise<{ success: boolean; message?: string }> => {
    const assignedClients = customers.filter(c => c.ruta_id === routeId);
    if (assignedClients.length > 0) {
      return { success: false, message: 'No se puede eliminar la ruta porque tiene clientes asignados.' };
    }
    setRoutes(prev => prev.filter(r => r.id !== routeId));
    const { error } = await supabase.from('rutas').delete().eq('id', routeId);
    if (error) console.error('Supabase rutas delete error:', error);
    return { success: true };
  };

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'orden_visita'>): Promise<Customer> => {
    const routeClients = customers.filter(c => c.ruta_id === customerData.ruta_id);
    const newCustomer: Customer = {
      ...customerData,
      id: crypto.randomUUID(),
      orden_visita: routeClients.length + 1,
      created_at: new Date().toISOString()
    };
    setCustomers(prev => [...prev, newCustomer]);

    // Payload limpio para PostgreSQL clientes
    const dbPayload = {
      id: newCustomer.id,
      ruta_id: newCustomer.ruta_id,
      nombre: newCustomer.nombre,
      documento: newCustomer.documento || null,
      telefono: newCustomer.telefono,
      direccion: newCustomer.direccion,
      barrio: newCustomer.barrio,
      alias: newCustomer.alias || null,
      foto_url: newCustomer.foto_url || null,
      foto_casa: newCustomer.foto_casa || null,
      foto_cliente: newCustomer.foto_cliente || null,
      foto_documento: newCustomer.foto_documento || null,
      estado: newCustomer.estado,
      orden_visita: newCustomer.orden_visita
    };

    const { error } = await supabase.from('clientes').insert(dbPayload);
    if (error) console.error('Supabase clientes insert error:', error);
    return newCustomer;
  };

  const updateCustomer = async (id: string, data: Partial<Customer>): Promise<void> => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    
    // Filtrar solo propiedades DB
    const dbData: Record<string, any> = {};
    const validKeys = ['ruta_id', 'nombre', 'documento', 'telefono', 'direccion', 'barrio', 'alias', 'foto_url', 'foto_casa', 'foto_cliente', 'foto_documento', 'estado', 'orden_visita'];
    
    Object.keys(data).forEach(key => {
      if (validKeys.includes(key)) {
        dbData[key] = (data as any)[key];
      }
    });

    const { error } = await supabase.from('clientes').update(dbData).eq('id', id);
    if (error) console.error('Supabase clientes update error:', error);
  };

  const reassignCustomerRoute = async (customerId: string, newRouteId: string): Promise<void> => {
    await updateCustomer(customerId, { ruta_id: newRouteId });
  };

  const reorderCustomersInRoute = async (routeId: string, orderedCustomerIds: string[]): Promise<void> => {
    setCustomers(prev => prev.map(c => {
      if (c.ruta_id === routeId) {
        const newOrder = orderedCustomerIds.indexOf(c.id);
        return newOrder !== -1 ? { ...c, orden_visita: newOrder + 1 } : c;
      }
      return c;
    }));
  };

  const addLoan = async (loanData: {
    cliente_id: string;
    monto: number;
    interes: number;
    cuotas_totales: number;
    tipo_pago: PaymentFrequency;
    fecha_inicio?: string;
  }): Promise<Loan> => {
    const monto_total = Math.round(loanData.monto * (1 + loanData.interes / 100));
    const valor_cuota = Math.round(monto_total / loanData.cuotas_totales);

    const newLoan: Loan = {
      id: crypto.randomUUID(),
      cliente_id: loanData.cliente_id,
      monto: loanData.monto,
      interes: loanData.interes,
      monto_total,
      saldo: monto_total,
      cuotas_totales: loanData.cuotas_totales,
      cuotas_pagadas: 0,
      valor_cuota,
      fecha_inicio: loanData.fecha_inicio || new Date().toISOString().split('T')[0],
      tipo_pago: loanData.tipo_pago,
      estado: 'ACTIVO',
      created_at: new Date().toISOString()
    };

    setLoans(prev => [newLoan, ...prev]);

    // Payload limpio para PostgreSQL prestamos
    const dbPayload = {
      id: newLoan.id,
      cliente_id: newLoan.cliente_id,
      monto: newLoan.monto,
      interes: newLoan.interes,
      monto_total: newLoan.monto_total,
      saldo: newLoan.saldo,
      cuotas_totales: newLoan.cuotas_totales,
      cuotas_pagadas: newLoan.cuotas_pagadas,
      valor_cuota: newLoan.valor_cuota,
      fecha_inicio: newLoan.fecha_inicio,
      tipo_pago: newLoan.tipo_pago,
      estado: newLoan.estado
    };

    const { error } = await supabase.from('prestamos').insert(dbPayload);
    if (error) console.error('Supabase prestamos insert error:', error);
    return newLoan;
  };

  const recordPayment = async (paymentData: {
    prestamo_id: string;
    valor: number;
    tipo: 'CUOTA_REGULAR' | 'ABONO_EXTRA';
    num_cuota?: number;
    observaciones?: string;
    registrado_por: string;
  }): Promise<Payment> => {
    const loan = loans.find(l => l.id === paymentData.prestamo_id);
    if (!loan) throw new Error('Préstamo no encontrado');

    const newSaldo = Math.max(0, loan.saldo - paymentData.valor);
    const newCuotasPagadas = paymentData.tipo === 'CUOTA_REGULAR' 
      ? loan.cuotas_pagadas + 1 
      : loan.cuotas_pagadas;

    const newEstado = newSaldo === 0 ? 'PAGADO' : loan.estado;

    setLoans(prev => prev.map(l => l.id === loan.id ? {
      ...l,
      saldo: newSaldo,
      cuotas_pagadas: newCuotasPagadas,
      estado: newEstado
    } : l));

    const customer = customers.find(c => c.id === loan.cliente_id);
    const route = routes.find(r => r.id === customer?.ruta_id);

    const newPayment: Payment = {
      id: crypto.randomUUID(),
      prestamo_id: paymentData.prestamo_id,
      fecha: new Date().toISOString(),
      valor: paymentData.valor,
      tipo: paymentData.tipo,
      num_cuota: paymentData.num_cuota || newCuotasPagadas,
      observaciones: paymentData.observaciones || '',
      registrado_por: paymentData.registrado_por,
      created_at: new Date().toISOString(),
      customerName: customer?.nombre,
      loanBalanceAfter: newSaldo,
      routeName: route?.nombre
    };

    setPayments(prev => [newPayment, ...prev]);

    // Payload limpio para PostgreSQL pagos
    const dbPayload = {
      id: newPayment.id,
      prestamo_id: newPayment.prestamo_id,
      fecha: newPayment.fecha,
      valor: newPayment.valor,
      tipo: newPayment.tipo,
      num_cuota: newPayment.num_cuota,
      observaciones: newPayment.observaciones,
      registrado_por: newPayment.registrado_por
    };

    const { error: payError } = await supabase.from('pagos').insert(dbPayload);
    if (payError) console.error('Supabase pagos insert error:', payError);

    const { error: loanError } = await supabase.from('prestamos').update({
      saldo: newSaldo,
      cuotas_pagadas: newCuotasPagadas,
      estado: newEstado
    }).eq('id', loan.id);
    if (loanError) console.error('Supabase prestamos update error:', loanError);

    return newPayment;
  };

  const deletePayment = async (paymentId: string): Promise<void> => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;

    const loan = loans.find(l => l.id === payment.prestamo_id);
    if (loan) {
      const newSaldo = loan.saldo + payment.valor;
      const newCuotasPagadas = payment.tipo === 'CUOTA_REGULAR' 
        ? Math.max(0, loan.cuotas_pagadas - 1)
        : loan.cuotas_pagadas;
      const newEstado = newSaldo > 0 ? (loan.estado === 'PAGADO' ? 'ACTIVO' : loan.estado) : 'PAGADO';

      setLoans(prev => prev.map(l => l.id === loan.id ? {
        ...l,
        saldo: newSaldo,
        cuotas_pagadas: newCuotasPagadas,
        estado: newEstado
      } : l));

      const { error: loanErr } = await supabase.from('prestamos').update({
        saldo: newSaldo,
        cuotas_pagadas: newCuotasPagadas,
        estado: newEstado
      }).eq('id', loan.id);
      if (loanErr) console.error('Supabase prestamos revert error:', loanErr);
    }

    setPayments(prev => prev.filter(p => p.id !== paymentId));
    const { error: payErr } = await supabase.from('pagos').delete().eq('id', paymentId);
    if (payErr) console.error('Supabase pagos delete error:', payErr);
  };

  const recordExtraAbono = async (abonoData: {
    prestamo_id: string;
    valor: number;
    observaciones?: string;
  }): Promise<ExtraAbono> => {
    const loan = loans.find(l => l.id === abonoData.prestamo_id);
    if (!loan) throw new Error('Préstamo no encontrado');

    const newSaldo = Math.max(0, loan.saldo - abonoData.valor);
    const newEstado = newSaldo === 0 ? 'PAGADO' : loan.estado;

    setLoans(prev => prev.map(l => l.id === loan.id ? {
      ...l,
      saldo: newSaldo,
      estado: newEstado
    } : l));

    const newAbono: ExtraAbono = {
      id: crypto.randomUUID(),
      prestamo_id: abonoData.prestamo_id,
      fecha: new Date().toISOString(),
      valor: abonoData.valor,
      observaciones: abonoData.observaciones || 'Abono extraordinario a capital',
      created_at: new Date().toISOString()
    };

    setAbonos(prev => [...prev, newAbono]);

    const dbPayload = {
      id: newAbono.id,
      prestamo_id: newAbono.prestamo_id,
      fecha: newAbono.fecha,
      valor: newAbono.valor,
      observaciones: newAbono.observaciones
    };

    const { error: abonoError } = await supabase.from('abonos').insert(dbPayload);
    if (abonoError) console.error('Supabase abonos insert error:', abonoError);

    const { error: loanError } = await supabase.from('prestamos').update({
      saldo: newSaldo,
      estado: newEstado
    }).eq('id', loan.id);
    if (loanError) console.error('Supabase prestamos update error:', loanError);

    return newAbono;
  };

  const getDashboardStats = (currentUserId?: string, role: 'ADMIN' | 'COBRADOR' = 'ADMIN'): DashboardStats => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    let activeRoutes = routes;
    if (role === 'COBRADOR' && currentUserId) {
      activeRoutes = routes.filter(r => r.usuario_id === currentUserId);
    }

    const activeRouteIds = activeRoutes.map(r => r.id);
    const routeCustomers = customers.filter(c => activeRouteIds.includes(c.ruta_id));
    const customerIds = routeCustomers.map(c => c.id);

    const relevantLoans = loans.filter(l => customerIds.includes(l.cliente_id));

    const carteraTotal = relevantLoans.reduce((sum, l) => sum + l.saldo, 0);

    const todayPayments = payments.filter(p => p.fecha.startsWith(todayStr));
    const recaudoHoy = todayPayments.reduce((sum, p) => sum + p.valor, 0);

    const totalEnMora = relevantLoans.filter(l => l.estado === 'EN_MORA').reduce((sum, l) => sum + l.saldo, 0);
    const porcentajeMora = carteraTotal > 0 ? Math.round((totalEnMora / carteraTotal) * 100) : 0;

    const collectors = users.filter(u => u.rol === 'COBRADOR');
    const recaudoPorCobrador = collectors.map(col => {
      const colRoutes = routes.filter(r => r.usuario_id === col.id).map(r => r.id);
      const colClients = customers.filter(c => colRoutes.includes(c.ruta_id)).map(c => c.id);
      const colLoans = loans.filter(l => colClients.includes(l.cliente_id)).map(l => l.id);
      
      const colCollectedToday = payments
        .filter(p => p.fecha.startsWith(todayStr) && (p.registrado_por === col.id || colLoans.includes(p.prestamo_id)))
        .reduce((sum, p) => sum + p.valor, 0);

      const colPaidClientsToday = new Set(
        payments
          .filter(p => p.fecha.startsWith(todayStr) && colLoans.includes(p.prestamo_id))
          .map(p => {
            const l = loans.find(loan => loan.id === p.prestamo_id);
            return l?.cliente_id;
          })
      ).size;

      return {
        cobradorId: col.id,
        cobradorNombre: col.nombre,
        montoRecaudado: colCollectedToday,
        clientesCobrados: colPaidClientsToday,
        totalClientes: colClients.length
      };
    });

    const recaudoPorRuta = routes.map(rt => {
      const rtClients = customers.filter(c => c.ruta_id === rt.id).map(c => c.id);
      const rtLoans = loans.filter(l => rtClients.includes(l.cliente_id)).map(l => l.id);

      const rtCollectedToday = payments
        .filter(p => p.fecha.startsWith(todayStr) && rtLoans.includes(p.prestamo_id))
        .reduce((sum, p) => sum + p.valor, 0);

      const metaRuta = loans
        .filter(l => rtClients.includes(l.cliente_id) && l.estado === 'ACTIVO')
        .reduce((sum, l) => sum + l.valor_cuota, 0);

      const cumplimiento = metaRuta > 0 ? Math.min(100, Math.round((rtCollectedToday / metaRuta) * 100)) : 0;

      return {
        rutaId: rt.id,
        rutaNombre: rt.nombre,
        montoRecaudado: rtCollectedToday,
        porcentajeCumplimiento: cumplimiento
      };
    });

    return {
      carteraTotal,
      recaudoHoy,
      metaDia: 500000,
      totalClientesActivos: routeCustomers.filter(c => c.estado === 'ACTIVO').length,
      totalPrestamosActivos: relevantLoans.filter(l => l.estado === 'ACTIVO' || l.estado === 'EN_MORA').length,
      totalEnMora,
      porcentajeMora,
      recaudoPorCobrador,
      recaudoPorRuta
    };
  };

  return (
    <DataContext.Provider
      value={{
        users,
        routes,
        customers,
        loans,
        payments,
        abonos,
        addUser,
        updateUser,
        updateUserPassword,
        resetUserPassword,
        addRoute,
        updateRoute,
        deleteRoute,
        addCustomer,
        updateCustomer,
        reassignCustomerRoute,
        reorderCustomersInRoute,
        addLoan,
        recordPayment,
        deletePayment,
        recordExtraAbono,
        getDashboardStats,
        resetDemoData
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData debe ser usado dentro de un DataProvider');
  return context;
};
