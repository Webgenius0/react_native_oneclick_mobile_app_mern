/**
 * Currency parsing, normalization, and USD conversion helpers.
 * Aligned with 1Click Exchange Rate API documentation.
 */

export const DEFAULT_RATES = {
  USD: 1.0,
  TRY: 0.029412,
  AED: 0.3125,
  UAE: 0.3125,
  EUR: 1.08,
  GBP: 1.28,
  SAR: 0.266667,
};

export const DEFAULT_INVERSE_RATES = {
  USD: 1.0,
  AED: 3.2,
  UAE: 3.2,
  TRY: 33.9997,
  EUR: 0.9259,
  GBP: 0.7813,
  SAR: 3.75,
};

/**
 * Normalizes any currency string / symbol to a 3-letter ISO code.
 * @param {string} rawCurrency
 * @param {string|number} rawPrice
 * @returns {string} 3-letter uppercase currency code (default: 'TRY')
 */
export const normalizeCurrency = (rawCurrency, rawPrice = '') => {
  const c = String(rawCurrency || '').trim().toUpperCase();
  const p = String(rawPrice || '').trim().toUpperCase();

  // Explicit currency string matches
  if (c === 'TRY' || c === 'TL' || c.includes('₺') || c.includes('LIRA')) {
    return 'TRY';
  }
  if (c === 'UAE') {
    return 'UAE';
  }
  if (c === 'AED' || c === 'DHS' || c === 'DH' || c.includes('DIRHAM') || c.includes('د.إ') || c.includes('درهم') || c.includes('\u20C3')) {
    return 'AED';
  }
  if (c === 'EUR' || c.includes('€') || c.includes('EURO')) {
    return 'EUR';
  }
  if (c === 'GBP' || c.includes('£') || c.includes('POUND')) {
    return 'GBP';
  }
  if (
    c === 'SAR' ||
    c === 'SR' ||
    c.includes('﷼') ||
    c.includes('\uFDFC') ||
    c.includes('⃁') ||
    c.includes('\u20C1') ||
    c.includes('ر.س') ||
    c.includes('ريال') ||
    c.includes('RIYAL') ||
    c.includes('RIAL')
  ) {
    return 'SAR';
  }
  if (c === 'USD' || c.includes('$') || c.includes('DOLLAR')) {
    return 'USD';
  }
  if (c === 'KWD' || c === 'KD' || c.includes('د.ك')) {
    return 'KWD';
  }
  if (c === 'QAR' || c === 'QR' || c.includes('ر.ق')) {
    return 'QAR';
  }
  if (c === 'BHD' || c === 'BD' || c.includes('د.ب')) {
    return 'BHD';
  }
  if (c === 'OMR' || c === 'RO' || c.includes('ر.ع')) {
    return 'OMR';
  }
  if (c === 'IQD') {
    return 'IQD';
  }

  // If currency was not found in rawCurrency, look inside rawPrice for symbols/words
  if (p.includes('₺') || /\bTL\b/.test(p) || p.includes('TRY')) {
    return 'TRY';
  }
  if (p.includes('UAE')) {
    return 'UAE';
  }
  if (p.includes('AED') || /\bDHS?\b/.test(p) || p.includes('DIRHAM') || p.includes('د.إ') || p.includes('درهم') || p.includes('\u20C3')) {
    return 'AED';
  }
  if (p.includes('€') || p.includes('EUR')) {
    return 'EUR';
  }
  if (p.includes('£') || p.includes('GBP')) {
    return 'GBP';
  }
  if (
    p.includes('SAR') ||
    /\bSR\b/.test(p) ||
    p.includes('﷼') ||
    p.includes('\uFDFC') ||
    p.includes('⃁') ||
    p.includes('\u20C1') ||
    p.includes('ر.س') ||
    p.includes('ريال') ||
    p.includes('RIYAL') ||
    p.includes('RIAL')
  ) {
    return 'SAR';
  }
  if (p.includes('$') || p.includes('USD')) {
    return 'USD';
  }

  // If already a valid 3-letter alpha code
  if (/^[A-Z]{3}$/.test(c)) {
    return c;
  }

  return 'TRY';
};

