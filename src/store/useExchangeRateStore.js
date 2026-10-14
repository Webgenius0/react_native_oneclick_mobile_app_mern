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
      if (pair && pair.from) {
        const fromUpper = String(pair.from).toUpperCase().trim();
        const toUpper = String(pair.to || 'USD').toUpperCase().trim();
        if (toUpper === 'USD') {
          if (pair.rate !== undefined && pair.rate !== null && !ratesObj[fromUpper]) {
            ratesObj[fromUpper] = Number(pair.rate);
          }
          if (pair.inverseRate !== undefined && pair.inverseRate !== null && !inverseRatesObj[fromUpper]) {
            inverseRatesObj[fromUpper] = Number(pair.inverseRate);
          }
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
    if (!ratesObj.AED && data.rateAed > 0) {
      ratesObj.AED = Number((1 / data.rateAed).toFixed(6));
    }
  }
  if (data.rateTry) {
    inverseRatesObj.TRY = Number(data.rateTry);
    if (!ratesObj.TRY && data.rateTry > 0) {
      ratesObj.TRY = Number((1 / data.rateTry).toFixed(6));
    }
  }

  // Aliases: UAE -> AED
  if (ratesObj.AED) {
    ratesObj.UAE = ratesObj.AED;
  }
  if (inverseRatesObj.AED) {
    inverseRatesObj.UAE = inverseRatesObj.AED;
  }

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
        const cur = normalizeCurrency(fromCurrency);
        if (cur === 'USD') {
          return Number(amount) || 0;
        }
        const {rates, inverseRates} = get();
        const rate = Number(rates[cur] || DEFAULT_RATES[cur]);
        if (!isNaN(rate) && rate > 0) {
          return parseFloat((Number(amount) * rate).toFixed(2));
        }
        const invRate = Number(inverseRates[cur] || DEFAULT_INVERSE_RATES[cur]);
        if (!isNaN(invRate) && invRate > 0) {
          return parseFloat((Number(amount) / invRate).toFixed(2));
        }
        return Number(amount) || 0;
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
        const rate = Number(rates[cur] || DEFAULT_RATES[cur]);
        if (!isNaN(rate) && rate > 0) {
          return parseFloat((Number(usdAmount) / rate).toFixed(2));
        }
        const invRate = Number(inverseRates[cur] || DEFAULT_INVERSE_RATES[cur]);
        if (!isNaN(invRate) && invRate > 0) {
          return parseFloat((Number(usdAmount) * invRate).toFixed(2));
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
