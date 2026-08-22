import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  User, Route, Customer, Loan, Payment, ExtraAbono, 
  DashboardStats, PaymentFrequency, Postponement, TransactionMethod,
  CompanyConfig, ExpenseConcept, Expense
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
  
  // Configuración de Empresa
  companyConfig: CompanyConfig;
  updateCompanyConfig: (data: Partial<CompanyConfig>) => Promise<CompanyConfig>;

  // Gastos & Conceptos
  expenseConcepts: ExpenseConcept[];
  expenses: Expense[];
  addExpenseConcept: (nombre: string) => Promise<ExpenseConcept>;
  updateExpenseConcept: (id: string, data: Partial<ExpenseConcept>) => Promise<void>;
  toggleExpenseConceptActive: (id: string) => Promise<void>;
  deleteExpenseConcept: (id: string) => Promise<{ success: boolean; message?: string }>;
  addExpense: (data: {
    concepto_id: string;
    monto: number;
    descripcion?: string;
    fecha?: string;
    usuario_id?: string;
  }) => Promise<Expense>;
  deleteExpense: (expenseId: string) => Promise<{ success: boolean; message?: string }>;

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
  deleteCustomer: (customerId: string) => Promise<{ success: boolean; message?: string }>;
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
  deleteLoan: (loanId: string) => Promise<{ success: boolean; message?: string }>;
  
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

  refinanceLoan: (data: {
    prestamo_anterior_id: string;
    cliente_id: string;
    saldo_anterior: number;
    capital_adicional: number;
    nuevo_monto: number;
    interes: number;
    cuotas_totales: number;
    tipo_pago: PaymentFrequency;
    fecha_inicio?: string;
    observaciones?: string;
    registrado_por?: string;
  }) => Promise<Loan>;

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
const STORAGE_KEY_COMPANY = 'prestapp_company_config_v1';
const STORAGE_KEY_CONCEPTS = 'prestapp_expense_concepts_v1';
const STORAGE_KEY_EXPENSES = 'prestapp_expenses_v1';
const STORAGE_KEY_NOTIFIED_ROUTES = 'prestapp_notified_route_ids_v1';

const DEFAULT_COMPANY_CONFIG: CompanyConfig = {
  id: 'default_config',
  nombre: 'PRESTAPP',
  slogan: 'Manejo Financiero Fácil y Rápido',
  nit: '900.123.456-7',
  logo_url: '',
  updated_at: new Date().toISOString()
};

const DEFAULT_EXPENSE_CONCEPTS: ExpenseConcept[] = [
  { id: 'c1', nombre: 'Combustible / Gasolina', activo: true, created_at: new Date().toISOString() },
  { id: 'c2', nombre: 'Almuerzo / Viáticos', activo: true, created_at: new Date().toISOString() },
  { id: 'c3', nombre: 'Mantenimiento de Vehículo', activo: true, created_at: new Date().toISOString() },
  { id: 'c4', nombre: 'Papelería e Impresiones', activo: true, created_at: new Date().toISOString() },
  { id: 'c5', nombre: 'Servicios / Recargas Móvil', activo: true, created_at: new Date().toISOString() },
  { id: 'c6', nombre: 'Otros Gastos Operativos', activo: true, created_at: new Date().toISOString() },
];

const generateExpenseCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'GST-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const isValidUUID = (str?: string | null): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
};

const APPS_SCRIPT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzQi80iM7sgT3OwmgWpQF-1d67DFq6I0d5aquvgX1L56qfCRnbqk51ZxhLCAIALdC3iQA/exec';

// Bloqueo en memoria para evitar llamadas simultáneas duplicadas
const inFlightRouteNotifs = new Set<string>();

/**
 * Función para registrar en Google Sheets a través de Google Apps Script:
 * REGLAS ESTRICTAS:
 * 1. Solo envía si total_rutas > 1 (la primera ruta es gratuita).
 * 2. Solo envía UNA SOLA VEZ cuando se agrega el PRIMER cliente a una nueva ruta creada (0 clientes previos).
 * 3. NO envía más información si la ruta ya tiene clientes agregados o si ya fue notificada.
 * 4. Envío ÚNICO (un solo canal limpio para evitar registros repetidos).
 * 5. Envía la URL de Cloudinary de la BD (sin Base64).
 */
