export const APP_VERSION = 38;
export const DEV_LOCAL = false;
export const FIREBASE_ENABLED = true;
export const FIREBASE_LOG = false;
export const LOCAL_HOST = "192.168.1.120";
export const DEV_REDIRECT_STORE = false;
export const PROD_LOCAL = false;

export const LOCAL_BASE_URL = `http://${LOCAL_HOST}/my/oneclicktoshop`;
// export const REMOTE_BASE_URL = "https://1click.thesyndicates.team";
export const REMOTE_BASE_URL = "https://1click.thesyndicates.team/api";

export const BASE_URL = (__DEV__ && DEV_LOCAL) || (!__DEV__ && PROD_LOCAL) ? LOCAL_BASE_URL : REMOTE_BASE_URL;
export const API_URL = BASE_URL.endsWith('/api') ? BASE_URL + '/' : BASE_URL + '/api/';
export const DATA_URL = BASE_URL.replace(/\/api\/?$/, '') + '/data/';

export const IS_LOCAL = API_URL.includes("localhost") || API_URL.includes("172.20") || API_URL.includes("192.168");

export const DELAY_TIME = 100;
export const TARIH_FORMAT = 'dd/MM/yyyy';

export const paymentTypes = [
  { id: 1, name: 'WaafiPay', target: 'WaafiPay' },
  { id: 2, name: 'eDahab', target: 'EDahab' },
];
export const supportPhone = "+252637979636";

const MOBIL_SCRIPT_URL = 'http://app.1clicktoshop.com/mobile-scripts/bundle.js';
const MOBIL_SCRIPT_DEV_URL = 'http://app.1clicktoshop.com/mobile-scripts/bundle.js';

export const MOBIL_SCRIPT_TEST = true;
export const MOBIL_SCRIPT = __DEV__ && MOBIL_SCRIPT_TEST ? MOBIL_SCRIPT_DEV_URL : MOBIL_SCRIPT_URL;

export const ODENEBILIR_DURUMS = [16, 21];

export const EXPRESS = true;