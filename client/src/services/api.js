import axios from 'axios';

export const TOKEN_KEY = 'campusfix.token';

/**
 * Vite only inlines variables prefixed with VITE_, so this is a build-time
 * value - the API base URL is public and no secret may ever appear here.
 */
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const SIGN_OUT_EVENT = 'campusfix:signout';

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // An expired or revoked token must not leave the UI showing a dashboard
    // that every subsequent request rejects.
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event(SIGN_OUT_EVENT));
    }
    return Promise.reject(error);
  }
);

/** Turns any axios failure into a single sentence the UI can show directly. */
export function getMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === 'ECONNABORTED') return 'The server took too long to respond.';
  if (error?.message === 'Network Error') {
    return 'Cannot reach the CampusFix API. Is the backend running?';
  }
  return error?.message || fallback;
}

/** Field-level validation errors, keyed by field name, for inline messages. */
export function getFieldErrors(error) {
  return error?.response?.data?.errors || {};
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}
