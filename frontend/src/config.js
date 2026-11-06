/**
 * Single source of truth for backend URLs.
 *
 * Before: the base URL "http://localhost:8000" was hard-coded in 4 different files
 * (api.js, websocket.js call sites, LocationContext, LocationMap), so deploying or
 * running the backend on another host/port required editing source code.
 *
 * Now: set VITE_API_BASE_URL / VITE_WS_BASE_URL in a .env file (see .env.example).
 * If they are not set we fall back to the previous localhost behaviour, so nothing
 * breaks for the current setup.
 */

const stripTrailingSlash = (value) => value.replace(/\/+$/, '');

const resolveHttpBase = () => {
  const fromEnv = import.meta.env?.VITE_API_BASE_URL;

  // Explicit env value wins.
  if (fromEnv !== undefined && fromEnv !== null && String(fromEnv).trim() !== '') {
    return stripTrailingSlash(String(fromEnv).trim());
  }

  // Running in a browser: if the dev server proxies /api, an empty base (same origin) works.
  if (import.meta.env?.DEV) {
    return 'http://localhost:8000';
  }

  return 'http://localhost:8000';
};

const resolveWsBase = (httpBase) => {
  const fromEnv = import.meta.env?.VITE_WS_BASE_URL;

  if (fromEnv !== undefined && fromEnv !== null && String(fromEnv).trim() !== '') {
    return stripTrailingSlash(String(fromEnv).trim());
  }

  // Derive from the HTTP base, and force wss:// when the page itself is served over HTTPS
  // (browsers block insecure ws:// connections from HTTPS pages).
  const derived = httpBase.replace(/^http/i, 'ws');

  if (typeof window !== 'undefined' && window.location?.protocol === 'https:') {
    return derived.replace(/^ws:\/\//i, 'wss://');
  }

  return derived;
};

export const API_BASE_URL = resolveHttpBase();
export const WS_BASE_URL = resolveWsBase(API_BASE_URL);

export const API_ENDPOINTS = {
  contacts: '/api/contacts/',
  notifications: '/api/notifications/',
  sendAlert: '/api/notifications/send-alert',
  sendLocation: '/api/notifications/send-location',
  locationUpdate: '/api/location/update',
  predictions: '/api/predictions/',
  modelInfo: '/api/predictions/model/info',
};

export default { API_BASE_URL, WS_BASE_URL, API_ENDPOINTS };
