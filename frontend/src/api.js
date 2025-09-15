import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 
                     window.location.origin.replace(/:\d+$/, ':8000');

const api = axios.create({ 
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000
});

// Add retry mechanism for failed requests
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.code === 'ECONNABORTED' || !error.response) {
      console.error('Network error or timeout:', error.message);
      // You can show a user-friendly message here
    }
    return Promise.reject(error);
  }
);

api.interceptors.request.use(config => { 
  const token = localStorage.getItem('token'); 
  if (token) config.headers.Authorization = `Bearer ${token}`; 
  return config; 
});

// Store user ID on login
api.interceptors.response.use(
  response => {
    if (response.config.url.includes('/auth/login') || response.config.url.includes('/auth/signup')) {
      if (response.data.user && response.data.user.id) {
        localStorage.setItem('userId', response.data.user.id);
      }
    }
    return response;
  },
  error => {
    return Promise.reject(error);
  }
);

export default {
  auth: {
    signup: (data) => api.post('/auth/signup', data),
    login: (data) => api.post('/auth/login', data)
  },
  groups: {
    list: () => api.get('/groups'),
    create: (data) => api.post('/groups', data),
    get: (id) => api.get(`/groups/${id}`),
    balances: (id) => api.get(`/groups/${id}/balances`),
    totalBalances: (id) => api.get(`/groups/${id}/total-balances`),
    addMember: (groupId, data) => api.post(`/groups/${groupId}/members`, data),
    removeMember: (groupId, memberId) => api.delete(`/groups/${groupId}/members/${memberId}`)
  },
  expenses: {
    create: (data) => api.post('/expenses', data),
    list: (groupId) => api.get(`/expenses/${groupId}`),
    delete: (expenseId) => api.delete(`/expenses/${expenseId}`),
    calculateSplit: (groupId, data) => api.post(`/expenses/${groupId}/calculate-split`, data)
  },
  payments: {
    create: (data) => api.post('/payments', data),
    me: () => api.get('/payments/me'),
    settle: (data) => api.post('/payments/settle', data),
    settlements: (groupId) => api.get(`/payments/settlements/${groupId}`)
  }
};
