import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createJSONStorage, persist} from 'zustand/middleware';
import ai from '../helpers/ai';
import {useExchangeRateStore} from './useExchangeRateStore';

export const useSheinPriceStore = create(
  persist(
    (set, get) => ({
      marketplaces: [],
      marketplaceRates: {},
      sheinPrice: 0,
      currency: 'USD',
      percent: 0,
      sheinPercent: 0,
      lastFetched: null,
      loading: false,
      error: null,

      /**
       * Fetches dynamic marketplace pricing list from GET /api/marketplace-price
       */
      fetchMarketplacePrices: async () => {
        try {
          set({loading: true, error: null});
          console.log('[MarketplacePrice] Calling GET /api/marketplace-price...');
          const response = await ai.get('marketplace-price');

          if (response?.data && response.data.error === false) {
            const data = response.data;
            const marketplaces = Array.isArray(data.marketplaces)
              ? data.marketplaces
              : [];
            const rates = data.rates || {};

            const parsePercent = val => {
              if (val === null || val === undefined || val === '') return 0;
              const num =
                typeof val === 'number'
                  ? val
                  : parseFloat(String(val).replace(/%/g, '').trim());
              return isNaN(num) ? 0 : num;
            };

            const sheinItem = marketplaces.find(
              m => String(m.marketplace || '').toLowerCase() === 'shein',
            );
            const sheinPercent = sheinItem
              ? parsePercent(sheinItem.percent)
              : parsePercent(rates.shein ?? 0);
            const sheinPriceVal = Number(sheinItem?.price ?? 0);

            console.log('[MarketplacePrice] API response received successfully:', {
              marketplacesCount: marketplaces.length,
              sheinPercent,
              rates,
            });

            set({
              marketplaces,
              marketplaceRates: rates,
              percent: sheinPercent,
              sheinPercent: sheinPercent,
              sheinPrice: sheinPriceVal,
              lastFetched: Date.now(),
              loading: false,
              error: null,
            });
            return data;
          } else {
            console.warn('[MarketplacePrice] API responded without error=false:', response?.data);
            set({loading: false});
          }
        } catch (err) {
          console.warn('[MarketplacePrice] Axios fetch failed, attempting native fetch fallback:', err?.message || err);
          // Fallback to direct fetch if axios wrapper encounters network issues
          try {
            const directUrl =
              'https://1click.thesyndicates.team/api/marketplace-price';
            const directRes = await fetch(directUrl);
            const data = await directRes.json();
            if (data && data.error === false) {
              const marketplaces = Array.isArray(data.marketplaces)
                ? data.marketplaces
                : [];
              const rates = data.rates || {};
              const sheinItem = marketplaces.find(
                m => String(m.marketplace || '').toLowerCase() === 'shein',
              );
              const sheinPercent = sheinItem
                ? Number(sheinItem.percent ?? 0)
                : Number(rates.shein ?? 0);

              set({
                marketplaces,
                marketplaceRates: rates,
                percent: sheinPercent,
                sheinPercent: sheinPercent,
                lastFetched: Date.now(),
                loading: false,
                error: null,
              });
              return data;
            }
          } catch (_e) {}
          set({
            loading: false,
            error: err?.message || 'Failed to fetch marketplace price',
          });
        }
      },

      /**
       * Backward-compatible alias for existing screens
       */
      fetchSheinPrice: async (targetCurrency = 'AED') => {
        return get().fetchMarketplacePrices();
      },

      /**
       * Returns marketplace fee for a given currency using live exchange rates from GET /api/exchange-rate
       * @param {string} [userCurrency='AED']
       * @returns {number}
       */
      getFeeForCurrency: (userCurrency = 'AED') => {
        const cur = String(userCurrency || 'AED').toUpperCase().trim();
        if (cur === 'USD') return 1.0;
        const liveRates = useExchangeRateStore.getState().rates || {};
        return liveRates[cur] || 1.0;
      },
    }),
    {
      name: 'shein-price-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        marketplaces: state.marketplaces,
        marketplaceRates: state.marketplaceRates,
        percent: state.percent,
        sheinPercent: state.sheinPercent,
        sheinPrice: state.sheinPrice,
        currency: state.currency,
        lastFetched: state.lastFetched,
      }),
    },
  ),
);

/**
 * Convenience alias for marketplace price store
 */
export const useMarketplacePriceStore = useSheinPriceStore;

/**
 * Convenience helper to get Shein fee in a target currency
 */
export const getSheinFee = (currency = 'AED') => {
  return useSheinPriceStore.getState().getFeeForCurrency(currency);
};


