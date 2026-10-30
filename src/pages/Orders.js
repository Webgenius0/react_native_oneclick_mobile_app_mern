import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { getMessaging, onMessage } from '@react-native-firebase/messaging';
import { tr } from '../translate/i18n';
import { EmContext } from '../contexts/EmContext';
import GroupItem from '../components/orders/GroupItem';
import OrdersLoading from '../components/orders/Loading';
import AppHeader from '../components/common/AppHeader';
import { FIREBASE_ENABLED } from '../../config';
import BagIcon from '../assets/svg/bag.svg';
import { FILTER_TABS } from '../helpers/orderStatus';
import { useOrderStore } from '../store/useOrderStore';

export default function Orders({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { ctx } = useContext(EmContext);
  const isFocused = useIsFocused();

  const [activeTabId, setActiveTabId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refetch, setRefetch] = useState(route?.params?.refetch || 0);

  const debounceTimerRef = useRef(null);

  // Connect to central store
  const {
    tabs,
    searchCache,
    fetchOrders,
    loadInitialCache,
    invalidateOrders,
  } = useOrderStore();

  // 1. Debounce search query input (300ms)
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

  // 2. Load cached orders on mount for instant zero-latency cold start
  useEffect(() => {
    loadInitialCache();
  }, [loadInitialCache]);

  // Determine current active dataset from store cache
  const isSearching = debouncedSearch.length > 0;
  const currentTabData = isSearching
    ? searchCache
    : tabs[activeTabId] || {
        orders: [],
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        loading: false,
        loadingMore: false,
      };

  const displayedOrders = currentTabData.orders || [];
  const page = currentTabData.page || 1;
  const totalPages = currentTabData.totalPages || 1;
  const hasNextPage = currentTabData.hasNextPage || false;
  const loading = currentTabData.loading || false;
  const loadingMore = currentTabData.loadingMore || false;

  const lastRefetchRef = useRef(route?.params?.refetch || 0);

  // 3. Fetch orders when tab changes or search query changes
  useEffect(() => {
    fetchOrders({
      tabId: activeTabId,
      pageNum: 1,
      search: debouncedSearch,
      grupID: route?.params?.grupID,
    });
  }, [fetchOrders, activeTabId, debouncedSearch, route?.params?.grupID]);

  // 4. Focus effect: only re-fetch if marked dirty (new order placed) or refetch param changed
  useFocusEffect(
    useCallback(() => {
      const dirty = useOrderStore.getState().isDirty;
      const refetchParam = route?.params?.refetch || 0;
      const hasNewRefetch = refetchParam && refetchParam !== lastRefetchRef.current;

      if (dirty || hasNewRefetch) {
        lastRefetchRef.current = refetchParam;
        fetchOrders({
          tabId: activeTabId,
          pageNum: 1,
          search: debouncedSearch,
          force: true,
          grupID: route?.params?.grupID,
        });
      }
    }, [route?.params?.refetch, activeTabId, debouncedSearch, fetchOrders, route?.params?.grupID]),
  );

  // 5. Firebase real-time updates: mark dirty and refetch
  useEffect(() => {
    if (!isFocused || !FIREBASE_ENABLED) return;
    let unsubscribe;
    try {
      unsubscribe = onMessage(getMessaging(), () => {
        invalidateOrders();
        fetchOrders({
          tabId: activeTabId,
          pageNum: 1,
          search: debouncedSearch,
          force: true,
        });
        setRefetch(+new Date());
      });
    } catch (e) {
      console.log('Orders onMessage error:', e?.message || e);
    }
    return unsubscribe;
  }, [isFocused, activeTabId, debouncedSearch, invalidateOrders, fetchOrders]);

  // Pull to refresh: forces page 1 update and refreshes cache
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders({
      tabId: activeTabId,
      pageNum: 1,
      search: debouncedSearch,
      isRefresh: true,
      force: true,
      grupID: route?.params?.grupID,
    });
    setRefreshing(false);
  }, [activeTabId, debouncedSearch, route?.params?.grupID, fetchOrders]);

  // Infinite scroll load more handler for pagination
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !loadingMore && !loading && !refreshing) {
      fetchOrders({
        tabId: activeTabId,
        pageNum: page + 1,
        search: debouncedSearch,
        grupID: route?.params?.grupID,
      });
    }
  }, [
    hasNextPage,
    loadingMore,
    loading,
    refreshing,
    activeTabId,
    page,
    debouncedSearch,
    route?.params?.grupID,
    fetchOrders,
  ]);

  const isDark = ctx?.isDark;
  const pageBg = isDark ? '#111827' : '#F8FAFC';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#1E293B';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#F1F5F9';

  const renderOrderItem = useCallback(
    ({ item, index }) => (
      <GroupItem
        key={item.id || item.order_number || index}
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
    (item, index) => String(item.id || item.order_number || index),
    [],
  );

  const renderFooter = useMemo(() => {
    if (!loadingMore) return <View style={{ height: 28 }} />;
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
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: cardBg }]}
      edges={['top', 'left', 'right']}>
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
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={4}
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
