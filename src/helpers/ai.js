import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import { getToken } from './auth';
import * as RootNavigation from './../services/RootNavigation';

const ai = axios.create();
const aiLog = false;
const aiErrorLog = true;
ai.defaults.baseURL = API_URL;
ai.defaults.timeout = 10000;
ai.defaults.headers = ai.defaults.headers || {};
ai.defaults.headers.common = ai.defaults.headers.common || {};
ai.defaults.headers.post = ai.defaults.headers.post || {};
ai.defaults.headers.common['Accept'] = 'application/json, text/plain, */*';
ai.defaults.headers.post['Content-Type'] = 'application/json';

ai.interceptors.request.use(
  async config => {
    const token = await getToken();
    if (aiLog) {
      console.log('Request.User Token', token);
    }

    // show request url
    if (aiLog) {
      console.log('Request.URL', config.url + '\n\n\n');
    }

    if (token && token !== 'GUEST') {
      config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      config.headers.token = token;

      const method = (config.method || 'get').toLowerCase();
      if (method === 'post' || method === 'put' || method === 'patch' || method === 'delete') {
        if (!config.data) {
          config.data = { token };
        } else if (typeof config.data === 'object' && !(config.data instanceof FormData)) {
          if (!config.data.token) {
            config.data = { token, ...config.data };
          }
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
    return response;
  },
  async error => {
    if (aiLog) {
      console.log('error status ======> ', JSON.stringify(error));
    }

    // react native error
    if (!error?.response) {
      if (aiErrorLog) {
        console.warn('API network error:', error?.message || error, ai.defaults.baseURL);
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

    return Promise.reject(error);
  },
);

export default ai;
