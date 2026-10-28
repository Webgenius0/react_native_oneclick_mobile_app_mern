import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  StatusBar,
  FlatList,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { getMessaging, onMessage } from '@react-native-firebase/messaging';
import { tr } from '../translate/i18n';
import { EmContext } from '../contexts/EmContext';
import { storageGet, storageSet } from '../helpers/storage';
import ai from '../helpers/ai';
import GroupItem from '../components/orders/GroupItem';
import OrdersLoading from '../components/orders/Loading';
import AppHeader from '../components/common/AppHeader';
import { FIREBASE_ENABLED } from '../../config';
import BagIcon from '../assets/svg/bag.svg';
import {
  FILTER_TABS,
  getOrderStatusCategory,
  matchesOrderSearch,
  filterOrdersByTabAndSearch,
} from '../helpers/orderStatus';

const CACHE_ORDERS_KEY = 'cached_orders_list';

export default function Orders({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { ctx } = useContext(EmContext);
  const isFocused = useIsFocused();

  const [orders, setOrders] = useState([]);
  const [activeTabId, setActiveTabId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refetch, setRefetch] = useState(route?.params?.refetch || 0);

  const debounceTimerRef = useRef(null);

  // 1. Debounce search query input (300ms as per Section 11)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // 2. Initial cached data load for fast initial render
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cached = await storageGet(CACHE_ORDERS_KEY);
        if (mounted && Array.isArray(cached) && cached.length > 0) {
          setOrders(cached);
          setLoading(false);
        }
      } catch (err) {
        console.log('Error reading cached orders:', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 3. Fetch orders from backend using GET /api/orders (with POST fallback)
  const fetchOrders = useCallback(
    async ({
      pageNum = 1,
      tabId = activeTabId,
      search = debouncedSearch,
      isRefresh = false,
      isSilent = false,
    } = {}) => {
      if (pageNum === 1 && !isRefresh && !isSilent) {
        setLoading(true);
      } else if (pageNum > 1) {
        setLoadingMore(true);
      }

      try {
        const activeTabObj = FILTER_TABS.find(t => t.id === tabId) || FILTER_TABS[0];
        const queryParams = {
          page: pageNum,
          per_page: 20,
          filter: tabId,
        };
        if (search) {
          queryParams.search = search;
        }
        if (route?.params?.grupID) {
          queryParams.grupID = route.params.grupID;
        }

        let res = null;
        try {
          // Primary specification: GET /api/orders?page=X&per_page=20&filter=X&search=X
          res = await ai.get('orders', { params: queryParams });
        } catch (_getErr) {
          // Fallback to POST orders if GET fails on legacy server
          res = await ai.post('orders', {
            ...queryParams,
            durum: activeTabObj.durums || 0,
            grupID: route?.params?.grupID || 0,
          });
        }

        if (res?.data && res.data.error === false) {
          let rawList = res.data.ss || res.data.grups || [];

          // Tab-level status validation:
          // If server didn't perform status filtering (returns mixed/unfiltered list on legacy server),
          // ensure rawList strictly matches the requested tab.
          if (tabId !== 'all' && Array.isArray(rawList)) {
            const hasMismatched = rawList.some(
              item => getOrderStatusCategory(item) !== tabId,
            );
            if (hasMismatched) {
              rawList = rawList.filter(
                item => getOrderStatusCategory(item) === tabId,
              );
            }
          }

          if (search && Array.isArray(rawList)) {
            rawList = rawList.filter(item => matchesOrderSearch(item, search));
          }

          const hasMore = Boolean(
            res.data.has_next_page ?? (pageNum < (res.data.total_pages || 1)),
          );

          if (pageNum === 1) {
            setOrders(rawList);
            if (!search && tabId === 'all') {
              await storageSet(CACHE_ORDERS_KEY, rawList);
            }
          } else {
            setOrders(prev => {
              const existingIds = new Set(prev.map(item => item.id));
              const newUnique = rawList.filter(item => !existingIds.has(item.id));
              return [...prev, ...newUnique];
            });
          }

          setPage(res.data.page || pageNum);
          setTotalPages(res.data.total_pages || 1);
          setHasNextPage(hasMore);
        }
      } catch (e) {
        console.log('Orders fetch error:', e?.message || e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [activeTabId, debouncedSearch, route?.params?.grupID],
  );

  // Trigger fetch when tab or debounced search changes
  useEffect(() => {
    setPage(1);
    fetchOrders({ pageNum: 1, tabId: activeTabId, search: debouncedSearch });
  }, [fetchOrders, activeTabId, debouncedSearch]);

  // Focus effect: silently refresh current view
  useFocusEffect(
    useCallback(() => {
      fetchOrders({ pageNum: 1, isSilent: true });
    }, [fetchOrders]),
  );

  // Firebase real-time updates
  useEffect(() => {
    if (!isFocused || !FIREBASE_ENABLED) return;
    let unsubscribe;
    try {
      unsubscribe = onMessage(getMessaging(), () => {
        setRefetch(+new Date());
      });
    } catch (e) {
      console.log('Orders onMessage error:', e?.message || e);
    }
    return unsubscribe;
  }, [isFocused]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders({ pageNum: 1, isRefresh: true });
  }, [fetchOrders]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !loadingMore && !loading && !refreshing) {
      fetchOrders({ pageNum: page + 1 });
    }
  }, [hasNextPage, loadingMore, loading, refreshing, page, fetchOrders]);

  const isDark = ctx?.isDark;
  const pageBg = isDark ? '#111827' : '#F8FAFC';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#1E293B';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#F1F5F9';

  const displayedOrders = useMemo(() => {
    return filterOrdersByTabAndSearch(orders, activeTabId, debouncedSearch);
  }, [orders, activeTabId, debouncedSearch]);

  const renderOrderItem = useCallback(
    ({ item, index }) => (
      <GroupItem
        key={item.id || index}
        s={item}
        ctx={ctx}
        navigation={navigation}
        refetch={refetch}
        setRefetch={setRefetch}
      />
    ),
    [ctx, navigation, refetch],
  );

  const keyExtractor = useCallback(
    (item, index) => String(item.id || item.orders?.[0]?.id || index),
    [],
  );

  const renderFooter = useMemo(() => {
    if (!loadingMore) return <View style={{ height: 24 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#F67922" />
      </View>
    );
  }, [loadingMore]);

  const renderEmptyComponent = useMemo(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <BagIcon width={34} height={34} fill="#F67922" />
        </View>
        <Text style={[styles.emptyTitle, { color: textColor }]}>
          {tr('No orders found') || 'No orders found'}
        </Text>
        <Text style={[styles.emptySubtitle, { color: subTextColor }]}>
          {debouncedSearch
            ? tr('Try adjusting your search query') ||
              'No orders match your search keyword.'
            : tr('You have no orders in this category yet') ||
              'You have no orders in this category yet.'}
        </Text>
      </View>
    );
  }, [loading, debouncedSearch, textColor, subTextColor]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: cardBg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={cardBg}
      />

      {/* Header */}
      <AppHeader
        navigation={navigation}
        showBack={navigation.canGoBack()}
        title={tr('Orders') || 'Orders'}
        style={{
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          backgroundColor: cardBg,
        }}
      />

      <View style={[styles.container, { backgroundColor: pageBg }]}>
        {/* Search Bar */}
        <View style={styles.searchWrap}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: cardBg, borderColor: borderColor },
            ]}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M21 21l-4.35-4.35M19 11a8 8 0 11-16 0 8 8 0 0116 0z"
                stroke="#94A3B8"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder={
                tr('Search orders (Order ID, product...)') ||
                'Search orders (Order ID, product...)'
              }
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterTabsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTabsContent}>
            {FILTER_TABS.map(tab => {
              const isActive = tab.id === activeTabId;
              return (
                <TouchableOpacity
                  key={tab.id}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (activeTabId !== tab.id) {
                      setActiveTabId(tab.id);
                      setOrders([]);
                      setLoading(true);
                      setPage(1);
                    }
                  }}
                  style={[
                    styles.tabPill,
                    isActive
                      ? styles.tabPillActive
                      : [
                          styles.tabPillInactive,
                          {
                            backgroundColor: cardBg,
                            borderColor: borderColor,
                          },
                        ],
                  ]}>
                  <Text
                    style={[
                      styles.tabPillText,
                      isActive
                        ? styles.tabPillTextActive
                        : [styles.tabPillTextInactive, { color: subTextColor }],
                    ]}>
                    {tr(tab.label) || tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Orders List / Optimized Animated Skeleton */}
        {loading && displayedOrders.length === 0 ? (
          <OrdersLoading loading={loading} />
        ) : (
          <FlatList
            data={displayedOrders}
            keyExtractor={keyExtractor}
            renderItem={renderOrderItem}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.ordersContent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={renderFooter}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#F67922']}
                tintColor="#F67922"
              />
            }
            ListEmptyComponent={renderEmptyComponent}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    padding: 0,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#94A3B8',
    paddingHorizontal: 4,
  },
  filterTabsWrap: {
    marginBottom: 8,
  },
  filterTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
  },
  tabPillActive: {
    backgroundColor: '#F67922',
  },
  tabPillInactive: {
    borderWidth: 1,
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },
  tabPillTextInactive: {
    color: '#64748B',
  },
  ordersContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
