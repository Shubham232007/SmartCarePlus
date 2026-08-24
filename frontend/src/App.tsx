import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { Login } from './pages/Login';

import { PatientDashboard } from './pages/PatientDashboard';
import { PatientHealthPage } from './pages/PatientHealthPage';
import { PatientMedicinesPage } from './pages/PatientMedicinesPage';
import { PatientAIPage } from './pages/PatientAIPage';
import { PatientAlertsPage } from './pages/PatientAlertsPage';
import { PatientDevicePage } from './pages/PatientDevicePage';

import { DoctorDashboard } from './pages/DoctorDashboard';
import { DoctorPatientDetail } from './pages/DoctorPatientDetail';
import { DoctorAlertsPage } from './pages/DoctorAlertsPage';
import { DoctorNotesPage } from './pages/DoctorNotesPage';

import { AdminDashboard } from './pages/AdminDashboard';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminDevicesPage } from './pages/AdminDevicesPage';
import { AdminThresholdsPage } from './pages/AdminThresholdsPage';
import { AdminAuditLogsPage } from './pages/AdminAuditLogsPage';

// Protected Layout Component
const DashboardLayout: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm font-semibold">
        <div className="flex items-center space-x-3">
          <span className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <span>Authenticating SmartCare+ Session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect user to their own role dashboard
    const defaultPath = user.role === 'PATIENT' ? '/patient/dashboard' : user.role === 'DOCTOR' ? '/doctor/dashboard' : '/admin/dashboard';
    return <Navigate to={defaultPath} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate
              to={user?.role === 'PATIENT' ? '/patient/dashboard' : user?.role === 'DOCTOR' ? '/doctor/dashboard' : '/admin/dashboard'}
              replace
            />
          ) : (
            <Login />
          )
        }
      />

      {/* Patient Routes */}
      <Route path="/patient/dashboard" element={<DashboardLayout allowedRoles={['PATIENT', 'ADMIN']}><PatientDashboard /></DashboardLayout>} />
      <Route path="/patient/health" element={<DashboardLayout allowedRoles={['PATIENT', 'ADMIN']}><PatientHealthPage /></DashboardLayout>} />
      <Route path="/patient/history" element={<DashboardLayout allowedRoles={['PATIENT', 'ADMIN']}><PatientHealthPage /></DashboardLayout>} />
      <Route path="/patient/medicines" element={<DashboardLayout allowedRoles={['PATIENT', 'ADMIN']}><PatientMedicinesPage /></DashboardLayout>} />
      <Route path="/patient/ai" element={<DashboardLayout allowedRoles={['PATIENT', 'ADMIN']}><PatientAIPage /></DashboardLayout>} />
      <Route path="/patient/alerts" element={<DashboardLayout allowedRoles={['PATIENT', 'ADMIN']}><PatientAlertsPage /></DashboardLayout>} />
      <Route path="/patient/emergency" element={<DashboardLayout allowedRoles={['PATIENT', 'ADMIN']}><PatientAlertsPage /></DashboardLayout>} />
      <Route path="/patient/device" element={<DashboardLayout allowedRoles={['PATIENT', 'ADMIN']}><PatientDevicePage /></DashboardLayout>} />

      {/* Doctor Routes */}
      <Route path="/doctor/dashboard" element={<DashboardLayout allowedRoles={['DOCTOR', 'ADMIN']}><DoctorDashboard /></DashboardLayout>} />
      <Route path="/doctor/patients" element={<DashboardLayout allowedRoles={['DOCTOR', 'ADMIN']}><DoctorDashboard /></DashboardLayout>} />
      <Route path="/doctor/patients/:patientId" element={<DashboardLayout allowedRoles={['DOCTOR', 'ADMIN']}><DoctorPatientDetail /></DashboardLayout>} />
      <Route path="/doctor/alerts" element={<DashboardLayout allowedRoles={['DOCTOR', 'ADMIN']}><DoctorAlertsPage /></DashboardLayout>} />
      <Route path="/doctor/notes" element={<DashboardLayout allowedRoles={['DOCTOR', 'ADMIN']}><DoctorNotesPage /></DashboardLayout>} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={<DashboardLayout allowedRoles={['ADMIN']}><AdminDashboard /></DashboardLayout>} />
      <Route path="/admin/users" element={<DashboardLayout allowedRoles={['ADMIN']}><AdminUsersPage /></DashboardLayout>} />
      <Route path="/admin/devices" element={<DashboardLayout allowedRoles={['ADMIN']}><AdminDevicesPage /></DashboardLayout>} />
      <Route path="/admin/thresholds" element={<DashboardLayout allowedRoles={['ADMIN']}><AdminThresholdsPage /></DashboardLayout>} />
      <Route path="/admin/audit-logs" element={<DashboardLayout allowedRoles={['ADMIN']}><AdminAuditLogsPage /></DashboardLayout>} />

      {/* Root Fallback */}
      <Route
        path="*"
        element={
          <Navigate
            to={
              !isAuthenticated
                ? '/login'
                : user?.role === 'PATIENT'
                ? '/patient/dashboard'
                : user?.role === 'DOCTOR'
                ? '/doctor/dashboard'
                : '/admin/dashboard'
            }
            replace
          />
        }
      />
    </Routes>
  );
};
