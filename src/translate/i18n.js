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

const interpolate = (str, opts) => {
  if (typeof str !== 'string' || !opts || typeof opts !== 'object') return str;
  return str.replace(/%\{(\w+)\}/g, (_, k) => (opts[k] !== undefined ? opts[k] : `%{${k}}`));
};

const sanitizeResult = (res, fallback) => {
  if (typeof res === 'string' && res.startsWith('[missing ') && res.endsWith(']')) {
    return fallback !== undefined ? fallback : '';
  }
  return res;
};

// Wrap native i18n.t to never fail on keys containing dots (e.g. 'Adding to cart...')
const originalI18nT = i18n.t.bind(i18n);
i18n.t = (scope, options = {}) => {
  if (!scope) return '';
  const loc = getSafeLocale();

  // 1. Exact match in current locale dictionary (prevents i18n-js from treating '.' as key path separator)
  if (i18n.translations && i18n.translations[loc] && i18n.translations[loc][scope] !== undefined) {
    return interpolate(i18n.translations[loc][scope], options);
  }

  // 2. Exact match in English fallback dictionary
  if (i18n.translations && i18n.translations.en && i18n.translations.en[scope] !== undefined) {
    return interpolate(i18n.translations.en[scope], options);
  }

  try {
    const res = originalI18nT(scope, { defaultValue: scope, ...options });
    return sanitizeResult(res, options.defaultValue !== undefined ? options.defaultValue : scope);
  } catch (_) {
    return options.defaultValue !== undefined ? options.defaultValue : scope;
  }
};

const tr = (key, options = {}) => {
  if (!key) return '';
  const loc = getSafeLocale();

  // 1. Direct key match in current locale (no dot split)
  if (i18n.translations && i18n.translations[loc] && i18n.translations[loc][key] !== undefined) {
    return interpolate(i18n.translations[loc][key], options);
  }

  // 2. Direct key match in English fallback
  if (i18n.translations && i18n.translations.en && i18n.translations.en[key] !== undefined) {
    return interpolate(i18n.translations.en[key], options);
  }

  // 3. Fallback for Turkish source keys: do not leak Turkish to the UI
  if (isTurkishText(key)) {
    return options.defaultValue !== undefined ? options.defaultValue : '';
  }

  // 4. Default value if provided
  if (options.defaultValue !== undefined) {
    return interpolate(options.defaultValue, options);
  }

  // 5. Native lookup with sanitized result
  const res = i18n.t(key, options);
  return sanitizeResult(res, key);
};

const t = (key, options = {}) => tr(key, options);

const localizeApiMessage = (msg, fallback = 'Payment Failed') => {
  if (!msg || typeof msg !== 'string') {
    return fallback ? (tr(fallback) || fallback) : '';
  }
  const clean = msg.trim();
  if (!clean) {
    return fallback ? (tr(fallback) || fallback) : '';
  }

  // 1. Direct translation lookup
  const directTranslated = tr(clean);
  if (directTranslated && directTranslated !== clean) {
    return directTranslated;
  }

  // 2. Pattern matching for common Turkish / Gateway phrases returned by backend
  const lower = clean.toLowerCase();

  // Success phrases first
  if (
    lower.includes('başarılı') ||
    lower.includes('basarili') ||
    lower.includes('success') ||
    lower.includes('alındı') ||
    lower.includes('alindi')
  ) {
    return tr('Payment Successful') || 'Payment Successful';
  }

  // Amount changed
  if (
    lower.includes('tutarı değişti') ||
    lower.includes('tutari degisti') ||
    lower.includes('yenileyiniz') ||
    lower.includes('amount changed')
  ) {
    return (
      tr('Payment amount has changed. Please refresh and try again.') ||
      'Payment amount has changed. Please refresh and try again.'
    );
  }
  if (
    lower.includes('cüzdan') ||
    lower.includes('cuzdan') ||
    (lower.includes('geçerli') && lower.includes('numara')) ||
    (lower.includes('gecerli') && lower.includes('numara'))
  ) {
    return tr('Please enter a valid mobile wallet number') || 'Please enter a valid mobile wallet number';
  }
  if (lower.includes('bakiye') || lower.includes('yetersiz')) {
    return tr('Insufficient balance') || 'Insufficient balance';
  }
  if (lower.includes('zaman aşımı') || lower.includes('zaman asimi') || lower.includes('timeout')) {
    return tr('Transaction timed out') || 'Transaction timed out';
  }
  if (lower.includes('iptal')) {
    return tr('Payment was cancelled') || 'Payment was cancelled';
  }
  if (
    lower.includes('başarısız') ||
    lower.includes('basarisiz') ||
    lower.includes('başlatılamadı') ||
    lower.includes('baslatilamadi') ||
    lower.includes('reddedildi') ||
    lower === 'hata' ||
    lower.includes('hata oluştu') ||
    lower.includes('hata olustu')
  ) {
    return fallback ? (tr(fallback) || fallback) : (tr('Payment Failed') || 'Payment Failed');
  }

  // 3. If it contains Turkish characters and was not translated, do NOT leak it:
  if (isTurkishText(clean)) {
    return fallback ? (tr(fallback) || fallback) : (tr('Payment Failed') || 'Payment Failed');
  }

  return clean;
};

const availableLanguages = [
  { id: "en", ad: "English" },
  { id: "som", ad: "Somali" },
];

export {
  t,
  tr,
  localizeApiMessage,
  i18n,
  availableLanguages
};
