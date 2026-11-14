import React, { useState, useEffect } from 'react';
import { FaUsers, FaUserPlus, FaTrash, FaEdit, FaSearch, FaEnvelope, FaShieldAlt, FaUser } from 'react-icons/fa';
import { apiService } from '../services/api';
import { PageHeader, Spinner, EmptyState, Alert, Modal } from './ui';

const emptyForm = {
  nome: '',
  email: '',
  senha: '',
  role: 'user',
  ativo: true
};

const Admin = ({ user, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await apiService.getUsers();
      setUsers(Array.isArray(data) ? data : []);
      setErrorMessage('');
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setErrorMessage(error.message || 'Erro ao carregar usuários');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (showEditModal) {
        await apiService.updateUser(selectedUser.id, formData);
      } else {
        await apiService.createUser(formData);
      }
      await fetchUsers();
      setShowCreateModal(false);
      setShowEditModal(false);
      setFormData(emptyForm);
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      window.alert(error.message || 'Erro ao salvar usuário');
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      nome: user.nome,
      email: user.email,
      senha: '',
      role: user.role,
      ativo: user.ativo
    });
    setShowEditModal(true);
  };

  const handleDelete = async (user) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await apiService.deleteUser(user.id);
        await fetchUsers();
      } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        window.alert(error.message || 'Erro ao excluir usuário');
      }
    }
  };

  const filteredUsers = (users || []).filter(user =>
    (user.nome && user.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const fecharModal = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setFormData(emptyForm);
  };

  if (loading) {
    return <Spinner label="Carregando usuários..." />;
  }

  return (
    <div>
      <PageHeader icon={FaUsers} title="Gerenciar Usuários" subtitle="Administração de usuários do sistema">
        <button type="button" onClick={() => setShowCreateModal(true)} className="btn btn-primary w-full sm:w-auto">
          <FaUserPlus />
          Novo usuário
        </button>
      </PageHeader>

      <div className="relative mb-4 lg:max-w-xl">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="search"
          aria-label="Buscar usuários"
          placeholder="Buscar usuários..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="field pl-10"
        />
      </div>

      {errorMessage && (
        <div className="mb-4">
          <Alert>{errorMessage}</Alert>
        </div>
      )}

      {filteredUsers.length === 0 ? (
        <div className="card">
          <EmptyState icon={FaUsers}>Nenhum usuário encontrado</EmptyState>
        </div>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {filteredUsers.map((user) => (
            <li key={user.id} className="card p-4">
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-11 h-11 bg-blue-600 rounded-full shrink-0">
                  <FaUser className="text-white text-lg" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-white font-semibold break-words">{user.nome}</h2>
                  <p className="flex items-center gap-1.5 text-slate-300 text-sm min-w-0">
                    <FaEnvelope className="text-xs shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${
                      user.role === 'admin'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : 'bg-green-500/20 text-green-300 border-green-500/30'
                    }`}>
                      <FaShieldAlt className="text-xs" />
                      {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${
                      user.ativo
                        ? 'bg-green-500/20 text-green-300 border-green-500/30'
                        : 'bg-red-500/20 text-red-300 border-red-500/30'
                    }`}>
                      {user.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 sm:flex sm:justify-end">
                <button type="button" onClick={() => handleEdit(user)} className="btn btn-neutral text-sm">
                  <FaEdit />
                  Editar
                </button>
                <button type="button" onClick={() => handleDelete(user)} className="btn btn-neutral text-sm text-red-300">
                  <FaTrash />
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(showCreateModal || showEditModal) && (
        <Modal
          title={showEditModal ? 'Editar Usuário' : 'Novo Usuário'}
          icon={showEditModal ? FaEdit : FaUserPlus}
          size="sm:max-w-md"
          onClose={fecharModal}
          footer={
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
              <button type="button" onClick={fecharModal} className="btn btn-neutral">
                Cancelar
              </button>
              <button type="submit" form="form-usuario" className="btn btn-primary">
                {showEditModal ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          }
        >
          <form id="form-usuario" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="usuario-nome" className="field-label">Nome</label>
              <input
                id="usuario-nome"
                type="text"
                required
                autoComplete="name"
                value={formData.nome || ''}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="usuario-email" className="field-label">Email</label>
              <input
                id="usuario-email"
                type="email"
                required
                inputMode="email"
                autoComplete="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="usuario-senha" className="field-label">
                Senha {showEditModal && <span className="font-normal text-slate-400">(deixe em branco para manter a atual)</span>}
              </label>
              <input
                id="usuario-senha"
                type="password"
                required={!showEditModal}
                autoComplete="new-password"
                value={formData.senha || ''}
                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="usuario-role" className="field-label">Função</label>
              <select
                id="usuario-role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="field"
              >
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <label className="flex items-center gap-3 min-h-[44px] text-sm font-medium text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.ativo || false}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="w-5 h-5 rounded accent-blue-600"
              />
              Usuário ativo
            </label>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Admin;
