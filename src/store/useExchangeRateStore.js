import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createJSONStorage, persist} from 'zustand/middleware';
import ai from '../helpers/ai';
import {
  DEFAULT_RATES,
  DEFAULT_INVERSE_RATES,
  calculateConvertedPrice,
  normalizeCurrency,
  parsePrice,
} from '../helpers/currencyHelper';

export const parseExchangeRateData = data => {
  const ratesObj = {...(data.rates || {})};
  const inverseRatesObj = {...(data.inverseRates || {})};

  // Ingest pairs from API response dynamically
  if (Array.isArray(data.pairs)) {
    data.pairs.forEach(pair => {
      if (!pair) return;
      const fromUpper = String(pair.from || '').toUpperCase().trim();
      const toUpper = String(pair.to || 'USD').toUpperCase().trim();
      const rawRate = Number(pair.rate);
      const rawInverse = Number(pair.inverseRate);

      if (toUpper === 'USD' && fromUpper) {
        if (!isNaN(rawRate) && rawRate > 0) {
          if (['SAR', 'AED', 'TRY', 'UAE', 'QAR', 'EGP', 'INR', 'PKR'].includes(fromUpper) && rawRate > 1) {
            inverseRatesObj[fromUpper] = rawRate;
            ratesObj[fromUpper] = Number((1 / rawRate).toFixed(6));
          } else {
            ratesObj[fromUpper] = rawRate;
            if (!inverseRatesObj[fromUpper]) {
              inverseRatesObj[fromUpper] = Number((1 / rawRate).toFixed(6));
            }
          }
        }
        if (!isNaN(rawInverse) && rawInverse > 0) {
          inverseRatesObj[fromUpper] = rawInverse;
          if (!ratesObj[fromUpper]) {
            ratesObj[fromUpper] = Number((1 / rawInverse).toFixed(6));
          }
        }
      } else if (fromUpper === 'USD' && toUpper) {
        if (!isNaN(rawRate) && rawRate > 0) {
          inverseRatesObj[toUpper] = rawRate;
          ratesObj[toUpper] = Number((1 / rawRate).toFixed(6));
        }
      }
    });
  }

  // Handle top-level default fields
  if (data.default_from && (!data.default_to || data.default_to === 'USD')) {
    const defFrom = String(data.default_from).toUpperCase().trim();
    if (data.default_rate && !ratesObj[defFrom]) {
      ratesObj[defFrom] = Number(data.default_rate);
    }
    if (data.default_inverse_rate && !inverseRatesObj[defFrom]) {
      inverseRatesObj[defFrom] = Number(data.default_inverse_rate);
    }
  }

  if (!ratesObj.AED && data.default_rate) {
    ratesObj.AED = Number(data.default_rate);
  }
  if (!inverseRatesObj.AED) {
    inverseRatesObj.AED = Number(
      data.rateAed || data.default_inverse_rate || data.rate || 3.2,
    );
  }

  if (data.rateAed) {
    inverseRatesObj.AED = Number(data.rateAed);
    ratesObj.AED = Number((1 / data.rateAed).toFixed(6));
  }
  if (data.rateTry) {
    inverseRatesObj.TRY = Number(data.rateTry);
    ratesObj.TRY = Number((1 / data.rateTry).toFixed(6));
  }

  // Handle rateSar / rate_sar from API
  const rawSarRate =
    data.rateSar ||
    data.rate_sar ||
    data.rateSAR ||
    data.sar ||
    data.SAR ||
    (data.rates && (data.rates.SAR || data.rates.sar)) ||
    (data.inverseRates && (data.inverseRates.SAR || data.inverseRates.sar));

  if (rawSarRate) {
    const num = Number(rawSarRate);
    if (!isNaN(num) && num > 0) {
      if (num > 1) {
        inverseRatesObj.SAR = num;
        ratesObj.SAR = Number((1 / num).toFixed(6));
      } else {
        ratesObj.SAR = num;
        inverseRatesObj.SAR = Number((1 / num).toFixed(6));
      }
    }
  }

  // Aliases: UAE -> AED
  if (ratesObj.AED) {
    ratesObj.UAE = ratesObj.AED;
  }
  if (inverseRatesObj.AED) {
    inverseRatesObj.UAE = inverseRatesObj.AED;
  }

  // Sanity check across all weaker currencies (SAR, AED, TRY, etc.)
  // to ensure ratesObj is always the multiplier (< 1) and inverseRatesObj is always the divisor (> 1)
  const weakerCurrencies = ['SAR', 'AED', 'UAE', 'TRY', 'QAR', 'EGP', 'INR', 'PKR'];
  weakerCurrencies.forEach(curr => {
    const direct = Number(ratesObj[curr]);
    const inv = Number(inverseRatesObj[curr]);

    if (!isNaN(direct) && direct > 1) {
      inverseRatesObj[curr] = direct;
      ratesObj[curr] = Number((1 / direct).toFixed(6));
    } else if (!isNaN(inv) && inv > 0 && inv < 1) {
      ratesObj[curr] = inv;
      inverseRatesObj[curr] = Number((1 / inv).toFixed(6));
    }

    if (ratesObj[curr] && (!inverseRatesObj[curr] || isNaN(inverseRatesObj[curr]))) {
      inverseRatesObj[curr] = Number((1 / ratesObj[curr]).toFixed(6));
    }
    if (inverseRatesObj[curr] && (!ratesObj[curr] || isNaN(ratesObj[curr]))) {
      ratesObj[curr] = Number((1 / inverseRatesObj[curr]).toFixed(6));
    }
  });

  // USD is always 1.0 (never converted)
  const newRates = {
    ...DEFAULT_RATES,
    ...ratesObj,
    USD: 1.0,
  };
  const newInverseRates = {
    ...DEFAULT_INVERSE_RATES,
    ...inverseRatesObj,
    USD: 1.0,
  };

  return {
    rates: newRates,
    inverseRates: newInverseRates,
    pairs: data.pairs || [],
    defaultCurrency: data.default_currency || data.default_from || 'AED',
    defaultTarget: data.default_target || data.default_to || 'USD',
    defaultRate: Number(data.default_rate || newRates.AED || 0.3125),
    defaultInverseRate: Number(
      data.default_inverse_rate || data.rateAed || newInverseRates.AED || 3.2,
    ),
    rateAed: Number(data.rateAed || newInverseRates.AED || 3.2),
    rateTry: Number(data.rateTry || newInverseRates.TRY || 33.9997),
    rateSar: Number(rawSarRate || newInverseRates.SAR || 3.75),
    lastFetched: Date.now(),
    loading: false,
    error: null,
  };
};