/**
 * Parses numeric price from string or number.
 * Handles European/Turkish formats ("1.299,99", "1.299 TL", "179,10") and US formats ("1,299.99", "1,450 AED", "179.10").
 * Robustly removes discount percentages, currency symbols, and distinguishes thousands vs decimal separators.
 * @param {string|number} rawPrice
 * @param {string} rawCurrency
 * @returns {number|null} parsed float or null if invalid
 */
export const parsePrice = (rawPrice, rawCurrency = '') => {
  if (typeof rawPrice === 'number') {
    return isNaN(rawPrice) || rawPrice <= 0 ? null : rawPrice;
  }

  if (!rawPrice) {
    return null;
  }

  let str = String(rawPrice).trim();

  // Strip discount percentages e.g. '-30%', '%25', '30% off', 'Save 20%'
  str = str.replace(/[-–]?\s*\d+(?:\.\d+)?\s*%\s*(?:off|indirim)?/gi, '');
  str = str.replace(/%\s*\d+(?:\.\d+)?/gi, '');
  str = str.replace(/\b(?:save|indirim|coupon|kupon|off)\b[^\d]*\d+(?:\.\d+)?%?/gi, '');

  // Strip known Arabic and Latin currency symbols containing dots before digit isolation
  str = str.replace(/د\.?إ|ر\.?س|د\.?ك|ر\.?ق|د\.?ب|ر\.?ع/gi, ' ');

  // Strip currency symbols and letters (keep digits, comma, dot, minus, space)
  str = str.replace(/[^0-9.,\s-]/g, '').trim();
  if (!str) {
    return null;
  }

  // Remove spaces between digits: "1 450" -> "1450"
  str = str.replace(/\s+/g, '');

  const curr = String(rawCurrency || '').trim().toUpperCase();
  const commaCount = (str.match(/,/g) || []).length;
  const dotCount = (str.match(/\./g) || []).length;

  if (commaCount > 0 && dotCount > 0) {
    // Both comma and dot present: determine decimal vs thousands by position of the last separator
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // European/Turkish format: 1.299,99 or 24.999,00 -> 1299.99
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,299.99 or 24,999.00 -> 1299.99
      str = str.replace(/,/g, '');
    }
  } else if (commaCount > 1) {
    // Multiple commas: 1,250,000 -> 1250000
    str = str.replace(/,/g, '');
  } else if (dotCount > 1) {
    // Multiple dots: 1.250.000 -> 1250000
    str = str.replace(/\./g, '');
  } else if (commaCount === 1) {
    // Single comma: e.g. "199,99" (decimal) vs "1,450" (thousands)
    const parts = str.split(',');
    const before = parts[0];
    const after = parts[1];
    if (after.length === 3 && before !== '0' && !['KWD', 'BHD', 'OMR'].includes(curr)) {
      // Thousands: 1,450 -> 1450
      str = str.replace(',', '');
    } else {
      // Decimal: 199,99 -> 199.99 or 0,500 -> 0.500
      str = str.replace(',', '.');
    }
  } else if (dotCount === 1) {
    // Single dot: e.g. "199.99" (decimal) vs "1.450" or "2.999" (thousands in Turkish/European/Arabic)
    const parts = str.split('.');
    const before = parts[0];
    const after = parts[1];
    if (after.length === 3 && before !== '0' && !['KWD', 'BHD', 'OMR'].includes(curr)) {
      // Thousands: 1.450 -> 1450 or 2.999 -> 2999
      str = str.replace('.', '');
    }
  }

  const num = parseFloat(str);
  return isNaN(num) || num <= 0 ? null : num;
};