const notifyClientAddedToRoute = (
  customer: Customer,
  targetRouteId: string,
  actionType: 'CREACION_CLIENTE' | 'TRANSFERENCIA_CLIENTE',
  allRoutes: Route[],
  allUsers: User[],
  allCustomers: Customer[],
  currentCompanyConfig?: CompanyConfig
) => {
  try {
    const webhookUrl = APPS_SCRIPT_WEBHOOK_URL;
    if (!webhookUrl || !webhookUrl.startsWith('http')) return;

    // Rutas efectivas
    const effectiveRoutes = (allRoutes && allRoutes.length > 0)
      ? allRoutes
      : getSafeLocalStorage<Route[]>(STORAGE_KEY_ROUTES, []);

    // REGLA 1: Solo enviar si hay más de 1 ruta (la 1ra ruta es la gratuita)
    if (effectiveRoutes.length <= 1) {
      console.log('[APPS_SCRIPT] Omitido: Solo hay 1 ruta (la primera es gratuita). Total rutas:', effectiveRoutes.length);
      return;
    }

    // REGLA 2: Registro persistente - Si esta ruta ya fue notificada previamente, NUNCA repetir
    const notifiedRouteIds = getSafeLocalStorage<string[]>(STORAGE_KEY_NOTIFIED_ROUTES, []);
    if (notifiedRouteIds.includes(targetRouteId)) {
      console.log('[APPS_SCRIPT] Omitido: Esta ruta ya fue notificada anteriormente:', targetRouteId);
      return;
    }

    // Bloqueo en memoria para concurrencia
    if (inFlightRouteNotifs.has(targetRouteId)) {
      console.log('[APPS_SCRIPT] Omitido: Notificación ya en curso para la ruta:', targetRouteId);
      return;
    }

    // REGLA 3: Verificar que la ruta NO tenga clientes previos (solo se notifica el primer cliente / movimiento)
    const effectiveCustomers = (allCustomers && allCustomers.length > 0)
      ? allCustomers
      : getSafeLocalStorage<Customer[]>(STORAGE_KEY_CUSTOMERS, []);

    const existingClientsInTargetRoute = effectiveCustomers.filter(c => c.ruta_id === targetRouteId && c.id !== customer.id);
    if (existingClientsInTargetRoute.length > 0) {
      console.log(`[APPS_SCRIPT] Omitido: La ruta ya tiene ${existingClientsInTargetRoute.length} cliente(s). No se notifica.`);
      return;
    }

    const targetRoute = effectiveRoutes.find(r => r.id === targetRouteId) || {
      id: targetRouteId,
      nombre: 'Ruta Nueva / Asignada',
      descripcion: 'Ruta activa',
      usuario_id: ''
    };

    // Usuarios efectivos
    const effectiveUsers = (allUsers && allUsers.length > 0)
      ? allUsers
      : getSafeLocalStorage<User[]>(STORAGE_KEY_USERS, []);

    // Cobrador asignado a la ruta
    const collector = effectiveUsers.find(u => u.id === targetRoute.usuario_id);
    const collectorName = collector ? `${collector.nombre} (${collector.rol || 'Cobrador'})` : 'Sin asignar';

    // Correo y nombre del Admin en sesión
    const activeUserId = localStorage.getItem('prestapp_active_user_id');
    const activeUser = effectiveUsers.find(u => u.id === activeUserId);
    const adminEmail = activeUser?.correo || 'rsaldarriaga.sismasalud@gmail.com';
    const adminName = activeUser?.nombre || 'Administrador';

    // Configuración de Empresa efectiva (URL de Cloudinary, NUNCA Base64)
    const effectiveCompany = currentCompanyConfig || getSafeLocalStorage<CompanyConfig>(STORAGE_KEY_COMPANY, DEFAULT_COMPANY_CONFIG);
    const empresaNombre = effectiveCompany?.nombre || 'PRESTAPP';
    const rawLogo = effectiveCompany?.logo_url || '';
    const empresaLogo = (rawLogo.startsWith('http://') || rawLogo.startsWith('https://')) ? rawLogo : '';
    const empresaNit = effectiveCompany?.nit || '900.123.456-7';
    const empresaSlogan = effectiveCompany?.slogan || 'Manejo Financiero Fácil y Rápido';

    const fechaFormateada = new Date().toLocaleString('es-CO');

    const payload: Record<string, unknown> = {
      tipo_evento: 'CLIENTE_AGREGADO_A_RUTA',
      mensaje_clave: 'Primer Cliente Agregado a Nueva Ruta',
      accion: actionType === 'CREACION_CLIENTE' ? 'Nuevo Cliente Creado (Primer Cliente)' : 'Cliente Transferido (Primer Cliente)',
      fecha_hora: fechaFormateada,
      empresa_nombre: empresaNombre,
      empresa_logo: empresaLogo,
      empresa_nit: empresaNit,
      empresa_slogan: empresaSlogan,
      nombre_ruta: targetRoute.nombre,
      descripcion_ruta: targetRoute.descripcion || 'Sin detalle',
      cobrador_asignado: collectorName,
      cliente_nombre: customer.nombre || 'Cliente sin nombre',
      cliente_documento: customer.documento || 'Sin documento',
      cliente_telefono: customer.telefono || 'Sin teléfono',
      cliente_direccion: `${customer.direccion || ''} ${customer.barrio ? '(' + customer.barrio + ')' : ''}`.trim() || 'Sin dirección',
      admin_email: adminEmail,
      admin_nombre: adminName,
      total_rutas: effectiveRoutes.length,
      timestamp: new Date().toISOString()
    };

    const serializedPayload = JSON.stringify(payload);

    // Marcar como notificada inmediatamente para blindar contra repeticiones
    inFlightRouteNotifs.add(targetRouteId);
    localStorage.setItem(STORAGE_KEY_NOTIFIED_ROUTES, JSON.stringify([...notifiedRouteIds, targetRouteId]));

    console.log('[APPS_SCRIPT] Enviando notificación ÚNICA a Google Sheets & Email:', payload);

    // ENVÍO ÚNICO EXCLUSIVO: Formulario POST en Iframe Oculto (100% compatible con Apps Script y 302 redirects)
    if (typeof document !== 'undefined') {
      const iframeName = 'gscript_target_frame_' + Date.now();
      const hiddenIframe = document.createElement('iframe');
      hiddenIframe.name = iframeName;
      hiddenIframe.style.display = 'none';
      hiddenIframe.style.width = '0';
      hiddenIframe.style.height = '0';
      hiddenIframe.style.position = 'absolute';
      hiddenIframe.style.left = '-9999px';
      document.body.appendChild(hiddenIframe);

      const hiddenForm = document.createElement('form');
      hiddenForm.method = 'POST';
      hiddenForm.action = webhookUrl;
      hiddenForm.target = iframeName;
      hiddenForm.style.display = 'none';

      // Campo 'data' con JSON completo
      const dataInput = document.createElement('input');
      dataInput.type = 'hidden';
      dataInput.name = 'data';
      dataInput.value = serializedPayload;
      hiddenForm.appendChild(dataInput);

      // Campos individuales para e.parameter de Google Apps Script
      Object.entries(payload).forEach(([key, val]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = typeof val === 'string' ? val : String(val);
        hiddenForm.appendChild(input);
      });

      document.body.appendChild(hiddenForm);
      hiddenForm.submit();

      // Limpieza ordenada de elementos DOM temporales
      setTimeout(() => {
        try {
          if (hiddenForm.parentNode) hiddenForm.parentNode.removeChild(hiddenForm);
          if (hiddenIframe.parentNode) hiddenIframe.parentNode.removeChild(hiddenIframe);
        } catch (cleanErr) {
          console.debug('[APPS_SCRIPT] Limpieza DOM completada:', cleanErr);
        }
      }, 10000);
    }

  } catch (e) {
    console.warn('[NOTIFY CLIENT ROUTE] Exception:', e);
  }
};

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

  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>(() =>
    getSafeLocalStorage<CompanyConfig>(STORAGE_KEY_COMPANY, DEFAULT_COMPANY_CONFIG)
  );

  const [expenseConcepts, setExpenseConcepts] = useState<ExpenseConcept[]>(() =>
    getSafeLocalStorage<ExpenseConcept[]>(STORAGE_KEY_CONCEPTS, DEFAULT_EXPENSE_CONCEPTS)
  );

  const [expenses, setExpenses] = useState<Expense[]>(() =>
    getSafeLocalStorage<Expense[]>(STORAGE_KEY_EXPENSES, [])
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
  useEffect(() => { setSafeLocalStorage(STORAGE_KEY_COMPANY, companyConfig); }, [companyConfig]);
  useEffect(() => { setSafeLocalStorage(STORAGE_KEY_CONCEPTS, expenseConcepts); }, [expenseConcepts]);
  useEffect(() => { setSafeLocalStorage(STORAGE_KEY_EXPENSES, expenses); }, [expenses]);

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
      const normalizedUsers: User[] = (remoteUsers || []).map((u: Record<string, unknown>) => {
        let permisosObj = u.permisos;
        if (typeof permisosObj === 'string') {
          try {
            permisosObj = JSON.parse(permisosObj);
          } catch {
            permisosObj = undefined;
          }
        }
        return {
          ...u,
          permisos: permisosObj
        } as User;
      });
      setUsers(normalizedUsers);

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

      // 7. Aplazamientos / Incumplimientos
      const { data: remotePostp, error: postpErr } = await supabase
        .from('aplazamientos')
        .select('*')
        .order('fecha', { ascending: false });
      if (!postpErr && remotePostp) setPostponements(remotePostp);

      // 8. Configuración de Empresa
      try {
        const { data: remoteComp, error: compErr } = await supabase
          .from('empresa_config')
          .select('*')
          .limit(1)
          .maybeSingle();
        if (!compErr && remoteComp && remoteComp.nombre) {
          setCompanyConfig(remoteComp);
        }
      } catch {
        // Ignorar si la tabla aún no se ha creado en Supabase
      }

      // 9. Conceptos de Gastos
      try {
        const { data: remoteConcepts, error: concErr } = await supabase
          .from('conceptos_gasto')
          .select('*')
          .order('created_at', { ascending: true });
        if (!concErr && remoteConcepts && remoteConcepts.length > 0) {
          setExpenseConcepts(remoteConcepts);
        }
      } catch {
        // Ignorar si la tabla aún no se ha creado en Supabase
      }

      // 10. Gastos
      try {
        const { data: remoteExpenses, error: expErr } = await supabase
          .from('gastos')
          .select('*')
          .order('fecha', { ascending: false });
        if (!expErr && remoteExpenses) {
          setExpenses(remoteExpenses);
        }
      } catch {
        // Ignorar si la tabla aún no se ha creado en Supabase
      }

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
      permisos: newUser.permisos,
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
    const updatedRoutes = [...routes, newRoute];
    setRoutes(updatedRoutes);

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
    const updatedRoutes = routes.map(r => r.id === id ? { ...r, ...data } : r);
    setRoutes(updatedRoutes);
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
    const routeClientsBefore = customers.filter(c => c.ruta_id === customerData.ruta_id);
    const newCustomer: Customer = {
      ...customerData,
      id: crypto.randomUUID(),
      orden_visita: routeClientsBefore.length + 1,
      created_at: new Date().toISOString()
    };
    const updatedCustomers = [...customers, newCustomer];
    setCustomers(updatedCustomers);

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

    // Disparador 2: Nuevo cliente creado en ruta (si total_rutas > 1 y es el 1er cliente de la ruta)
    notifyClientAddedToRoute(newCustomer, newCustomer.ruta_id, 'CREACION_CLIENTE', routes, users, customers, companyConfig);

    return newCustomer;
  };

  const updateCustomer = async (id: string, data: Partial<Customer>): Promise<void> => {
    const prevCustomer = customers.find(c => c.id === id);
    const updatedCustomers = customers.map(c => c.id === id ? { ...c, ...data } : c);
    setCustomers(updatedCustomers);
    
    // Filtrar solo propiedades DB
    const dbData: Record<string, unknown> = {};
    const validKeys = ['ruta_id', 'nombre', 'documento', 'telefono', 'direccion', 'barrio', 'alias', 'foto_url', 'foto_casa', 'foto_cliente', 'foto_documento', 'estado', 'orden_visita'];
    
    Object.keys(data).forEach(key => {
      if (validKeys.includes(key)) {
        dbData[key] = data[key as keyof Customer];
      }
    });

    await safeSupabaseExecute('update cliente', () => supabase.from('clientes').update(dbData).eq('id', id));

    // Si la ruta fue modificada en la actualización (transferencia)
    if (data.ruta_id && prevCustomer && data.ruta_id !== prevCustomer.ruta_id) {
      notifyClientAddedToRoute(
        { ...prevCustomer, ...data, ruta_id: data.ruta_id },
        data.ruta_id,
        'TRANSFERENCIA_CLIENTE',
        routes,
        users,
        customers,
        companyConfig
      );
    }
  };

  const deleteCustomer = async (customerId: string): Promise<{ success: boolean; message?: string }> => {
    const customerLoans = loans.filter(l => l.cliente_id === customerId);
    const loanIds = customerLoans.map(l => l.id);

    // 1. Eliminar pagos y abonos relacionados
    setPayments(prev => prev.filter(p => !loanIds.includes(p.prestamo_id)));
    setAbonos(prev => prev.filter(a => !loanIds.includes(a.prestamo_id)));
    setPostponements(prev => prev.filter(postp => postp.cliente_id !== customerId && !loanIds.includes(postp.prestamo_id)));

    // 2. Eliminar préstamos
    setLoans(prev => prev.filter(l => l.cliente_id !== customerId));

    // 3. Eliminar cliente de estado local
    setCustomers(prev => prev.filter(c => c.id !== customerId));

    // 4. En Supabase (respetar Foreign Keys)
    for (const lid of loanIds) {
      await safeSupabaseExecute('delete pagos de prestamo', () => supabase.from('pagos').delete().eq('prestamo_id', lid));
      await safeSupabaseExecute('delete abonos de prestamo', () => supabase.from('abonos').delete().eq('prestamo_id', lid));
      await safeSupabaseExecute('delete aplazamientos de prestamo', () => supabase.from('aplazamientos').delete().eq('prestamo_id', lid));
      await safeSupabaseExecute('delete prestamo', () => supabase.from('prestamos').delete().eq('id', lid));
    }
    await safeSupabaseExecute('delete aplazamientos cliente', () => supabase.from('aplazamientos').delete().eq('cliente_id', customerId));
    await safeSupabaseExecute('delete cliente', () => supabase.from('clientes').delete().eq('id', customerId));

    return { success: true };
  };

  const reassignCustomerRoute = async (customerId: string, newRouteId: string): Promise<void> => {
    // updateCustomer ya gestiona la actualización y la notificación si la ruta cambia
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

    // Validación y sanitización estricta de campos para PostgreSQL
    const rawUserId = postponementData.registrado_por?.trim();
    const validRegistradoPor = isValidUUID(rawUserId) ? rawUserId : null;

    const dbPayload: Record<string, unknown> = {
      id: newPostponement.id,
      prestamo_id: newPostponement.prestamo_id,
      cliente_id: newPostponement.cliente_id,
      fecha: newPostponement.fecha,
      motivo: newPostponement.motivo,
      nueva_fecha: newPostponement.nueva_fecha || null,
      observaciones: newPostponement.observaciones || null,
      registrado_por: validRegistradoPor
    };

    try {
      const { error } = await supabase.from('aplazamientos').insert(dbPayload);
      if (error) {
        console.warn('[SUPABASE APLAZAMIENTOS] Error primario al insertar:', error.message, error.code, error.details);
        
        // Si falló por Foreign Key en 'registrado_por' (23503), reintentar con NULL
        if (error.code === '23503' && dbPayload.registrado_por) {
          console.info('[SUPABASE APLAZAMIENTOS] Reintentando inserción sin registrado_por...');
          dbPayload.registrado_por = null;
          const { error: retryError } = await supabase.from('aplazamientos').insert(dbPayload);
          if (retryError) {
            console.error('[SUPABASE APLAZAMIENTOS] Falló reintento:', retryError.message);
          } else {
            console.log('[SUPABASE APLAZAMIENTOS] Inserción completada con éxito tras reintento.');
          }
        }
      } else {
        console.log('[SUPABASE APLAZAMIENTOS] Registro insertado exitosamente en BD.');
      }
    } catch (err) {
      console.error('[SUPABASE APLAZAMIENTOS] Excepción inesperada al insertar:', err);
    }

    return newPostponement;
  };

  const refinanceLoan = async (data: {
    prestamo_anterior_id: string;
    cliente_id: string;
    saldo_anterior: number;
    capital_adicional: number;
    nuevo_monto: number;
    interes: number;
    cuotas_totales: number;
    tipo_pago: PaymentFrequency;
    fecha_inicio?: string;
    observaciones?: string;
    registrado_por?: string;
  }): Promise<Loan> => {
    const previousLoan = loans.find(l => l.id === data.prestamo_anterior_id);
    if (!previousLoan) throw new Error('Préstamo anterior no encontrado');

    const monto_total = Math.round(data.nuevo_monto * (1 + data.interes / 100));
    const valor_cuota = Math.round(monto_total / data.cuotas_totales);

    const newLoan: Loan = {
      id: crypto.randomUUID(),
      cliente_id: data.cliente_id,
      monto: data.nuevo_monto,
      interes: data.interes,
      monto_total,
      saldo: monto_total,
      cuotas_totales: data.cuotas_totales,
      cuotas_pagadas: 0,
      valor_cuota,
      fecha_inicio: data.fecha_inicio || new Date().toISOString().split('T')[0],
      tipo_pago: data.tipo_pago,
      estado: 'ACTIVO',
      prestamo_origen_id: data.prestamo_anterior_id,
      es_refinanciacion: true,
      saldo_refinanciado: data.saldo_anterior,
      motivo_refinanciacion: data.observaciones || 'Refinanciación de crédito',
      created_at: new Date().toISOString()
    };

    setLoans(prev => [
      newLoan,
      ...prev.map(l => l.id === data.prestamo_anterior_id ? {
        ...l,
        estado: 'REFINANCIADO' as LoanStatus,
        saldo: 0
      } : l)
    ]);

    await safeSupabaseExecute('marcar prestamo refinanciado', () => 
      supabase.from('prestamos').update({
        estado: 'REFINANCIADO',
        saldo: 0
      }).eq('id', data.prestamo_anterior_id)
    );

    const dbPayload = {
      id: newLoan.id,
      cliente_id: newLoan.cliente_id,
      monto: newLoan.monto,
      interes: newLoan.interes,
      monto_total: newLoan.monto_total,
      saldo: newLoan.saldo,
      cuotas_totales: newLoan.cuotas_totales,
      cuotas_pagadas: 0,
      valor_cuota: newLoan.valor_cuota,
      fecha_inicio: newLoan.fecha_inicio,
      tipo_pago: newLoan.tipo_pago,
      estado: newLoan.estado
    };

    await safeSupabaseExecute('insert prestamo refinanciado', () => 
      supabase.from('prestamos').insert(dbPayload)
    );

    return newLoan;
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

  const deleteLoan = async (loanId: string): Promise<{ success: boolean; message?: string }> => {
    // 1. Eliminar pagos, abonos y aplazamientos vinculados a este préstamo
    setPayments(prev => prev.filter(p => p.prestamo_id !== loanId));
    setAbonos(prev => prev.filter(a => a.prestamo_id !== loanId));
    setPostponements(prev => prev.filter(postp => postp.prestamo_id !== loanId));

    // 2. Eliminar préstamo de estado local
    setLoans(prev => prev.filter(l => l.id !== loanId));

    // 3. En Supabase
    await safeSupabaseExecute('delete pagos de prestamo', () => supabase.from('pagos').delete().eq('prestamo_id', loanId));
    await safeSupabaseExecute('delete abonos de prestamo', () => supabase.from('abonos').delete().eq('prestamo_id', loanId));
    await safeSupabaseExecute('delete aplazamientos de prestamo', () => supabase.from('aplazamientos').delete().eq('prestamo_id', loanId));
    await safeSupabaseExecute('delete prestamo', () => supabase.from('prestamos').delete().eq('id', loanId));

    return { success: true };
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

  const updateCompanyConfig = async (data: Partial<CompanyConfig>): Promise<CompanyConfig> => {
    const updated: CompanyConfig = {
      ...companyConfig,
      ...data,
      updated_at: new Date().toISOString()
    };
    setCompanyConfig(updated);

    const dbPayload = {
      nombre: updated.nombre,
      slogan: updated.slogan || '',
      nit: updated.nit || '',
      logo_url: updated.logo_url || '',
      updated_at: updated.updated_at
    };

    if (isValidUUID(updated.id)) {
      await safeSupabaseExecute('update empresa_config', () => 
        supabase.from('empresa_config').upsert({ id: updated.id, ...dbPayload })
      );
    } else {
      await safeSupabaseExecute('insert/upsert empresa_config', async () => {
        const { data: existing } = await supabase.from('empresa_config').select('id').limit(1).maybeSingle();
        if (existing?.id) {
          return supabase.from('empresa_config').update(dbPayload).eq('id', existing.id);
        } else {
          return supabase.from('empresa_config').insert(dbPayload);
        }
      });
    }

    return updated;
  };

  const addExpenseConcept = async (nombre: string): Promise<ExpenseConcept> => {
    const newConcept: ExpenseConcept = {
      id: crypto.randomUUID(),
      nombre: nombre.trim(),
      activo: true,
      created_at: new Date().toISOString()
    };

    setExpenseConcepts(prev => [...prev, newConcept]);

    const dbPayload = {
      id: newConcept.id,
      nombre: newConcept.nombre,
      activo: newConcept.activo,
      created_at: newConcept.created_at
    };

    await safeSupabaseExecute('insert concepto_gasto', () => supabase.from('conceptos_gasto').insert(dbPayload));
    return newConcept;
  };

  const updateExpenseConcept = async (id: string, data: Partial<ExpenseConcept>): Promise<void> => {
    setExpenseConcepts(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    await safeSupabaseExecute('update concepto_gasto', () => supabase.from('conceptos_gasto').update(data).eq('id', id));
  };

  const toggleExpenseConceptActive = async (id: string): Promise<void> => {
    const concept = expenseConcepts.find(c => c.id === id);
    if (concept) {
      await updateExpenseConcept(id, { activo: !concept.activo });
    }
  };

  const deleteExpenseConcept = async (id: string): Promise<{ success: boolean; message?: string }> => {
    const usedInExpenses = expenses.some(e => e.concepto_id === id);
    if (usedInExpenses) {
      await updateExpenseConcept(id, { activo: false });
      return { success: true, message: 'El concepto se ha desactivado porque tiene gastos históricos registrados.' };
    }
    setExpenseConcepts(prev => prev.filter(c => c.id !== id));
    await safeSupabaseExecute('delete concepto_gasto', () => supabase.from('conceptos_gasto').delete().eq('id', id));
    return { success: true };
  };

  const addExpense = async (data: {
    concepto_id: string;
    monto: number;
    descripcion?: string;
    fecha?: string;
    usuario_id?: string;
  }): Promise<Expense> => {
    const activeUserId = data.usuario_id || localStorage.getItem('prestapp_active_user_id') || users.find(u => u.rol === 'ADMIN')?.id || 'admin';
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      codigo: generateExpenseCode(),
      concepto_id: data.concepto_id,
      usuario_id: activeUserId,
      monto: Number(data.monto) || 0,
      descripcion: data.descripcion?.trim() || '',
      fecha: data.fecha || new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    setExpenses(prev => [newExpense, ...prev]);

    const dbPayload = {
      id: newExpense.id,
      codigo: newExpense.codigo,
      concepto_id: isValidUUID(newExpense.concepto_id) ? newExpense.concepto_id : null,
      usuario_id: isValidUUID(newExpense.usuario_id) ? newExpense.usuario_id : null,
      monto: newExpense.monto,
      descripcion: newExpense.descripcion,
      fecha: newExpense.fecha,
      created_at: newExpense.created_at
    };

    await safeSupabaseExecute('insert gasto', () => supabase.from('gastos').insert(dbPayload));

    return newExpense;
  };

  const deleteExpense = async (expenseId: string): Promise<{ success: boolean; message?: string }> => {
    setExpenses(prev => prev.filter(e => e.id !== expenseId));
    await safeSupabaseExecute('delete gasto', () => supabase.from('gastos').delete().eq('id', expenseId));
    return { success: true };
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

    const todayExpenses = expenses.filter(e => e.fecha.startsWith(todayStr));
    const gastosHoy = todayExpenses.reduce((sum, e) => sum + e.monto, 0);

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
      gastosHoy,
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
        companyConfig,
        updateCompanyConfig,
        expenseConcepts,
        expenses,
        addExpenseConcept,
        updateExpenseConcept,
        toggleExpenseConceptActive,
        deleteExpenseConcept,
        addExpense,
        deleteExpense,
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
        deleteCustomer,
        reassignCustomerRoute,
        reorderCustomersInRoute,
        addLoan,
        deleteLoan,
        recordPayment,
        deletePayment,
        recordExtraAbono,
        postponements,
        recordPostponement,
        refinanceLoan,
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