export const useExchangeRateStore = create(
  persist(
    (set, get) => ({
      rates: DEFAULT_RATES,
      inverseRates: DEFAULT_INVERSE_RATES,
      defaultCurrency: 'AED',
      defaultTarget: 'USD',
      defaultRate: 0.3125,
      defaultInverseRate: 3.2,
      rateAed: 3.2,
      rateTry: 33.9997,
      rateSar: 3.75,
      pairs: [],
      lastFetched: null,
      loading: false,
      error: null,

      /**
       * Fetches latest exchange rates from GET /api/exchange-rate
       * If called with an explicit USD/$ context currency, avoids hitting the API.
       */
      fetchRates: async (contextCurrencyOrItem) => {
        if (contextCurrencyOrItem) {
          if (Array.isArray(contextCurrencyOrItem)) {
            if (contextCurrencyOrItem.length === 0) {
              return;
            }
            const hasNonUsd = contextCurrencyOrItem.some(it => {
              const p = String(it?.price || '');
              const c = String(it?.currency || '').trim().toUpperCase();
              const isUsd = p.includes('$') || /\bUSD\b/i.test(p) || c.includes('$') || /\bUSD\b/i.test(c) || normalizeCurrency(c, p) === 'USD';
              return !isUsd;
            });
            if (!hasNonUsd) {
              return;
            }
          } else if (typeof contextCurrencyOrItem === 'object') {
            const isShein = Boolean(
              (contextCurrencyOrItem?.store && String(contextCurrencyOrItem.store).toLowerCase().includes('shein')) ||
              (contextCurrencyOrItem?.url && String(contextCurrencyOrItem.url).toLowerCase().includes('shein.com')) ||
              (contextCurrencyOrItem?.marketplace && String(contextCurrencyOrItem.marketplace).toLowerCase().includes('shein')),
            );
            const p = String(contextCurrencyOrItem?.price || '');
            const c = String(contextCurrencyOrItem?.currency || '').trim().toUpperCase();
            const isUsd = p.includes('$') || /\bUSD\b/i.test(p) || c.includes('$') || /\bUSD\b/i.test(c) || normalizeCurrency(c, p) === 'USD';
            if ((isShein && isUsd) || isUsd) {
              return;
            }
          } else {
            const c = String(contextCurrencyOrItem).trim().toUpperCase();
            if (c === 'USD' || c === '$' || c.includes('USD') || c.includes('$') || normalizeCurrency(c) === 'USD') {
              return;
            }
          }
        }
        try {
          set({loading: true, error: null});
          const response = await ai.get('exchange-rate');

          if (response?.data && response.data.error === false) {
            const parsed = parseExchangeRateData(response.data);
            set(parsed);
            return response.data;
          } else {
            set({loading: false});
          }
        } catch (err) {
          console.log('fetchRates error:', err?.message || err);
          // Fallback to direct fetch if axios wrapper encounters network issues
          try {
            const directRes = await fetch(
              'https://1click.thesyndicates.team/api/exchange-rate',
            );
            const data = await directRes.json();
            if (data && data.error === false) {
              const parsed = parseExchangeRateData(data);
              set(parsed);
              return data;
            }
          } catch (_e) {}
          set({loading: false, error: err?.message || 'Failed to fetch rates'});
        }
      },

      /**
       * Converts a local price to USD based on current rates
       * @param {string|number} price
       * @param {string} currency
       * @returns {number|null} Converted USD amount
       */
      convertPrice: (price, currency) => {
        const {rates, inverseRates} = get();
        return calculateConvertedPrice(price, currency, rates, inverseRates);
      },

      /**
       * Converts local currency amount to USD (Method A Multiplier)
       * @param {number} amount
       * @param {string} [fromCurrency='AED']
       * @returns {number}
       */
      toUSD: (amount, fromCurrency = 'AED') => {
        const {rates, inverseRates} = get();
        return (
          calculateConvertedPrice(amount, fromCurrency, rates, inverseRates) ??
          (Number(amount) || 0)
        );
      },

      /**
       * Converts USD amount to local currency (e.g. for display)
       * @param {number} usdAmount
       * @param {string} [targetCurrency='AED']
       * @returns {number}
       */
      fromUSD: (usdAmount, targetCurrency = 'AED') => {
        const cur = normalizeCurrency(targetCurrency);
        if (cur === 'USD') {
          return Number(usdAmount) || 0;
        }
        const {rates, inverseRates} = get();
        const isWeaker = ['SAR', 'AED', 'UAE', 'TRY', 'QAR', 'EGP', 'INR', 'PKR'].includes(cur);
        const invRate = Number(inverseRates[cur] || DEFAULT_INVERSE_RATES[cur]);
        if (!isNaN(invRate) && invRate > 0) {
          if (isWeaker && invRate < 1) {
            return parseFloat((Number(usdAmount) / invRate).toFixed(2));
          }
          return parseFloat((Number(usdAmount) * invRate).toFixed(2));
        }
        const rate = Number(rates[cur] || DEFAULT_RATES[cur]);
        if (!isNaN(rate) && rate > 0) {
          if (isWeaker && rate > 1) {
            return parseFloat((Number(usdAmount) * rate).toFixed(2));
          }
          return parseFloat((Number(usdAmount) / rate).toFixed(2));
        }
        return Number(usdAmount) || 0;
      },

      /**
       * Returns the direct multiplier for a currency to USD
       * @param {string} currency
       * @returns {number}
       */
      getRate: currency => {
        const norm = normalizeCurrency(currency);
        const {rates} = get();
        return rates[norm] || DEFAULT_RATES[norm] || 1.0;
      },
    }),
    {
      name: 'exchange-rate-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        rates: state.rates,
        inverseRates: state.inverseRates,
        defaultCurrency: state.defaultCurrency,
        defaultTarget: state.defaultTarget,
        defaultRate: state.defaultRate,
        defaultInverseRate: state.defaultInverseRate,
        rateAed: state.rateAed,
        rateTry: state.rateTry,
        rateSar: state.rateSar,
        pairs: state.pairs,
        lastFetched: state.lastFetched,
      }),
    },
  ),
);

/**
 * Direct convenience conversion function using store state
 */
export const convertToUsd = (price, currency) => {
  return useExchangeRateStore.getState().convertPrice(price, currency);
};

export const convertFromUsd = (usdAmount, currency) => {
  return useExchangeRateStore.getState().fromUSD(usdAmount, currency);
};

export const currencyService = {
  toUSD: (amount, fromCurrency = 'AED') =>
    useExchangeRateStore.getState().toUSD(amount, fromCurrency),
  fromUSD: (usdAmount, targetCurrency = 'AED') =>
    useExchangeRateStore.getState().fromUSD(usdAmount, targetCurrency),
  syncRates: () => useExchangeRateStore.getState().fetchRates(),
};

export {normalizeCurrency, parsePrice};
