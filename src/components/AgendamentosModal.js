import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaTimes, FaPlus, FaSearch, FaFilter, FaStore, FaUser } from 'react-icons/fa';
import { apiService } from '../services/api';

const AgendamentosModal = ({ user, onClose }) => {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLoja, setFilterLoja] = useState('');
  const [formData, setFormData] = useState({
    nomeCliente: '',
    loja: '',
    status: 'pendente'
  });
  const [message, setMessage] = useState('');

  const lojas = [
    "Diana D1", "Diana D2", "Diana D3", "Diana D4",
    "Marquise Planejados", "By Estilo", "Anfelle", 
    "Planejados", "Rassul Planejados", "Miralli Móveis", "Outros"
  ];

  const statusOptions = [
    { value: 'pendente', label: 'Pendente' },
    { value: 'confirmado', label: 'Confirmado' },
    { value: 'cancelado', label: 'Cancelado' },
    { value: 'concluido', label: 'Concluído' },
    { value: 'agendar', label: 'Agendar' }
  ];

  useEffect(() => {
    fetchAgendamentos();
  }, []);

  const fetchAgendamentos = async () => {
    try {
      const data = await apiService.getAgendamentos();
      setAgendamentos(data);
    } catch (error) {
      setMessage(error.message || 'Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgendamento = async (e) => {
    e.preventDefault();
    
    try {
      const data = await apiService.createAgendamento(formData);
      setMessage(data.message);
      setFormData({ nomeCliente: '', loja: '', status: 'pendente' });
      setShowCreateForm(false);
      fetchAgendamentos(); // Atualizar lista
    } catch (error) {
      setMessage(error.message || 'Erro ao criar agendamento');
    }
  };

  const handleUpdateStatus = async (agendamentoId, newStatus) => {
    try {
      await apiService.updateAgendamento(agendamentoId, { status: newStatus });
      setMessage('Status atualizado com sucesso');
      fetchAgendamentos(); // Atualizar lista
    } catch (error) {
      setMessage(error.message || 'Erro ao atualizar status');
    }
  };

  const filteredAgendamentos = agendamentos.filter(agendamento => {
    const matchSearch = agendamento.nomeCliente.toLowerCase().includes(searchTerm.toLowerCase());
    const matchLoja = !filterLoja || agendamento.loja === filterLoja;
    const matchStatus = agendamento.status === 'pendente'; // Apenas pendentes
    return matchSearch && matchLoja && matchStatus;
  });

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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-white/20">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg border-b border-white/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                <FaCalendarAlt className="text-white text-xl" />
              </div>
              <h1 className="text-xl font-bold text-white">Agendamentos Pendentes</h1>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-slate-300 transition-colors duration-200"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.includes('sucesso') ? 'bg-green-600/20 text-green-300 border border-green-600/30' : 
              'bg-red-600/20 text-red-300 border border-red-600/30'
            }`}>
              {message}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors duration-200"
            >
              <FaPlus />
              <span>Novo Agendamento</span>
            </button>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaStore className="text-slate-400" />
                </div>
                <select
                  value={filterLoja}
                  onChange={(e) => setFilterLoja(e.target.value)}
                  className="w-full sm:w-48 pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent appearance-none"
                  style={{
                    backgroundColor: '#1e293b',
                    borderColor: '#475569',
                    color: '#ffffff'
                  }}
                >
                  <option value="" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>Todas as lojas</option>
                  {lojas.map(loja => (
                    <option key={loja} value={loja} style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>{loja}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Criar Novo Agendamento</h3>
              <form onSubmit={handleCreateAgendamento} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Nome do Cliente
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaUser className="text-slate-400" />
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.nomeCliente}
                        onChange={(e) => setFormData({...formData, nomeCliente: e.target.value})}
                        className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        placeholder="Nome completo"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Loja
                    </label>
                    <select
                      required
                      value={formData.loja}
                      onChange={(e) => setFormData({...formData, loja: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      style={{
                        backgroundColor: '#1e293b',
                        borderColor: '#475569',
                        color: '#ffffff'
                      }}
                    >
                      <option value="" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>Selecione a loja</option>
                      {lojas.map(loja => (
                        <option key={loja} value={loja} style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>{loja}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      style={{
                        backgroundColor: '#1e293b',
                        borderColor: '#475569',
                        color: '#ffffff'
                      }}
                    >
                      {statusOptions.map(status => (
                        <option key={status.value} value={status.value} style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                  >
                    Criar Agendamento
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

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
                    {filteredAgendamentos.map((agendamento) => (
                      <tr key={agendamento.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center mr-3">
                              <FaUser className="text-blue-300 text-sm" />
                            </div>
                            <div className="text-sm font-medium text-white">{agendamento.nomeCliente}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FaStore className="text-slate-400 mr-2" />
                            <span className="text-sm text-slate-300">{agendamento.loja}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          {agendamento.data ? new Date(agendamento.data).toLocaleDateString('pt-BR') : 'Sem data'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(agendamento.status)}`}>
                            {agendamento.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredAgendamentos.length === 0 && !loading && (
                  <div className="p-8 text-center text-slate-300">
                    Nenhum agendamento encontrado
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgendamentosModal;
