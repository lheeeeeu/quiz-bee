// Centralized Backend API URL helper
// - On Vercel (production): set VITE_API_URL=https://<your-render-backend>.onrender.com
// - In local dev (localhost / 127.0.0.1): leave VITE_API_URL empty to use local proxy / same-origin

function isLocalHostname(hostname) {
  if (!hostname) return true;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname)
  );
}

function resolveApiConfig() {
  // Primary env var is VITE_API_URL; also accept legacy alias VITE_API_URL_BACKEND gracefully
  const raw = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_URL_BACKEND ||
    ''
  ).trim();

  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const isLocal = isLocalHostname(hostname);

  if (!raw) {
    if (isLocal) {
      return { baseUrl: '', configured: true, error: null, isLocal: true };
    }
    return {
      baseUrl: '',
      configured: false,
      isLocal: false,
      error:
        'Backend API URL is not configured (missing VITE_API_URL). Set VITE_API_URL in your Vercel Environment Variables to your Render backend URL and redeploy.'
    };
  }

  // Validate URL format (must be absolute http:// or https://)
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Protocol must be http or https');
    }
    const normalized = parsed.origin + parsed.pathname.replace(/\/+$/, '').replace(/\/api$/i, '');

    // Prevent accidental self-referencing to the static Vercel frontend origin
    if (typeof window !== 'undefined' && !isLocal && parsed.origin === window.location.origin) {
      return {
        baseUrl: '',
        configured: false,
        isLocal: false,
        error: `Invalid VITE_API_URL (${raw}): points to the Vercel frontend domain instead of your Render backend URL.`
      };
    }

    return { baseUrl: normalized, configured: true, error: null, isLocal };
  } catch {
    return {
      baseUrl: '',
      configured: false,
      isLocal,
      error: `Invalid VITE_API_URL value ("${raw}"). Expected a full URL such as https://your-backend.onrender.com`
    };
  }
}

const config = resolveApiConfig();

export const API_BASE_URL = config.baseUrl;
export const IS_API_CONFIGURED = config.configured;
export const API_CONFIG_ERROR = config.error;

if (API_CONFIG_ERROR && typeof console !== 'undefined') {
  console.error(`[QuizBee API Config Error] ${API_CONFIG_ERROR}`);
}

export function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!IS_API_CONFIGURED) {
    throw new Error(API_CONFIG_ERROR || 'Backend API URL is not configured.');
  }
  return API_BASE_URL ? `${API_BASE_URL}${normalized}` : normalized;
}

export function getSocketBaseUrl() {
  if (!IS_API_CONFIGURED) return null;
  if (API_BASE_URL) return API_BASE_URL;
  if (typeof window !== 'undefined' && window.location.port === '5173') {
    return 'http://localhost:3001';
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
}
