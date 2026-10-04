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

export const useExchangeRateStore = create(
  persist(
    (set, get) => ({
      rates: DEFAULT_RATES,
      inverseRates: DEFAULT_INVERSE_RATES,
      defaultCurrency: 'AED',
      defaultTarget: 'USD',
      defaultRate: 0.272479,
      defaultInverseRate: 3.670008,
      rateAed: 3.67,
      rateTry: 33.9997,
      pairs: [],
      lastFetched: null,
      loading: false,
      error: null,

      /**
       * Fetches latest exchange rates from GET /api/exchange-rate
       */
      fetchRates: async () => {
        try {
          set({loading: true, error: null});
          const response = await ai.get('exchange-rate');

          if (response?.data && response.data.error === false) {
            const data = response.data;
            const ratesObj = {...(data.rates || {})};
            const inverseRatesObj = {...(data.inverseRates || {})};

            if (!ratesObj.AED && data.default_rate) {
              ratesObj.AED = data.default_rate;
            }
            if (!inverseRatesObj.AED) {
              inverseRatesObj.AED =
                data.rateAed || data.default_inverse_rate || data.rate || 3.67;
            }

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

            set({
              rates: newRates,
              inverseRates: newInverseRates,
              pairs: data.pairs || [],
              defaultCurrency: data.default_currency || 'AED',
              defaultTarget: data.default_target || 'USD',
              defaultRate: Number(data.default_rate || 0.272479),
              defaultInverseRate: Number(
                data.default_inverse_rate || data.rateAed || 3.670008,
              ),
              rateAed: Number(data.rateAed || 3.67),
              rateTry: Number(data.rateTry || 33.9997),
              lastFetched: Date.now(),
              loading: false,
              error: null,
            });
            return data;
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
              const ratesObj = {...(data.rates || {})};
              const inverseRatesObj = {...(data.inverseRates || {})};
              if (!ratesObj.AED && data.default_rate) {
                ratesObj.AED = data.default_rate;
              }
              if (!inverseRatesObj.AED) {
                inverseRatesObj.AED =
                  data.rateAed || data.default_inverse_rate || data.rate || 3.67;
              }

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

              set({
                rates: newRates,
                inverseRates: newInverseRates,
                pairs: data.pairs || [],
                defaultCurrency: data.default_currency || 'AED',
                defaultTarget: data.default_target || 'USD',
                defaultRate: Number(data.default_rate || 0.272479),
                defaultInverseRate: Number(
                  data.default_inverse_rate || data.rateAed || 3.670008,
                ),
                rateAed: Number(data.rateAed || 3.67),
                rateTry: Number(data.rateTry || 33.9997),
                lastFetched: Date.now(),
                loading: false,
                error: null,
              });
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
        const {rates} = get();
        const rate = rates[cur] || DEFAULT_RATES[cur];
        if (!rate || rate <= 0) {
          return Number(amount) || 0;
        }
        return parseFloat((Number(amount) * rate).toFixed(2));
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
        const {rates} = get();
        const rate = rates[cur] || DEFAULT_RATES[cur];
        if (!rate || rate <= 0) {
          return Number(usdAmount) || 0;
        }
        return parseFloat((Number(usdAmount) / rate).toFixed(2));
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
