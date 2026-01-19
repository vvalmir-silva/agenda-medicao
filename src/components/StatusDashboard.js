import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaClock, FaList } from 'react-icons/fa';
import { apiService } from '../services/api';

const StatusDashboard = ({ user, onLogout }) => {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('todos');

  useEffect(() => {
    fetchAgendamentos();
  }, []);

  const fetchAgendamentos = async () => {
    try {
      const data = await apiService.getAgendamentos();
      setAgendamentos(data);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStats = () => {
    const stats = {
      pendente: agendamentos.filter(a => a.status === 'pendente').length,
      confirmado: agendamentos.filter(a => a.status === 'confirmado').length,
      cancelado: agendamentos.filter(a => a.status === 'cancelado').length,
      concluido: agendamentos.filter(a => a.status === 'concluido').length,
      agendar: agendamentos.filter(a => a.status === 'agendar').length,
      total: agendamentos.length
    };
    return stats;
  };

  const getFilteredAgendamentos = () => {
    if (activeTab === 'todos') return agendamentos;
    return agendamentos.filter(a => a.status === activeTab);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pendente': return 'bg-yellow-600/20 text-yellow-300 border-yellow-600/30';
      case 'confirmado': return 'bg-green-600/20 text-green-300 border-green-600/30';
      case 'cancelado': return 'bg-red-600/20 text-red-300 border-red-600/30';
      case 'concluido': return 'bg-blue-600/20 text-blue-300 border-blue-600/30';
      case 'agendar': return 'bg-purple-600/20 text-purple-300 border-purple-600/30';
      default: return 'bg-gray-600/20 text-gray-300 border-gray-600/30';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pendente': return <FaClock className="text-yellow-300" />;
      case 'confirmado': return <FaCheckCircle className="text-green-300" />;
      case 'cancelado': return <FaTimesCircle className="text-red-300" />;
      case 'concluido': return <FaCheckCircle className="text-blue-300" />;
      case 'agendar': return <FaCalendarAlt className="text-purple-300" />;
      default: return <FaList className="text-gray-300" />;
    }
  };

  const stats = getStatusStats();

  const statusTabs = [
    { id: 'todos', label: 'Todos', count: stats.total, color: 'bg-slate-600' },
    { id: 'pendente', label: 'Pendentes', count: stats.pendente, color: 'bg-yellow-600' },
    { id: 'confirmado', label: 'Confirmados', count: stats.confirmado, color: 'bg-green-600' },
    { id: 'cancelado', label: 'Cancelados', count: stats.cancelado, color: 'bg-red-600' },
    { id: 'concluido', label: 'Concluídos', count: stats.concluido, color: 'bg-blue-600' },
    { id: 'agendar', label: 'Agendar', count: stats.agendar, color: 'bg-purple-600' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                <FaCalendarAlt className="text-white text-xl" />
              </div>
              <h1 className="text-xl font-bold text-white">Dashboard de Agendamentos</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-white text-sm font-medium">{user.email}</p>
                <p className="text-slate-400 text-xs">
                  {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                </p>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Total</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-slate-600 rounded-lg flex items-center justify-center">
                <FaList className="text-white text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Pendentes</p>
                <p className="text-3xl font-bold text-yellow-400">{stats.pendente}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center">
                <FaClock className="text-white text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Confirmados</p>
                <p className="text-3xl font-bold text-green-400">{stats.confirmado}</p>
              </div>
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                <FaCheckCircle className="text-white text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Cancelados</p>
                <p className="text-3xl font-bold text-red-400">{stats.cancelado}</p>
              </div>
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                <FaTimesCircle className="text-white text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">Concluídos</p>
                <p className="text-3xl font-bold text-blue-400">{stats.concluido}</p>
              </div>
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <FaCheckCircle className="text-white text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-8">
          <div className="flex flex-wrap gap-2">
            {statusTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  activeTab === tab.id
                    ? `${tab.color} text-white`
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                {tab.label}
                <span className="ml-2 px-2 py-1 bg-white/20 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Agendamentos List */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              <p className="text-slate-300 mt-4">Carregando agendamentos...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Loja
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {getFilteredAgendamentos().map((agendamento) => (
                    <tr key={agendamento.id} className="hover:bg-white/5">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center mr-3">
                            <FaCalendarAlt className="text-blue-300 text-sm" />
                          </div>
                          <div className="text-sm font-medium text-white">{agendamento.nomeCliente}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {agendamento.loja}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {agendamento.data ? new Date(agendamento.data).toLocaleDateString('pt-BR') : 'Sem data'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(agendamento.status)}
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(agendamento.status)}`}>
                            {agendamento.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {getFilteredAgendamentos().length === 0 && !loading && (
                <div className="p-8 text-center text-slate-300">
                  Nenhum agendamento encontrado para o status "{activeTab}"
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StatusDashboard;
