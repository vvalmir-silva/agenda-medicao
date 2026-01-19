import React, { useState, useEffect } from 'react';
import { FaUser, FaPhone, FaBuilding, FaHome, FaStore, FaCalendar, FaClock, FaMapPin, FaStickyNote, FaSave, FaEraser } from 'react-icons/fa';
import { apiService } from '../services/api';

const FormularioAgendamento = ({ user, initialData, onAgendamentoCreated }) => {
  const [formData, setFormData] = useState({
    nomeCliente: initialData?.nomeCliente || '',
    telefone: initialData?.telefone || '',
    tipoImovel: '',
    ambientes: [],
    loja: initialData?.loja || '',
    data: '',
    horario: '',
    cep: '',
    numero: '',
    complemento: '',
    logradouro: '',
    bairro: '',
    cidade: '',
    observacoes: '',
    status: 'pendente',
    id: initialData?.id || null
  });

  const [showAmbienteDropdown, setShowAmbienteDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const lojas = [
    "Diana D1", "Diana D2", "Diana D3", "Diana D4",
    "Marquise Planejados", "By Estilo", "Anfelle", 
    "Planejados", "Rassul Planejados", "Miralli Móveis", "Outros"
  ];

  const ambientesOptions = {
    casa: [
      "Sala de Estar", "Sala de Jantar", "Cozinha", "Quarto Principal", 
      "Quarto Secundário", "Banheiro Social", "Banheiro Suíte", 
      "Área de Serviço", "Garagem", "Jardim", "Varanda"
    ],
    apartamento: [
      "Sala de Estar", "Sala de Jantar", "Cozinha", "Quarto Principal", 
      "Quarto Secundário", "Banheiro Social", "Banheiro Suíte", 
      "Área de Serviço", "Varanda Gourmet", "Sacada", "Dormitório"
    ]
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAmbienteToggle = (ambiente) => {
    setFormData(prev => ({
      ...prev,
      ambientes: prev.ambientes.includes(ambiente)
        ? prev.ambientes.filter(a => a !== ambiente)
        : [...prev.ambientes, ambiente]
    }));
  };

  const buscarEndereco = async () => {
    if (!formData.cep || formData.cep.length < 8) return;
    
    try {
      const cep = formData.cep.replace(/\D/g, '');
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          logradouro: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Validar campos obrigatórios
      if (!formData.nomeCliente || !formData.telefone || 
          !formData.tipoImovel || formData.ambientes.length === 0 || 
          !formData.loja || !formData.data || !formData.horario || 
          !formData.cep || !formData.numero) {
        setMessage('Por favor, preencha todos os campos obrigatórios.');
        return;
      }

      // Preparar dados para API
      const agendamentoData = {
        nomeCliente: formData.nomeCliente,
        loja: formData.loja,
        data: formData.data,
        hora: formData.horario,
        observacoes: formData.observacoes,
        status: 'confirmado', // Ao confirmar, muda status para confirmado
        // Campos adicionais
        telefone: formData.telefone,
        tipoImovel: formData.tipoImovel,
        ambientes: formData.ambientes,
        endereco: {
          cep: formData.cep,
          logradouro: formData.logradouro,
          numero: formData.numero,
          complemento: formData.complemento,
          bairro: formData.bairro,
          cidade: formData.cidade
        }
      };

      let result;
      if (formData.id) {
        // Editar agendamento existente
        result = await apiService.updateAgendamento(formData.id, agendamentoData);
        setMessage('Agendamento confirmado com sucesso!');
      } else {
        // Criar novo agendamento
        result = await apiService.createAgendamento(agendamentoData);
        setMessage('Agendamento criado com sucesso!');
      }
      
      // Notificar componente pai
      if (onAgendamentoCreated) {
        onAgendamentoCreated(result);
      }

    } catch (error) {
      setMessage(error.message || 'Erro ao salvar agendamento');
    } finally {
      setLoading(false);
    }
  };

  const limparFormulario = () => {
    setFormData({
      nomeCliente: initialData?.nomeCliente || '',
      telefone: initialData?.telefone || '',
      tipoImovel: '',
      ambientes: [],
      loja: initialData?.loja || '',
      data: '',
      horario: '',
      cep: '',
      numero: '',
      complemento: '',
      logradouro: '',
      bairro: '',
      cidade: '',
      observacoes: '',
      status: 'pendente',
      id: initialData?.id || null
    });
    setMessage('');
  };

  const getAmbienteDisplay = () => {
    if (formData.ambientes.length === 0) {
      return formData.tipoImovel ? 'Selecione os ambientes' : 'Primeiro selecione o tipo de imóvel';
    }
    return `${formData.ambientes.length} ambiente(s) selecionado(s)`;
  };

  const getHorarioAgendamento = () => {
    if (!formData.data || !formData.horario) return 'Selecione data e horário acima';
    
    const data = new Date(formData.data + 'T' + formData.horario);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto py-2 sm:py-4 lg:py-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-xl p-3 sm:p-6 lg:p-8 border border-white/20">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-4 sm:mb-6 lg:mb-8 text-center">
            <FaCalendar className="inline text-blue-400 mr-2 sm:mr-3 text-lg sm:text-xl lg:text-2xl" />
            <span className="block sm:inline text-sm sm:text-base lg:text-lg">
              {initialData?.id ? 'Confirmar Agendamento' : 'Novo Agendamento de Medição'}
            </span>
          </h2>
        
        {message && (
          <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg text-sm sm:text-base ${
            message.includes('sucesso') ? 'bg-green-600/20 text-green-300 border border-green-600/30' : 
            'bg-red-600/20 text-red-300 border border-red-600/30'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            {/* Nome Cliente */}
            <div className="lg:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-2">
                <FaUser className="inline mr-1 sm:mr-2 text-blue-400 text-xs sm:text-sm" />
                Nome do Cliente*
              </label>
              <input
                type="text"
                name="nomeCliente"
                value={formData.nomeCliente}
                onChange={handleInputChange}
                required
                className="w-full px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-slate-600 rounded-lg focus:border-blue-400 focus:ring focus:ring-blue-200 transition-all bg-slate-800 text-white placeholder-slate-400"
                placeholder="Nome completo"
              />
            </div>

            {/* Telefone */}
            <div className="lg:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-2">
                <FaPhone className="inline mr-1 sm:mr-2 text-blue-400 text-xs sm:text-sm" />
                Telefone*
              </label>
              <input
                type="tel"
                name="telefone"
                value={formData.telefone}
                onChange={handleInputChange}
                required
                placeholder="(11) 99999-9999"
                className="w-full px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-slate-600 rounded-lg focus:border-blue-400 focus:ring focus:ring-blue-200 transition-all bg-slate-800 text-white placeholder-slate-400"
              />
            </div>

            {/* Tipo de Imóvel */}
            <div className="sm:col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <FaBuilding className="inline mr-2 text-blue-400" />
                Tipo de Imóvel*
              </label>
              <select
                name="tipoImovel"
                value={formData.tipoImovel}
                onChange={handleInputChange}
                required
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-slate-600 rounded-lg focus:border-blue-400 focus:ring focus:ring-blue-200 transition-all bg-slate-800 text-white"
              >
                <option value="" className="bg-slate-800">Selecione o tipo</option>
                <option value="casa" className="bg-slate-800">Casa</option>
                <option value="apartamento" className="bg-slate-800">Apartamento</option>
              </select>
            </div>

            {/* Ambiente */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <FaHome className="inline mr-2 text-blue-400" />
                Ambientes* (Múltipla Escolha)
              </label>
              <div className="relative">
                <div
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-slate-600 rounded-lg focus-within:border-blue-400 focus-within:ring focus-within:ring-blue-200 transition-all bg-slate-800 text-white min-h-[44px] cursor-pointer"
                  onClick={() => setShowAmbienteDropdown(!showAmbienteDropdown)}
                >
                  <div className="text-slate-400">{getAmbienteDisplay()}</div>
                </div>
                {showAmbienteDropdown && formData.tipoImovel && (
                  <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {ambientesOptions[formData.tipoImovel]?.map(ambiente => (
                      <label
                        key={ambiente}
                        className="flex items-center px-3 py-2 hover:bg-slate-700 cursor-pointer text-white"
                      >
                        <input
                          type="checkbox"
                          checked={formData.ambientes.includes(ambiente)}
                          onChange={() => handleAmbienteToggle(ambiente)}
                          className="mr-2"
                        />
                        {ambiente}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CEP e Endereço */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaMapPin className="inline mr-2 text-blue-600" />
                    CEP*
                  </label>
                  <input
                    type="text"
                    name="cep"
                    value={formData.cep}
                    onChange={handleInputChange}
                    onBlur={buscarEndereco}
                    required
                    placeholder="00000-000"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all"
                  />
                </div>
                <div className="sm:col-span-1 lg:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Número*</label>
                  <input
                    type="text"
                    name="numero"
                    value={formData.numero}
                    onChange={handleInputChange}
                    required
                    placeholder="123"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Complemento</label>
                  <input
                    type="text"
                    name="complemento"
                    value={formData.complemento}
                    onChange={handleInputChange}
                    placeholder="Apto 45, Bloco B"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logradouro*</label>
                  <input
                    type="text"
                    name="logradouro"
                    value={formData.logradouro}
                    onChange={handleInputChange}
                    required
                    readOnly
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg bg-gray-50"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bairro*</label>
                  <input
                    type="text"
                    name="bairro"
                    value={formData.bairro}
                    onChange={handleInputChange}
                    required
                    readOnly
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg bg-gray-50"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cidade*</label>
                  <input
                    type="text"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleInputChange}
                    required
                    readOnly
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg bg-gray-50"
                  />
                </div>
              </div>
            </div>

          {/* Observação */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaStickyNote className="inline mr-2 text-blue-600" />
              Observações
            </label>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all resize-none"
              placeholder="Informações adicionais sobre o agendamento..."
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center disabled:opacity-50"
            >
              <FaSave className="mr-2" />
              {loading ? 'Salvando...' : 'Salvar Agendamento'}
            </button>
            <button
              type="button"
              onClick={limparFormulario}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center"
            >
              <FaEraser className="mr-2" />
              Limpar
            </button>
          </div>
        </div>
        </form>
      </div>
    </div>
  </div>
  );
};

export default FormularioAgendamento;
