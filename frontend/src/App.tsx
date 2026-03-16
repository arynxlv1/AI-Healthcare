import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PatientPortal } from './pages/PatientPortal';
import { DoctorPortal } from './pages/DoctorPortal';
import { HospitalDashboard } from './pages/HospitalDashboard';
import { AdminConsole } from './pages/AdminConsole';
import { Toaster } from 'sonner';

const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-background font-sans antialiased selection:bg-primary/20">
        <Routes>
          <Route path="/patient" element={<PatientPortal />} />
          <Route path="/doctor" element={<DoctorPortal />} />
          <Route path="/hospital" element={<HospitalDashboard />} />
          <Route path="/admin" element={<AdminConsole />} />
          <Route path="/" element={<Navigate to="/patient" replace />} />
        </Routes>
        <Toaster position="top-right" expand={false} richColors />
      </div>
    </Router>
  );
};

export default App;
