import axios from 'axios';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').trim();

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true,
});

// Interceptor for simple error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Optionally redirect to login on 401
    if (error.response && error.response.status === 401) {
      // Ignore on login/register endpoints
      if (!error.config.url.includes('/auth/')) {
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
