import axios from 'axios';

import {API_URL} from '../../config';
import asyncStorage from '@react-native-async-storage/async-storage/src/AsyncStorage';
import {getToken} from './auth';
// import navigator from "../services/navigator";
// any js module
import * as RootNavigation from './../services/RootNavigation';

const ai = axios.create();
const aiLog = false;
const aiErrorLog = true;
ai.defaults.baseURL = API_URL;

// console.log('API_URL', API_URL);

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
        console.error('error', error, error.message, ai.defaults.baseURL);
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
      // console.log("removeItem user");
      await asyncStorage.removeItem('user');
      RootNavigation.reset('Login');
      // return false;
      // navigator.reset("Login");

      // localStorage.removeItem('token');

      // window.location = '/'
    }
  },
);

export default ai;
