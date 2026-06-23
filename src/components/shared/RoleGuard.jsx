/**
 * Doc 11 - RBAC frontend route guard
 * Renders children only if user role matches. Otherwise redirects to /.
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function RoleGuard({ allowedRoles, children }) {
  const { currentUser } = useAuth();

  // If auth is still loading or no user, let ProtectedRoute handle it
  if (!currentUser) return null;

  const userRole = currentUser.role || 'user';

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
