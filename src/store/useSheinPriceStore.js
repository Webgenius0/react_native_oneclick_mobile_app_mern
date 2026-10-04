import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createJSONStorage, persist} from 'zustand/middleware';
import ai from '../helpers/ai';

export const useSheinPriceStore = create(
  persist(
    (set, get) => ({
      sheinPrice: 1.101, // default currency is now AED per API v2.1
      currency: 'AED',
      priceAed: 1.101,
      basePriceAed: 1.101,
      basePriceUsd: 0.3,
      priceCents: 30,
      rates: {
        AED: 1.101,
        USD: 0.3,
        TRY: 10.2,
        SAR: 1.125,
        EUR: 0.2778,
        GBP: 0.2344,
      },
      lastFetched: null,
      loading: false,
      error: null,

      /**
       * Fetches Shein marketplace price from GET /api/shein-price
       * @param {string} [targetCurrency='AED']
       */
      fetchSheinPrice: async (targetCurrency = 'AED') => {
        try {
          set({loading: true, error: null});
          const query =
            targetCurrency && targetCurrency !== 'AED'
              ? `shein-price?currency=${targetCurrency}`
              : 'shein-price';
          const response = await ai.get(query);

          if (response?.data && response.data.error === false) {
            const data = response.data;
            const usdPrice = Number(
              data.base_price_usd ??
                (data.price_cents
                  ? data.price_cents / 100
                  : (data.rates?.USD ?? 0.3)),
            );
            const aedPrice = Number(
              data.price_aed ??
                data.base_price_aed ??
                (data.rates?.AED ?? 1.101),
            );
            const currentPrice = Number(
              data.price ?? (data.currency === 'USD' ? usdPrice : aedPrice),
            );

            set({
              sheinPrice: currentPrice,
              currency:
                data.currency ||
                (targetCurrency ? String(targetCurrency).toUpperCase() : 'AED'),
              priceAed: aedPrice,
              basePriceAed: aedPrice,
              basePriceUsd: usdPrice,
              priceCents: Number(data.price_cents ?? Math.round(usdPrice * 100)),
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
            const directUrl =
              targetCurrency && targetCurrency !== 'AED'
                ? `https://1click.thesyndicates.team/api/shein-price?currency=${targetCurrency}`
                : 'https://1click.thesyndicates.team/api/shein-price';
            const directRes = await fetch(directUrl);
            const data = await directRes.json();
            if (data && data.error === false) {
              const usdPrice = Number(
                data.base_price_usd ??
                  (data.price_cents
                    ? data.price_cents / 100
                    : (data.rates?.USD ?? 0.3)),
              );
              const aedPrice = Number(
                data.price_aed ??
                  data.base_price_aed ??
                  (data.rates?.AED ?? 1.101),
              );
              const currentPrice = Number(
                data.price ?? (data.currency === 'USD' ? usdPrice : aedPrice),
              );

              set({
                sheinPrice: currentPrice,
                currency: data.currency || 'AED',
                priceAed: aedPrice,
                basePriceAed: aedPrice,
                basePriceUsd: usdPrice,
                priceCents: Number(data.price_cents ?? Math.round(usdPrice * 100)),
                rates: data.rates || {},
                lastFetched: Date.now(),
                loading: false,
                error: null,
              });
              return data;
            }
          } catch (_e) {}
          set({
            loading: false,
            error: err?.message || 'Failed to fetch shein price',
          });
        }
      },

      /**
       * Returns Shein fee for a given currency
       * @param {string} [userCurrency='AED']
       * @returns {number}
       */
      getFeeForCurrency: (userCurrency = 'AED') => {
        const cur = String(userCurrency || 'AED').toUpperCase().trim();
        const state = get();
        if (cur === 'USD') {
          return state.basePriceUsd;
        }
        if (cur === 'AED') {
          return state.priceAed;
        }
        if (state.rates && typeof state.rates[cur] === 'number') {
          return state.rates[cur];
        }
        if (state.currency === cur) {
          return state.sheinPrice;
        }
        return state.priceAed;
      },
    }),
    {
      name: 'shein-price-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        sheinPrice: state.sheinPrice,
        currency: state.currency,
        priceAed: state.priceAed,
        basePriceAed: state.basePriceAed,
        basePriceUsd: state.basePriceUsd,
        priceCents: state.priceCents,
        rates: state.rates,
        lastFetched: state.lastFetched,
      }),
    },
  ),
);

/**
 * Convenience helper to get Shein fee in a target currency
 */
export const getSheinFee = (currency = 'AED') => {
  return useSheinPriceStore.getState().getFeeForCurrency(currency);
};
