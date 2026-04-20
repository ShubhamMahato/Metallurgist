import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { LanguageProvider } from './lib/LanguageContext';
import { useGetCurrentUserQuery } from './store/apiSlice';
import DashboardPage from './pages/DashboardPage';
import IntakePage from './pages/IntakePage';
import PublicReportPage from './pages/PublicReportPage';
import Login from './components/Login';
import Register from './components/Register';
import NoPermission from './components/NoPermission';

// Separate component for auth guard to use hooks
const AuthGuard = ({ children, onLogout }: { children: React.ReactNode, onLogout: () => void }) => {
  const savedUser = localStorage.getItem('user');
  const { data: serverUser, error, isLoading } = useGetCurrentUserQuery(undefined, {
    skip: !savedUser,
  });

  useEffect(() => {
    if (error) {
      const status = (error as any)?.status;
      if (status === 401 || status === 403) {
        onLogout();
      }
    }
  }, [error, onLogout]);

  useEffect(() => {
    if (serverUser && !serverUser.isApproved) {
      onLogout();
    }
  }, [serverUser, onLogout]);

  if (savedUser && isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-primary font-bold uppercase tracking-widest text-[10px]">Validating Permissions...</div>;
  }

  return <>{children}</>;
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-primary font-bold">Initializing System...</div>;
  }

  return (
    <Provider store={store}>
      <LanguageProvider>
        <Router>
          <AuthGuard onLogout={handleLogout}>
            <div className="min-h-screen bg-background">
              <Routes>
                {/* Public Routes First - NO VALIDATION HERE as per user request */}
                <Route path="/intake" element={<IntakePage />} />
                <Route path="/report/:id" element={<PublicReportPage />} />
                
                {/* Protected Root */}
                <Route 
                  path="/" 
                  element={user ? <DashboardPage onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
                />
                
                {/* Auth Routes */}
                <Route 
                  path="/login" 
                  element={!user ? <Login onLogin={handleLogin} onNavigateToRegister={() => window.location.href = '/register'} /> : <Navigate to="/" replace />} 
                />
                <Route 
                  path="/register" 
                  element={!user ? <Register onRegister={handleLogin} onNavigateToLogin={() => window.location.href = '/login'} /> : <Navigate to="/" replace />} 
                />
                
                {/* Support Routes */}
                <Route path="/no-permission" element={<NoPermission onBack={() => {}} />} />
                
                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </AuthGuard>
        </Router>
      </LanguageProvider>
    </Provider>
  );
}
