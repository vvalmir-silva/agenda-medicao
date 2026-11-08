// URL base da API. Por padrão usa a mesma origem do site (/api):
// - no Vercel, /api é atendido pela função serverless;
// - no `npm start`, o "proxy" do package.json repassa /api para localhost:5000.
export const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export const apiService = {
  getAuthHeader() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  async request(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        ...options.headers
      }
    });

    let body = null;
    try {
      body = await response.json();
    } catch (e) {
      // resposta sem JSON
    }

    if (!response.ok) {
      // Sessão inválida/expirada: volta para o login
      if (response.status === 401 && !endpoint.startsWith('/auth/login')) {
        clearSession();
        window.location.hash = '/login';
        window.location.reload();
      }
      throw new Error((body && body.error) || `Erro na requisição (${response.status})`);
    }

    return body;
  },

  // ============= AGENDAMENTOS =============

  getAgendamentos() {
    return this.request('/agendamentos');
  },

  createAgendamento(data) {
    return this.request('/agendamentos', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateAgendamento(id, data) {
    return this.request(`/agendamentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteAgendamento(id) {
    return this.request(`/agendamentos/${id}`, {
      method: 'DELETE'
    });
  },

  // ============= USUÁRIOS (admin) =============

  getUsers() {
    return this.request('/users');
  },

  createUser(data) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateUser(id, data) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteUser(id) {
    return this.request(`/users/${id}`, {
      method: 'DELETE'
    });
  }
};
