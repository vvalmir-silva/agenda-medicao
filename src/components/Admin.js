import React, { useState, useEffect } from 'react';
import { FaUsers, FaUserPlus, FaTrash, FaEdit, FaEye, FaSearch, FaStore, FaEnvelope, FaKey, FaShieldAlt, FaUser } from 'react-icons/fa';
import { authService } from '../services/auth';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://agenda-medicao-git-main-vvalmir-silvas-projects.vercel.app'
  : 'http://localhost:5000/api';

// Mock users para produção
const mockUsers = [
  {
    id: 'admin-001',
    nome: 'Administrador',
    email: 'admin@agenda.com',
    role: 'admin',
    ativo: true
  },
  {
    id: 'user-001',
    nome: 'João Silva',
    email: 'joao@email.com',
    role: 'user',
    ativo: true
  },
  {
    id: 'user-002',
    nome: 'Maria Santos',
    email: 'maria@email.com',
    role: 'user',
    ativo: true
  }
];

const Admin = ({ user, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    role: 'user',
    ativo: true
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('Token:', token ? 'exists' : 'missing');
      
      // Mock para produção
      if (process.env.NODE_ENV === 'production') {
        setUsers(mockUsers);
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Users data:', data);
        setUsers(data);
      } else {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        if (response.status === 401) {
          console.error('Unauthorized - token invalid or expired');
        }
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      // Fallback para mock em produção
      if (process.env.NODE_ENV === 'production') {
        setUsers(mockUsers);
      } else {
        setUsers([]); // Set empty array on error
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = showEditModal ? `${API_BASE_URL}/users/${selectedUser.id}` : `${API_BASE_URL}/users/register`;
      const method = showEditModal ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchUsers();
        setShowCreateModal(false);
        setShowEditModal(false);
        setFormData({
          nome: '',
          email: '',
          senha: '',
          role: 'user',
          ativo: true
        });
      }
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
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

  const handleDelete = async (userId) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          await fetchUsers();
        }
      } catch (error) {
        console.error('Erro ao excluir usuário:', error);
      }
    }
  };

  const filteredUsers = (users || []).filter(user =>
    (user.nome && user.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
          <p className="text-white mt-4">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center">
            <FaUsers className="mr-3 text-blue-400" />
            Gerenciar Usuários
          </h1>
          <p className="text-gray-300">Administração de usuários do sistema</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar usuários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center transition-colors"
            >
              <FaUserPlus className="mr-2" />
              Novo Usuário
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          {filteredUsers.map((user) => (
            <div key={user._id} className="bg-white/10 backdrop-blur-md rounded-xl p-4 hover:bg-white/20 transition-colors">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <FaUser className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{user.nome}</h3>
                    <p className="text-gray-300 text-sm flex items-center">
                      <FaEnvelope className="mr-1 text-xs" />
                      {user.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-green-500/20 text-green-300 border border-green-500/30'
                      }`}>
                        <FaShieldAlt className="inline mr-1 text-xs" />
                        {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.ativo 
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        {user.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(user)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(user._id)}
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {(showCreateModal || showEditModal) && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">
                {showEditModal ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    required
                    value={formData.nome || ''}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email || ''}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha {showEditModal && '(deixe em branco para manter atual)'}
                  </label>
                  <input
                    type="password"
                    required={!showEditModal}
                    value={formData.senha || ''}
                    onChange={(e) => setFormData({...formData, senha: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">Usuário</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo || false}
                    onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="ativo" className="text-sm font-medium text-gray-700">Usuário Ativo</label>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
                  >
                    {showEditModal ? 'Atualizar' : 'Criar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowEditModal(false);
                      setFormData({
                        nome: '',
                        email: '',
                        senha: '',
                        role: 'user',
                        ativo: true
                      });
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
