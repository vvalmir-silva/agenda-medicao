import React, { useState, useEffect } from 'react';
import {
  FaTable, FaSearch, FaTrash, FaDownload, FaEdit, FaEye, FaCalendarAlt, FaStore, FaClock, FaUser, FaPhone,
  FaMapMarkerAlt, FaExclamationTriangle, FaSave, FaCheckCircle, FaInfoCircle, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import { apiService } from '../services/api';
import {
  LOJAS, ambientesPorTipo, formatDate, dateInputValue, formatEndereco,
  StatusBadge, PageHeader, Spinner, EmptyState, Modal
} from './ui';

const ITENS_POR_PAGINA = 10;

const NOMES_DOS_CAMPOS = {
  nomeCliente: 'nome',
  telefone: 'telefone',
  loja: 'loja',
  data: 'data',
  hora: 'horário',
  status: 'status',
  tipoImovel: 'tipo de imóvel'
};

const Detalhe = ({ label, children, className = '' }) => (
  <div className={className}>
    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
    <dd className="text-white mt-0.5 break-words">{children}</dd>
  </div>
);

const Bloco = ({ title, children }) => (
  <section className="rounded-xl border border-white/10 bg-white/5 p-4">
    <h3 className="text-base font-semibold text-white mb-3">{title}</h3>
    {children}
  </section>
);

const ListaAgendamentos = () => {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
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

  // Uma nova busca volta para a primeira página
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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

  const avisar = (mensagem, tipo = 'error') => {
    setValidationMessage(mensagem);
    setValidationType(tipo);
    setShowValidationError(true);
  };

  const filteredAgendamentos = agendamentos.filter((agendamento) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      agendamento.nomeCliente?.toLowerCase().includes(searchLower) ||
      agendamento.loja?.toLowerCase().includes(searchLower) ||
      agendamento.telefone?.toLowerCase().includes(searchLower) ||
      agendamento.email?.toLowerCase().includes(searchLower) ||
      agendamento.status?.toLowerCase().includes(searchLower) ||
      formatEndereco(agendamento.endereco).toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredAgendamentos.length / ITENS_POR_PAGINA));
  const paginaAtual = Math.min(currentPage, totalPages);
  const startIndex = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const endIndex = startIndex + ITENS_POR_PAGINA;
  const currentItems = filteredAgendamentos.slice(startIndex, endIndex);
  const todosSelecionados = currentItems.length > 0 && currentItems.every((item) => selectedItems.includes(item.id));

  const handleSelectAll = () => {
    setSelectedItems(todosSelecionados ? [] : currentItems.map((item) => item.id));
  };

  const handleSelectItem = (id) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;

    if (window.confirm(`Tem certeza que deseja excluir ${selectedItems.length} agendamento(s)?`)) {
      try {
        await Promise.all(selectedItems.map((id) => apiService.deleteAgendamento(id)));
        setSelectedItems([]);
        fetchAgendamentos();
      } catch (error) {
        console.error('Erro ao excluir agendamentos:', error);
        avisar(`Erro ao excluir: ${error.message || 'Erro desconhecido'}`);
      }
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Nome do Cliente', 'Loja', 'Data', 'Horário', 'Status', 'Telefone', 'Email'],
      ...filteredAgendamentos.map((item) => [
        item.nomeCliente || '',
        item.loja || '',
        item.data || '',
        item.hora || '',
        item.status || '',
        item.telefone || '',
        item.email || ''
      ])
    ].map((row) => row.join(',')).join('\n');

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
    setCepMessage('');
    setShowEditModal(true);
  };

  const handleView = (agendamento) => {
    setSelectedAgendamento(agendamento);
    setShowViewModal(true);
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await apiService.updateAgendamento(id, { status });
      setShowViewModal(false);
      fetchAgendamentos();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      avisar(`Erro ao atualizar status: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const editar = (patch) => setSelectedAgendamento((prev) => ({ ...prev, ...patch }));
  const editarEndereco = (patch) =>
    setSelectedAgendamento((prev) => ({ ...prev, endereco: { ...(prev.endereco || {}), ...patch } }));

  const handleUpdateAgendamento = (updatedData) => {
    // Apenas observações e complemento podem ficar vazios
    const camposVazios = Object.keys(NOMES_DOS_CAMPOS).filter(
      (campo) => !updatedData[campo] || String(updatedData[campo]).trim() === ''
    );

    if (camposVazios.length > 0) {
      avisar(`Preencha os campos obrigatórios: ${camposVazios.map((c) => NOMES_DOS_CAMPOS[c]).join(', ')}`);
      return;
    }
    if (!updatedData.ambientes || updatedData.ambientes.length === 0) {
      avisar('Selecione pelo menos um ambiente');
      return;
    }
    if (!updatedData.endereco) {
      avisar('Endereço é obrigatório');
      return;
    }
    if (!updatedData.endereco.cep || String(updatedData.endereco.cep).trim() === '') {
      avisar('CEP é obrigatório');
      return;
    }
    if (!updatedData.endereco.numero || String(updatedData.endereco.numero).trim() === '') {
      avisar('Número do endereço é obrigatório');
      return;
    }
    if (String(updatedData.endereco.cep).replace(/\D/g, '').length !== 8) {
      avisar('CEP deve ter 8 dígitos');
      return;
    }

    const dataToSend = {
      nomeCliente: updatedData.nomeCliente.trim(),
      telefone: updatedData.telefone.trim(),
      loja: updatedData.loja.trim(),
      data: dateInputValue(updatedData.data) || updatedData.data,
      hora: updatedData.hora,
      status: updatedData.status,
      tipoImovel: updatedData.tipoImovel,
      ambientes: updatedData.ambientes,
      observacoes: updatedData.observacoes || '',
      endereco: {
        cep: String(updatedData.endereco.cep).replace(/\D/g, ''),
        logradouro: updatedData.endereco.logradouro || '',
        numero: String(updatedData.endereco.numero).trim(),
        complemento: updatedData.endereco.complemento || '',
        bairro: updatedData.endereco.bairro || '',
        cidade: updatedData.endereco.cidade || ''
      }
    };

    // Guarda os dados e pede confirmação antes de salvar
    setPendingUpdate({ id: selectedAgendamento.id, data: dataToSend });
    setShowConfirmModal(true);
  };

  const confirmUpdate = async () => {
    try {
      const isCanceling = pendingUpdate?.data?.status === 'cancelado';
      await apiService.updateAgendamento(pendingUpdate.id, pendingUpdate.data);

      setShowConfirmModal(false);
      setShowEditModal(false);
      setPendingUpdate(null);
      fetchAgendamentos();

      if (isCanceling) {
        avisar('Agendamento cancelado com sucesso!', 'success');
      }
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      setShowConfirmModal(false);
      avisar(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
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

  const mostrarMensagemCep = (texto) => {
    setCepMessage(texto);
    setTimeout(() => setCepMessage(''), 3000);
  };

  const buscarEndereco = async () => {
    const cep = String(selectedAgendamento.endereco?.cep || '').replace(/\D/g, '');
    if (cep.length !== 8) {
      mostrarMensagemCep('CEP deve ter 8 dígitos');
      return;
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        editarEndereco({ logradouro: data.logradouro, bairro: data.bairro, cidade: data.localidade });
        mostrarMensagemCep('CEP encontrado! Endereço preenchido.');
      } else {
        mostrarMensagemCep('CEP não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      mostrarMensagemCep('Erro ao buscar CEP');
    }
  };

  if (loading) {
    return <Spinner label="Carregando agendamentos..." />;
  }

  const total = filteredAgendamentos.length;

  return (
    <div>
      <PageHeader
        icon={FaTable}
        title="Agendamentos"
        subtitle={
          total === 0
            ? 'Nenhum agendamento'
            : `Mostrando ${startIndex + 1} a ${Math.min(endIndex, total)} de ${total}`
        }
      >
        <button type="button" onClick={handleExport} className="btn btn-success flex-1 sm:flex-none">
          <FaDownload />
          Exportar
        </button>
        <button
          type="button"
          onClick={handleDeleteSelected}
          disabled={selectedItems.length === 0}
          className="btn btn-danger flex-1 sm:flex-none"
        >
          <FaTrash />
          Excluir{selectedItems.length > 0 ? ` (${selectedItems.length})` : ''}
        </button>
      </PageHeader>

      {/* Busca */}
      <div className="relative mb-4 lg:max-w-xl">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="search"
          aria-label="Buscar agendamentos"
          placeholder="Buscar por nome, endereço, telefone, loja..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="field pl-10"
        />
      </div>

      {total === 0 ? (
        <div className="card">
          <EmptyState icon={FaCalendarAlt}>Nenhum agendamento encontrado</EmptyState>
        </div>
      ) : (
        <>
          {/* Celular: cartões */}
          <div className="md:hidden">
            <label className="flex items-center gap-3 min-h-[44px] px-1 mb-2 text-sm text-slate-300">
              <input type="checkbox" checked={todosSelecionados} onChange={handleSelectAll} className="w-5 h-5 rounded accent-blue-600" />
              Selecionar todos desta página
            </label>
            <ul className="space-y-3">
              {currentItems.map((agendamento) => {
                const endereco = formatEndereco(agendamento.endereco);
                return (
                  <li key={agendamento.id} className="card p-4">
                    <div className="flex items-start gap-3">
                      <label className="flex items-center justify-center w-8 h-11 -ml-1.5 -mt-1.5 shrink-0">
                        <input
                          type="checkbox"
                          aria-label={`Selecionar ${agendamento.nomeCliente || 'agendamento'}`}
                          checked={selectedItems.includes(agendamento.id)}
                          onChange={() => handleSelectItem(agendamento.id)}
                          className="w-5 h-5 rounded accent-blue-600"
                        />
                      </label>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-white break-words min-w-0">{agendamento.nomeCliente || 'Cliente sem nome'}</p>
                          <StatusBadge status={agendamento.status} className="shrink-0" />
                        </div>
                        <dl className="mt-2 space-y-1 text-sm text-slate-300">
                          {agendamento.telefone && (
                            <div className="flex items-center gap-2">
                              <FaPhone className="text-slate-400 text-xs shrink-0" />
                              <dd>{agendamento.telefone}</dd>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <FaCalendarAlt className="text-slate-400 text-xs shrink-0" />
                            <dd>
                              {formatDate(agendamento.data)}
                              {agendamento.hora ? ` às ${agendamento.hora}` : ''}
                            </dd>
                          </div>
                          {agendamento.loja && (
                            <div className="flex items-center gap-2">
                              <FaStore className="text-slate-400 text-xs shrink-0" />
                              <dd className="truncate">{agendamento.loja}</dd>
                            </div>
                          )}
                          {endereco && (
                            <div className="flex items-start gap-2">
                              <FaMapMarkerAlt className="text-slate-400 text-xs shrink-0 mt-1" />
                              <dd className="break-words min-w-0">{endereco}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button type="button" onClick={() => handleView(agendamento)} className="btn btn-neutral text-sm">
                        <FaEye />
                        Ver
                      </button>
                      <button type="button" onClick={() => handleEdit(agendamento)} className="btn btn-neutral text-sm">
                        <FaEdit />
                        Editar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Tablet e desktop: tabela */}
          <div className="hidden md:block card overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-xs font-medium text-slate-300 uppercase tracking-wider">
                <tr>
                  <th className="w-12 pl-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Selecionar todos desta página"
                      checked={todosSelecionados}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded accent-blue-600 align-middle"
                    />
                  </th>
                  <th className="px-3 py-3">Cliente</th>
                  <th className="px-3 py-3">Loja</th>
                  <th className="px-3 py-3">Data</th>
                  <th className="px-3 py-3 hidden lg:table-cell">Endereço</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {currentItems.map((agendamento) => (
                  <tr key={agendamento.id} className="hover:bg-white/5">
                    <td className="pl-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Selecionar ${agendamento.nomeCliente || 'agendamento'}`}
                        checked={selectedItems.includes(agendamento.id)}
                        onChange={() => handleSelectItem(agendamento.id)}
                        className="w-4 h-4 rounded accent-blue-600 align-middle"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 bg-blue-600/20 rounded-full shrink-0">
                          <FaUser className="text-blue-300 text-sm" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white break-words">{agendamento.nomeCliente || 'Cliente sem nome'}</p>
                          {agendamento.telefone && <p className="text-xs text-slate-400 whitespace-nowrap">{agendamento.telefone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-300">{agendamento.loja || '—'}</td>
                    <td className="px-3 py-3 text-sm text-slate-300 whitespace-nowrap">
                      <p className="flex items-center gap-1.5">
                        <FaCalendarAlt className="text-slate-400 text-xs" />
                        {formatDate(agendamento.data)}
                      </p>
                      {agendamento.hora && (
                        <p className="flex items-center gap-1.5 mt-0.5">
                          <FaClock className="text-slate-400 text-xs" />
                          {agendamento.hora}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-300 hidden lg:table-cell">
                      {formatEndereco(agendamento.endereco) || '—'}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={agendamento.status} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleView(agendamento)}
                          aria-label={`Ver detalhes de ${agendamento.nomeCliente || 'agendamento'}`}
                          title="Ver detalhes"
                          className="btn-icon text-blue-300 hover:bg-white/10"
                        >
                          <FaEye />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(agendamento)}
                          aria-label={`Editar ${agendamento.nomeCliente || 'agendamento'}`}
                          title="Editar"
                          className="btn-icon text-green-300 hover:bg-white/10"
                        >
                          <FaEdit />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between gap-3 mt-4">
            <p className="text-sm text-slate-300">
              Página {paginaAtual} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, paginaAtual - 1))}
                disabled={paginaAtual === 1}
                className="btn btn-neutral px-3 text-sm"
              >
                <FaChevronLeft className="text-xs" />
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(totalPages, paginaAtual + 1))}
                disabled={paginaAtual === totalPages}
                className="btn btn-neutral px-3 text-sm"
              >
                Próxima
                <FaChevronRight className="text-xs" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal de visualização */}
      {showViewModal && selectedAgendamento && (
        <Modal
          title="Detalhes do Agendamento"
          icon={FaEye}
          onClose={() => setShowViewModal(false)}
          footer={
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
              <button type="button" onClick={() => setShowViewModal(false)} className="btn btn-neutral">
                Fechar
              </button>
              {selectedAgendamento.status !== 'concluido' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedAgendamento.id, 'concluido')}
                  className="btn btn-primary"
                >
                  <FaCheckCircle />
                  Concluir agendamento
                </button>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            <Bloco title="Cliente">
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Detalhe label="Nome">{selectedAgendamento.nomeCliente || 'Não informado'}</Detalhe>
                <Detalhe label="Telefone">{selectedAgendamento.telefone || 'Não informado'}</Detalhe>
                <Detalhe label="Status">
                  <StatusBadge status={selectedAgendamento.status} />
                </Detalhe>
              </dl>
            </Bloco>

            <Bloco title="Agendamento">
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Detalhe label="Loja" className="col-span-2 sm:col-span-1">{selectedAgendamento.loja || 'Não informada'}</Detalhe>
                <Detalhe label="Data">{formatDate(selectedAgendamento.data)}</Detalhe>
                <Detalhe label="Horário">{selectedAgendamento.hora || 'Não definido'}</Detalhe>
                <Detalhe label="Tipo de imóvel" className="col-span-2 sm:col-span-1">
                  <span className="capitalize">{selectedAgendamento.tipoImovel || 'Não informado'}</span>
                </Detalhe>
                <Detalhe label="Ambientes" className="col-span-2 sm:col-span-4">
                  {selectedAgendamento.ambientes && selectedAgendamento.ambientes.length > 0
                    ? selectedAgendamento.ambientes.join(', ')
                    : 'Não informados'}
                </Detalhe>
                <Detalhe label="Observações" className="col-span-2 sm:col-span-4">
                  {selectedAgendamento.observacoes || 'Nenhuma'}
                </Detalhe>
              </dl>
            </Bloco>

            {selectedAgendamento.endereco && (
              <Bloco title="Endereço">
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Detalhe label="Logradouro" className="col-span-2">{selectedAgendamento.endereco.logradouro || '—'}</Detalhe>
                  <Detalhe label="Número">{selectedAgendamento.endereco.numero || '—'}</Detalhe>
                  <Detalhe label="Complemento">{selectedAgendamento.endereco.complemento || '—'}</Detalhe>
                  <Detalhe label="Bairro">{selectedAgendamento.endereco.bairro || '—'}</Detalhe>
                  <Detalhe label="Cidade">{selectedAgendamento.endereco.cidade || '—'}</Detalhe>
                  <Detalhe label="CEP">{selectedAgendamento.endereco.cep || '—'}</Detalhe>
                </dl>
              </Bloco>
            )}
          </div>
        </Modal>
      )}

      {/* Modal de edição */}
      {showEditModal && selectedAgendamento && (
        <Modal
          title="Editar Agendamento"
          icon={FaEdit}
          onClose={() => setShowEditModal(false)}
          footer={
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
              <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-neutral">
                Cancelar
              </button>
              <button type="button" onClick={() => handleUpdateAgendamento(selectedAgendamento)} className="btn btn-success">
                <FaSave />
                Salvar alterações
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <Bloco title="Cliente">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-nome" className="field-label">Nome</label>
                  <input
                    id="edit-nome"
                    type="text"
                    value={selectedAgendamento.nomeCliente || ''}
                    onChange={(e) => editar({ nomeCliente: e.target.value })}
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor="edit-telefone" className="field-label">Telefone</label>
                  <input
                    id="edit-telefone"
                    type="tel"
                    inputMode="tel"
                    value={selectedAgendamento.telefone || ''}
                    onChange={(e) => editar({ telefone: e.target.value })}
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor="edit-status" className="field-label">Status</label>
                  <select
                    id="edit-status"
                    value={selectedAgendamento.status || ''}
                    onChange={(e) => editar({ status: e.target.value })}
                    className="field"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="agendar">A agendar</option>
                  </select>
                </div>
              </div>
            </Bloco>

            <Bloco title="Agendamento">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="edit-loja" className="field-label">Loja</label>
                  <select
                    id="edit-loja"
                    value={selectedAgendamento.loja || ''}
                    onChange={(e) => editar({ loja: e.target.value })}
                    className="field"
                  >
                    <option value="">Selecione a loja</option>
                    {/* Mantém visível uma loja antiga que não esteja mais na lista */}
                    {selectedAgendamento.loja && !LOJAS.includes(selectedAgendamento.loja) && (
                      <option value={selectedAgendamento.loja}>{selectedAgendamento.loja}</option>
                    )}
                    {LOJAS.map((loja) => (
                      <option key={loja} value={loja}>{loja}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="edit-tipo" className="field-label">Tipo de imóvel</label>
                  <select
                    id="edit-tipo"
                    value={selectedAgendamento.tipoImovel || ''}
                    onChange={(e) => editar({ tipoImovel: e.target.value })}
                    className="field"
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="casa">Casa</option>
                    <option value="apartamento">Apartamento</option>
                    <option value="sobrado">Sobrado</option>
                    <option value="comercial">Comercial</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-data" className="field-label">Data</label>
                  <input
                    id="edit-data"
                    type="date"
                    value={dateInputValue(selectedAgendamento.data)}
                    onChange={(e) => editar({ data: e.target.value })}
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor="edit-hora" className="field-label">Horário</label>
                  <input
                    id="edit-hora"
                    type="time"
                    value={selectedAgendamento.hora || ''}
                    onChange={(e) => editar({ hora: e.target.value })}
                    className="field"
                  />
                </div>
                <div className="col-span-2">
                  <p id="edit-ambientes" className="field-label">Ambientes</p>
                  {selectedAgendamento.tipoImovel ? (
                    <div role="group" aria-labelledby="edit-ambientes" className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 gap-x-3">
                      {ambientesPorTipo(selectedAgendamento.tipoImovel).map((ambiente) => {
                        const ambientes = selectedAgendamento.ambientes || [];
                        return (
                          <label key={ambiente} className="flex items-center gap-2.5 min-h-[44px] text-sm text-white cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ambientes.includes(ambiente)}
                              onChange={(e) =>
                                editar({
                                  ambientes: e.target.checked ? [...ambientes, ambiente] : ambientes.filter((a) => a !== ambiente)
                                })
                              }
                              className="w-5 h-5 rounded accent-blue-600 shrink-0"
                            />
                            <span>{ambiente}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">Selecione o tipo de imóvel primeiro</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label htmlFor="edit-obs" className="field-label">Observações</label>
                  <textarea
                    id="edit-obs"
                    value={selectedAgendamento.observacoes || ''}
                    onChange={(e) => editar({ observacoes: e.target.value })}
                    rows={3}
                    className="field resize-none"
                  />
                </div>
              </div>
            </Bloco>

            <Bloco title="Endereço">
              {cepMessage && (
                <div
                  role="status"
                  className={`mb-3 p-3 rounded-lg text-sm border ${
                    cepMessage.includes('preenchido')
                      ? 'bg-green-600/20 text-green-300 border-green-600/30'
                      : 'bg-yellow-600/20 text-yellow-300 border-yellow-600/30'
                  }`}
                >
                  {cepMessage}
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                <div className="col-span-2 sm:col-span-3">
                  <label htmlFor="edit-cep" className="field-label">CEP</label>
                  <div className="flex gap-2">
                    <input
                      id="edit-cep"
                      type="text"
                      inputMode="numeric"
                      maxLength={9}
                      value={selectedAgendamento.endereco?.cep || ''}
                      onChange={(e) => editarEndereco({ cep: e.target.value })}
                      onBlur={buscarEndereco}
                      className="field flex-1 min-w-0"
                      placeholder="00000-000"
                    />
                    <button type="button" onClick={buscarEndereco} className="btn btn-primary px-3 shrink-0">
                      <FaSearch />
                      Buscar
                    </button>
                  </div>
                </div>
                <div className="sm:col-span-1">
                  <label htmlFor="edit-numero" className="field-label">Número</label>
                  <input
                    id="edit-numero"
                    type="text"
                    value={selectedAgendamento.endereco?.numero || ''}
                    onChange={(e) => editarEndereco({ numero: e.target.value })}
                    className="field"
                    placeholder="123"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="edit-complemento" className="field-label">Complemento</label>
                  <input
                    id="edit-complemento"
                    type="text"
                    value={selectedAgendamento.endereco?.complemento || ''}
                    onChange={(e) => editarEndereco({ complemento: e.target.value })}
                    className="field"
                    placeholder="Apto 101"
                  />
                </div>
                <div className="col-span-2 sm:col-span-6">
                  <label htmlFor="edit-logradouro" className="field-label">Logradouro</label>
                  <input
                    id="edit-logradouro"
                    type="text"
                    value={selectedAgendamento.endereco?.logradouro || ''}
                    onChange={(e) => editarEndereco({ logradouro: e.target.value })}
                    className="field"
                    placeholder="Rua, Avenida, etc"
                  />
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <label htmlFor="edit-bairro" className="field-label">Bairro</label>
                  <input
                    id="edit-bairro"
                    type="text"
                    value={selectedAgendamento.endereco?.bairro || ''}
                    onChange={(e) => editarEndereco({ bairro: e.target.value })}
                    className="field"
                    placeholder="Centro"
                  />
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <label htmlFor="edit-cidade" className="field-label">Cidade</label>
                  <input
                    id="edit-cidade"
                    type="text"
                    value={selectedAgendamento.endereco?.cidade || ''}
                    onChange={(e) => editarEndereco({ cidade: e.target.value })}
                    className="field"
                    placeholder="São Paulo"
                  />
                </div>
              </div>
            </Bloco>
          </div>
        </Modal>
      )}

      {/* Confirmação antes de salvar */}
      {showConfirmModal && (
        <Modal
          title="Confirmar alterações"
          icon={FaSave}
          size="sm:max-w-md"
          onClose={cancelUpdate}
          footer={
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
              <button type="button" onClick={cancelUpdate} className="btn btn-neutral">
                Cancelar
              </button>
              <button type="button" onClick={confirmUpdate} className="btn btn-success">
                Sim, salvar
              </button>
            </div>
          }
        >
          <p className="text-slate-200">Tem certeza que deseja salvar as alterações deste agendamento?</p>
        </Modal>
      )}

      {/* Avisos de validação, erro e sucesso */}
      {showValidationError && (
        <Modal
          title={validationType === 'success' ? 'Sucesso!' : validationType === 'error' ? 'Atenção' : 'Informação'}
          size="sm:max-w-md"
          onClose={closeValidationError}
          footer={
            <button type="button" onClick={closeValidationError} className="btn btn-primary w-full">
              Entendido
            </button>
          }
        >
          <div className="flex items-start gap-3">
            {validationType === 'success' ? (
              <FaCheckCircle className="text-green-400 text-2xl shrink-0 mt-0.5" />
            ) : validationType === 'error' ? (
              <FaExclamationTriangle className="text-red-400 text-2xl shrink-0 mt-0.5" />
            ) : (
              <FaInfoCircle className="text-blue-400 text-2xl shrink-0 mt-0.5" />
            )}
            <p className="text-slate-200">{validationMessage}</p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ListaAgendamentos;
