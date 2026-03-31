const API_BASE = window.location.hostname === 'localhost' ? '/api' : '/api';

class ApiClient {
  constructor() {
    this.accessToken = null;
  }

  setToken(token) {
    this.accessToken = token;
  }

  clearToken() {
    this.accessToken = null;
  }

  async request(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Send cookies for refresh token
    });

    const data = await res.json();

    // Auto-refresh on 401 TOKEN_EXPIRED
    if (res.status === 401 && data.code === 'TOKEN_EXPIRED') {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        const retryRes = await fetch(`${API_BASE}${endpoint}`, { ...options, headers, credentials: 'include' });
        return { ok: retryRes.ok, status: retryRes.status, data: await retryRes.json() };
      }
    }

    return { ok: res.ok, status: res.status, data };
  }

  async refreshToken() {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        this.accessToken = data.accessToken;
        return true;
      }
    } catch {}
    return false;
  }

  // Auth
  register(body) { return this.request('/auth/register', { method: 'POST', body: JSON.stringify(body) }); }
  login(body) { return this.request('/auth/login', { method: 'POST', body: JSON.stringify(body) }); }
  logout() { return this.request('/auth/logout', { method: 'POST' }); }
  getMe() { return this.request('/auth/me'); }

  // Tasks
  getTasks(query = '') { return this.request(`/tasks${query ? '?' + query : ''}`); }
  getStats() { return this.request('/tasks/stats'); }
  createTask(body) { return this.request('/tasks', { method: 'POST', body: JSON.stringify(body) }); }
  updateTask(id, body) { return this.request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }); }
  deleteTask(id) { return this.request(`/tasks/${id}`, { method: 'DELETE' }); }

  // Admin
  getUsers() { return this.request('/admin/users'); }
  deleteUser(id) { return this.request(`/admin/users/${id}`, { method: 'DELETE' }); }
  updateUserRole(id, role) { return this.request(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }); }
}

export const api = new ApiClient();