/**
 * Converts local price to USD using live or fallback rates.
 * Formula: Price_in_USD = Local_Price * rates[CURRENCY]
 * @param {string|number} rawPrice
 * @param {string} rawCurrency
 * @param {Object} rates
 * @param {Object} inverseRates
 * @returns {number|null} Converted USD price as float rounded to 2 decimals, or null
 */
export const calculateConvertedPrice = (
  rawPrice,
  rawCurrency = 'TRY',
  rates = {},
  inverseRates = {},
) => {
  const currency = normalizeCurrency(rawCurrency, rawPrice);
  const price = parsePrice(rawPrice, currency);
  if (price === null) {
    return null;
  }

  if (currency === 'USD') {
    return parseFloat(price.toFixed(2));
  }

  const isWeaker = ['SAR', 'AED', 'UAE', 'TRY', 'QAR', 'EGP', 'INR', 'PKR'].includes(currency);

  // 1. Check dynamic rates (Multiplier: Price_in_USD = Local_Price * rates[CURRENCY])
  const rateVal = Number(rates?.[currency]);
  if (!isNaN(rateVal) && rateVal > 0) {
    if (isWeaker && rateVal > 1) {
      // rateVal is an inverse rate (e.g. 3.75 SAR per USD) -> divide instead of multiply
      return parseFloat((price / rateVal).toFixed(2));
    }
    return parseFloat((price * rateVal).toFixed(2));
  }

  // 2. Check dynamic inverse rates (Divisor: Price_in_USD = Local_Price / inverseRates[CURRENCY])
  const inverseRateVal = Number(inverseRates?.[currency]);
  if (!isNaN(inverseRateVal) && inverseRateVal > 0) {
    if (isWeaker && inverseRateVal < 1) {
      // inverseRateVal is a direct multiplier -> multiply instead of divide
      return parseFloat((price * inverseRateVal).toFixed(2));
    }
    return parseFloat((price / inverseRateVal).toFixed(2));
  }

  // 3. Fallback to default rates
  const defaultRate = Number(DEFAULT_RATES[currency]);
  if (!isNaN(defaultRate) && defaultRate > 0) {
    return parseFloat((price * defaultRate).toFixed(2));
  }

  const defaultInverseRate = Number(DEFAULT_INVERSE_RATES[currency]);
  if (!isNaN(defaultInverseRate) && defaultInverseRate > 0) {
    return parseFloat((price / defaultInverseRate).toFixed(2));
  }

  return null;
};

/**
 * Formats a USD amount for display.
 * @param {number} amount
 * @returns {string} e.g. "$13.24 USD"
 */
export const formatUsd = amount => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '';
  }
  return `$${amount.toFixed(2)} USD`;
};

/**
 * Detects the source currency for an item based on its explicit currency,
 * price string, store/marketplace, or URL domain.
 * Supports dynamic detection of USD, AED, SAR, TRY, EUR, GBP, etc.
 * When price or currency is '$' or 'USD', it is preserved as USD without being overwritten.
 * @param {Object} item - Product/Cart item object or param bag
 * @param {string} [fallbackCurrency='AED']
 * @returns {string} 3-letter currency code (e.g. 'USD', 'AED', 'SAR', 'TRY')
 */
