import axios from 'axios';
import { AUTH_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY } from '@/constants';

const AUTH_CLEARED_EVENT = 'stocky:auth-cleared';
const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim();

const api = axios.create({
  baseURL: configuredApiBaseUrl || '/',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  const isAuthRequest = config.url?.startsWith('/api/auth/');
  if (token && !isAuthRequest) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isAuthRequest = error.config?.url?.startsWith('/api/auth/');
    if (status === 401 && !isAuthRequest) {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
      }
    }
    return Promise.reject(error);
  },
);

export default api;
