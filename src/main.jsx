import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';

import { AuthProvider } from '@/lib/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleGuard from '@/components/shared/RoleGuard';
import ScrollToTop from '@/components/ScrollToTop';

import Login from '@/components/pages/Login';
import Register from '@/components/pages/Register';
import VerifyOTP from '@/components/pages/VerifyOTP';
import ForgotPassword from '@/components/pages/ForgotPassword';
import ResetPassword from '@/components/pages/ResetPassword';
import RoleSelect from '@/components/pages/RoleSelect';
import InspectorLayout from '@/components/pages/InspectorLayout';
import InspectorDashboard from '@/components/pages/InspectorDashboard';
import NewInspection from '@/components/pages/NewInspection';
import InspectionDetails from '@/components/pages/InspectionDetails';
import Archive from '@/components/pages/Archive';
import AdminLayout from '@/components/pages/AdminLayout';
import AdminDashboard from '@/components/pages/AdminDashboard';
import AdminQueue from '@/components/pages/AdminQueue';
import AdminReports from '@/components/pages/AdminReports';
import AdminUsers from '@/components/pages/AdminUsers';
import AdminArchive from '@/components/pages/AdminArchive';
import AuditorLayout from '@/components/pages/AuditorLayout';
import AuditorArchive from '@/components/pages/AuditorArchive';
import AuditorReports from '@/components/pages/AuditorReports';
import ShipperLayout from '@/components/pages/ShipperLayout';
import ShipperDashboard from '@/components/pages/ShipperDashboard';
import ShipperNewInspection from '@/components/pages/ShipperNewInspection';
import ShipperBatchInspection from '@/components/pages/ShipperBatchInspection';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function App() {
  const loginElement = <Navigate to="/login" replace />;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify" element={<VerifyOTP />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route element={<ProtectedRoute unauthenticatedElement={loginElement} />}>
              <Route index element={<RoleSelect />} />

              <Route
                path="/inspector"
                element={
                  <RoleGuard allowedRoles={['inspector', 'user']}>
                    <InspectorLayout />
                  </RoleGuard>
                }
              >
                <Route index element={<InspectorDashboard />} />
              </Route>
              <Route
                path="/inspections/new"
                element={
                  <RoleGuard allowedRoles={['inspector', 'user']}>
                    <InspectorLayout />
                  </RoleGuard>
                }
              >
                <Route index element={<NewInspection />} />
              </Route>
              <Route
                path="/inspections/:id"
                element={
                  <RoleGuard allowedRoles={['inspector', 'user', 'admin', 'auditor', 'shipper']}>
                    <InspectorLayout />
                  </RoleGuard>
                }
              >
                <Route index element={<InspectionDetails />} />
              </Route>
              <Route
                path="/my-archive"
                element={
                  <RoleGuard allowedRoles={['inspector', 'user']}>
                    <InspectorLayout />
                  </RoleGuard>
                }
              >
                <Route index element={<Archive />} />
              </Route>

              <Route
                path="/admin"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <AdminLayout />
                  </RoleGuard>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="queue" element={<AdminQueue />} />
                <Route path="queue/:id" element={<AdminQueue />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="archive" element={<AdminArchive />} />
                <Route path="archive/:id" element={<InspectionDetails />} />
                <Route path="users" element={<AdminUsers />} />
              </Route>

              <Route
                path="/auditor"
                element={
                  <RoleGuard allowedRoles={['auditor', 'admin']}>
                    <AuditorLayout />
                  </RoleGuard>
                }
              >
                <Route index element={<AuditorArchive />} />
                <Route path="reports" element={<AuditorReports />} />
              </Route>

              <Route
                path="/shipper"
                element={
                  <RoleGuard allowedRoles={['shipper', 'admin']}>
                    <ShipperLayout />
                  </RoleGuard>
                }
              >
                <Route index element={<ShipperDashboard />} />
                <Route path="new" element={<ShipperNewInspection />} />
                <Route path="batch" element={<ShipperBatchInspection />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
