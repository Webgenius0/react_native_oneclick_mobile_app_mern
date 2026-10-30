import { I18n } from 'i18n-js';
import translations from './translations.json';

const i18n = new I18n(translations);
const defaultLocale = 'en';

i18n.defaultLocale = defaultLocale;
i18n.locale = defaultLocale;
i18n.enableFallback = true;

const getSafeLocale = () => {
  const loc = i18n.locale;
  return loc && ['en', 'som'].includes(loc) ? loc : defaultLocale;
};

i18n.exists = (key) => {
  const loc = getSafeLocale();
  if (!i18n.translations || !i18n.translations[loc]) {
    return false;
  }
  return Object.keys(i18n.translations[loc]).includes(key);
};

const isTurkishText = (str) => {
  if (typeof str !== 'string') return false;
  return /[çğışöüÇĞİŞÖÜ]/.test(str);
};

const tr = (key, options = {}) => {
  if (!key) return '';
  const loc = getSafeLocale();
  if (i18n.translations && i18n.translations[loc] && i18n.translations[loc][key] !== undefined) {
    return i18n.t(key, options);
  }
  if (i18n.translations && i18n.translations.en && i18n.translations.en[key] !== undefined) {
    return i18n.translations.en[key];
  }
  // If the key is in Turkish and no translation was matched, do not leak Turkish to the UI
  if (isTurkishText(key)) {
    return options.defaultValue !== undefined ? options.defaultValue : '';
  }
  return i18n.t(key, { defaultValue: key, ...options });
};

const t = (key, options = {}) => tr(key, options);

const availableLanguages = [
  { id: "en", ad: "English" },
  { id: "som", ad: "Somali" },
];

export {
  t,
  tr,
  i18n,
  availableLanguages
};
