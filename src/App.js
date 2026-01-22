import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { authService } from './services/auth';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AgendamentosPendentes from './components/AgendamentosPendentes';
import FormularioAgendamento from './components/FormularioAgendamento';
import ListaAgendamentos from './components/ListaAgendamentos';
import StatusDashboard from './components/StatusDashboard';
import Admin from './components/Admin';
import Navbar from './components/Navbar';

// Componente wrapper para sincronizar currentView com a rota
const AppContent = ({ user, onLogout, onLogin }) => {
  const location = useLocation();
  const [currentView, setCurrentView] = useState('dashboard');

  useEffect(() => {
    // Extrair a rota atual do hash
    const hashPath = location.hash.replace('#', '') || '/';
    const path = hashPath === '/' ? 'dashboard' : hashPath.replace('/', '');
    setCurrentView(path);
  }, [location]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
      <Navbar user={user} onLogout={onLogout} currentView={currentView} />
      <div className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/dashboard" element={<Dashboard user={user} />} />
          <Route path="/pendentes" element={<AgendamentosPendentes user={user} />} />
          <Route path="/formulario" element={<FormularioAgendamento user={user} />} />
          <Route path="/lista" element={<ListaAgendamentos user={user} />} />
          <Route path="/status" element={<StatusDashboard user={user} onLogout={onLogout} />} />
          <Route 
            path="/admin" 
            element={
              user.role === 'admin' ? 
              <Admin user={user} onLogout={onLogout} /> : 
              <Navigate to="/" replace />
            } 
          />
        </Routes>
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
        }
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const handleLogin = async (username, password) => {
    try {
      const result = await authService.login(username, password);
      if (result && result.user) {
        setUser(result.user);
      }
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
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

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
          } 
        />
        
        <Route 
          path="/*" 
          element={
            user ? <AppContent user={user} onLogout={handleLogout} onLogin={handleLogin} /> : <Navigate to="/login" replace />
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
