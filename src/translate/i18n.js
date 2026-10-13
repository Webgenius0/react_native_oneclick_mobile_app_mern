import { I18n } from "i18n-js";
import * as RNLocalize from 'react-native-localize';
import {storageGet, storageSet} from '../helpers/storage';
import translations from "./translations.json";

const i18n = new I18n(translations);
const defaultLocale = 'en';

i18n.defaultLocale = defaultLocale;
i18n.locale = defaultLocale;
i18n.enableFallback = true;
i18n.exists = (key) => {
  if (!i18n.translations || !i18n.locale || !i18n.translations[i18n.locale]) {
    return false;
  }
  return Object.keys(i18n.translations[i18n.locale]).includes(key);
};

const t = (key, options = {}) => {
  if (!key) return '';
  return i18n.t(key, { defaultValue: key, ...options });
};
const tr = (key, options = {}) => {
  if (!key) return '';
  return i18n.t(key, { defaultValue: key, ...options });
};

const availableLanguages = [
  // { id: "ar", ad: "عربي" },
  { id: "en", ad: "English" },
  { id:"som", ad:"Somali"},
  { id: "tr", ad: "Türkçe" },
];

export {
  t,
  tr,
  i18n,
  availableLanguages
};
