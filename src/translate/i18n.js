import { I18n } from "i18n-js";
import * as RNLocalize from 'react-native-localize';
import {storageGet, storageSet} from '../helpers/storage';
import translations from "./translations.json";

const i18n = new I18n(translations);
const defaultLocale = 'en';

i18n.defaultLocale = defaultLocale;
i18n.locale = defaultLocale;
i18n.exists = (key) => {
  // return i18n.translations[i18n.locale][key] !== undefined;
  var s = Object.keys(i18n.translations[i18n.locale]).includes(key);

  /*
  var ceviri;
  if(s){
    ceviri = i18n.t(key);
  }

  console.log("exists", i18n.locale, s, ceviri, key );
*/

  return s;
};

const t = (key) => {
  return i18n.t(key);
};
const tr = (key) => {
  return i18n.t(key);
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
