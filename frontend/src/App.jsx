import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login, Signup } from './components/Auth';
import { Layout } from './components/Layout';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import './App.css';

const AppContent = () => {
  const { user } = useAuth();
  const [authPage, setAuthPage] = useState('login');

  if (!user) {
    return (
      <div className="auth-page">
        {authPage === 'login' ? (
          <Login onSwitch={() => setAuthPage('signup')} />
        ) : (
          <Signup onSwitch={() => setAuthPage('login')} />
        )}
      </div>
    );
  }

  return (
    <Layout>
      {user.role === 'Admin' ? <AdminDashboard /> : <EmployeeDashboard />}
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
