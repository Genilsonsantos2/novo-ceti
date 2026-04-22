import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ScannerPage } from './pages/ScannerPage';
import { StudentCardPage } from './pages/StudentCardPage';
import { StudentsPage } from './pages/StudentsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { PrintCardsPage } from './pages/PrintCardsPage';
import { AdminLayout } from './components/AdminLayout';
import { ExitReportPage } from './pages/ExitReportPage';
import { LunchReportPage } from './pages/LunchReportPage';
import { AuthorizationTermPage } from './pages/AuthorizationTermPage';
import { ProvisionalExitReportPage } from './pages/ProvisionalExitReportPage';

const ProtectedRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles?: string[] }) => {
// ...
          <Route path="/provisional-report" element={
            <ProtectedRoute allowedRoles={['DIRETOR', 'PORTEIRO']}>
              <ProvisionalExitReportPage />
            </ProtectedRoute>
          } />
  const { user, profile, loading } = useAuth();

  if (loading) return <div>Carregando...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

function AppRoutes() {
  const { user, profile } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
      
      {/* Independent full-screen routes */}
      <Route path="/print-cards" element={
        <ProtectedRoute allowedRoles={['DIRETOR']}>
          <PrintCardsPage />
        </ProtectedRoute>
      } />

      {/* Protected routes wrapped in AdminLayout */}
      <Route element={<AdminLayout />}>
        <Route path="/" element={
          <ProtectedRoute>
            {profile?.role === 'DIRETOR' ? <DashboardPage /> : 
             profile?.role === 'PORTEIRO' ? <ScannerPage /> : 
             <StudentCardPage />}
          </ProtectedRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['DIRETOR']}>
            <DashboardPage />
          </ProtectedRoute>
        } />

        <Route path="/scanner" element={
          <ProtectedRoute allowedRoles={['DIRETOR', 'PORTEIRO']}>
            <ScannerPage />
          </ProtectedRoute>
        } />

        <Route path="/id" element={
          <ProtectedRoute>
            <StudentCardPage />
          </ProtectedRoute>
        } />
        
        <Route path="/id/:studentId" element={
          <ProtectedRoute>
            <StudentCardPage />
          </ProtectedRoute>
        } />

        <Route path="/students" element={
          <ProtectedRoute allowedRoles={['DIRETOR']}>
            <StudentsPage />
          </ProtectedRoute>
        } />

        <Route path="/admin/users" element={
          <ProtectedRoute allowedRoles={['DIRETOR']}>
            <AdminUsersPage />
          </ProtectedRoute>
        } />

        <Route path="/exit-report" element={
          <ProtectedRoute allowedRoles={['DIRETOR', 'PORTEIRO']}>
            <ExitReportPage />
          </ProtectedRoute>
        } />

        <Route path="/lunch-report" element={
          <ProtectedRoute allowedRoles={['DIRETOR', 'PORTEIRO']}>
            <LunchReportPage />
          </ProtectedRoute>
        } />

        <Route path="/auth-term/:studentId" element={
          <ProtectedRoute allowedRoles={['DIRETOR']}>
            <AuthorizationTermPage />
          </ProtectedRoute>
        } />

        <Route path="/provisional-report" element={
          <ProtectedRoute allowedRoles={['DIRETOR', 'PORTEIRO']}>
            <ProvisionalExitReportPage />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen font-body selection:bg-primary/20">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
