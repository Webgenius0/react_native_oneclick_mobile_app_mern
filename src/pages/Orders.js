import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
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

const CACHE_ORDERS_KEY = 'cached_orders_list';

const FILTER_TABS = [
  { id: 'all', label: 'All', durums: 0 },
  { id: 'pending', label: 'Pending', durums: [1, 14, 15, 16, 18, 19] },
  { id: 'in_progress', label: 'In Progress', durums: [2, 3, 4, 5, 11] },
  { id: 'delivered', label: 'Delivered', durums: [6] },
  { id: 'canceled', label: 'Canceled', durums: [7, 8, 9, 10, 12, 13, 17] },
];

export default function Orders({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { ctx } = useContext(EmContext);
  const isFocused = useIsFocused();

  const [allGrups, setAllGrups] = useState([]);
  const [activeTabId, setActiveTabId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refetch, setRefetch] = useState(route?.params?.refetch || 0);

  const activeTab = useMemo(
    () => FILTER_TABS.find(t => t.id === activeTabId) || FILTER_TABS[0],
    [activeTabId],
  );

  // 1. Initial cached data load for 0ms initial render
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cached = await storageGet(CACHE_ORDERS_KEY);
        if (mounted && Array.isArray(cached) && cached.length > 0) {
          setAllGrups(cached);
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

  // 2. Fetch fresh orders from backend
  const fetchData = useCallback(
    async (isSilent = false) => {
      if (!isSilent && allGrups.length === 0) {
        setLoading(true);
      }
      try {
        const c = await ai.post('orders', {
          durum: 0, // Fetch all orders to enable instantaneous in-memory tab switching
          grupID: route?.params?.grupID || 0,
        });

        if (c?.data && c.data.error === false) {
          const freshGrups = c.data.grups || [];
          setAllGrups(freshGrups);
          await storageSet(CACHE_ORDERS_KEY, freshGrups);
        }
      } catch (e) {
        console.log('Orders fetchData error:', e?.message || e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [allGrups.length, route?.params?.grupID],
  );

  // Focus effect: fetch fresh data when screen comes into view
  useFocusEffect(
    useCallback(() => {
      fetchData(allGrups.length > 0);
    }, [refetch]),
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
    fetchData(true);
  }, [fetchData]);

  // Instantaneous in-memory filtering by active tab and search query
  const filteredGrups = useMemo(() => {
    let list = allGrups || [];

    // Filter by tab status
    if (activeTabId !== 'all') {
      const targetDurums = activeTab.durums;
      if (Array.isArray(targetDurums)) {
        list = list.filter(g => {
          const orders = g.orders || [g];
          const firstOrder = orders[0] || {};
          const statusNum = parseInt(
            g.durum !== undefined ? g.durum : firstOrder.durum || 1,
            10,
          );
          return targetDurums.includes(statusNum);
        });
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(g => {
        const orders = g.orders || [g];
        const matchId = String(g.id || (orders[0] && orders[0].id) || '')
          .toLowerCase()
          .includes(q);
        const matchOrders = orders.some(
          o =>
            String(o.ad || '').toLowerCase().includes(q) ||
            String(o.id || '').toLowerCase().includes(q) ||
            String(o.magaza || o.store || '').toLowerCase().includes(q),
        );
        return matchId || matchOrders;
      });
    }

    return list;
  }, [allGrups, activeTabId, activeTab, searchQuery]);

  const isDark = ctx?.isDark;
  const pageBg = isDark ? '#111827' : '#F8FAFC';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#1E293B';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#F1F5F9';

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
          {searchQuery
            ? tr('Try adjusting your search query') ||
              'No orders match your search keyword.'
            : tr('You have no orders in this category yet') ||
              'You have no orders in this category yet.'}
        </Text>
      </View>
    );
  }, [loading, searchQuery, textColor, subTextColor]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: cardBg }]}
      edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={cardBg}
      />

      {/* Figma Header */}
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
        {/* Search Bar (Figma) */}
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

        {/* Filter Pills (Figma) */}
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
                    setActiveTabId(tab.id);
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
        {loading && allGrups.length === 0 ? (
          <OrdersLoading loading={loading} />
        ) : (
          <FlatList
            data={filteredGrups}
            keyExtractor={keyExtractor}
            renderItem={renderOrderItem}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.ordersContent}
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
