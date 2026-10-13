/**
 * Currency parsing, normalization, and USD conversion helpers.
 * Aligned with 1Click Exchange Rate API documentation.
 */

export const DEFAULT_RATES = {
  USD: 1.0,
  TRY: 0.029412,
  AED: 0.272479,
  UAE: 0.272479,
  EUR: 1.08,
  GBP: 1.28,
  SAR: 0.266667,
};

export const DEFAULT_INVERSE_RATES = {
  USD: 1.0,
  AED: 3.67,
  UAE: 3.67,
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
  if (p.includes('UAE')) {
    return 'UAE';
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

  // 1. Check dynamic rates (Multiplier: Price_in_USD = Local_Price * rates[CURRENCY])
  const rateVal = Number(rates?.[currency]);
  if (!isNaN(rateVal) && rateVal > 0) {
    return parseFloat((price * rateVal).toFixed(2));
  }

  // 2. Check dynamic inverse rates (Divisor: Price_in_USD = Local_Price / inverseRates[CURRENCY])
  const inverseRateVal = Number(inverseRates?.[currency]);
  if (!isNaN(inverseRateVal) && inverseRateVal > 0) {
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
