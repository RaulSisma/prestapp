/**
 * Safe LocalStorage Wrapper with Quota Management and Fallbacks
 */

const memoryCache = new Map<string, string>();

export function getSafeLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item !== null) {
      return JSON.parse(item) as T;
    }
  } catch (err) {
    console.warn(`[SafeStorage] Error reading key "${key}" from localStorage:`, err);
  }

  // Fallback a memoria si existe
  if (memoryCache.has(key)) {
    try {
      return JSON.parse(memoryCache.get(key)!) as T;
    } catch {
      // ignore
    }
  }

  return defaultValue;
}

export function setSafeLocalStorage<T>(key: string, value: T): boolean {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch (err) {
    console.error(`[SafeStorage] Error serializing data for "${key}":`, err);
    return false;
  }

  try {
    localStorage.setItem(key, serialized);
    memoryCache.set(key, serialized);
    return true;
  } catch (err: unknown) {
    const isQuotaError = 
      err instanceof DOMException &&
      (err.code === 22 ||
       err.code === 1014 ||
       err.name === 'QuotaExceededError' ||
       err.name === 'NS_ERROR_DOM_QUOTA_REACHED');

    if (isQuotaError) {
      console.warn(`[SafeStorage] QuotaExceededError en "${key}". Iniciando limpieza inteligente de almacenamiento...`);
      cleanupStorage();

      // Intento 2: tras limpiar claves antiguas
      try {
        localStorage.setItem(key, serialized);
        memoryCache.set(key, serialized);
        return true;
      } catch {
        // Intento 3: Si es un array de clientes con fotos base64 pesadas, sanitizamos fotos pesadas del cache local
        if (Array.isArray(value) && key.includes('customers')) {
          try {
            const sanitized = (value as Array<Record<string, unknown>>).map(item => {
              const clone = { ...item };
              // Si la foto es un base64 muy grande (> 100KB), la truncamos o limpiamos para el almacenamiento local
              ['foto_casa', 'foto_cliente', 'foto_documento'].forEach(photoKey => {
                if (typeof clone[photoKey] === 'string' && (clone[photoKey] as string).length > 80000) {
                  // Mantiene solo fotos ligeras en local
                  delete clone[photoKey];
                }
              });
              return clone;
            });
            const lightSerialized = JSON.stringify(sanitized);
            localStorage.setItem(key, lightSerialized);
            memoryCache.set(key, serialized); // mantenemos completa en memoria
            return true;
          } catch {
            // Guardar solo en memoria
          }
        }
      }
    }

    // Fallback seguro a memoria para nunca romper la aplicación
    memoryCache.set(key, serialized);
    return false;
  }
}

/**
 * Limpia claves obsoletas de versiones anteriores para liberar cuota
 */
export function cleanupStorage(): void {
  try {
    const obsoletePrefixes = [
      'prestapp_users_v1',
      'prestapp_users_v2',
      'prestapp_routes_v1',
      'prestapp_routes_v2',
      'prestapp_customers_v1',
      'prestapp_customers_v2',
      'prestapp_customers_v3',
      'prestapp_loans_v1',
      'prestapp_loans_v2',
      'prestapp_loans_v3',
      'prestapp_loans_v4',
      'prestapp_loans_v5',
      'prestapp_payments_v1',
      'prestapp_payments_v2',
      'prestapp_payments_v3',
      'prestapp_payments_v4',
      'prestapp_payments_v5',
      'prestapp_abonos_v1'
    ];

    obsoletePrefixes.forEach(oldKey => {
      localStorage.removeItem(oldKey);
    });

    // Limpiar claves huérfanas temporales
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('temp_') || k.startsWith('cache_'))) {
        localStorage.removeItem(k);
      }
    }
  } catch (e) {
    console.warn('[SafeStorage] Error durante limpieza de almacenamiento:', e);
  }
}
