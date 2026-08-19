import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, UserPermissions } from '../types';

interface RoleGuardProps {
  allowedRoles?: UserRole[];
  requiredPermission?: keyof UserPermissions;
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, requiredPermission, children }) => {
  const { role, hasPermission } = useAuth();

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/field-route" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/field-route" replace />;
  }

  return <>{children}</>;
};