export const detectItemCurrency = (item = {}, fallbackCurrency = 'USD') => {
  if (!item) return normalizeCurrency(fallbackCurrency);

  const rawCurr = item.currency || '';
  const rawPrice = item.price || '';
  const url = String(item.url || item.link || '').toLowerCase();
  const store = String(item.store || item.marketplace || '').toLowerCase();
  const isShein = store.includes('shein') || url.includes('shein');

  // 1. Check explicit currency field first (e.g. 'AED', 'SAR')
  if (rawCurr) {
    const norm = normalizeCurrency(rawCurr, rawPrice);
    if (norm === 'SAR') return 'SAR';
    if (norm === 'AED' || norm === 'UAE') return 'AED';
    if (norm === 'USD' || norm === '$') return 'USD';
    if (norm === 'EUR') return 'EUR';
    if (norm === 'GBP') return 'GBP';
    if (norm === 'TRY') return 'TRY';
    return norm;
  }

  // 2. Check price string for explicit symbols or currency codes
  if (rawPrice) {
    const p = String(rawPrice).trim();
    if (
      /\b(?:SAR|SR|RIYAL|RIAL)\b/i.test(p) ||
      p.includes('﷼') ||
      p.includes('\uFDFC') ||
      p.includes('⃁') ||
      p.includes('\u20C1') ||
      p.includes('ر.س') ||
      p.includes('ريال')
    ) return 'SAR';
    if (/\b(?:AED|DHS|DH|DIRHAM)\b/i.test(p) || p.includes('د.إ') || p.includes('درهم') || p.includes('\u20C3')) return 'AED';
    if (p.includes('$') || /\bUSD\b/i.test(p)) return 'USD';
    if (p.includes('€') || /\bEUR\b/i.test(p)) return 'EUR';
    if (p.includes('£') || /\bGBP\b/i.test(p)) return 'GBP';
    if (p.includes('₺') || /\bTL\b/i.test(p) || /\bTRY\b/i.test(p)) return 'TRY';
  }

  // 3. Domain and store-based detection
  if (url.includes('shein.ae') || url.includes('amazon.ae') || url.includes('noon.com')) {
    return 'AED';
  }
  if (
    url.includes('shein.sa') ||
    url.includes('shein.com.sa') ||
    url.includes('amazon.sa') ||
    url.includes('shein.com/ar') ||
    url.includes('shein.com/sa') ||
    url.includes('/ar-en/') ||
    url.includes('/ar/') ||
    url.includes('/sa/')
  ) {
    return 'SAR';
  }
  // Generic Shein URLs (m.shein.com, www.shein.com) without specific region → SAR default.
  // IMPORTANT: In Webview.js addChart, sheinCurrencyRef.current ALWAYS overrides rawCurrency
  // before detectItemCurrency is ever called, so this SAR default is never reached for live items.
  if (isShein && !url.includes('us.shein.com') && !url.includes('/us/')) {
    return 'SAR';
  }
  if (url.includes('shein.com.tr') || url.includes('trendyol.') || url.includes('hepsiburada.')) {
    return 'TRY';
  }
  if (url.includes('amazon.de') || url.includes('.de/') || url.includes('.fr/')) {
    return 'EUR';
  }
  if (url.includes('amazon.co.uk') || url.includes('.co.uk/')) {
    return 'GBP';
  }
  if (
    url.includes('us.shein.com') ||
    url.includes('amazon.com') ||
    url.includes('.com/us') ||
    url.includes('/us/')
  ) {
    return 'USD';
  }

  // 4. Fallback to fallbackCurrency (default USD)
  return normalizeCurrency(fallbackCurrency, rawPrice);
};

/**
 * Returns how the currency was originally specified: '$', 'USD', '﷼', 'ر.س', or the normalized currency code.
 * Used to preserve and show the currency format exactly as received.
 * @param {Object} item - Product/Cart item object
 * @returns {{ code: string, display: string, isUsd: boolean }}
 */
