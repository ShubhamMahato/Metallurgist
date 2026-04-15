import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import Dashboard from './components/Dashboard';
import IntakePage from './pages/IntakePage';
import Login from './components/Login';
import Register from './components/Register';
import NoPermission from './components/NoPermission';

export default function App() {
  return (
    <Provider store={store}>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/intake" element={<IntakePage />} />
            <Route path="/login" element={<Login onLogin={() => {}} onNavigateToRegister={() => {}} />} />
            <Route path="/register" element={<Register onRegister={() => {}} onNavigateToLogin={() => {}} />} />
            <Route path="/no-permission" element={<NoPermission onBack={() => {}} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </Provider>
  );
}
