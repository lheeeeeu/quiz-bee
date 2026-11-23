// Centralized Backend API URL helper
// - On Vercel (production): set VITE_API_URL=https://<your-cloud-run-service>.run.app
// - In local dev/preview: leave VITE_API_URL empty to use same-origin / Vite proxy

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

export const API_BASE_URL = rawApiUrl;

export function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalized}` : normalized;
}

export function getSocketBaseUrl() {
  if (API_BASE_URL) return API_BASE_URL;
  if (typeof window !== 'undefined' && window.location.port === '5173') {
    return 'http://localhost:3001';
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
}
