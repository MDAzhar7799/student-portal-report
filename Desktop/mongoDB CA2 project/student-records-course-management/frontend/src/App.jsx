// =============================================================
// App.jsx — Main Application Router & Protected Routes
// Technology: React.js + React Router v6 + JWT Authentication
// =============================================================

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CGPACalculator from './pages/CGPACalculator';
import MCQPractice from './pages/MCQPractice';

// Protected Route Component: ensures user is authenticated with a JWT token
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* 1. Page 1: Upload Dataset & View Results */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* 2. Page 2: CGPA & TCPA Calculator */}
        <Route
          path="/cgpa-calculator"
          element={
            <ProtectedRoute>
              <CGPACalculator />
            </ProtectedRoute>
          }
        />

        {/* 3. Page 3: OMR Exam Practice Sheet */}
        <Route
          path="/mcq-practice"
          element={
            <ProtectedRoute>
              <MCQPractice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/omr"
          element={
            <ProtectedRoute>
              <MCQPractice />
            </ProtectedRoute>
          }
        />

        {/* Redirect /ocr and old routes directly to /dashboard */}
        <Route path="/ocr" element={<Navigate to="/dashboard" replace />} />
        <Route path="/students" element={<Navigate to="/dashboard" replace />} />
        <Route path="/courses" element={<Navigate to="/dashboard" replace />} />
        <Route path="/enrollments" element={<Navigate to="/dashboard" replace />} />
        <Route path="/results" element={<Navigate to="/dashboard" replace />} />
        <Route path="/analytics" element={<Navigate to="/dashboard" replace />} />

        {/* Fallback Redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
