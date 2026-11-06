import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Without a timeout a dead backend leaves every button spinning forever.
  timeout: 20000,
});

// Turn axios' generic failures into messages that are actually useful in the UI.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      error.friendlyMessage = `Request timed out. Is the backend running at ${API_BASE_URL}?`;
    } else if (!error.response) {
      error.friendlyMessage =
        `Cannot reach the backend at ${API_BASE_URL}. ` +
        'Make sure the API server is running and that CORS allows this origin.';
    } else {
      const detail = error.response.data?.detail;
      error.friendlyMessage =
        typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : `Request failed (${error.response.status})`;
    }
    return Promise.reject(error);
  },
);

// Contacts API
export const contactsAPI = {
  getAll: () => api.get(API_ENDPOINTS.contacts),
  getById: (id) => api.get(`${API_ENDPOINTS.contacts}${id}`),
  create: (data) => api.post(API_ENDPOINTS.contacts, data),
  update: (id, data) => api.put(`${API_ENDPOINTS.contacts}${id}`, data),
  delete: (id) => api.delete(`${API_ENDPOINTS.contacts}${id}`),
};

// Notifications API
export const notificationsAPI = {
  sendAlert: (data) => api.post(API_ENDPOINTS.sendAlert, data),
  getAll: (params) => api.get(API_ENDPOINTS.notifications, { params }),
  getById: (id) => api.get(`${API_ENDPOINTS.notifications}${id}`),
};

// Predictions API
export const predictionsAPI = {
  create: (data) => api.post(API_ENDPOINTS.predictions, data),
  getAll: (params) => api.get(API_ENDPOINTS.predictions, { params }),
  getById: (id) => api.get(`${API_ENDPOINTS.predictions}${id}`),
  getModelInfo: () => api.get(API_ENDPOINTS.modelInfo),
};

export { API_BASE_URL };
export default api;
