const API_BASE_URL = process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost'
  ? `${window.location.protocol}//${window.location.hostname}` 
  : 'http://localhost:5000/api';

// Mock data para produção
const mockAgendamentos = [
  {
    id: '1',
    cliente: 'João Silva',
    data: '2026-01-22',
    hora: '14:00',
    servico: 'Medição Predial',
    status: 'confirmado',
    loja: 'Matriz'
  },
  {
    id: '2',
    cliente: 'Maria Santos',
    data: '2026-01-23',
    hora: '10:00',
    servico: 'Medição Residencial',
    status: 'pendente',
    loja: 'Filial'
  },
  {
    id: '3',
    cliente: 'Carlos Oliveira',
    data: '2026-01-24',
    hora: '16:00',
    servico: 'Medição Comercial',
    status: 'agendar',
    loja: 'Matriz'
  }
];

export const apiService = {
  // Get auth token
  getAuthHeader() {
    const token = localStorage.getItem('token');
    console.log('Token from localStorage:', token ? 'exists' : 'missing');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  },

  // Generic request method
  async request(endpoint, options = {}) {
    const isProduction = process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost';
    console.log('API Request - NODE_ENV:', process.env.NODE_ENV);
    console.log('API Request - Hostname:', window.location.hostname);
    console.log('API Request - Is Production:', isProduction);
    console.log('API Request - Endpoint:', endpoint);
    
    // Em produção, usar a API real do Vercel
    if (isProduction) {
      console.log('Production API - Using real data from MongoDB');
      
      const url = `${API_BASE_URL}${endpoint}`;
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader(),
          ...options.headers
        },
        ...options
      };

      console.log('Making production request to:', url);
      console.log('Config:', config);

      const response = await fetch(url, config);
      
      console.log('Production response status:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Production API Error:', error);
        
        // Se o token for inválido, limpar localStorage
        if (response.status === 401 || response.status === 403 || (response.status === 500 && error.error?.includes('token'))) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.hash = '/login';
        }
        
        throw new Error(error.error || 'Request failed');
      }

      return response.json();
    }
    
    // Backend real para desenvolvimento
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        ...options.headers
      },
      ...options
    };

    console.log('Making dev request to:', url);
    console.log('Config:', config);

    const response = await fetch(url, config);
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const error = await response.json();
      console.error('API Error:', error);
      
      // Se o token for inválido (401 Unauthorized), limpar localStorage
      if (response.status === 401 || response.status === 403 || (response.status === 500 && error.error?.includes('token'))) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Usar HashRouter format para redirecionamento
        window.location.hash = '/login';
      }
      
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  },

  // ============= AGENDAMENTOS =============
  
  async getAgendamentos() {
    return this.request('/agendamentos');
  },

  async createAgendamento(data) {
    return this.request('/agendamentos', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateAgendamento(id, data) {
    console.log('=== API UPDATE AGENDAMENTO ===');
    console.log('ID:', id);
    console.log('Data:', data);
    console.log('Endpoint:', `/agendamentos/${id}`);
    
    try {
      const response = await this.request(`/agendamentos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      
      console.log('Resposta updateAgendamento:', response);
      console.log('=== FIM API UPDATE ===');
      
      return response;
    } catch (error) {
      console.error('Erro em updateAgendamento:', error);
      throw error;
    }
  },

  async deleteAgendamento(id) {
    return this.request(`/agendamentos/${id}`, {
      method: 'DELETE'
    });
  },

  // ============= LOJAS =============
  
  async getLojas() {
    return this.request('/lojas');
  },

  async createLoja(data) {
    return this.request('/lojas', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // ============= CLIENTES =============
  
  async getClientes() {
    return this.request('/clientes');
  },

  async createCliente(data) {
    return this.request('/clientes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // ============= MEDICOES =============
  
  async getMedicoes() {
    return this.request('/medicoes');
  },

  async createMedicao(data) {
    return this.request('/medicoes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // ============= PROJETOS =============
  
  async getProjetos() {
    return this.request('/projetos');
  },

  async createProjeto(data) {
    return this.request('/projetos', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // ============= FINANCEIRO =============
  
  async getFinanceiro() {
    return this.request('/financeiro');
  },

  async createMovimento(data) {
    return this.request('/financeiro', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // ============= NOTIFICACOES =============
  
  async getNotificacoes() {
    return this.request('/notificacoes');
  },

  async createNotificacao(data) {
    return this.request('/notificacoes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async marcarNotificacaoLida(id) {
    return this.request(`/notificacoes/${id}/lida`, {
      method: 'PUT'
    });
  }
};
