import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import CollectorRoute from './pages/CollectorRoute';
import Customers from './pages/Customers';
import LoansPage from './pages/LoansPage';
import RoutesPage from './pages/RoutesPage';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleGuard } from './components/RoleGuard';

function App() {
  return (
    <DataProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route 
                index 
                element={
                  <RoleGuard allowedRoles={['ADMIN']}>
                    <Dashboard />
                  </RoleGuard>
                } 
              />

              <Route path="field-route" element={<CollectorRoute />} />
              <Route path="customers" element={<Customers />} />
              <Route path="loans" element={<LoansPage />} />

              <Route 
                path="routes" 
                element={
                  <RoleGuard allowedRoles={['ADMIN']}>
                    <RoutesPage />
                  </RoleGuard>
                } 
              />
              <Route 
                path="users" 
                element={
                  <RoleGuard allowedRoles={['ADMIN']}>
                    <UsersPage />
                  </RoleGuard>
                } 
              />
              <Route 
                path="reports" 
                element={
                  <RoleGuard allowedRoles={['ADMIN']}>
                    <ReportsPage />
                  </RoleGuard>
                } 
              />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </DataProvider>
  );
}

export default App;
