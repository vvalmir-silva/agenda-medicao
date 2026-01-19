import React, { useState, useEffect } from 'react';
import { FaList, FaSearch, FaTrash, FaDownload, FaEdit, FaEye, FaCalendarAlt, FaStore, FaClock, FaUser, FaExclamationTriangle, FaSave, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import { apiService } from '../services/api';

const ListaAgendamentos = ({ user }) => {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState(null);
  const [cepMessage, setCepMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const [showValidationError, setShowValidationError] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [validationType, setValidationType] = useState('error'); // 'error', 'success', 'info'

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

  const filteredAgendamentos = agendamentos.filter(agendamento => {
    const searchLower = searchTerm.toLowerCase();
    return (
      agendamento.nomeCliente?.toLowerCase().includes(searchLower) ||
      agendamento.loja?.toLowerCase().includes(searchLower) ||
      agendamento.telefone?.toLowerCase().includes(searchLower) ||
      agendamento.email?.toLowerCase().includes(searchLower) ||
      agendamento.status?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredAgendamentos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredAgendamentos.slice(startIndex, endIndex);

  const handleSelectAll = () => {
    if (selectedItems.length === currentItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(currentItems.map(item => item.id));
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    
    if (confirm(`Tem certeza que deseja excluir ${selectedItems.length} agendamento(s)?`)) {
      try {
        await Promise.all(
          selectedItems.map(id => apiService.deleteAgendamento(id))
        );
        setSelectedItems([]);
        fetchAgendamentos();
      } catch (error) {
        console.error('Erro ao excluir agendamentos:', error);
      }
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Nome do Cliente', 'Loja', 'Data', 'Horário', 'Status', 'Telefone', 'Email'],
      ...filteredAgendamentos.map(item => [
        item.nomeCliente || '',
        item.loja || '',
        item.data || '',
        item.hora || '',
        item.status || '',
        item.telefone || '',
        item.email || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agendamentos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleEdit = (agendamento) => {
    setSelectedAgendamento(agendamento);
    setShowEditModal(true);
  };

  const handleView = (agendamento) => {
    setSelectedAgendamento(agendamento);
    setShowViewModal(true);
  };

  const handleUpdateAgendamento = async (updatedData) => {
    try {
      console.log('=== INÍCIO DA ATUALIZAÇÃO ===');
      console.log('ID do agendamento:', selectedAgendamento.id);
      console.log('Dados atualizados:', updatedData);
      
      // Validação rigorosa - apenas observações pode ser nulo
      const camposObrigatorios = [
        'nomeCliente',
        'telefone', 
        'loja',
        'data',
        'hora',
        'status',
        'tipoImovel'
      ];
      
      const camposVazios = camposObrigatorios.filter(campo => 
        !updatedData[campo] || updatedData[campo].trim() === ''
      );
      
      if (camposVazios.length > 0) {
        setValidationMessage(`Os seguintes campos são obrigatórios: ${camposVazios.join(', ')}`);
        setValidationType('error');
        setShowValidationError(true);
        return;
      }
      
      // Validar ambientes
      if (!updatedData.ambientes || updatedData.ambientes.length === 0) {
        setValidationMessage('Selecione pelo menos um ambiente');
        setValidationType('error');
        setShowValidationError(true);
        return;
      }
      
      // Validar endereço
      if (!updatedData.endereco) {
        setValidationMessage('Endereço é obrigatório');
        setValidationType('error');
        setShowValidationError(true);
        return;
      }
      
      if (!updatedData.endereco.cep || updatedData.endereco.cep.trim() === '') {
        setValidationMessage('CEP é obrigatório');
        setValidationType('error');
        setShowValidationError(true);
        return;
      }
      
      if (!updatedData.endereco.numero || updatedData.endereco.numero.trim() === '') {
        setValidationMessage('Número do endereço é obrigatório');
        setValidationType('error');
        setShowValidationError(true);
        return;
      }
      
      // Validar formato do CEP (8 dígitos)
      const cepLimpo = updatedData.endereco.cep.replace(/\D/g, '');
      if (cepLimpo.length !== 8) {
        setValidationMessage('CEP deve ter 8 dígitos');
        setValidationType('error');
        setShowValidationError(true);
        return;
      }
      
      // Preparar dados para envio
      const dataToSend = {
        nomeCliente: updatedData.nomeCliente.trim(),
        telefone: updatedData.telefone.trim(),
        loja: updatedData.loja.trim(),
        data: updatedData.data,
        hora: updatedData.hora,
        status: updatedData.status,
        tipoImovel: updatedData.tipoImovel,
        ambientes: updatedData.ambientes,
        observacoes: updatedData.observacoes || '', // Único campo que pode ser nulo
        endereco: {
          cep: updatedData.endereco.cep.replace(/\D/g, ''), // Apenas números
          logradouro: updatedData.endereco.logradouro || '',
          numero: updatedData.endereco.numero.trim(),
          complemento: updatedData.endereco.complemento || '',
          bairro: updatedData.endereco.bairro || '',
          cidade: updatedData.endereco.cidade || ''
        }
      };

      console.log('Dados formatados para API:', dataToSend);
      
      // Armazenar dados pendentes e mostrar popup de confirmação
      setPendingUpdate({ id: selectedAgendamento.id, data: dataToSend });
      setShowConfirmModal(true);
      
    } catch (error) {
      console.error('=== ERRO NA ATUALIZAÇÃO ===');
      console.error('Erro completo:', error);
      setValidationMessage('Erro ao validar dados. Tente novamente.');
      setValidationType('error');
      setShowValidationError(true);
    }
  };

  const confirmUpdate = async () => {
    try {
      console.log('=== CONFIRMANDO ATUALIZAÇÃO ===');
      console.log('ID específico:', pendingUpdate?.id);
      console.log('É o ObjectID 696d8bccf4fcc12a75e2ab63?', pendingUpdate?.id === '696d8bccf4fcc12a75e2ab63');
      console.log('Dados pendentes:', pendingUpdate?.data);
      
      // Verificar se está cancelando
      const isCanceling = pendingUpdate?.data?.status === 'cancelado';
      console.log('Está cancelando agendamento?', isCanceling);
      
      // Log detalhado dos dados
      console.log('Dados completos para enviar:', JSON.stringify(pendingUpdate?.data, null, 2));
      
      const response = await apiService.updateAgendamento(pendingUpdate.id, pendingUpdate.data);
      console.log('Resposta da API:', response);
      console.log('Status da resposta:', response?.status);
      console.log('Dados retornados:', response?.data);
      
      setShowConfirmModal(false);
      setShowEditModal(false);
      setPendingUpdate(null);
      fetchAgendamentos();
      
      console.log('=== ATUALIZAÇÃO CONCLUÍDA ===');
      
      // Feedback especial para cancelamento
      if (isCanceling) {
        setValidationMessage('Agendamento cancelado com sucesso!');
        setValidationType('success');
        setShowValidationError(true);
      } else {
        console.log('Agendamento atualizado com sucesso!');
      }
    } catch (error) {
      console.error('=== ERRO AO SALVAR ===');
      console.error('Erro completo:', error);
      console.error('Status do erro:', error.response?.status);
      console.error('Mensagem do servidor:', error.response?.data);
      console.error('Stack do erro:', error.stack);
      
      setValidationMessage(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
      setValidationType('error');
      setShowValidationError(true);
    }
  };

  const cancelUpdate = () => {
    setShowConfirmModal(false);
    setPendingUpdate(null);
  };

  const closeValidationError = () => {
    setShowValidationError(false);
    setValidationMessage('');
    setValidationType('error');
  };

  const buscarEndereco = async () => {
    if (!selectedAgendamento.endereco?.cep || selectedAgendamento.endereco.cep.length < 8) {
      setCepMessage('CEP deve ter 8 dígitos');
      setTimeout(() => setCepMessage(''), 3000);
      return;
    }
    
    try {
      const cep = selectedAgendamento.endereco.cep.replace(/\D/g, '');
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setSelectedAgendamento(prev => ({
          ...prev,
          endereco: {
            ...prev.endereco,
            logradouro: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade
          }
        }));
        setCepMessage('CEP encontrado! Endereço preenchido.');
        setTimeout(() => setCepMessage(''), 3000);
      } else {
        setCepMessage('CEP não encontrado');
        setTimeout(() => setCepMessage(''), 3000);
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      setCepMessage('Erro ao buscar CEP');
      setTimeout(() => setCepMessage(''), 3000);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'confirmado': return 'bg-green-100 text-green-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      case 'concluido': return 'bg-blue-100 text-blue-800';
      case 'agendar': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Sem data';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Carregando agendamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 border border-white/20">
          {/* Filtros */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="max-w-md">
              <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">Buscar:</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por nome, endereço, telefone, email, loja..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 pl-10 text-sm border border-slate-600 rounded-lg focus:border-blue-400 focus:ring focus:ring-blue-200 bg-slate-800 text-white placeholder-slate-400"
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
              <FaList className="inline mr-2 sm:mr-3 text-blue-400" />
              <span className="block sm:inline">Agendamentos</span>
            </h2>
          
          {/* Ações em lote */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={handleDeleteSelected}
              disabled={selectedItems.length === 0}
              className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs sm:text-sm font-medium transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaTrash className="mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Excluir Selecionados</span>
              <span className="sm:hidden">Excluir</span>
            </button>
            <button
              onClick={handleExport}
              className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs sm:text-sm font-medium transition-all flex items-center justify-center"
            >
              <FaDownload className="mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </div>

        {/* Controles de seleção */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedItems.length === currentItems.length && currentItems.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="text-sm font-medium text-gray-700">
              Selecionar todos ({selectedItems.length})
            </label>
          </div>
          <div className="text-xs sm:text-sm text-gray-600">
            Mostrando {startIndex + 1} a {Math.min(endIndex, filteredAgendamentos.length)} de {filteredAgendamentos.length} agendamentos
          </div>
        </div>

        {/* Tabela responsiva */}
        <div className="overflow-x-auto -mx-2 sm:-mx-4">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider hidden sm:table-cell">
                      Loja
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider hidden md:table-cell">
                      Data
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider hidden lg:table-cell">
                      Endereço
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider hidden lg:table-cell">
                      Loja
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredAgendamentos.map((agendamento) => (
                    <tr key={agendamento.id} className="hover:bg-white/5">
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600/20 rounded-full flex items-center justify-center mr-2 sm:mr-3">
                            <FaUser className="text-blue-300 text-xs sm:text-sm" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs sm:text-sm font-medium text-white truncate">{agendamento.nomeCliente}</div>
                            <div className="text-xs text-gray-400 truncate">{agendamento.telefone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden sm:table-cell">
                        <div className="flex items-center">
                          <FaStore className="text-gray-400 mr-1 sm:mr-2 text-xs" />
                          <span className="text-xs sm:text-sm text-gray-300 truncate">{agendamento.loja}</span>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden md:table-cell">
                        <div className="text-xs sm:text-sm text-gray-300">
                          <div className="flex items-center">
                            <FaCalendarAlt className="mr-1 text-gray-400 text-xs" />
                            {formatDate(agendamento.data)}
                          </div>
                          {agendamento.hora && (
                            <div className="flex items-center mt-1">
                              <FaClock className="mr-1 text-gray-400 text-xs" />
                              {agendamento.hora}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden lg:table-cell">
                        <div className="text-xs sm:text-sm text-gray-300">
                          <div className="truncate">{agendamento.endereco?.logradouro}, {agendamento.endereco?.numero}</div>
                          <div className="text-xs text-gray-400 truncate">{agendamento.endereco?.bairro} - {agendamento.endereco?.cidade}</div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden lg:table-cell">
                        <div className="flex items-center">
                          <FaStore className="text-gray-400 mr-1 sm:mr-2 text-xs" />
                          <span className="text-xs sm:text-sm text-gray-300 truncate">{agendamento.loja}</span>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                        <span className={`inline-flex px-1 sm:px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(agendamento.status)}`}>
                          {agendamento.status}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-center">
                        <div className="flex justify-center space-x-1">
                          <button
                            onClick={() => handleView(agendamento)}
                            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                            title="Visualizar"
                          >
                            <FaEye className="text-xs sm:text-sm" />
                          </button>
                          <button
                            onClick={() => handleEdit(agendamento)}
                            className="p-1 text-green-600 hover:text-green-800 transition-colors"
                            title="Editar"
                          >
                            <FaEdit className="text-xs sm:text-sm" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Paginação */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
          <div className="text-xs sm:text-sm text-gray-600">
            Página {currentPage} de {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-xs sm:text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaCalendarAlt className="inline mr-1" />
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-xs sm:text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próxima
              <FaCalendarAlt className="inline ml-1" />
            </button>
          </div>
        </div>

        {/* Mensagem quando não há agendamentos */}
        {filteredAgendamentos.length === 0 && (
          <div className="text-center py-6 sm:py-8">
            <FaCalendarAlt className="text-2xl sm:text-4xl text-gray-400 mb-3 sm:mb-4 mx-auto" />
            <p className="text-sm sm:text-base text-gray-500">Nenhum agendamento encontrado</p>
          </div>
        )}
      </div>

      {/* Modal de Visualização */}
      {showViewModal && selectedAgendamento && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl mx-2 sm:mx-4 max-h-[95vh] sm:max-h-[90vh] overflow-hidden border border-slate-600">
            <div className="bg-blue-600 text-white p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center">
                  <FaEye className="mr-3" />
                  Detalhes do Agendamento
                </h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="space-y-6">
                {/* Informações do Cliente */}
                <div className="bg-blue-600/10 p-6 rounded-xl border border-blue-600/30">
                  <h4 className="text-lg font-semibold text-white mb-4">Informações do Cliente</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-white">Nome</label>
                      <p className="text-white font-medium">{selectedAgendamento.nomeCliente}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-white">Telefone</label>
                      <p className="text-white font-medium">{selectedAgendamento.telefone || 'Não informado'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-white">Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedAgendamento.status)}`}>
                        {selectedAgendamento.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Informações do Agendamento */}
                <div className="bg-green-600/10 p-6 rounded-xl border border-green-600/30">
                  <h4 className="text-lg font-semibold text-white mb-4">Detalhes do Agendamento</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-white">Loja</label>
                      <p className="text-white font-medium">{selectedAgendamento.loja}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-white">Data</label>
                      <p className="text-white font-medium">{formatDate(selectedAgendamento.data)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-white">Horário</label>
                      <p className="text-white font-medium">{selectedAgendamento.hora || 'Não definido'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-white">Tipo de Imóvel</label>
                      <p className="text-white font-medium">{selectedAgendamento.tipoImovel || 'Não informado'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-white">Ambientes</label>
                      <p className="text-white font-medium">
                        {selectedAgendamento.ambientes && selectedAgendamento.ambientes.length > 0 
                          ? selectedAgendamento.ambientes.join(', ')
                          : 'Não informados'
                        }
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-white">Observações</label>
                      <p className="text-white font-medium">{selectedAgendamento.observacoes || 'Nenhuma'}</p>
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                {selectedAgendamento.endereco && (
                  <div className="bg-purple-600/10 p-6 rounded-xl border border-purple-600/30">
                    <h4 className="text-lg font-semibold text-white mb-4">Endereço</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-white">CEP</label>
                        <p className="text-white font-medium">{selectedAgendamento.endereco.cep}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-white">Logradouro</label>
                        <p className="text-white font-medium">{selectedAgendamento.endereco.logradouro}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-white">Número</label>
                        <p className="text-white font-medium">{selectedAgendamento.endereco.numero}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-white">Complemento</label>
                        <p className="text-white font-medium">{selectedAgendamento.endereco.complemento || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-white">Bairro</label>
                        <p className="text-white font-medium">{selectedAgendamento.endereco.bairro}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-white">Cidade</label>
                        <p className="text-white font-medium">{selectedAgendamento.endereco.cidade}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-slate-700 p-6 border-t border-slate-600">
              <div className="flex space-x-3">
                {selectedAgendamento.status !== 'concluido' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedAgendamento.id, 'concluido')}
                    className="flex-1 bg-white hover:bg-gray-100 text-gray-800 px-6 py-3 rounded-lg font-medium transition-all border border-gray-300"
                  >
                    Concluir Agendamento
                  </button>
                )}
                <button
                  onClick={() => setShowViewModal(false)}
                  className={`flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all ${
                    selectedAgendamento.status === 'concluido' ? 'w-full' : ''
                  }`}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && selectedAgendamento && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl mx-2 sm:mx-4 max-h-[90vh] sm:max-h-[85vh] overflow-hidden border border-slate-600 flex flex-col">
            <div className="bg-green-600 text-white p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center">
                  <FaEdit className="mr-3" />
                  Editar Agendamento
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 max-h-[calc(85vh-140px)]">
              {/* Mensagem CEP */}
              {cepMessage && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  cepMessage.includes('encontrado') 
                    ? 'bg-green-600/20 text-green-300 border border-green-600/30' 
                    : 'bg-yellow-600/20 text-yellow-300 border border-yellow-600/30'
                }`}>
                  {cepMessage}
                </div>
              )}
              
              <div className="space-y-6">
                {/* Informações do Cliente */}
                <div className="bg-blue-600/10 p-6 rounded-xl border border-blue-600/30">
                  <h4 className="text-lg font-semibold text-white mb-4">Informações do Cliente</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-white">Nome</label>
                      <input
                        type="text"
                        value={selectedAgendamento.nomeCliente || ''}
                        onChange={(e) => setSelectedAgendamento({...selectedAgendamento, nomeCliente: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-white">Telefone</label>
                      <input
                        type="text"
                        value={selectedAgendamento.telefone || ''}
                        onChange={(e) => setSelectedAgendamento({...selectedAgendamento, telefone: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-white">Status</label>
                      <select
                        value={selectedAgendamento.status || ''}
                        onChange={(e) => setSelectedAgendamento({...selectedAgendamento, status: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="concluido">Concluído</option>
                        <option value="cancelado">Cancelado</option>
                        <option value="agendar">Agendar</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Informações do Agendamento */}
                <div className="bg-green-600/10 p-6 rounded-xl border border-green-600/30">
                  <h4 className="text-lg font-semibold text-white mb-4">Detalhes do Agendamento</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-white">Loja</label>
                      <select
                        value={selectedAgendamento.loja || ''}
                        onChange={(e) => setSelectedAgendamento({...selectedAgendamento, loja: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="">Selecione a loja</option>
                        <option value="Diana D1">Diana D1</option>
                        <option value="Diana D2">Diana D2</option>
                        <option value="Diana D3">Diana D3</option>
                        <option value="Diana D4">Diana D4</option>
                        <option value="Marquise Planejados">Marquise Planejados</option>
                        <option value="By Estilo">By Estilo</option>
                        <option value="Anfelle">Anfelle</option>
                        <option value="Planejados">Planejados</option>
                        <option value="Rassul Planejados">Rassul Planejados</option>
                        <option value="Miralli Móveis">Miralli Móveis</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-white">Data</label>
                      <input
                        type="date"
                        value={selectedAgendamento.data ? new Date(selectedAgendamento.data).toISOString().split('T')[0] : ''}
                        onChange={(e) => setSelectedAgendamento({...selectedAgendamento, data: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-white">Horário</label>
                      <input
                        type="time"
                        value={selectedAgendamento.hora || ''}
                        onChange={(e) => setSelectedAgendamento({...selectedAgendamento, hora: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-white">Tipo de Imóvel</label>
                      <select
                        value={selectedAgendamento.tipoImovel || ''}
                        onChange={(e) => setSelectedAgendamento({...selectedAgendamento, tipoImovel: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="">Selecione o tipo</option>
                        <option value="casa">Casa</option>
                        <option value="apartamento">Apartamento</option>
                        <option value="sobrado">Sobrado</option>
                        <option value="comercial">Comercial</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-white">Ambientes</label>
                      <div className="space-y-2">
                        {selectedAgendamento.tipoImovel && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {(selectedAgendamento.tipoImovel === 'casa' ? [
                              "Sala de Estar", "Sala de Jantar", "Cozinha", "Quarto Principal", 
                              "Quarto Secundário", "Banheiro Social", "Banheiro Suíte", 
                              "Área de Serviço", "Garagem", "Jardim", "Varanda"
                            ] : [
                              "Sala de Estar", "Sala de Jantar", "Cozinha", "Quarto Principal", 
                              "Quarto Secundário", "Banheiro Social", "Banheiro Suíte", 
                              "Área de Serviço", "Varanda Gourmet", "Sacada", "Dormitório"
                            ]).map(ambiente => (
                              <label key={ambiente} className="flex items-center space-x-2 text-white">
                                <input
                                  type="checkbox"
                                  checked={selectedAgendamento.ambientes?.includes(ambiente) || false}
                                  onChange={(e) => {
                                    const ambientes = selectedAgendamento.ambientes || [];
                                    if (e.target.checked) {
                                      setSelectedAgendamento({
                                        ...selectedAgendamento,
                                        ambientes: [...ambientes, ambiente]
                                      });
                                    } else {
                                      setSelectedAgendamento({
                                        ...selectedAgendamento,
                                        ambientes: ambientes.filter(a => a !== ambiente)
                                      });
                                    }
                                  }}
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm">{ambiente}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        {!selectedAgendamento.tipoImovel && (
                          <p className="text-gray-400 text-sm">Selecione o tipo de imóvel primeiro</p>
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-white">Observações</label>
                      <textarea
                        value={selectedAgendamento.observacoes || ''}
                        onChange={(e) => setSelectedAgendamento({...selectedAgendamento, observacoes: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div className="bg-purple-600/10 p-6 rounded-xl border border-purple-600/30">
                  <h4 className="text-lg font-semibold text-white mb-4">Endereço</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-white">CEP</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={selectedAgendamento.endereco?.cep || ''}
                          onChange={(e) => setSelectedAgendamento({
                            ...selectedAgendamento, 
                            endereco: {...selectedAgendamento.endereco, cep: e.target.value}
                          })}
                          onBlur={buscarEndereco}
                          className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                          placeholder="00000-000"
                        />
                        <button
                          type="button"
                          onClick={buscarEndereco}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
                          title="Buscar CEP"
                        >
                          🔍
                        </button>
                      </div>
                    </div>
                    <div className="lg:col-span-2">
                      <label className="text-sm font-medium text-white">Logradouro</label>
                      <input
                        type="text"
                        value={selectedAgendamento.endereco?.logradouro || ''}
                        onChange={(e) => setSelectedAgendamento({
                          ...selectedAgendamento, 
                          endereco: {...selectedAgendamento.endereco, logradouro: e.target.value}
                        })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="Rua, Avenida, etc"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-white">Número</label>
                      <input
                        type="text"
                        value={selectedAgendamento.endereco?.numero || ''}
                        onChange={(e) => setSelectedAgendamento({
                          ...selectedAgendamento, 
                          endereco: {...selectedAgendamento.endereco, numero: e.target.value}
                        })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="123"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-white">Complemento</label>
                      <input
                        type="text"
                        value={selectedAgendamento.endereco?.complemento || ''}
                        onChange={(e) => setSelectedAgendamento({
                          ...selectedAgendamento, 
                          endereco: {...selectedAgendamento.endereco, complemento: e.target.value}
                        })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="Apto 101"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-white">Bairro</label>
                      <input
                        type="text"
                        value={selectedAgendamento.endereco?.bairro || ''}
                        onChange={(e) => setSelectedAgendamento({
                          ...selectedAgendamento, 
                          endereco: {...selectedAgendamento.endereco, bairro: e.target.value}
                        })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="Centro"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-white">Cidade</label>
                      <input
                        type="text"
                        value={selectedAgendamento.endereco?.cidade || ''}
                        onChange={(e) => setSelectedAgendamento({
                          ...selectedAgendamento, 
                          endereco: {...selectedAgendamento.endereco, cidade: e.target.value}
                        })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="São Paulo"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-700 p-6 border-t border-slate-600 flex-shrink-0">
              <div className="flex space-x-3">
                <button
                  onClick={() => handleUpdateAgendamento(selectedAgendamento)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-all"
                >
                  Salvar Alterações
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Validação */}
      {showValidationError && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                validationType === 'success' ? 'bg-green-100' : 
                validationType === 'error' ? 'bg-red-100' : 'bg-blue-100'
              }`}>
                {validationType === 'success' ? (
                  <FaCheckCircle className="text-green-600 text-2xl" />
                ) : validationType === 'error' ? (
                  <FaExclamationTriangle className="text-red-600 text-2xl" />
                ) : (
                  <FaInfoCircle className="text-blue-600 text-2xl" />
                )}
              </div>
              <h3 className={`text-xl font-bold mb-2 ${
                validationType === 'success' ? 'text-green-900' : 
                validationType === 'error' ? 'text-red-900' : 'text-blue-900'
              }`}>
                {validationType === 'success' ? 'Sucesso!' : 
                 validationType === 'error' ? 'Atenção' : 'Informação'}
              </h3>
              <p className="text-gray-600 mb-6 text-left">
                {validationMessage}
              </p>
              
              <button
                onClick={closeValidationError}
                className={`w-full px-6 py-3 rounded-lg font-medium transition-all ${
                  validationType === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' : 
                  validationType === 'error' ? 'bg-red-600 hover:bg-red-700 text-white' : 
                  'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaSave className="text-green-600 text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Confirmar Alterações
              </h3>
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja salvar as alterações deste agendamento?
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={confirmUpdate}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-all"
                >
                  Sim, Salvar
                </button>
                <button
                  onClick={cancelUpdate}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ListaAgendamentos;
