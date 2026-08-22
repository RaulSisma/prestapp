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
import ExpensesPage from './pages/ExpensesPage';
import CompanySettingsPage from './pages/CompanySettingsPage';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleGuard } from './components/RoleGuard';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
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
                    <RoleGuard requiredPermission="view_dashboard">
                      <Dashboard />
                    </RoleGuard>
                  } 
                />

                <Route 
                  path="field-route" 
                  element={
                    <RoleGuard requiredPermission="view_field_route">
                      <CollectorRoute />
                    </RoleGuard>
                  } 
                />
                
                <Route 
                  path="customers" 
                  element={
                    <RoleGuard requiredPermission="view_customers">
                      <Customers />
                    </RoleGuard>
                  } 
                />
                
                <Route 
                  path="loans" 
                  element={
                    <RoleGuard requiredPermission="view_loans">
                      <LoansPage />
                    </RoleGuard>
                  } 
                />

                <Route 
                  path="routes" 
                  element={
                    <RoleGuard requiredPermission="view_routes">
                      <RoutesPage />
                    </RoleGuard>
                  } 
                />
                <Route 
                  path="users" 
                  element={
                    <RoleGuard requiredPermission="view_users">
                      <UsersPage />
                    </RoleGuard>
                  } 
                />
                <Route 
                  path="reports" 
                  element={
                    <RoleGuard requiredPermission="view_reports">
                      <ReportsPage />
                    </RoleGuard>
                  } 
                />
                <Route 
                  path="expenses" 
                  element={
                    <RoleGuard requiredPermission="view_expenses">
                      <ExpensesPage />
                    </RoleGuard>
                  } 
                />
                <Route 
                  path="settings" 
                  element={
                    <RoleGuard requiredPermission="view_company_settings">
                      <CompanySettingsPage />
                    </RoleGuard>
                  } 
                />
              </Route>
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </DataProvider>
    </ErrorBoundary>
  );
}

export default App;
