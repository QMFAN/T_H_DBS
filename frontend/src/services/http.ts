import axios from 'axios';
import config from '../config/env';

const http = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use((req) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    req.headers = req.headers || {}
    ;(req.headers as any).Authorization = `Bearer ${token}`
  }
  if (typeof req.url === 'string' && req.url.includes('/analytics/data/delete')) {
    // eslint-disable-next-line no-console
    console.info('DELETE request', { url: req.url, body: req.data });
  }
  return req;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // TODO: 可根据后端返回结构统一处理错误码
      // eslint-disable-next-line no-console
      console.error('API Error:', error.response.status, error.response.data);
    } else {
      // eslint-disable-next-line no-console
      console.error('Network Error:', error.message);
    }
    const status = error.response?.status;
    if (status === 401) {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh && !(error.config as any).__retried) {
        return import('../services/authService').then(async (mod) => {
          const res = await mod.authService.refresh(refresh);
          if (res.success && res.access_token && res.refresh_token) {
            localStorage.setItem('auth_token', res.access_token);
            localStorage.setItem('refresh_token', res.refresh_token);
            const cfg = { ...error.config, headers: { ...(error.config.headers || {}), Authorization: `Bearer ${res.access_token}` } };
            (cfg as any).__retried = true;
            return http.request(cfg);
          }
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          return Promise.reject(error);
        });
      }
    }
    return Promise.reject(error);
  },
);

http.interceptors.response.use((res) => {
  if (typeof res.config.url === 'string' && res.config.url.includes('/analytics/data/delete')) {
    // eslint-disable-next-line no-console
    console.info('DELETE response', res.data);
  }
  return res;
});

export default http;
