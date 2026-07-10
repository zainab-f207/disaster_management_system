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

export default api;
