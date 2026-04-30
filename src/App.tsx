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
import { PrintTermsPage } from './pages/PrintTermsPage';
import { DailyAccessReportPage } from './pages/DailyAccessReportPage';
import { DevolutivaPage } from './pages/DevolutivaPage';

const ProtectedRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles?: string[] }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-transparent"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <Navigate to="/login" />;
  
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" />;
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
        <ProtectedRoute allowedRoles={['ADM', 'DIRETOR']}>
          <PrintCardsPage />
        </ProtectedRoute>
      } />
      
      <Route path="/print-terms" element={
        <ProtectedRoute allowedRoles={['ADM', 'DIRETOR']}>
          <PrintTermsPage />
        </ProtectedRoute>
      } />

      {/* Protected routes wrapped in AdminLayout */}
      <Route element={<AdminLayout />}>
        <Route path="/" element={
          <ProtectedRoute>
            {profile?.role === 'ADM' || profile?.role === 'DIRETOR' ? <DashboardPage /> : 
             profile?.role === 'PORTEIRO' ? <ScannerPage /> : 
             <StudentCardPage />}
          </ProtectedRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['ADM', 'DIRETOR']}>
            <DashboardPage />
          </ProtectedRoute>
        } />

        <Route path="/scanner" element={
          <ProtectedRoute allowedRoles={['ADM', 'DIRETOR', 'PORTEIRO']}>
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
          <ProtectedRoute allowedRoles={['ADM', 'DIRETOR']}>
            <StudentsPage />
          </ProtectedRoute>
        } />

        <Route path="/admin/users" element={
          <ProtectedRoute allowedRoles={['ADM', 'DIRETOR']}>
            <AdminUsersPage />
          </ProtectedRoute>
        } />

        <Route path="/exit-report" element={
          <ProtectedRoute allowedRoles={['ADM', 'DIRETOR', 'PORTEIRO']}>
            <ExitReportPage />
          </ProtectedRoute>
        } />

        <Route path="/lunch-report" element={
          <ProtectedRoute allowedRoles={['ADM', 'DIRETOR', 'PORTEIRO']}>
            <LunchReportPage />
          </ProtectedRoute>
        } />

        <Route path="/auth-term/:studentId" element={
          <ProtectedRoute allowedRoles={['ADM', 'DIRETOR']}>
            <AuthorizationTermPage />
          </ProtectedRoute>
        } />

        <Route path="/provisional-report" element={
          <ProtectedRoute allowedRoles={['ADM', 'DIRETOR', 'PORTEIRO']}>
            <ProvisionalExitReportPage />
          </ProtectedRoute>
        } />
        
        <Route path="/daily-access-report" element={
          <ProtectedRoute allowedRoles={['ADM', 'DIRETOR', 'PORTEIRO']}>
            <DailyAccessReportPage />
          </ProtectedRoute>
        } />

        <Route path="/devolutiva" element={
          <ProtectedRoute allowedRoles={['ADM', 'DIRETOR']}>
            <DevolutivaPage />
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
