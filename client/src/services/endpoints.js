import { api } from './api.js';

export const authApi = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data.data),
  me: () => api.get('/auth/me').then((r) => r.data.data.user),
};

export const userApi = {
  list: (params) => api.get('/users', { params }).then((r) => r.data.data),
  get: (id) => api.get(`/users/${id}`).then((r) => r.data.data.user),
  create: (payload) => api.post('/users', payload).then((r) => r.data.data.user),
  update: (id, payload) => api.patch(`/users/${id}`, payload).then((r) => r.data.data.user),
  remove: (id) => api.delete(`/users/${id}`).then((r) => r.data),
};

export const complaintApi = {
  list: (params) => api.get('/complaints', { params }).then((r) => r.data.data),
  get: (id) =>
    api.get(`/complaints/${id}`).then((r) => ({
      complaint: r.data.data.complaint,
      comments: r.data.data.comments,
      activities: r.data.data.activities,
      feedback: r.data.data.feedback,
    })),
  create: (formData) =>
    api.post('/complaints', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data.data.complaint),
  update: (id, payload) => api.patch(`/complaints/${id}`, payload).then((r) => r.data.data.complaint),
  remove: (id, reason) => api.delete(`/complaints/${id}`, { data: { reason } }).then((r) => r.data),
  assign: (id, assignedTo) =>
    api.patch(`/complaints/${id}/assign`, { assignedTo }).then((r) => r.data.data.complaint),
  setStatus: (id, payload) =>
    api.patch(`/complaints/${id}/status`, payload).then((r) => r.data.data.complaint),
  addComment: (id, text) =>
    api.post(`/complaints/${id}/comments`, { text }).then((r) => r.data.data.comment),
  listComments: (id, params) => api.get(`/complaints/${id}/comments`, { params }).then((r) => r.data.data),
};

export const feedbackApi = {
  submit: (id, payload) =>
    api.post(`/complaints/${id}/feedback`, payload).then((r) => r.data.data.feedback),
  list: (params) => api.get('/feedback', { params }).then((r) => r.data.data),
};

export const analyticsApi = {
  dashboard: () => api.get('/analytics/dashboard').then((r) => r.data.data),
  byCategory: () => api.get('/analytics/complaints-by-category').then((r) => r.data.data.categories),
  monthly: (months = 6) =>
    api.get('/analytics/monthly-statistics', { params: { months } }).then((r) => r.data.data.months),
};
