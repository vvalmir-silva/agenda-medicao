import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaUser, FaCalendarAlt, FaCalendarCheck, FaMapMarkerAlt, FaStickyNote, FaSave, FaEraser, FaCheck, FaArrowLeft } from 'react-icons/fa';
import { apiService } from '../services/api';
import { LOJAS, ambientesPorTipo, PageHeader, Alert } from './ui';

const Secao = ({ icon: Icon, title, children }) => (
  <fieldset className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
    <legend className="flex items-center gap-2 px-1 text-base font-semibold text-white">
      <Icon className="text-blue-400" />
      {title}
    </legend>
    <div className="mt-2">{children}</div>
  </fieldset>
);

const FormularioAgendamento = ({ initialData, onAgendamentoCreated }) => {
  const location = useLocation();
  const navigate = useNavigate();
  // Vindo de "Confirmar" na tela de pendentes, os dados chegam pela navegação
  const inicial = initialData || (location.state && location.state.agendamento) || null;

  const formularioVazio = () => ({
    nomeCliente: inicial?.nomeCliente || '',
    telefone: inicial?.telefone || '',
    tipoImovel: '',
    ambientes: [],
    loja: inicial?.loja || '',
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
    id: inicial?.id || null
  });

  const [formData, setFormData] = useState(formularioVazio);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // Ao trocar o tipo de imóvel, mantém só os ambientes que existem no novo tipo
      if (name === 'tipoImovel') {
        const validos = value ? ambientesPorTipo(value) : [];
        next.ambientes = prev.ambientes.filter((a) => validos.includes(a));
      }
      return next;
    });
  };

  const handleAmbienteToggle = (ambiente) => {
    setFormData((prev) => ({
      ...prev,
      ambientes: prev.ambientes.includes(ambiente)
        ? prev.ambientes.filter((a) => a !== ambiente)
        : [...prev.ambientes, ambiente]
    }));
  };

  const buscarEndereco = async () => {
    const cep = (formData.cep || '').replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setFormData((prev) => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade
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
      if (!formData.nomeCliente || !formData.telefone ||
          !formData.tipoImovel || formData.ambientes.length === 0 ||
          !formData.loja || !formData.data || !formData.horario ||
          !formData.cep || !formData.numero) {
        setMessage(
          formData.tipoImovel && formData.ambientes.length === 0
            ? 'Selecione pelo menos um ambiente.'
            : 'Por favor, preencha todos os campos obrigatórios.'
        );
        return;
      }

      const agendamentoData = {
        nomeCliente: formData.nomeCliente,
        loja: formData.loja,
        data: formData.data,
        hora: formData.horario,
        observacoes: formData.observacoes,
        status: 'confirmado', // Ao salvar com todos os dados, o agendamento fica confirmado
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
        result = await apiService.updateAgendamento(formData.id, agendamentoData);
        setMessage('Agendamento confirmado com sucesso!');
      } else {
        result = await apiService.createAgendamento(agendamentoData);
        // Limpa os campos para um segundo envio não criar o mesmo agendamento de novo
        setFormData(formularioVazio());
        setMessage('Agendamento criado com sucesso!');
      }

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
    setFormData(formularioVazio());
    setMessage('');
  };

  const confirmando = !!inicial?.id;
  const sucesso = message.includes('sucesso');

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        icon={FaCalendarCheck}
        title={confirmando ? 'Confirmar Agendamento' : 'Novo Agendamento de Medição'}
        subtitle="Campos com * são obrigatórios"
      >
        <button type="button" onClick={() => navigate('/pendentes')} className="btn btn-neutral w-full sm:w-auto">
          <FaArrowLeft />
          Voltar
        </button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <Secao icon={FaUser} title="Cliente">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nomeCliente" className="field-label">Nome do cliente*</label>
              <input
                id="nomeCliente"
                type="text"
                name="nomeCliente"
                value={formData.nomeCliente}
                onChange={handleInputChange}
                required
                autoComplete="name"
                className="field"
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label htmlFor="telefone" className="field-label">Telefone*</label>
              <input
                id="telefone"
                type="tel"
                name="telefone"
                value={formData.telefone}
                onChange={handleInputChange}
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 99999-9999"
                className="field"
              />
            </div>
          </div>
        </Secao>

        <Secao icon={FaCalendarAlt} title="Agendamento">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <label htmlFor="loja" className="field-label">Loja*</label>
              <select id="loja" name="loja" value={formData.loja} onChange={handleInputChange} required className="field">
                <option value="">Selecione a loja</option>
                {LOJAS.map((loja) => (
                  <option key={loja} value={loja}>{loja}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="data" className="field-label">Data*</label>
              <input id="data" type="date" name="data" value={formData.data} onChange={handleInputChange} required className="field" />
            </div>
            <div>
              <label htmlFor="horario" className="field-label">Horário*</label>
              <input id="horario" type="time" name="horario" value={formData.horario} onChange={handleInputChange} required className="field" />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label htmlFor="tipoImovel" className="field-label">Tipo de imóvel*</label>
              <select id="tipoImovel" name="tipoImovel" value={formData.tipoImovel} onChange={handleInputChange} required className="field">
                <option value="">Selecione o tipo</option>
                <option value="casa">Casa</option>
                <option value="apartamento">Apartamento</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <p id="ambientes-label" className="field-label">
              Ambientes*
              {formData.ambientes.length > 0 && (
                <span className="ml-2 text-slate-400 font-normal">
                  {formData.ambientes.length} {formData.ambientes.length === 1 ? 'selecionado' : 'selecionados'}
                </span>
              )}
            </p>
            {formData.tipoImovel ? (
              <div role="group" aria-labelledby="ambientes-label" className="flex flex-wrap gap-2">
                {ambientesPorTipo(formData.tipoImovel).map((ambiente) => {
                  const marcado = formData.ambientes.includes(ambiente);
                  return (
                    <button
                      key={ambiente}
                      type="button"
                      aria-pressed={marcado}
                      onClick={() => handleAmbienteToggle(ambiente)}
                      className={`inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-full border text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                        marcado
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-800/80 border-slate-600 text-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {marcado && <FaCheck className="text-xs" />}
                      {ambiente}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Selecione primeiro o tipo de imóvel.</p>
            )}
          </div>
        </Secao>

        <Secao icon={FaMapMarkerAlt} title="Endereço">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="cep" className="field-label">CEP*</label>
              <input
                id="cep"
                type="text"
                name="cep"
                value={formData.cep}
                onChange={handleInputChange}
                onBlur={buscarEndereco}
                required
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={9}
                placeholder="00000-000"
                className="field"
              />
            </div>
            <div className="sm:col-span-1">
              <label htmlFor="numero" className="field-label">Número*</label>
              <input
                id="numero"
                type="text"
                name="numero"
                value={formData.numero}
                onChange={handleInputChange}
                required
                placeholder="123"
                className="field"
              />
            </div>
            <div className="col-span-2 sm:col-span-3">
              <label htmlFor="complemento" className="field-label">Complemento</label>
              <input
                id="complemento"
                type="text"
                name="complemento"
                value={formData.complemento}
                onChange={handleInputChange}
                placeholder="Apto 45, Bloco B"
                className="field"
              />
            </div>
            <div className="col-span-2 sm:col-span-6">
              <label htmlFor="logradouro" className="field-label">Logradouro*</label>
              <input
                id="logradouro"
                type="text"
                name="logradouro"
                value={formData.logradouro}
                onChange={handleInputChange}
                required
                autoComplete="address-line1"
                placeholder="Preenchido pelo CEP"
                className="field"
              />
            </div>
            <div className="col-span-2 sm:col-span-3">
              <label htmlFor="bairro" className="field-label">Bairro*</label>
              <input id="bairro" type="text" name="bairro" value={formData.bairro} onChange={handleInputChange} required className="field" />
            </div>
            <div className="col-span-2 sm:col-span-3">
              <label htmlFor="cidade" className="field-label">Cidade*</label>
              <input id="cidade" type="text" name="cidade" value={formData.cidade} onChange={handleInputChange} required className="field" />
            </div>
          </div>
        </Secao>

        <Secao icon={FaStickyNote} title="Observações">
          <label htmlFor="observacoes" className="sr-only">Observações</label>
          <textarea
            id="observacoes"
            name="observacoes"
            value={formData.observacoes}
            onChange={handleInputChange}
            rows="3"
            className="field resize-none"
            placeholder="Informações adicionais sobre o agendamento..."
          />
        </Secao>

        {/* A mensagem fica junto dos botões para aparecer sem precisar rolar a tela */}
        {message && <Alert type={sucesso ? 'success' : 'error'}>{message}</Alert>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button type="button" onClick={limparFormulario} className="btn btn-neutral">
            <FaEraser />
            Limpar
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary sm:min-w-[14rem]">
            <FaSave />
            {loading ? 'Salvando...' : confirmando ? 'Confirmar agendamento' : 'Salvar agendamento'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormularioAgendamento;
