import React, { useState, useEffect } from 'react';
import { authService } from './services/auth';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AgendamentosPendentes from './components/AgendamentosPendentes';
import FormularioAgendamento from './components/FormularioAgendamento';
import ListaAgendamentos from './components/ListaAgendamentos';
import StatusDashboard from './components/StatusDashboard';
import Admin from './components/Admin';
import Navbar from './components/Navbar';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [formularioData, setFormularioData] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Primeiro verificar se há token
        if (!authService.isAuthenticated()) {
          setUser(null);
          setLoading(false);
          return;
        }

        // Se há token, tentar obter dados do usuário
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        } else {
          // Token inválido, limpar
          authService.logout();
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    // Listener para mudanças no localStorage
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'user') {
        if (!authService.isAuthenticated()) {
          setUser(null);
        } else {
          const currentUser = authService.getCurrentUser();
          setUser(currentUser);
        }
      }
    };

    initAuth();
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleLogin = async (email, password) => {
    try {
      const result = await authService.login(email, password);
      setUser(result.user);
      return result;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setCurrentView('dashboard');
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  const handleNavigateToFormulario = (data) => {
    setFormularioData(data);
    setCurrentView('formulario');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
          <p className="text-white mt-4">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
      <Navbar 
        user={user} 
        currentView={currentView}
        onViewChange={handleViewChange}
        onLogout={handleLogout}
      />
      
      {currentView === 'dashboard' && (
        <Dashboard 
          user={user} 
          onLogout={handleLogout}
          onNavigateToAgendamentos={() => setCurrentView('pendentes')}
        />
      )}
      
      {currentView === 'formulario' && (
        <FormularioAgendamento 
          user={user}
          initialData={formularioData}
          onAgendamentoCreated={() => {
            setCurrentView('lista');
            setFormularioData(null);
          }}
        />
      )}
      
      {currentView === 'pendentes' && (
        <AgendamentosPendentes 
          user={user}
          onNavigateToFormulario={handleNavigateToFormulario}
        />
      )}
      
      {currentView === 'lista' && (
        <ListaAgendamentos 
          user={user}
        />
      )}
      
      {currentView === 'status' && (
        <StatusDashboard 
          user={user} 
          onLogout={handleLogout}
        />
      )}
      
      {currentView === 'admin' && user?.role === 'admin' && (
        <Admin 
          user={user} 
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
