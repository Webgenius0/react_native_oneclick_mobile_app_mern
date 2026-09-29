import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createJSONStorage, persist} from 'zustand/middleware';
import ai from '../helpers/ai';

export const useSheinPriceStore = create(
  persist(
    (set, get) => ({
      sheinPrice: 0.3,
      currency: 'USD',
      basePriceUsd: 0.3,
      rates: {
        USD: 0.3,
      },
      lastFetched: null,
      loading: false,
      error: null,

      /**
       * Fetches Shein marketplace price from GET /api/shein-price
       */
      fetchSheinPrice: async () => {
        try {
          set({loading: true, error: null});
          const response = await ai.get('shein-price');

          if (response?.data && response.data.error === false) {
            const data = response.data;
            const usdPrice = Number(data.base_price_usd ?? data.price ?? 0.3);
            set({
              sheinPrice: Number(data.price ?? 0.3),
              basePriceUsd: usdPrice,
              currency: data.currency || 'USD',
              rates: data.rates || {},
              lastFetched: Date.now(),
              loading: false,
              error: null,
            });
            return data;
          } else {
            set({loading: false});
          }
        } catch (err) {
          console.log('fetchSheinPrice error:', err?.message || err);
          // Fallback to direct fetch if axios wrapper encounters network issues
          try {
            const directRes = await fetch(
              'https://1click.thesyndicates.team/api/shein-price',
            );
            const data = await directRes.json();
            if (data && data.error === false) {
              const usdPrice = Number(data.base_price_usd ?? data.price ?? 0.3);
              set({
                sheinPrice: Number(data.price ?? 0.3),
                basePriceUsd: usdPrice,
                currency: data.currency || 'USD',
                rates: data.rates || {},
                lastFetched: Date.now(),
                loading: false,
                error: null,
              });
              return data;
            }
          } catch (_e) {}
          set({loading: false, error: err?.message || 'Failed to fetch shein price'});
        }
      },
    }),
    {
      name: 'shein-price-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        sheinPrice: state.sheinPrice,
        basePriceUsd: state.basePriceUsd,
        currency: state.currency,
        rates: state.rates,
        lastFetched: state.lastFetched,
      }),
    },
  ),
);
