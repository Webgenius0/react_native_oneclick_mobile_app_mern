import { create } from 'zustand';
import { storageGet, storageSet } from '../helpers/storage';
import ai from '../helpers/ai';
import {
  FILTER_TABS,
  matchesOrderSearch,
  getOrderStatusCategory,
  normalizeOrderRecord,
} from '../helpers/orderStatus';

const CACHE_ORDERS_KEY = 'cached_orders_master';
const LEGACY_CACHE_KEY = 'cached_orders_list';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache validity
const ORDERS_PER_PAGE = 5; // Reduced from 10 to 5 for significantly faster backend response & lighter render

// Map to track in-flight requests and prevent duplicate network hits
const inFlightRequests = new Map();

const createInitialTabState = () => ({
  orders: [],
  page: 1,
  totalPages: 1,
  totalOrders: 0,
  hasNextPage: false,
  lastFetched: null,
  loading: false,
  loadingMore: false,
});

// Read FILTER_TABS lazily: orderStatus is part of an import cycle with this
// store (orderStatus -> storeHelper -> ... -> auth -> useOrderStore), so its
// exports can still be undefined while this module is first evaluated.
const createInitialTabs = () => {
  const ids = Array.isArray(FILTER_TABS) ? FILTER_TABS.map(t => t.id) : ['all'];
  return ids.reduce((acc, id) => {
    acc[id] = createInitialTabState();
    return acc;
  }, {});
};

