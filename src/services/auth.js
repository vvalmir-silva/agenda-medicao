const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://agenda-medicao-git-main-vvalmir-silvas-projects.vercel.app'
  : 'http://localhost:5000/api';

export const authService = {
  // Login
  async login(username, password) {
    // Mock para produção temporariamente
    if (process.env.NODE_ENV === 'production') {
      if (username === 'admin' && password === 'admin123') {
        const mockUser = {
          token: 'mock-jwt-token-12345',
          user: {
            id: 'admin-001',
            email: 'admin@agenda.com',
            nome: 'Administrador',
            role: 'admin'
          }
        };
        
        // Salvar no localStorage
        localStorage.setItem('token', mockUser.token);
        localStorage.setItem('user', JSON.stringify(mockUser.user));
        
        return mockUser;
      } else {
        throw new Error('Credenciais inválidas');
      }
    }
    
    // Backend real para desenvolvimento
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao fazer login');
    }

    const data = await response.json();
    
    // Salvar token e usuário no localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  },

  // Logout
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Get current user
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Get token
  getToken() {
    return localStorage.getItem('token');
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

  // Check if user is admin
  isAdmin() {
    const user = this.getCurrentUser();
    return user && user.role === 'admin';
  },

  // Get user info
  async getUserInfo() {
    const token = this.getToken();
    if (!token) return null;

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      this.logout();
      return null;
    }

    const user = await response.json();
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  }
};
