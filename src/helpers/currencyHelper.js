/**
 * Currency parsing, normalization, and USD conversion helpers.
 * Aligned with 1Click Exchange Rate API documentation.
 */

export const DEFAULT_RATES = {
  USD: 1.0,
  TRY: 0.029412,
  AED: 0.272479,
  EUR: 1.08,
  GBP: 1.28,
  SAR: 0.266667,
};

export const DEFAULT_INVERSE_RATES = {
  USD: 1.0,
  AED: 3.67,
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
  if (c === 'AED' || c === 'DHS' || c === 'DH' || c.includes('DIRHAM')) {
    return 'AED';
  }
  if (c === 'EUR' || c.includes('€') || c.includes('EURO')) {
    return 'EUR';
  }
  if (c === 'GBP' || c.includes('£') || c.includes('POUND')) {
    return 'GBP';
  }
  if (c === 'SAR' || c === 'SR' || c.includes('RIYAL') || c.includes('RIAL')) {
    return 'SAR';
  }
  if (c === 'USD' || c.includes('$') || c.includes('DOLLAR')) {
    return 'USD';
  }
  if (c === 'KWD' || c === 'KD') {
    return 'KWD';
  }
  if (c === 'QAR' || c === 'QR') {
    return 'QAR';
  }
  if (c === 'BHD' || c === 'BD') {
    return 'BHD';
  }
  if (c === 'OMR' || c === 'RO') {
    return 'OMR';
  }
  if (c === 'IQD') {
    return 'IQD';
  }

  // If currency was not found in rawCurrency, look inside rawPrice for symbols/words
  if (p.includes('₺') || /\bTL\b/.test(p) || p.includes('TRY')) {
    return 'TRY';
  }
  if (p.includes('AED') || /\bDHS?\b/.test(p)) {
    return 'AED';
  }
  if (p.includes('€') || p.includes('EUR')) {
    return 'EUR';
  }
  if (p.includes('£') || p.includes('GBP')) {
    return 'GBP';
  }
  if (p.includes('SAR') || /\bSR\b/.test(p)) {
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
 * Handles European/Turkish formats ("1.299,99" or "179,10") and US formats ("1,299.99" or "179.10").
 * @param {string|number} rawPrice
 * @returns {number|null} parsed float or null if invalid
 */
export const parsePrice = rawPrice => {
  if (typeof rawPrice === 'number') {
    return isNaN(rawPrice) || rawPrice <= 0 ? null : rawPrice;
  }

  if (!rawPrice) {
    return null;
  }

  let str = String(rawPrice).trim();

  // Strip currency symbols and letters (keep digits, comma, dot, minus)
  str = str.replace(/[^0-9.,-]/g, '').trim();
  if (!str) {
    return null;
  }

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    // Both comma and dot present: determine which is decimal by position
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // European/Turkish format: 1.299,99 -> 1299.99
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,299.99 -> 1299.99
      str = str.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    // Only comma present: 179,10 -> 179.10
    str = str.replace(',', '.');
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
  const price = parsePrice(rawPrice);
  if (price === null) {
    return null;
  }

  const currency = normalizeCurrency(rawCurrency, rawPrice);
  if (currency === 'USD') {
    return parseFloat(price.toFixed(2));
  }

  // 1. Check dynamic rates
  if (rates && typeof rates[currency] === 'number' && rates[currency] > 0) {
    return parseFloat((price * rates[currency]).toFixed(2));
  }

  // 2. Check dynamic inverse rates
  if (
    inverseRates &&
    typeof inverseRates[currency] === 'number' &&
    inverseRates[currency] > 0
  ) {
    return parseFloat((price / inverseRates[currency]).toFixed(2));
  }

  // 3. Fallback to default rates
  if (DEFAULT_RATES[currency]) {
    return parseFloat((price * DEFAULT_RATES[currency]).toFixed(2));
  }

  if (DEFAULT_INVERSE_RATES[currency]) {
    return parseFloat((price / DEFAULT_INVERSE_RATES[currency]).toFixed(2));
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
