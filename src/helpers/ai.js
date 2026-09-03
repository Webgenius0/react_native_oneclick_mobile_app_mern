import axios from 'axios';
import {API_URL} from '../../config';
import asyncStorage from '@react-native-async-storage/async-storage/src/AsyncStorage';
import {getToken} from './auth';
import * as RootNavigation from './../services/RootNavigation';

const ai = axios.create();
const aiLog = false;
const aiErrorLog = true;
ai.defaults.baseURL = API_URL;
ai.defaults.headers.common['Accept'] = 'application/json, text/plain, */*';
ai.defaults.headers.post['Content-Type'] = 'application/json';

console.log('API_URL', API_URL);

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

    if (token) {
      config.headers.Authorization = token;

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
    // console.log("\n\n");
    if (aiLog) {
      console.log('response', response);
    }
    // console.log("\n\n");

    return response;
  },
  async error => {
    //console.log("\n\n\n");

    if (aiLog) {
      console.log('error status ======> ', JSON.stringify(error));
    }
    //console.log("\n\n\n");
    // console.log("error", error);
    // console.log("\n\n\n");

    // react native error
    if (!error?.response) {
      // print node error
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
        console.log('403 Err');
      }
      await asyncStorage.removeItem('user');

      try {
        if (RootNavigation.navigationRef && RootNavigation.navigationRef.isReady()) {
          const currentRoute = RootNavigation.navigationRef.getCurrentRoute();
          if (currentRoute && currentRoute.name !== 'Login' && currentRoute.name !== 'Splash') {
            RootNavigation.reset('Login');
          }
        }
      } catch (navErr) {
        console.log('Navigation reset error:', navErr);
      }
    }

    return Promise.reject(error);
  },
);

export default ai;
