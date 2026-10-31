import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import { getToken } from './auth';
import * as RootNavigation from './../services/RootNavigation';
import { i18n } from '../translate/i18n';

const ai = axios.create();
const aiLog = false;
const aiErrorLog = true;
ai.defaults.baseURL = API_URL;
ai.defaults.timeout = 30000;
ai.defaults.headers = ai.defaults.headers || {};
ai.defaults.headers.common = ai.defaults.headers.common || {};
ai.defaults.headers.post = ai.defaults.headers.post || {};
ai.defaults.headers.common['Accept'] = 'application/json, text/plain, */*';
ai.defaults.headers.post['Content-Type'] = 'application/json';

ai.interceptors.request.use(
  async config => {
    try {
      const activeLang = i18n?.locale || 'en';
      if (config.headers?.set) {
        config.headers.set('Accept-Language', activeLang);
      } else {
        config.headers = config.headers || {};
        config.headers['Accept-Language'] = activeLang;
      }
    } catch (_) {}

    const token = await getToken();
    if (aiLog) {
      console.log('Request.User Token', token);
    }

    // show request url
    if (aiLog) {
      console.log('Request.URL', config.url + '\n\n\n');
    }

    if (token && token !== 'GUEST') {
      const authVal = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      if (config.headers?.set) {
        config.headers.set('Authorization', authVal);
        config.headers.set('token', token);
      } else {
        config.headers = config.headers || {};
        config.headers.Authorization = authVal;
        config.headers.token = token;
      }

      const method = (config.method || 'get').toLowerCase();
      if (method === 'post' || method === 'put' || method === 'patch' || method === 'delete') {
        if (!config.data) {
          config.data = { token };
        } else if (typeof config.data === 'object' && !(config.data instanceof FormData)) {
          if (!config.data.token) {
            config.data = { token, ...config.data };
          }
        } else if (config.data instanceof FormData) {
          try {
            if (typeof config.data.append === 'function') {
              if (typeof config.data.has === 'function') {
                if (!config.data.has('token')) {
                  config.data.append('token', token);
                }
              } else {
                config.data.append('token', token);
              }
            }
          } catch (_) {}
        }
      } else {
        config.params = { token, ...config.params };
      }
    }
    return config;
  },
  error => {
    if (aiErrorLog) {
      console.log('Request.Error', error);
    }
    return Promise.reject(error);
  },
);

