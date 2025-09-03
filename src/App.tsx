import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/common/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/auth/Login';
import AdminDashboard from './components/dashboards/AdminDashboard';
import ManagerDashboard from './components/dashboards/ManagerDashboard';
import BillerDashboard from './components/dashboards/BillerDashboard';
import StockReconcilerDashboard from './components/dashboards/StockReconcilerDashboard';
import POSScreen from './components/pos/POSScreen';
import ProductManagement from './components/products/ProductManagement';
import ProductForm from './components/products/ProductForm';
import InventoryManagement from './components/inventory/InventoryManagement';
import ReportsPage from './components/reports/ReportsPage';
import UsersManagement from './components/users/UsersManagement';
import UserForm from './components/users/UserForm';

import './App.css';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/manager" element={
              <ProtectedRoute requiredRole={['admin', 'manager']}>
                <ManagerDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/biller" element={
              <ProtectedRoute requiredRole={['admin', 'manager', 'biller']}>
                <BillerDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/stock-reconciler" element={
              <ProtectedRoute requiredRole={['admin', 'manager', 'stock_reconciler']}>
                <StockReconcilerDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/pos" element={
              <ProtectedRoute requiredRole={['admin', 'manager', 'biller']}>
                <POSScreen />
              </ProtectedRoute>
            } />
            
            <Route path="/products" element={
              <ProtectedRoute requiredRole={['admin', 'manager']}>
                <ProductManagement />
              </ProtectedRoute>
            } />

            <Route path="/products/new" element={
              <ProtectedRoute requiredRole={['admin', 'manager']}>
                <ProductForm />
              </ProtectedRoute>
            } />

            <Route path="/products/edit/:id" element={
              <ProtectedRoute requiredRole={['admin', 'manager']}>
                <ProductForm />
              </ProtectedRoute>
            } />
            
            <Route path="/inventory" element={
              <ProtectedRoute requiredRole={['admin', 'manager']}>
                <InventoryManagement />
              </ProtectedRoute>
            } />
            
            <Route path="/reports" element={
              <ProtectedRoute requiredRole={['admin', 'manager']}>
                <ReportsPage />
              </ProtectedRoute>
            } />
            
            <Route path="/users" element={
              <ProtectedRoute requiredRole="admin">
                <UsersManagement />
              </ProtectedRoute>
            } />

            <Route path="/users/new" element={
              <ProtectedRoute requiredRole="admin">
                <UserForm />
              </ProtectedRoute>
            } />

            <Route path="/users/edit/:id" element={
              <ProtectedRoute requiredRole="admin">
                <UserForm />
              </ProtectedRoute>
            } />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
    </ToastProvider>
  );
}

export default App;
