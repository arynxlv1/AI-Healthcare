import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { PatientPortal } from './pages/PatientPortal';
import { DoctorPortal } from './pages/DoctorPortal';
import { HospitalDashboard } from './pages/HospitalDashboard';
import { AdminConsole } from './pages/AdminConsole';
import { LoginPage } from './pages/LoginPage';
import { NavBar } from './components/NavBar';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/authStore';
import { ErrorBoundary } from './components/ErrorBoundary';

// Clear any corrupt persisted state that could cause a blank screen
try {
  const raw = localStorage.getItem('auth-storage');
  if (raw) JSON.parse(raw); // will throw if corrupt
} catch {
  localStorage.removeItem('auth-storage');
}

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { token, user } = useAuthStore();
  
  if (!token) return <Navigate to="/login" replace />;
  
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const NavBarWrapper = () => {
  const location = useLocation();
  if (location.pathname === '/login') return null;
  return <NavBar />;
};

const App = () => {
  const { token, user } = useAuthStore();

  const getRedirectPath = () => {
    if (!token || !user) return "/login";
    const routes: Record<string, string> = {
      'patient': '/patient',
      'doctor': '/doctor',
      'hospital_admin': '/hospital',
      'super_admin': '/admin'
    };
    return routes[user.role] || "/login";
  };

  return (
    <Router>
      <div className="min-h-screen bg-parchment font-body text-ink grain-overlay">
        <NavBarWrapper />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/patient" element={
            <ProtectedRoute allowedRoles={['patient', 'super_admin']}>
              <ErrorBoundary><PatientPortal /></ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/doctor" element={
            <ProtectedRoute allowedRoles={['doctor', 'super_admin']}>
              <ErrorBoundary><DoctorPortal /></ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/hospital" element={
            <ProtectedRoute allowedRoles={['hospital_admin', 'super_admin']}>
              <ErrorBoundary><HospitalDashboard /></ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <ErrorBoundary><AdminConsole /></ErrorBoundary>
            </ProtectedRoute>
          } />

          <Route path="/" element={<Navigate to={getRedirectPath()} replace />} />
          <Route path="*" element={<Navigate to={getRedirectPath()} replace />} />
        </Routes>
        <Toaster position="top-right" expand={false} richColors />
      </div>
    </Router>
  );
};

export default App;