ai.interceptors.response.use(
  response => {
    if (aiLog) {
      console.log('response', response);
    }
    // Protect against HTML or invalid string responses when server returns HTML error page with 200 OK
    if (
      typeof response?.data === 'string' &&
      (response.data.includes('<html') || response.data.includes('<!DOCTYPE'))
    ) {
      if (aiErrorLog) {
        console.warn('API returned HTML page instead of JSON:', response.config?.url);
      }
      response.data = {
        error: true,
        msg: 'Server error: Invalid response format',
        ss: [],
        data: null,
      };
    }
    return response;
  },
  async error => {
    if (aiLog) {
      console.log('error status ======> ', JSON.stringify(error));
    }

    // React Native network error (Axios XHR failure)
    if (!error?.response && error?.config) {
      const cfg = error.config;
      const method = (cfg.method || 'get').toUpperCase();
      const base = (cfg.baseURL || API_URL || '').replace(/\/+$/, '');
      const rel = (cfg.url || '').replace(/^\/+/, '');
      const fullUrl = rel.startsWith('http://') || rel.startsWith('https://')
        ? rel
        : `${base}/${rel}`;

      if (aiErrorLog) {
        console.warn(
          'API network error on Axios:',
          error?.code || 'NO_CODE',
          error?.message,
          method,
          fullUrl,
        );
        console.log('Attempting native fetch fallback for:', fullUrl);
      }

      try {
        const fetchHeaders = {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        };

        if (cfg.headers) {
          if (typeof cfg.headers.toJSON === 'function') {
            Object.assign(fetchHeaders, cfg.headers.toJSON());
          } else {
            Object.assign(fetchHeaders, cfg.headers);
          }
        }

        const fetchOptions = {
          method,
          headers: fetchHeaders,
        };

        if (method !== 'GET' && method !== 'HEAD' && cfg.data) {
          fetchOptions.body =
            typeof cfg.data === 'string'
              ? cfg.data
              : JSON.stringify(cfg.data);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        fetchOptions.signal = controller.signal;

        let fetchRes;
        try {
          fetchRes = await fetch(fullUrl, fetchOptions);
        } finally {
          clearTimeout(timeoutId);
        }

        const text = await fetchRes.text();
        let parsedData = null;
        try {
          parsedData = JSON.parse(text);
        } catch (_) {
          parsedData = text;
        }

        if (aiErrorLog) {
          console.log('Native fetch fallback response:', fetchRes.status);
        }

        const isHtml = typeof parsedData === 'string' && parsedData.includes('<html');

        if (!fetchRes.ok || isHtml) {
          const errorMsg = isHtml
            ? `Server Error (${fetchRes.status} ${fetchRes.statusText || 'Gateway Timeout'}). Upstream server did not respond.`
            : (parsedData?.msg || `Server Error ${fetchRes.status}`);

          const errorObj = new Error(errorMsg);
          errorObj.response = {
            status: fetchRes.status,
            statusText: fetchRes.statusText,
            data: isHtml ? { error: true, msg: errorMsg } : parsedData,
            headers: fetchRes.headers,
          };
          errorObj.config = cfg;
          return Promise.reject(errorObj);
        }

        return {
          data: parsedData,
          status: fetchRes.status,
          statusText: fetchRes.statusText,
          headers: fetchRes.headers,
          config: cfg,
        };
      } catch (fetchErr) {
        if (aiErrorLog) {
          console.warn(
            'Native fetch fallback also failed:',
            fetchErr?.message || fetchErr,
          );
        }
      }
    }

    let status = error?.response?.status || null;
    if (aiErrorLog) {
      console.log('error.response.status', status);
    }

    if (status === 403) {
      if (aiErrorLog) {
        console.log('403 Err on:', error?.config?.url);
      }

      // Do NOT kick to login for guest users or for cart-data / soft endpoints
      const url = error?.config?.url || '';
      const isPublicOrSoftEndpoint =
        url.includes('cart-data') ||
        url.includes('home') ||
        url.includes('banner') ||
        url.includes('fcm') ||
        url.includes('notification');

      try {
        const storedUser = await AsyncStorage.getItem('user');
        const isGuestStorage = (await AsyncStorage.getItem('is_guest')) === '1';
        const parsedUser = storedUser ? JSON.parse(storedUser) : null;
        const isGuest =
          isGuestStorage ||
          parsedUser?.kod === 'GUEST' ||
          parsedUser?.kod === 'HG1000' ||
          parsedUser?.token === 'GUEST';

        if (!isGuest && parsedUser && !isPublicOrSoftEndpoint) {
          await AsyncStorage.removeItem('user');

          if (RootNavigation.navigationRef && RootNavigation.navigationRef.isReady()) {
            const currentRoute = RootNavigation.navigationRef.getCurrentRoute();
            const authRoutes = [
              'Login',
              'Register',
              'Splash',
              'Onboarding',
              'AuthWelcome',
              'ContinueGuest',
              'ChooseVerificationMethod',
              'VerifyOtp',
              'ForgotPassword',
              'SetNewPassword',
            ];
            if (currentRoute && !authRoutes.includes(currentRoute.name)) {
              RootNavigation.reset('Login');
            }
          }
        }
      } catch (navErr) {
        console.log('403 handler error:', navErr);
      }
    }

    // Guarantee error.response is always an object with error: true and a readable msg
    if (!error?.response) {
      error.response = {
        status: 0,
        statusText: error?.message || 'Network Error',
        data: {
          error: true,
          msg:
            error?.message ||
            'Unable to connect to the server. Please check your internet connection.',
          ss: [],
          data: null,
        },
        headers: {},
      };
    } else {
      if (
        typeof error.response.data === 'string' &&
        (error.response.data.includes('<html') ||
          error.response.data.includes('<!DOCTYPE'))
      ) {
        error.response.data = {
          error: true,
          msg: `Server Error (${error.response.status || 500}). Please try again later.`,
          ss: [],
          data: null,
        };
      } else if (!error.response.data || typeof error.response.data !== 'object') {
        error.response.data = {
          error: true,
          msg: error?.message || `Request failed with status ${error.response.status}`,
          ss: [],
          data: null,
        };
      }
    }

    return Promise.reject(error);
  },
);

export default ai;
