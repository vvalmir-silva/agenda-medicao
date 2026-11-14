import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaClock, FaCheckCircle, FaCalendarAlt, FaList, FaStore, FaMapMarkerAlt, FaChevronRight } from 'react-icons/fa';
import { apiService } from '../services/api';
import { formatDate, formatEndereco, hojeISO, StatusBadge } from './ui';

const saudacao = () => {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
};

const Dashboard = ({ user }) => {
  const navigate = useNavigate();
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    apiService
      .getAgendamentos()
      .then((data) => {
        if (ativo) setAgendamentos(Array.isArray(data) ? data : []);
      })
      .catch((error) => console.error('Erro ao carregar agendamentos:', error))
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const resumo = useMemo(() => {
    const hoje = hojeISO();
    const mesAtual = hoje.slice(0, 7);
    const proximos = agendamentos
      .filter((a) => a.data && String(a.data).slice(0, 10) >= hoje && (a.status === 'pendente' || a.status === 'confirmado'))
      .sort((a, b) => `${a.data} ${a.hora || ''}`.localeCompare(`${b.data} ${b.hora || ''}`));
    return {
      pendentes: agendamentos.filter((a) => a.status === 'pendente').length,
      confirmados: agendamentos.filter((a) => a.status === 'confirmado').length,
      doMes: agendamentos.filter((a) => a.data && String(a.data).startsWith(mesAtual)).length,
      total: agendamentos.length,
      proximo: proximos[0] || null
    };
  }, [agendamentos]);

  const primeiroNome = (user.nome || user.email || '').split(/[\s@]/)[0];
  const dataDeHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const cards = [
    { label: 'Pendentes', valor: resumo.pendentes, cor: 'text-yellow-400', fundo: 'bg-yellow-600', icon: FaClock, rota: '/pendentes' },
    { label: 'Confirmados', valor: resumo.confirmados, cor: 'text-green-400', fundo: 'bg-green-600', icon: FaCheckCircle, rota: '/status' },
    { label: 'Neste mês', valor: resumo.doMes, cor: 'text-blue-400', fundo: 'bg-blue-600', icon: FaCalendarAlt, rota: '/lista' },
    { label: 'Total', valor: resumo.total, cor: 'text-white', fundo: 'bg-slate-600', icon: FaList, rota: '/lista' }
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Boas-vindas */}
      <section className="card p-5 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-slate-400 first-letter:uppercase">{dataDeHoje}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1 break-words">
              {saudacao()}, {primeiroNome}!
            </h1>
            <p className="text-slate-300 mt-1.5">Acompanhe as medições agendadas e o que ainda precisa de confirmação.</p>
          </div>
          <button type="button" onClick={() => navigate('/formulario')} className="btn btn-primary w-full sm:w-auto shrink-0">
            <FaPlus />
            Novo agendamento
          </button>
        </div>
      </section>

      {/* Números */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" aria-label="Resumo dos agendamentos">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => navigate(card.rota)}
              className="card p-4 sm:p-5 text-left hover:bg-white/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-slate-300">{card.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${card.cor}`}>{loading ? '–' : card.valor}</p>
                </div>
                <span className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg shrink-0 ${card.fundo}`}>
                  <Icon className="text-white" />
                </span>
              </div>
            </button>
          );
        })}
      </section>

      {/* Próximo agendamento */}
      <section className="card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold text-white">Próximo agendamento</h2>
          <button type="button" onClick={() => navigate('/lista')} className="btn btn-neutral px-3 text-sm whitespace-nowrap shrink-0">
            Ver todos
            <FaChevronRight className="text-xs" />
          </button>
        </div>

        {loading ? (
          <p className="text-slate-400">Carregando...</p>
        ) : resumo.proximo ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <p className="text-xl font-bold text-white break-words">{resumo.proximo.nomeCliente || 'Cliente sem nome'}</p>
              <p className="flex items-center gap-2 text-slate-200">
                <FaCalendarAlt className="text-blue-400 shrink-0" />
                <span>
                  {formatDate(resumo.proximo.data)}
                  {resumo.proximo.hora ? ` às ${resumo.proximo.hora}` : ''}
                </span>
              </p>
              {resumo.proximo.loja && (
                <p className="flex items-center gap-2 text-slate-300 text-sm">
                  <FaStore className="text-slate-400 shrink-0" />
                  <span>{resumo.proximo.loja}</span>
                </p>
              )}
              {formatEndereco(resumo.proximo.endereco) && (
                <p className="flex items-start gap-2 text-slate-300 text-sm">
                  <FaMapMarkerAlt className="text-slate-400 shrink-0 mt-0.5" />
                  <span className="break-words min-w-0">{formatEndereco(resumo.proximo.endereco)}</span>
                </p>
              )}
            </div>
            <StatusBadge status={resumo.proximo.status} className="self-start sm:self-center" />
          </div>
        ) : (
          <p className="text-slate-300">Nenhum agendamento com data marcada daqui para frente.</p>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
