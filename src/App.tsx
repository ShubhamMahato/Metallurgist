import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import NoPermission from './components/NoPermission';

type Screen = 'login' | 'register' | 'dashboard' | 'no-permission';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  return (
    <div className="min-h-screen bg-background">
      {currentScreen === 'login' && (
        <Login 
          onLogin={() => navigateTo('dashboard')} 
          onNavigateToRegister={() => navigateTo('register')} 
        />
      )}
      
      {currentScreen === 'register' && (
        <Register 
          onRegister={() => navigateTo('login')} 
          onNavigateToLogin={() => navigateTo('login')} 
        />
      )}
      
      {currentScreen === 'dashboard' && (
        <div className="relative">
          <Dashboard />
          {/* Hidden trigger for No Permission screen for demo purposes */}
          <button 
            onClick={() => navigateTo('no-permission')}
            className="fixed bottom-4 right-4 p-2 bg-slate-800 text-white rounded-full opacity-0 hover:opacity-50 transition-opacity"
            title="Simulate Permission Error"
          >
            !
          </button>
        </div>
      )}
      
      {currentScreen === 'no-permission' && (
        <NoPermission onBack={() => navigateTo('dashboard')} />
      )}
    </div>
  );
}
