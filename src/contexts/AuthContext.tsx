import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { useData } from './DataContext';

interface AuthContextType {
  currentUser: User | null;
  role: UserRole;
  login: (correo: string, password: string) => { success: boolean; message?: string; user?: User };
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

  const login = (correo: string, password: string): { success: boolean; message?: string; user?: User } => {
    const cleanEmail = correo.trim().toLowerCase();
    const found = users.find(u => u.correo.toLowerCase() === cleanEmail);

    if (!found) {
      return { success: false, message: 'El correo electrónico no se encuentra registrado.' };
    }

    if (!found.activo) {
      return { success: false, message: 'La cuenta de usuario se encuentra inactiva.' };
    }

    // Verificar contraseña (o documento si no se ha cambiado clave)
    const expectedPass = found.password || found.documento;
    if (password !== expectedPass) {
      return { success: false, message: 'Contraseña incorrecta. (Recuerda que la clave inicial es tu N° de cédula)' };
    }

    setCurrentUser(found);
    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, found.id);
    return { success: true, user: found };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
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
