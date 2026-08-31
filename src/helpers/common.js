import { API_URL, APP_VERSION } from '../../config';
import axios from "axios";
import DeviceInfo from 'react-native-device-info';

export const IS_DEV = process.env.NODE_ENV !== "production";

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const formatDate = (str) => {
  if (!str) return "";
  const date = new Date(str);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${day < 10 ? "0" + day : day}.${month < 10 ? "0" + month : month}.${year}`;
};

export const time = () => {
  //  discuss at: https://locutus.io/php/time/
  // original by: GeekFG (https://geekfg.blogspot.com)
  // improved by: Kevin van Zonneveld (https://kvz.io)
  // improved by: metjay
  // improved by: HKM
  //   example 1: var $timeStamp = time()
  //   example 1: var $result = $timeStamp > 1000000000 && $timeStamp < 2000000000
  //   returns 1: true
  // return Math.floor(new Date().getTime() / 1000)

  return +new Date();
};

export const trDate = () => {
  const d = new Date();
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  return `${day < 10 ? "0" + day : day}.${month < 10 ? "0" + month : month}.${year}`;
};

export const trTime = () => {
  const d = new Date();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();

  return `${hours < 10 ? "0" + hours : hours}:${minutes < 10 ? "0" + minutes : minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
};

export const fullTrDate = () => {
  return `${trDate()} ${trTime()}`;
};

export const lb = (str) => {
  console.log("__________________ " + str + " __________________" + (+new Date()) + "\n");
};

export const debounce = (func, delay) => {
  let timeoutId;
  return function (...args) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const throttle = (func, delay) => {
  let lastCalled = 0;

  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCalled < delay) return;
    lastCalled = now;
    func(...args);
  };
};


export const appVersionCheck = async () => {
  try {
    const url = API_URL + "app-version";
    var s = await axios.post(url, { version: APP_VERSION });
    return s.data || { valid: true };
  } catch (error) {
    console.log("appVersionCheck error:", error?.message);
    return { valid: true };
  }
};

export const shorten = (str, limit = 10) => {
  if (!str) return "";
  return str.length > limit ? str.substring(0, limit) + "..." : str;
}

export const randomNumber = (min, max) => {
  if (min === undefined) min = 0;
  if (max === undefined) max = 100;
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// return float
export const round = (num) => {
  return parseFloat(parseFloat(num).toFixed(2));
}

export const getUserAgent = () => {
  return DeviceInfo.getBrand() + ' ' + DeviceInfo.getModel() + ' ' + DeviceInfo.getSystemVersion();
}