import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaClock, FaPlus, FaSearch, FaStore, FaUser, FaCheck, FaTimes, FaCalendarAlt } from 'react-icons/fa';
import { apiService } from '../services/api';
import { LOJAS, formatDate, PageHeader, Spinner, EmptyState, Alert } from './ui';

const AgendamentosPendentes = () => {
  const navigate = useNavigate();
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLoja, setFilterLoja] = useState('');
  const [formData, setFormData] = useState({ nomeCliente: '', loja: '', status: 'pendente' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAgendamentos();
  }, []);

  const fetchAgendamentos = async () => {
    try {
      const data = await apiService.getAgendamentos();
      setAgendamentos(Array.isArray(data) ? data : []);
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
      fetchAgendamentos();
    } catch (error) {
      setMessage(error.message || 'Erro ao criar agendamento');
    }
  };

  // Abre o formulário completo já com os dados do cliente preenchidos
  const handleConfirmar = (agendamento) => {
    navigate('/formulario', {
      state: {
        agendamento: {
          id: agendamento.id,
          nomeCliente: agendamento.nomeCliente,
          loja: agendamento.loja,
          telefone: agendamento.telefone || ''
        }
      }
    });
  };

  const handleCancelar = async (agendamento) => {
    if (!window.confirm(`Cancelar o agendamento de ${agendamento.nomeCliente || 'cliente sem nome'}?`)) return;
    try {
      await apiService.updateAgendamento(agendamento.id, { status: 'cancelado' });
      setMessage('Agendamento cancelado com sucesso');
      fetchAgendamentos();
    } catch (error) {
      setMessage(error.message || 'Erro ao atualizar status');
    }
  };

  const filteredAgendamentos = agendamentos.filter((agendamento) => {
    const matchSearch = (agendamento.nomeCliente || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchLoja = !filterLoja || agendamento.loja === filterLoja;
    return matchSearch && matchLoja && agendamento.status === 'pendente';
  });

  const total = filteredAgendamentos.length;

  const Acoes = ({ agendamento, className = '' }) => (
    <div className={`flex gap-2 ${className}`}>
      <button type="button" onClick={() => handleConfirmar(agendamento)} className="btn btn-success flex-1 md:flex-none px-3 text-sm">
        <FaCheck />
        Confirmar
      </button>
      <button type="button" onClick={() => handleCancelar(agendamento)} className="btn btn-neutral flex-1 md:flex-none px-3 text-sm text-red-300">
        <FaTimes />
        Cancelar
      </button>
    </div>
  );

  return (
    <div>
      <PageHeader
        icon={FaClock}
        title="Agendamentos Pendentes"
        subtitle={loading ? 'Carregando...' : `${total} ${total === 1 ? 'agendamento pendente' : 'agendamentos pendentes'}`}
      >
        <button type="button" onClick={() => setShowCreateForm(!showCreateForm)} className="btn btn-primary w-full sm:w-auto">
          <FaPlus />
          Novo agendamento
        </button>
      </PageHeader>

      {message && (
        <div className="mb-4">
          <Alert type={message.includes('sucesso') ? 'success' : 'error'}>{message}</Alert>
        </div>
      )}

      {/* Cadastro rápido */}
      {showCreateForm && (
        <div className="card p-4 sm:p-6 mb-4">
          <h2 className="text-lg font-semibold text-white mb-4">Criar novo agendamento</h2>
          <form onSubmit={handleCreateAgendamento} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="novo-nome" className="field-label">Nome do cliente*</label>
                <input
                  id="novo-nome"
                  type="text"
                  required
                  value={formData.nomeCliente}
                  onChange={(e) => setFormData({ ...formData, nomeCliente: e.target.value })}
                  className="field"
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label htmlFor="novo-loja" className="field-label">Loja*</label>
                <select
                  id="novo-loja"
                  required
                  value={formData.loja}
                  onChange={(e) => setFormData({ ...formData, loja: e.target.value })}
                  className="field"
                >
                  <option value="">Selecione a loja</option>
                  {LOJAS.map((loja) => (
                    <option key={loja} value={loja}>{loja}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <button type="button" onClick={() => setShowCreateForm(false)} className="btn btn-neutral">
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Criar agendamento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3 mb-4">
        <div className="relative lg:w-80">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="search"
            aria-label="Buscar cliente"
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="field pl-10"
          />
        </div>
        <div className="relative lg:w-64">
          <FaStore className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select aria-label="Filtrar por loja" value={filterLoja} onChange={(e) => setFilterLoja(e.target.value)} className="field pl-10">
            <option value="">Todas as lojas</option>
            {LOJAS.map((loja) => (
              <option key={loja} value={loja}>{loja}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <Spinner label="Carregando agendamentos..." />
        </div>
      ) : total === 0 ? (
        <div className="card">
          <EmptyState icon={FaCalendarAlt}>Nenhum agendamento pendente encontrado</EmptyState>
        </div>
      ) : (
        <>
          {/* Celular: cartões */}
          <ul className="md:hidden space-y-3">
            {filteredAgendamentos.map((agendamento) => (
              <li key={agendamento.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-10 h-10 bg-blue-600/20 rounded-full shrink-0">
                    <FaUser className="text-blue-300" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white break-words">{agendamento.nomeCliente || 'Cliente sem nome'}</p>
                    <p className="flex items-center gap-1.5 text-sm text-slate-300 mt-0.5">
                      <FaStore className="text-slate-400 text-xs shrink-0" />
                      <span className="truncate">{agendamento.loja || 'Sem loja'}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-sm text-slate-300 mt-0.5">
                      <FaCalendarAlt className="text-slate-400 text-xs shrink-0" />
                      {formatDate(agendamento.data)}
                    </p>
                  </div>
                </div>
                <Acoes agendamento={agendamento} className="mt-3" />
              </li>
            ))}
          </ul>

          {/* Tablet e desktop: tabela */}
          <div className="hidden md:block card overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-xs font-medium text-slate-300 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Loja</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredAgendamentos.map((agendamento) => (
                  <tr key={agendamento.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 bg-blue-600/20 rounded-full shrink-0">
                          <FaUser className="text-blue-300 text-sm" />
                        </span>
                        <span className="text-sm font-medium text-white break-words">{agendamento.nomeCliente || 'Cliente sem nome'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{agendamento.loja || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">{formatDate(agendamento.data)}</td>
                    <td className="px-4 py-3">
                      <Acoes agendamento={agendamento} className="justify-end" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AgendamentosPendentes;
