import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaClock, FaList, FaChartBar, FaStore, FaFlagCheckered } from 'react-icons/fa';
import { apiService } from '../services/api';
import { formatDate, StatusBadge, PageHeader, Spinner, EmptyState } from './ui';

const StatusDashboard = () => {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('todos');

  useEffect(() => {
    fetchAgendamentos();
  }, []);

  const fetchAgendamentos = async () => {
    try {
      const data = await apiService.getAgendamentos();
      setAgendamentos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const contar = (status) => agendamentos.filter((a) => a.status === status).length;

  // Cada item é ao mesmo tempo um cartão de número e um filtro da lista
  const grupos = [
    { id: 'todos', label: 'Todos', count: agendamentos.length, icon: FaList, numero: 'text-white', fundo: 'bg-slate-600', anel: 'ring-slate-300' },
    { id: 'pendente', label: 'Pendentes', count: contar('pendente'), icon: FaClock, numero: 'text-yellow-400', fundo: 'bg-yellow-600', anel: 'ring-yellow-400' },
    { id: 'confirmado', label: 'Confirmados', count: contar('confirmado'), icon: FaCheckCircle, numero: 'text-green-400', fundo: 'bg-green-600', anel: 'ring-green-400' },
    { id: 'concluido', label: 'Concluídos', count: contar('concluido'), icon: FaFlagCheckered, numero: 'text-blue-400', fundo: 'bg-blue-600', anel: 'ring-blue-400' },
    { id: 'cancelado', label: 'Cancelados', count: contar('cancelado'), icon: FaTimesCircle, numero: 'text-red-400', fundo: 'bg-red-600', anel: 'ring-red-400' },
    { id: 'agendar', label: 'A agendar', count: contar('agendar'), icon: FaCalendarAlt, numero: 'text-purple-400', fundo: 'bg-purple-600', anel: 'ring-purple-400' }
  ];

  const grupoAtivo = grupos.find((g) => g.id === activeTab) || grupos[0];
  const filtrados = activeTab === 'todos' ? agendamentos : agendamentos.filter((a) => a.status === activeTab);

  return (
    <div>
      <PageHeader icon={FaChartBar} title="Status dos Agendamentos" subtitle="Toque em um status para filtrar a lista" />

      {/* Números por status (também funcionam como filtro) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-5 sm:mb-6" role="group" aria-label="Filtrar por status">
        {grupos.map((grupo) => {
          const Icon = grupo.icon;
          const selecionado = activeTab === grupo.id;
          return (
            <button
              key={grupo.id}
              type="button"
              onClick={() => setActiveTab(grupo.id)}
              aria-pressed={selecionado}
              className={`card p-4 text-left transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                selecionado ? `ring-2 ${grupo.anel} bg-white/15` : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-slate-300 truncate">{grupo.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${grupo.numero}`}>{loading ? '–' : grupo.count}</p>
                </div>
                <span className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${grupo.fundo}`}>
                  <Icon className="text-white" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <h2 className="text-lg font-semibold text-white mb-3">
        {grupoAtivo.label}
        {!loading && <span className="ml-2 text-slate-400 font-normal">({filtrados.length})</span>}
      </h2>

      {loading ? (
        <div className="card">
          <Spinner label="Carregando agendamentos..." />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card">
          <EmptyState icon={FaCalendarAlt}>
            {activeTab === 'todos' ? 'Nenhum agendamento cadastrado' : `Nenhum agendamento em "${grupoAtivo.label}"`}
          </EmptyState>
        </div>
      ) : (
        <>
          {/* Celular: cartões */}
          <ul className="md:hidden space-y-3">
            {filtrados.map((agendamento) => (
              <li key={agendamento.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-white break-words min-w-0">{agendamento.nomeCliente || 'Cliente sem nome'}</p>
                  <StatusBadge status={agendamento.status} className="shrink-0" />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-300">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <FaStore className="text-slate-400 text-xs shrink-0" />
                    <span className="truncate">{agendamento.loja || 'Sem loja'}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FaCalendarAlt className="text-slate-400 text-xs shrink-0" />
                    {formatDate(agendamento.data)}
                    {agendamento.hora ? ` às ${agendamento.hora}` : ''}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {/* Tablet e desktop: tabela */}
          <div className="hidden md:block card overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-xs font-medium text-slate-300 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Loja</th>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filtrados.map((agendamento) => (
                  <tr key={agendamento.id} className="hover:bg-white/5">
                    <td className="px-5 py-3.5 text-sm font-medium text-white break-words">{agendamento.nomeCliente || 'Cliente sem nome'}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-300">{agendamento.loja || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-300 whitespace-nowrap">
                      {formatDate(agendamento.data)}
                      {agendamento.hora ? ` às ${agendamento.hora}` : ''}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={agendamento.status} />
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

export default StatusDashboard;