export const useOrderStore = create((set, get) => ({
  // Per-tab cache, one entry per FILTER_TABS id (others are created on first fetch)
  tabs: createInitialTabs(),

  // Active search query cache
  searchCache: {
    query: '',
    tabId: 'all',
    orders: [],
    page: 1,
    totalPages: 1,
    hasNextPage: false,
    loading: false,
    loadingMore: false,
  },

  isDirty: false, // Set to true when a new order is placed or order updated

  // Invalidate all cached data so next fetch or screen focus refreshes
  invalidateOrders: () => {
    set(state => ({
      isDirty: true,
      tabs: Object.keys({ ...createInitialTabs(), ...state.tabs }).reduce(
        (acc, id) => {
          acc[id] = {
            ...(state.tabs[id] || createInitialTabState()),
            lastFetched: null,
          };
          return acc;
        },
        {},
      ),
    }));
  },

  // Completely wipe in-memory order data on logout
  clearOrders: () => {
    set(() => ({
      isDirty: true,
      tabs: createInitialTabs(),
      searchCache: {
        query: '',
        tabId: 'all',
        orders: [],
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        loading: false,
        loadingMore: false,
      },
    }));
  },

  // Hydrate initial cached orders on app cold start (instant 0ms display)
  loadInitialCache: async () => {
    try {
      const cached =
        (await storageGet(CACHE_ORDERS_KEY)) ||
        (await storageGet(LEGACY_CACHE_KEY));
      if (Array.isArray(cached) && cached.length > 0) {
        const normalizedCached = cached.map(normalizeOrderRecord);
        set(state => {
          // Only hydrate if tab is currently empty
          if (state.tabs.all.orders.length > 0) return state;
          return {
            tabs: {
              ...state.tabs,
              all: {
                ...state.tabs.all,
                orders: normalizedCached,
                totalOrders: normalizedCached.length,
              },
            },
          };
        });
      }
    } catch (e) {
      console.log('Error reading cached orders from storage:', e);
    }
  },

  // Fetch orders according to API specification
  fetchOrders: async ({
    tabId = 'all',
    pageNum = 1,
    search = '',
    isRefresh = false,
    isSilent = false,
    force = false,
    grupID = 0,
  } = {}) => {
    const state = get();
    const cleanSearch = (search || '').trim();
    const isSearching = cleanSearch.length > 0;
    const currentTab = state.tabs[tabId] || createInitialTabState();
    const now = Date.now();
    const isCacheFresh =
      currentTab.lastFetched && now - currentTab.lastFetched < CACHE_TTL_MS;

    // Fast-path: if page 1, not searching, not refreshing, not forced, not dirty, and cache is fresh:
    if (
      pageNum === 1 &&
      !isSearching &&
      !isRefresh &&
      !force &&
      !state.isDirty &&
      isCacheFresh &&
      currentTab.orders.length > 0
    ) {
      return {
        orders: currentTab.orders,
        page: currentTab.page,
        totalPages: currentTab.totalPages,
        hasNextPage: currentTab.hasNextPage,
      };
    }

    // In-flight deduplication: prevent duplicate concurrent HTTP requests
    const inFlightKey = `${tabId}_${cleanSearch}_${pageNum}`;
    if (inFlightRequests.has(inFlightKey)) {
      return inFlightRequests.get(inFlightKey);
    }

    // Guard against duplicate loading
    if (!isSearching) {
      if (pageNum === 1 && currentTab.loading && !force && !isRefresh) return null;
      if (pageNum > 1 && currentTab.loadingMore) return null;
    }

    // Set loading indicator
    if (isSearching) {
      set(s => ({
        searchCache: {
          ...s.searchCache,
          query: cleanSearch,
          tabId,
          loading: pageNum === 1 && !isRefresh && !isSilent,
          loadingMore: pageNum > 1,
        },
      }));
    } else {
      set(s => ({
        tabs: {
          ...s.tabs,
          [tabId]: {
            ...s.tabs[tabId],
            loading: pageNum === 1 && !isRefresh && !isSilent,
            loadingMore: pageNum > 1,
          },
        },
      }));
    }

    const executeFetch = async () => {
      try {
        const activeTabObj =
          FILTER_TABS.find(t => t.id === tabId) || FILTER_TABS[0];

        // GET /orders?filter=<all|pending|confirmed|in_progress|dubai_warehouse|
        //   delivery_warehouse|out_for_delivery|delivered|cancelled>
        const queryParams = {
          page: pageNum,
          per_page: ORDERS_PER_PAGE,
          limit: ORDERS_PER_PAGE,
          filter: activeTabObj.filter || tabId,
          tab: activeTabObj.filter || tabId,
        };

        if (isSearching) {
          queryParams.search = cleanSearch;
          queryParams.q = cleanSearch;
        }
        if (grupID) {
          queryParams.grupID = grupID;
        }

        let res = null;
        try {
          // Primary API endpoint: GET /api/orders
          res = await ai.get('orders', { params: queryParams });
        } catch (_getErr) {
          // Fallback endpoint: POST /api/orders if GET fails on legacy server
          res = await ai.post('orders', {
            ...queryParams,
            durum: activeTabObj.durums || 0,
            grupID: grupID || 0,
          });
        }

        if (res?.data && res.data.error === false) {
          const incomingOrders =
            Array.isArray(res.data.orders) && res.data.orders.length > 0
              ? res.data.orders
              : Array.isArray(res.data.unified_orders) && res.data.unified_orders.length > 0
              ? res.data.unified_orders
              : Array.isArray(res.data.grups) && res.data.grups.length > 0
              ? res.data.grups
              : Array.isArray(res.data.ss)
              ? res.data.ss
              : [];

          let rawList = incomingOrders.map(normalizeOrderRecord);
          const resPage = Number(res.data.page) || pageNum;
          const resTotalPages = Number(res.data.total_pages) || 1;
          const resTotalOrders =
            res.data.total_orders !== undefined
              ? Number(res.data.total_orders)
              : rawList.length;

          // If backend returns has_next_page use it, otherwise check page < total_pages
          const resHasNextPage = Boolean(
            res.data.has_next_page !== undefined
              ? res.data.has_next_page
              : resPage < resTotalPages,
          );

          // Guarantee tab-level status consistency (protect against unfiltered/mixed server returns)
          if (!isSearching && tabId !== 'all' && Array.isArray(rawList)) {
            const hasMismatched = rawList.some(
              item => getOrderStatusCategory(item) !== tabId,
            );
            if (hasMismatched) {
              rawList = rawList.filter(
                item => getOrderStatusCategory(item) === tabId,
              );
            }
          }

          // Fallback client filter if server returned unfiltered response
          if (isSearching && Array.isArray(rawList)) {
            const matches = rawList.filter(item =>
              matchesOrderSearch(item, cleanSearch),
            );
            if (matches.length > 0 || rawList.length > 0) {
              rawList = matches;
            }
          }

          if (isSearching) {
            set(s => {
              const existingList = pageNum === 1 ? [] : s.searchCache.orders;
              const existingIds = new Set(
                existingList.map(item => item.id || item.order_number),
              );
              const newUnique = rawList.filter(
                item => !existingIds.has(item.id || item.order_number),
              );
              const mergedList =
                pageNum === 1 ? rawList : [...existingList, ...newUnique];

              return {
                searchCache: {
                  query: cleanSearch,
                  tabId,
                  orders: mergedList,
                  page: resPage,
                  totalPages: resTotalPages,
                  hasNextPage: resHasNextPage,
                  loading: false,
                  loadingMore: false,
                },
              };
            });
          } else {
            set(s => {
              const existingTab = s.tabs[tabId] || createInitialTabState();
              const existingList = pageNum === 1 ? [] : existingTab.orders;
              const existingIds = new Set(
                existingList.map(item => item.id || item.order_number),
              );
              const newUnique = rawList.filter(
                item => !existingIds.has(item.id || item.order_number),
              );
              const mergedList =
                pageNum === 1 ? rawList : [...existingList, ...newUnique];

              return {
                isDirty: false,
                tabs: {
                  ...s.tabs,
                  [tabId]: {
                    orders: mergedList,
                    page: resPage,
                    totalPages: resTotalPages,
                    totalOrders: resTotalOrders,
                    hasNextPage: resHasNextPage,
                    lastFetched: Date.now(),
                    loading: false,
                    loadingMore: false,
                  },
                },
              };
            });

            // Persist the 'all' tab page 1 for instant cold start
            if (tabId === 'all' && pageNum === 1 && !isSearching) {
              await storageSet(CACHE_ORDERS_KEY, rawList);
            }
          }

          return {
            orders: rawList,
            page: resPage,
            totalPages: resTotalPages,
            hasNextPage: resHasNextPage,
          };
        }
      } catch (err) {
        console.log('Error fetching orders:', err?.message || err);
      } finally {
        // Ensure loading flags are reset
        set(s => ({
          tabs: {
            ...s.tabs,
            [tabId]: {
              ...s.tabs[tabId],
              loading: false,
              loadingMore: false,
            },
          },
          searchCache: {
            ...s.searchCache,
            loading: false,
            loadingMore: false,
          },
        }));
      }
      return null;
    };

    const requestPromise = executeFetch();
    inFlightRequests.set(inFlightKey, requestPromise);
    try {
      return await requestPromise;
    } finally {
      inFlightRequests.delete(inFlightKey);
    }
  },
}));

// Convenient standalone helper to invalidate cache from anywhere
export const invalidateOrderCache = () => {
  useOrderStore.getState().invalidateOrders();
};