export const getReceivedCurrencyInfo = (item = {}) => {
  const rawCurr = String(item?.currency || '').trim();
  const rawPrice = String(item?.price || '').trim();
  const rawCurrUpper = rawCurr.toUpperCase();
  const rawPriceUpper = rawPrice.toUpperCase();

  // 1. If SAR symbols or text are present (preserve received symbol)
  if (rawCurr.includes('﷼') || rawPrice.includes('﷼')) {
    return { code: 'SAR', display: '﷼', isUsd: false };
  }
  if (rawCurr.includes('⃁') || rawCurr.includes('\u20C1') || rawPrice.includes('⃁') || rawPrice.includes('\u20C1')) {
    return { code: 'SAR', display: '⃁', isUsd: false };
  }
  if (rawCurr.includes('\uFDFC') || rawPrice.includes('\uFDFC')) {
    return { code: 'SAR', display: '\uFDFC', isUsd: false };
  }
  if (rawCurr.includes('ر.س') || rawPrice.includes('ر.س')) {
    return { code: 'SAR', display: 'ر.س', isUsd: false };
  }
  if (
    /\b(?:SAR|SR|RIYAL|RIAL)\b/i.test(rawCurr) ||
    /\b(?:SAR|SR|RIYAL|RIAL)\b/i.test(rawPrice) ||
    rawCurrUpper === 'SAR' ||
    rawCurrUpper === 'SR'
  ) {
    return { code: 'SAR', display: 'SAR', isUsd: false };
  }

  // 2. If AED Arabic symbols, new UAE Dirham sign, or text are present
  if (
    rawCurr.includes('د.إ') ||
    rawPrice.includes('د.إ') ||
    rawCurr.includes('د.ا') ||
    rawPrice.includes('د.ا') ||
    rawCurr.includes('درهم') ||
    rawPrice.includes('درهم') ||
    rawCurr.includes('\u20C3') ||
    rawPrice.includes('\u20C3') ||
    /\b(?:AED|DHS|DIRHAM)\b/i.test(rawCurr) ||
    /\b(?:AED|DHS|DIRHAM)\b/i.test(rawPrice) ||
    rawCurrUpper === 'AED'
  ) {
    return {
      code: 'AED',
      display: rawCurr.includes('د.إ') || rawPrice.includes('د.إ') ? 'د.إ' : (rawCurr.includes('\u20C3') || rawPrice.includes('\u20C3') ? '\u20C3' : 'AED'),
      isUsd: false,
    };
  }

  // 3. If explicit 'USD' or '$' symbol is present
  if (
    rawCurr.includes('$') ||
    rawPrice.includes('$') ||
    /\bUSD\b/.test(rawCurrUpper) ||
    /\bUSD\b/.test(rawPriceUpper) ||
    rawCurrUpper === 'USD'
  ) {
    const isDollarSymbol = rawCurr.includes('$') || rawPrice.includes('$');
    return { code: 'USD', display: isDollarSymbol ? '$' : 'USD', isUsd: true };
  }

  // 4. If TRY symbol or text is present
  if (rawCurr.includes('₺') || rawPrice.includes('₺') || rawCurrUpper === 'TRY' || rawCurrUpper === 'TL') {
    return { code: 'TRY', display: rawCurr.includes('₺') || rawPrice.includes('₺') ? '₺' : 'TRY', isUsd: false };
  }

  // 5. If EUR symbol is present
  if (rawCurr.includes('€') || rawPrice.includes('€') || rawCurrUpper === 'EUR') {
    return { code: 'EUR', display: '€', isUsd: false };
  }

  // 6. If GBP symbol is present
  if (rawCurr.includes('£') || rawPrice.includes('£') || rawCurrUpper === 'GBP') {
    return { code: 'GBP', display: '£', isUsd: false };
  }

  const detected = detectItemCurrency(item);
  return {
    code: detected,
    display: detected === 'USD' ? '$' : detected,
    isUsd: detected === 'USD',
  };
};

/**
 * Formats the final price displaying the received currency symbol/code.
 * @param {number} finalPrice
 * @param {Object} item
 * @param {number|null} convertedUsd
 * @returns {string}
 */
export const formatDisplayPrice = (finalPrice, item = {}, convertedUsd = null) => {
  const info = getReceivedCurrencyInfo(item);
  const priceVal = typeof finalPrice === 'number' ? finalPrice.toFixed(2) : String(finalPrice || '');

  if (info.isUsd) {
    if (info.display === '$') {
      return `$${priceVal}`;
    }
    return `${priceVal} USD`;
  }

  if (convertedUsd !== null && typeof convertedUsd === 'number' && !isNaN(convertedUsd)) {
    return `$${convertedUsd.toFixed(2)}`;
  }

  return `${priceVal} ${info.display}`;
};
