import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, UserPermissions, getRoleDefaultPermissions } from '../types';
import { useData } from './DataContext';
import { supabase, getActiveSupabaseCredentials } from '../lib/supabase';

interface AuthContextType {
  currentUser: User | null;
  role: UserRole;
  hasPermission: (permission: keyof UserPermissions) => boolean;
  login: (correo: string, password: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  logout: () => void;
  switchUser: (userId: string) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_USER_STORAGE_KEY = 'prestapp_active_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { users } = useData();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUserId = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
    if (savedUserId && users.length > 0) {
      const found = users.find(u => u.id === savedUserId);
      if (found) {
        setCurrentUser(found);
      }
    }
  }, [users]);

  const login = async (correoOrDoc: string, password: string): Promise<{ success: boolean; message?: string; user?: User }> => {
    const cleanIdentifier = correoOrDoc.trim();
    const cleanPass = password.trim();

    if (!cleanIdentifier || !cleanPass) {
      return { success: false, message: 'Por favor ingresa tu correo/cédula y contraseña.' };
    }

    const { isConfigured } = getActiveSupabaseCredentials();

    // 1. Validar directamente en Supabase
    if (isConfigured) {
      try {
        const isEmail = cleanIdentifier.includes('@');
        let query = supabase.from('usuarios').select('*');
        
        if (isEmail) {
          query = query.ilike('correo', cleanIdentifier.toLowerCase());
        } else {
          query = query.eq('documento', cleanIdentifier);
        }

        const { data: dbUser, error } = await query.maybeSingle();

        if (error) {
          console.warn('[AUTH] Error consultando usuario en Supabase:', error);
          if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('permission')) {
            return {
              success: false,
              message: 'Acceso bloqueado por RLS en Supabase. Ejecuta en tu SQL Editor: "ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;"'
            };
          }
          return {
            success: false,
            message: `Error al verificar en Supabase: ${error.message}`
          };
        }

        if (dbUser) {
          if (!dbUser.activo) {
            return { success: false, message: 'La cuenta de usuario se encuentra inactiva. Contacta al Administrador.' };
          }
          const expectedPass = String(dbUser.password || dbUser.documento || '').trim();
          if (cleanPass === expectedPass) {
            setCurrentUser(dbUser);
            localStorage.setItem(ACTIVE_USER_STORAGE_KEY, dbUser.id);
            return { success: true, user: dbUser };
          } else {
            return { success: false, message: 'Contraseña incorrecta. (Por defecto tu clave es tu número de cédula).' };
          }
        } else {
          return {
            success: false,
            message: `El usuario "${cleanIdentifier}" no existe en la tabla usuarios de Supabase. Verifica la ortografía.`
          };
        }
      } catch (err: unknown) {
        console.warn('[AUTH] Error de red con Supabase:', err);
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, message: `Error de red al consultar Supabase: ${msg}` };
      }
    }

    // Si Supabase no está configurado, informar claramente al usuario
    return {
      success: false,
      message: 'Supabase no está vinculado aún. Haz clic en "Conectar Supabase" para ingresar la URL del proyecto y Anon Key.'
    };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
  };

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    if (!currentUser) return false;
    // Administrador siempre tiene el 100% de permisos
    if (currentUser.rol === 'ADMIN') return true;

    // Si el usuario tiene permisos personalizados explícitos en su objeto
    if (currentUser.permisos && currentUser.permisos[permission] !== undefined) {
      return !!currentUser.permisos[permission];
    }

    // De lo contrario, usar la plantilla predeterminada según su Rol (Supervisor / Cobrador)
    const defaults = getRoleDefaultPermissions(currentUser.rol);
    return !!defaults[permission];
  };

  const switchUser = (userId: string) => {
    const found = users.find(u => u.id === userId);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, found.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser?.rol || 'COBRADOR',
        hasPermission,
        login,
        logout,
        switchUser,
        isAuthenticated: !!currentUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  return context;
};

