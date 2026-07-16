import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:7129/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const auth = JSON.parse(localStorage.getItem('auth-data') || '{}');
  const token = auth?.state?.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth-data');
      window.location.href = '/login';
    } else if (err.response?.status === 429) {
      if (!document.getElementById('rate-limit-toast')) {
        const toast = document.createElement('div');
        toast.id = 'rate-limit-toast';
        toast.innerHTML = `
          <div style="position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#e53e3e;color:#fff;padding:12px 24px;border-radius:8px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.3);font-weight:bold;font-size:14px;display:flex;align-items:center;gap:10px;animation:fadeInDown 0.3s ease;">
            <span>✋</span> Too Many Requests. Please slow down.
          </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 4000);
      }
    }
    return Promise.reject(err);
  }
);

export const disasterApi = {
  getAll: (status) => api.get('/disasters', { params: status ? { status } : {} }),
  getById: (id) => api.get(`/disasters/${id}`),
  verify: (id) => api.put(`/disasters/${id}/verify`),
  updateStatus: (id, status) => api.put(`/disasters/${id}/status`, { status }),
  create: (data) => api.post('/disasters', data),
  delete: (id) => api.delete(`/disasters/${id}`),
  getReporter: (id) => api.get(`/disasters/${id}/reporter`),
};

export const reportApi = {
  submit: (data) => api.post('/reports', data),
  getAll: (status) => api.get('/reports', { params: status ? { status } : {} }),
  getMyReports: () => api.get('/reports/my'),
  getById: (id) => api.get(`/reports/${id}`),
  createDisaster: (id, data) => api.put(`/reports/${id}/create-disaster`, data),
  mergeExisting: (id, disasterId) => api.put(`/reports/${id}/merge-existing`, { disasterId }),
  reject: (id, reason) => api.put(`/reports/${id}/reject`, { reason }),
};

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export const orgApi = {
  getAll: () => api.get('/organizations'),
};

export const geocodingApi = {
  search: (query) => api.get('/geocoding/search', { params: { query } }),
};

export const alertApi = {
  getAll: () => api.get('/alerts'),
};

export const responderApi = {
  getMyAvailability: () => api.get('/users/me/availability'),
  setAvailability: (status) => api.put('/users/me/availability', { status }),
};

export const chatApi = {
  getMessages: (orgId) => api.get(`/chat/${orgId}/messages`),
  sendMessage: (orgId, message) => api.post(`/chat/${orgId}/messages`, { message }),
};
export default api;
