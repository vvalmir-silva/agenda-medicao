import React, { useState, useEffect } from 'react';
import { FaSignOutAlt } from 'react-icons/fa';
import { authService } from '../services/auth';

const Dashboard = ({ user, onLogout, onNavigateToAgendamentos }) => {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    console.log('Dashboard user:', user);
    console.log('Is authenticated:', authService.isAuthenticated());
    console.log('Token exists:', !!authService.getToken());
  }, [user]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Bom dia');
    } else if (hour < 18) {
      setGreeting('Boa tarde');
    } else {
      setGreeting('Boa noite');
    }
  }, []);

  return (
    <div className="min-h-screen">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
          <h2 className="text-3xl font-bold text-white mb-2">
            {greeting}, {user.email}!
          </h2>
          <p className="text-slate-300 text-lg">
            Seja bem-vindo ao Sistema de Agendamento Profissional
          </p>
          <div className="mt-4 flex items-center space-x-2">
            <span className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-sm">
              Status: Online
            </span>
            <span className="bg-green-600/20 text-green-300 px-3 py-1 rounded-full text-sm">
              Sistema Ativo
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        {/* Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h4 className="text-white font-semibold mb-2">Total de Agendamentos</h4>
            <p className="text-3xl font-bold text-blue-400">0</p>
            <p className="text-slate-400 text-sm mt-1">Este mês</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h4 className="text-white font-semibold mb-2">Próximo Agendamento</h4>
            <p className="text-xl font-bold text-green-400">Nenhum</p>
            <p className="text-slate-400 text-sm mt-1">Agende uma consulta</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
