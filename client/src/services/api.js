import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
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
