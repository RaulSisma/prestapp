import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  User, Route, Customer, Loan, Payment, ExtraAbono, 
  DashboardStats, PaymentFrequency, Postponement, TransactionMethod
} from '../types';
import { supabase, isSupabaseMocked } from '../lib/supabase';
import { getSafeLocalStorage, setSafeLocalStorage } from '../lib/safeStorage';

interface DataContextType {
  users: User[];
  routes: Route[];
  customers: Customer[];
  loans: Loan[];
  payments: Payment[];
  abonos: ExtraAbono[];
  postponements: Postponement[];
  
  // Estado de sincronización Supabase
  isSupabaseConnected: boolean;
  isSyncing: boolean;
  syncError: string | null;
  syncWithSupabase: () => Promise<void>;
  seedSupabaseDatabase: () => Promise<{ success: boolean; message: string }>;
  
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
    metodo_pago?: TransactionMethod;
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

  recordPostponement: (postponementData: {
    prestamo_id: string;
    cliente_id: string;
    motivo: string;
    nueva_fecha?: string;
    observaciones?: string;
    registrado_por: string;
  }) => Promise<Postponement>;

  getDashboardStats: (currentUserId?: string, role?: 'ADMIN' | 'COBRADOR') => DashboardStats;
  resetDemoData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEY_USERS = 'prestapp_users_v3';
const STORAGE_KEY_ROUTES = 'prestapp_routes_v3';
const STORAGE_KEY_CUSTOMERS = 'prestapp_customers_v4';
const STORAGE_KEY_LOANS = 'prestapp_loans_v6';
const STORAGE_KEY_PAYMENTS = 'prestapp_payments_v6';
const STORAGE_KEY_ABONOS = 'prestapp_abonos_v2';
const STORAGE_KEY_POSTPONEMENTS = 'prestapp_postponements_v1';

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => 
    getSafeLocalStorage<User[]>(STORAGE_KEY_USERS, [])
  );

  const [routes, setRoutes] = useState<Route[]>(() => 
    getSafeLocalStorage<Route[]>(STORAGE_KEY_ROUTES, [])
  );

  const [customers, setCustomers] = useState<Customer[]>(() => 
    getSafeLocalStorage<Customer[]>(STORAGE_KEY_CUSTOMERS, [])
  );

  const [loans, setLoans] = useState<Loan[]>(() => 
    getSafeLocalStorage<Loan[]>(STORAGE_KEY_LOANS, [])
  );

  const [payments, setPayments] = useState<Payment[]>(() => 
    getSafeLocalStorage<Payment[]>(STORAGE_KEY_PAYMENTS, [])
  );

  const [abonos, setAbonos] = useState<ExtraAbono[]>(() => 
    getSafeLocalStorage<ExtraAbono[]>(STORAGE_KEY_ABONOS, [])
  );

  const [postponements, setPostponements] = useState<Postponement[]>(() => 
    getSafeLocalStorage<Postponement[]>(STORAGE_KEY_POSTPONEMENTS, [])
  );

  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(!isSupabaseMocked);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => { setSafeLocalStorage(STORAGE_KEY_USERS, users); }, [users]);
  useEffect(() => { setSafeLocalStorage(STORAGE_KEY_ROUTES, routes); }, [routes]);
  useEffect(() => { setSafeLocalStorage(STORAGE_KEY_CUSTOMERS, customers); }, [customers]);
  useEffect(() => { setSafeLocalStorage(STORAGE_KEY_LOANS, loans); }, [loans]);
  useEffect(() => { setSafeLocalStorage(STORAGE_KEY_PAYMENTS, payments); }, [payments]);
  useEffect(() => { setSafeLocalStorage(STORAGE_KEY_ABONOS, abonos); }, [abonos]);
  useEffect(() => { setSafeLocalStorage(STORAGE_KEY_POSTPONEMENTS, postponements); }, [postponements]);

  const seedSupabaseDatabase = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    return { 
      success: true, 
      message: 'Base de datos vinculada directamente con Supabase. Puedes registrar usuarios, rutas y clientes desde el panel.' 
    };
  }, []);

  const fetchSupabaseData = useCallback(async () => {
    if (isSupabaseMocked) {
      setIsSupabaseConnected(false);
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      // 1. Usuarios
      const { data: remoteUsers, error: uErr } = await supabase
        .from('usuarios')
        .select('*')
        .order('nombre', { ascending: true });

      if (uErr) {
        console.warn('[PRESTAPP] No se pudo leer usuarios en Supabase:', uErr);
        setSyncError(uErr.message);
        setIsSupabaseConnected(false);
        return;
      }

      setIsSupabaseConnected(true);
      setUsers(remoteUsers || []);

      // 2. Rutas
      const { data: remoteRoutes, error: rErr } = await supabase
        .from('rutas')
        .select('*')
        .order('nombre', { ascending: true });
      if (!rErr && remoteRoutes) setRoutes(remoteRoutes);

      // 3. Clientes
      const { data: remoteCustomers, error: cErr } = await supabase
        .from('clientes')
        .select('*')
        .order('orden_visita', { ascending: true });
      if (!cErr && remoteCustomers) setCustomers(remoteCustomers);

      // 4. Préstamos
      const { data: remoteLoans, error: lErr } = await supabase
        .from('prestamos')
        .select('*')
        .order('created_at', { ascending: false });
      if (!lErr && remoteLoans) setLoans(remoteLoans);

      // 5. Pagos
      const { data: remotePayments, error: pErr } = await supabase
        .from('pagos')
        .select('*')
        .order('fecha', { ascending: false });
      if (!pErr && remotePayments) setPayments(remotePayments);

      // 6. Abonos
      const { data: remoteAbonos, error: aErr } = await supabase
        .from('abonos')
        .select('*')
        .order('fecha', { ascending: false });
      if (!aErr && remoteAbonos) setAbonos(remoteAbonos);

    } catch (err: unknown) {
      console.warn('Supabase fetch error:', err);
      const msg = err instanceof Error ? err.message : 'Error de conexión con Supabase';
      setSyncError(msg);
      setIsSupabaseConnected(false);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchSupabaseData();

    const handleConfigChange = () => {
      fetchSupabaseData();
    };

    window.addEventListener('prestapp:supabase-config-changed', handleConfigChange);
    return () => {
      window.removeEventListener('prestapp:supabase-config-changed', handleConfigChange);
    };
  }, [fetchSupabaseData]);

  const syncWithSupabase = async () => {
    await fetchSupabaseData();
  };

  const safeSupabaseExecute = async (
    operationName: string,
    fn: () => Promise<{ error?: { message?: string } | null }>
  ) => {
    if (isSupabaseMocked) return;
    try {
      const res = await fn();
      if (res && res.error) {
        console.warn(`[PRESTAPP Supabase] (${operationName}):`, res.error?.message || res.error);
        const errMsg = String(res.error?.message || '');
        if (errMsg.includes('Failed to fetch') || errMsg.includes('Network request failed') || errMsg.includes('NetworkError')) {
          setIsSupabaseConnected(false);
          setSyncError('Supabase no disponible por el momento. Operando en modo local seguro.');
        }
      }
    } catch (err: unknown) {
      console.warn(`[PRESTAPP Supabase Error] (${operationName}):`, err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('Failed to fetch') || errMsg.includes('Network request failed') || errMsg.includes('NetworkError')) {
        setIsSupabaseConnected(false);
        setSyncError('Supabase no disponible por el momento. Operando en modo local seguro.');
      }
    }
  };

  const resetDemoData = () => {
    localStorage.clear();
    fetchSupabaseData();
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

    await safeSupabaseExecute('insert usuario', () => supabase.from('usuarios').insert(dbPayload));
    return newUser;
  };

  const updateUser = async (userId: string, data: Partial<User>): Promise<void> => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));
    await safeSupabaseExecute('update usuario', () => supabase.from('usuarios').update(data).eq('id', userId));
  };

  const updateUserPassword = async (userId: string, newPassword: string): Promise<void> => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPassword } : u));
    await safeSupabaseExecute('update password', () => supabase.from('usuarios').update({ password: newPassword }).eq('id', userId));
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
    await safeSupabaseExecute('insert ruta', () => supabase.from('rutas').insert(dbPayload));
    return newRoute;
  };

  const updateRoute = async (id: string, data: Partial<Route>): Promise<void> => {
    setRoutes(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    await safeSupabaseExecute('update ruta', () => supabase.from('rutas').update(data).eq('id', id));
  };

  const deleteRoute = async (routeId: string): Promise<{ success: boolean; message?: string }> => {
    const assignedClients = customers.filter(c => c.ruta_id === routeId);
    if (assignedClients.length > 0) {
      return { success: false, message: 'No se puede eliminar la ruta porque tiene clientes asignados.' };
    }
    setRoutes(prev => prev.filter(r => r.id !== routeId));
    await safeSupabaseExecute('delete ruta', () => supabase.from('rutas').delete().eq('id', routeId));
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

    await safeSupabaseExecute('insert cliente', () => supabase.from('clientes').insert(dbPayload));
    return newCustomer;
  };

  const updateCustomer = async (id: string, data: Partial<Customer>): Promise<void> => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    
    // Filtrar solo propiedades DB
    const dbData: Record<string, unknown> = {};
    const validKeys = ['ruta_id', 'nombre', 'documento', 'telefono', 'direccion', 'barrio', 'alias', 'foto_url', 'foto_casa', 'foto_cliente', 'foto_documento', 'estado', 'orden_visita'];
    
    Object.keys(data).forEach(key => {
      if (validKeys.includes(key)) {
        dbData[key] = data[key as keyof Customer];
      }
    });

    await safeSupabaseExecute('update cliente', () => supabase.from('clientes').update(dbData).eq('id', id));
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

    // Actualizar orden_visita en Supabase para cada cliente
    orderedCustomerIds.forEach((id, idx) => {
      safeSupabaseExecute('update orden_visita cliente', () => 
        supabase.from('clientes').update({ orden_visita: idx + 1 }).eq('id', id)
      );
    });
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

    await safeSupabaseExecute('insert prestamo', () => supabase.from('prestamos').insert(dbPayload));
    return newLoan;
  };

  const recordPayment = async (paymentData: {
    prestamo_id: string;
    valor: number;
    tipo: 'CUOTA_REGULAR' | 'ABONO_EXTRA';
    metodo_pago?: TransactionMethod;
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
      metodo_pago: paymentData.metodo_pago || 'EFECTIVO',
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

    await safeSupabaseExecute('insert pago', () => supabase.from('pagos').insert(dbPayload));

    await safeSupabaseExecute('update prestamo post pago', () => supabase.from('prestamos').update({
      saldo: newSaldo,
      cuotas_pagadas: newCuotasPagadas,
      estado: newEstado
    }).eq('id', loan.id));

    return newPayment;
  };

  const recordPostponement = async (postponementData: {
    prestamo_id: string;
    cliente_id: string;
    motivo: string;
    nueva_fecha?: string;
    observaciones?: string;
    registrado_por: string;
  }): Promise<Postponement> => {
    const newPostponement: Postponement = {
      id: crypto.randomUUID(),
      prestamo_id: postponementData.prestamo_id,
      cliente_id: postponementData.cliente_id,
      fecha: new Date().toISOString(),
      motivo: postponementData.motivo,
      nueva_fecha: postponementData.nueva_fecha,
      observaciones: postponementData.observaciones || '',
      registrado_por: postponementData.registrado_por,
      created_at: new Date().toISOString()
    };

    setPostponements(prev => [newPostponement, ...prev]);
    return newPostponement;
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

      await safeSupabaseExecute('revert prestamo post delete pago', () => supabase.from('prestamos').update({
        saldo: newSaldo,
        cuotas_pagadas: newCuotasPagadas,
        estado: newEstado
      }).eq('id', loan.id));
    }

    setPayments(prev => prev.filter(p => p.id !== paymentId));
    await safeSupabaseExecute('delete pago', () => supabase.from('pagos').delete().eq('id', paymentId));
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

    await safeSupabaseExecute('insert abono', () => supabase.from('abonos').insert(dbPayload));

    await safeSupabaseExecute('update prestamo post abono', () => supabase.from('prestamos').update({
      saldo: newSaldo,
      estado: newEstado
    }).eq('id', loan.id));

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
        isSupabaseConnected,
        isSyncing,
        syncError,
        syncWithSupabase,
        seedSupabaseDatabase,
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
        postponements,
        recordPostponement,
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
