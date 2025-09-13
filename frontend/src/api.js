import axios from 'axios';
const api = axios.create({ baseURL: 'http://localhost:8000/api' });

api.interceptors.request.use(cfg => { 
  const t = localStorage.getItem('token'); 
  if (t) cfg.headers.Authorization = `Bearer ${t}`; 
  return cfg; 
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