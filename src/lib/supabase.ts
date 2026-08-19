/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'prestapp_supabase_url';
const STORAGE_ANON_KEY = 'prestapp_supabase_anon_key';

export const DEFAULT_SUPABASE_URL = 'https://qkcwqztrujqapjxerrrh.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY3dxenRydWpxYXBqeGVycnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTA5OTAsImV4cCI6MjEwMDc2Njk5MH0.jPHqje1C--m_gWoh43rrhVcKeWc6njMpzEE23uKQwVg';

/**
 * Detecta y auto-corrige si el usuario ingresó la API Key en el campo URL o viceversa
 */
export function normalizeSupabaseInputs(inputUrl: string | undefined | null, inputKey: string | undefined | null): { url: string; key: string } {
  let url = (inputUrl || '').trim();
  let key = (inputKey || '').trim();

  // Limpiar posibles prefijos erróneos agregados por autocompletar
  if (url.startsWith('https://ey') || url.startsWith('http://ey')) {
    url = url.replace(/^https?:\/\//i, '');
  }

  // Detectar si el campo URL en realidad contiene el token JWT (API Key)
  const isUrlActuallyJwt = url.startsWith('ey') || url.includes('.ey') || (url.length > 50 && url.split('.').length === 3);
  // Detectar si el campo Key en realidad contiene la URL del proyecto
  const isKeyActuallyUrl = key.includes('supabase.co') || key.startsWith('http://') || key.startsWith('https://');

  if (isUrlActuallyJwt || isKeyActuallyUrl) {
    // Están invertidos -> intercambiar
    const temp = url;
    url = key;
    key = temp;
  }

  // Asegurar formato correcto de URL
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  try {
    if (url) {
      const parsed = new URL(url);
      url = parsed.origin;
    }
  } catch {
    // Si sigue siendo inválido, usar el default
    url = DEFAULT_SUPABASE_URL;
  }

  if (!url || !url.includes('supabase.co')) {
    url = DEFAULT_SUPABASE_URL;
  }

  if (!key || key.length < 20) {
    key = DEFAULT_SUPABASE_ANON_KEY;
  }

  return { url, key };
}

export function getActiveSupabaseCredentials(): { url: string; key: string; isConfigured: boolean } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const rawLocalUrl = localStorage.getItem(STORAGE_URL_KEY);
  const rawLocalKey = localStorage.getItem(STORAGE_ANON_KEY);

  const initialUrl = rawLocalUrl || envUrl || DEFAULT_SUPABASE_URL;
  const initialKey = rawLocalKey || envKey || DEFAULT_SUPABASE_ANON_KEY;

  const { url, key } = normalizeSupabaseInputs(initialUrl, initialKey);

  // Guardar valores limpios y corregidos en localStorage
  if (rawLocalUrl !== url || rawLocalKey !== key) {
    localStorage.setItem(STORAGE_URL_KEY, url);
    localStorage.setItem(STORAGE_ANON_KEY, key);
  }

  return {
    url,
    key,
    isConfigured: !!(url && key)
  };
}

let activeClient: SupabaseClient | any = null;

function initClient(): SupabaseClient | any {
  const { url, key, isConfigured } = getActiveSupabaseCredentials();

  if (isConfigured) {
    try {
      const client = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      });
      return client;
    } catch (err) {
      console.warn('[PRESTAPP] Error inicializando cliente Supabase:', err);
    }
  }

  // Fallback a mock proxy seguro que avisa si se intenta usar sin configuración
  return createMockSupabase();
}

function createMockSupabase(): any {
  const createChain = () => {
    const chain: any = {
      select: () => chain,
      insert: () => chain,
      update: () => chain,
      delete: () => chain,
      upsert: () => chain,
      eq: () => chain,
      neq: () => chain,
      gt: () => chain,
      gte: () => chain,
      lt: () => chain,
      lte: () => chain,
      like: () => chain,
      ilike: () => chain,
      is: () => chain,
      in: () => chain,
      contains: () => chain,
      containedBy: () => chain,
      range: () => chain,
      order: () => chain,
      limit: () => chain,
      single: () => Promise.resolve({ data: null, error: { message: 'Supabase no está configurado con URL y Anon Key.' } }),
      maybeSingle: () => Promise.resolve({ data: null, error: { message: 'Supabase no está configurado con URL y Anon Key.' } }),
      then: (onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) => {
        return Promise.resolve({ data: [], error: { message: 'Supabase no configurado' }, count: 0 }).then(onfulfilled, onrejected);
      }
    };
    return chain;
  };

  return {
    from: () => createChain(),
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  };
}

activeClient = initClient();

export function setSupabaseCredentials(rawUrl: string, rawKey: string): { success: boolean; message?: string } {
  const { url, key } = normalizeSupabaseInputs(rawUrl, rawKey);

  if (!url) {
    return { success: false, message: 'La URL de Supabase es inválida. Debe ser del tipo https://xyz.supabase.co' };
  }
  if (!key) {
    return { success: false, message: 'El anon key de Supabase es inválido o está vacío.' };
  }

  localStorage.setItem(STORAGE_URL_KEY, url);
  localStorage.setItem(STORAGE_ANON_KEY, key);

  activeClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  window.dispatchEvent(new CustomEvent('prestapp:supabase-config-changed'));
  return { success: true };
}

export function testSupabaseConnection(rawUrl?: string, rawKey?: string): Promise<{ success: boolean; message: string; rowsCount?: number }> {
  const creds = rawUrl && rawKey 
    ? normalizeSupabaseInputs(rawUrl, rawKey) 
    : getActiveSupabaseCredentials();

  if (!creds.url || !creds.key) {
    return Promise.resolve({ success: false, message: 'Ingresa la URL y el Anon Key de Supabase.' });
  }

  try {
    const testClient = createClient(creds.url, creds.key);
    return testClient
      .from('usuarios')
      .select('*')
      .then(({ data, error }) => {
        if (error) {
          if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('permission')) {
            return {
              success: false,
              message: `Conectó con Supabase pero las políticas de RLS bloquearon la lectura. Ejecuta en Supabase SQL Editor: "ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;"`
            };
          }
          return { success: false, message: `Error de Supabase: ${error.message}` };
        }
        return {
          success: true,
          message: `Conexión exitosa a ${creds.url}. Se encontraron ${data?.length || 0} usuario(s) registrados.`,
          rowsCount: data?.length || 0
        };
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, message: `Error de red: ${msg}` };
      });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Promise.resolve({ success: false, message: `No se pudo inicializar Supabase: ${msg}` });
  }
}

export const getSupabaseClient = (): SupabaseClient => {
  if (!activeClient) {
    activeClient = initClient();
  }
  return activeClient;
};

export const isSupabaseConfigured = (): boolean => {
  return getActiveSupabaseCredentials().isConfigured;
};

// Proxy para mantener compatibilidad con export const supabase
export const supabase = new Proxy({} as any, {
  get(_target, prop) {
    if (!activeClient) {
      activeClient = initClient();
    }
    return (activeClient as any)[prop];
  }
});

export const isSupabaseMocked = false;


