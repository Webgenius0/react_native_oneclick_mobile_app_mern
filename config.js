// export const API_URL = 'http://localhost:3000';
// export const HOST_URL = process.env.REACT_APP_HOST_URL;

export const APP_VERSION = 38;
export const DEV_LOCAL = false;
export const FIREBASE_ENABLED = true;

export const FIREBASE_LOG = false;
// export const LOCAL_HOST = "192.168.39.11";
// export const LOCAL_HOST = "192.168.178.11";
export const LOCAL_HOST = "192.168.1.120";
// export const LOCAL_HOST = "172.20.10.2";
export const DEV_REDIRECT_STORE = true;
export const PROD_LOCAL = false;

export const LOCAL_BASE_URL = `http://${LOCAL_HOST}/my/oneclicktoshop`;
export const REMOTE_BASE_URL = "http://app.1clicktoshop.com";

export const BASE_URL = (__DEV__ && DEV_LOCAL) || (!__DEV__ && PROD_LOCAL) ? LOCAL_BASE_URL : REMOTE_BASE_URL;
export const API_URL = BASE_URL + "/api/";
export const DATA_URL = BASE_URL + "/data/";

export const IS_LOCAL = API_URL.includes("localhost")
  || API_URL.includes("172.20")
  || API_URL.includes("192.168");

export const DELAY_TIME = 100;
export const TARIH_FORMAT = 'dd/MM/yyyy';

export const paymentTypes = [
  { id: 1, name: 'WaafiPay', target: 'WaafiPay' },
];
export const supportPhone = "+252637979636";

const MOBIL_SCRIPT_URL = 'http://app.1clicktoshop.com/mobile-scripts/bundle.js';
// const MOBIL_SCRIPT_URL = 'http://s4.revea.com.tr/test/translate-new/bundle.js';
const MOBIL_SCRIPT_DEV_URL = 'http://app.1clicktoshop.com/mobile-scripts/bundle.js';

// 'http://192.168.1.120/test/translate-new/reactNativeTranslate.js' :
// 'http://mac.dev/test/translate-new/reactNativeTranslate.js' :
// 'https://s4.revea.com.tr/test/translate/reactNativeTranslate.js';

export const MOBIL_SCRIPT_TEST = true;
export const MOBIL_SCRIPT = __DEV__ && MOBIL_SCRIPT_TEST ? MOBIL_SCRIPT_DEV_URL : MOBIL_SCRIPT_URL;



// export const ODENEBILIR_DURUMS = [1, 2, 3, 4, 5, 11, 6, 9, 8, 16, 18, 21];
export const ODENEBILIR_DURUMS = [16, 21];


export const EXPRESS = true;