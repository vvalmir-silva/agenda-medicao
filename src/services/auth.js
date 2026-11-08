import { apiService } from './api';

export const authService = {
  async login(username, password) {
    const data = await apiService.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem('token');
  },

  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

  isAdmin() {
    const user = this.getCurrentUser();
    return !!user && user.role === 'admin';
  },

  async getUserInfo() {
    if (!this.getToken()) return null;
    try {
      const user = await apiService.request('/auth/me');
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (e) {
      this.logout();
      return null;
    }
  }
};
