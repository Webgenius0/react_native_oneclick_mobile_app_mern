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
            const newRates = {
              ...DEFAULT_RATES,
              ...(response.data.rates || {}),
              USD: 1.0,
            };
            const newInverseRates = {
              ...DEFAULT_INVERSE_RATES,
              ...(response.data.inverseRates || {}),
              USD: 1.0,
            };

            set({
              rates: newRates,
              inverseRates: newInverseRates,
              pairs: response.data.pairs || [],
              lastFetched: Date.now(),
              loading: false,
              error: null,
            });
            return response.data;
          } else {
            set({loading: false});
          }
        } catch (err) {
          console.log('fetchRates error:', err?.message || err);
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

export {normalizeCurrency, parsePrice};
