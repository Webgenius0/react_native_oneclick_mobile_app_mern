import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import moment from 'moment';
import { EmContext } from '../contexts/EmContext';
import { tr } from '../translate/i18n';
import AppHeader from '../components/common/AppHeader';
import NotificationBingIcon from '../assets/svg/notification_bing.svg';
import ai from '../helpers/ai';
import { storageGet, storageSet } from '../helpers/storage';
import {
  fetchAllNotifications,
  NOTIFICATION_COUNT_KEY,
  NOTIFICATION_KEY,
  setLocalNotifications,
} from '../helpers/notificationV2';

const STORAGE_PREFS_KEY = 'notification_settings_prefs';
const PAGE_SIZE = 8;

export default function NotificationSettings({ navigation }) {
  const { ctx, setCtx } = useContext(EmContext);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread' | 'settings'
  const [currentPage, setCurrentPage] = useState(1);

  // Notification Preferences
  const [allNotifications, setAllNotifications] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [promoOffers, setPromoOffers] = useState(true);
  const [paymentUpdates, setPaymentUpdates] = useState(true);
  const [accountSecurity, setAccountSecurity] = useState(true);

  // Load Preferences
  useEffect(() => {
    (async () => {
      try {
        const saved = await storageGet(STORAGE_PREFS_KEY);
        if (saved && typeof saved === 'object') {
          if (saved.allNotifications !== undefined) setAllNotifications(saved.allNotifications);
          if (saved.orderUpdates !== undefined) setOrderUpdates(saved.orderUpdates);
          if (saved.promoOffers !== undefined) setPromoOffers(saved.promoOffers);
          if (saved.paymentUpdates !== undefined) setPaymentUpdates(saved.paymentUpdates);
          if (saved.accountSecurity !== undefined) setAccountSecurity(saved.accountSecurity);
        }
      } catch (e) {}
    })();
  }, []);

  const savePref = async (key, value) => {
    try {
      const current = (await storageGet(STORAGE_PREFS_KEY)) || {};
      const updated = { ...current, [key]: value };
      await storageSet(STORAGE_PREFS_KEY, updated);
    } catch (e) {}
  };

  const handleToggleAll = val => {
    setAllNotifications(val);
    setOrderUpdates(val);
    setPromoOffers(val);
    setPaymentUpdates(val);
    setAccountSecurity(val);
    storageSet(STORAGE_PREFS_KEY, {
      allNotifications: val,
      orderUpdates: val,
      promoOffers: val,
      paymentUpdates: val,
      accountSecurity: val,
    });
  };

  // Load / Refresh Notifications
  const loadNotifications = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        await fetchAllNotifications(ctx, setCtx, true);
      } catch (err) {
        console.log('Error loading notifications:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [ctx, setCtx],
  );

  useEffect(() => {
    loadNotifications();
  }, []);

  const rawNotifications = useMemo(() => {
    return Array.isArray(ctx.notifications) ? ctx.notifications : [];
  }, [ctx.notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'unread') {
      return rawNotifications.filter(
        n => !n.read && n.read !== true && n.okundu !== 1 && n.okundu !== '1',
      );
    }
    return rawNotifications;
  }, [rawNotifications, activeTab]);

  const unreadCount = useMemo(() => {
    return rawNotifications.filter(
      n => !n.read && n.read !== true && n.okundu !== 1 && n.okundu !== '1',
    ).length;
  }, [rawNotifications]);

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / PAGE_SIZE));

  const paginatedNotifications = useMemo(() => {
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    return filteredNotifications.slice(startIdx, startIdx + PAGE_SIZE);
  }, [filteredNotifications, currentPage]);

  const handleMarkAsRead = async (item, indexInFiltered) => {
    try {
      const globalIndex = rawNotifications.findIndex(n => n.id === item.id);
      if (globalIndex !== -1) {
        const list = [...rawNotifications];
        list[globalIndex] = { ...list[globalIndex], read: true, okundu: 1 };

        if (setCtx) {
          setCtx(prev => ({
            ...prev,
            notifications: list,
            notificationCount: Math.max(0, (prev.notificationCount || 1) - 1),
          }));
        }

        await setLocalNotifications({
          notifications: list,
          lastId: list[0]?.id || 0,
        });
      }

      if (item.orderId || item.siparis_id) {
        navigation.navigate('OrderDetail', { id: item.orderId || item.siparis_id });
      }
    } catch (e) {
      console.log('handleMarkAsRead error:', e);
    }
  };

  const handleClearAll = () => {
    if (rawNotifications.length === 0) return;

    Alert.alert(
      tr('Bildirimleri Temizle') || 'Clear All Notifications',
      tr('Tüm bildirimleri silmek istediğinize emin misiniz?') ||
        'Are you sure you want to clear all notifications?',
      [
        { text: tr('İptal') || 'Cancel', style: 'cancel' },
        {
          text: tr('Temizle') || 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await ai.post('notifications', { islem: 'delete' });
            } catch (e) {}

            await storageSet(NOTIFICATION_KEY, { notifications: [], lastId: 0 });
            if (setCtx) {
              setCtx(prev => ({
                ...prev,
                [NOTIFICATION_COUNT_KEY]: 0,
                notifications: [],
              }));
            }
          },
        },
      ],
    );
  };

  const isDark = ctx?.isDark;
  const pageBg = isDark ? '#111827' : '#F8FAFC';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#1E293B';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#E2E8F0';

  const renderIconForNotification = item => {
    const text = ((item.baslik || '') + ' ' + (item.mesaj || '')).toLowerCase();
    if (text.includes('order') || text.includes('siparis') || text.includes('deliver')) {
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M9 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"
            stroke="#F67922"
            strokeWidth={2}
          />
          <Path
            d="M1 3h3l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L22 6H5"
            stroke="#F67922"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    }

    if (text.includes('pay') || text.includes('odeme') || text.includes('approved')) {
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Rect x="2" y="5" width="20" height="14" rx="3" stroke="#2563EB" strokeWidth={2} />
          <Path d="M2 10h20" stroke="#2563EB" strokeWidth={2} />
        </Svg>
      );
    }

    return <NotificationBingIcon width={20} height={20} stroke="#F67922" />;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: cardBg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={cardBg}
      />

      {/* Header */}
      <AppHeader
        navigation={navigation}
        showBack={true}
        title={tr('Notifications') || 'Notifications'}
        style={{
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          backgroundColor: cardBg,
        }}
      />

      <View style={[styles.mainWrap, { backgroundColor: pageBg }]}>
        {/* Navigation Tabs */}
        <View style={[styles.tabBar, { backgroundColor: cardBg, borderColor }]}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setActiveTab('all')}
            style={[styles.tabItem, activeTab === 'all' && styles.tabItemActive]}>
            <Text
              style={[
                styles.tabText,
                { color: subTextColor },
                activeTab === 'all' && styles.tabTextActive,
              ]}>
              {tr('All') || 'All'} ({rawNotifications.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setActiveTab('unread')}
            style={[styles.tabItem, activeTab === 'unread' && styles.tabItemActive]}>
            <View style={styles.unreadTabWrap}>
              <Text
                style={[
                  styles.tabText,
                  { color: subTextColor },
                  activeTab === 'unread' && styles.tabTextActive,
                ]}>
                {tr('Unread') || 'Unread'}
              </Text>
              {unreadCount > 0 ? (
                <View style={styles.badgeSmall}>
                  <Text style={styles.badgeSmallText}>{unreadCount}</Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setActiveTab('settings')}
            style={[styles.tabItem, activeTab === 'settings' && styles.tabItemActive]}>
            <Text
              style={[
                styles.tabText,
                { color: subTextColor },
                activeTab === 'settings' && styles.tabTextActive,
              ]}>
              {tr('Preferences') || 'Preferences'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Section */}
        {activeTab === 'settings' ? (
          /* Preferences Tab */
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionHeading, { color: textColor }]}>
              {tr('Notification Preferences') || 'Notification Preferences'}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: subTextColor }]}>
              {tr('Manage the notifications you receive on this device.') ||
                'Manage the notifications you receive on this device.'}
            </Text>

            {/* Master Toggle */}
            <View style={[styles.prefCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.prefLeft}>
                <Text style={[styles.prefTitle, { color: textColor }]}>
                  {tr('All Notifications') || 'All Notifications'}
                </Text>
                <Text style={[styles.prefSub, { color: subTextColor }]}>
                  {tr('Enable or disable all notifications') || 'Enable or disable all alerts'}
                </Text>
              </View>
              <Switch
                trackColor={{ false: '#CBD5E1', true: '#F67922' }}
                thumbColor="#FFFFFF"
                value={allNotifications}
                onValueChange={handleToggleAll}
              />
            </View>

            {/* Detailed Toggles */}
            <View style={[styles.prefListCard, { backgroundColor: cardBg, borderColor }]}>
              {/* Order Updates */}
              <View style={[styles.prefRow, { borderBottomColor: borderColor }]}>
                <View style={styles.prefLeft}>
                  <Text style={[styles.prefTitle, { color: textColor }]}>
                    {tr('Order Updates') || 'Order Updates'}
                  </Text>
                  <Text style={[styles.prefSub, { color: subTextColor }]}>
                    {tr('Tracking and delivery status alerts') || 'Tracking & delivery alerts'}
                  </Text>
                </View>
                <Switch
                  trackColor={{ false: '#CBD5E1', true: '#F67922' }}
                  thumbColor="#FFFFFF"
                  value={orderUpdates}
                  disabled={!allNotifications}
                  onValueChange={val => {
                    setOrderUpdates(val);
                    savePref('orderUpdates', val);
                  }}
                />
              </View>

              {/* Promo Offers */}
              <View style={[styles.prefRow, { borderBottomColor: borderColor }]}>
                <View style={styles.prefLeft}>
                  <Text style={[styles.prefTitle, { color: textColor }]}>
                    {tr('Promotions & Discounts') || 'Promotions & Discounts'}
                  </Text>
                  <Text style={[styles.prefSub, { color: subTextColor }]}>
                    {tr('Special offers and seasonal discounts') || 'Special offers & deals'}
                  </Text>
                </View>
                <Switch
                  trackColor={{ false: '#CBD5E1', true: '#F67922' }}
                  thumbColor="#FFFFFF"
                  value={promoOffers}
                  disabled={!allNotifications}
                  onValueChange={val => {
                    setPromoOffers(val);
                    savePref('promoOffers', val);
                  }}
                />
              </View>

              {/* Payment Updates */}
              <View style={[styles.prefRow, { borderBottomColor: borderColor }]}>
                <View style={styles.prefLeft}>
                  <Text style={[styles.prefTitle, { color: textColor }]}>
                    {tr('Payment & Invoices') || 'Payment & Invoices'}
                  </Text>
                  <Text style={[styles.prefSub, { color: subTextColor }]}>
                    {tr('Payment confirmation & receipts') || 'Receipts and transaction alerts'}
                  </Text>
                </View>
                <Switch
                  trackColor={{ false: '#CBD5E1', true: '#F67922' }}
                  thumbColor="#FFFFFF"
                  value={paymentUpdates}
                  disabled={!allNotifications}
                  onValueChange={val => {
                    setPaymentUpdates(val);
                    savePref('paymentUpdates', val);
                  }}
                />
              </View>

              {/* Account Security */}
              <View style={[styles.prefRow, { borderBottomWidth: 0 }]}>
                <View style={styles.prefLeft}>
                  <Text style={[styles.prefTitle, { color: textColor }]}>
                    {tr('Security Alerts') || 'Security Alerts'}
                  </Text>
                  <Text style={[styles.prefSub, { color: subTextColor }]}>
                    {tr('Password changes and login alerts') || 'Important account activity'}
                  </Text>
                </View>
                <Switch
                  trackColor={{ false: '#CBD5E1', true: '#F67922' }}
                  thumbColor="#FFFFFF"
                  value={accountSecurity}
                  disabled={!allNotifications}
                  onValueChange={val => {
                    setAccountSecurity(val);
                    savePref('accountSecurity', val);
                  }}
                />
              </View>
            </View>
          </ScrollView>
        ) : (
          /* Notifications Feed with Pagination */
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadNotifications(true)}
                colors={['#F67922']}
                tintColor="#F67922"
              />
            }>
            {/* Action Bar: Count info & Clear button */}
            <View style={styles.actionRow}>
              <Text style={[styles.actionInfoText, { color: subTextColor }]}>
                {filteredNotifications.length > 0
                  ? `${tr('Showing') || 'Showing'} ${
                      (currentPage - 1) * PAGE_SIZE + 1
                    }-${Math.min(currentPage * PAGE_SIZE, filteredNotifications.length)} ${
                      tr('of') || 'of'
                    } ${filteredNotifications.length}`
                  : `${tr('0 Notifications') || '0 Notifications'}`}
              </Text>

              {rawNotifications.length > 0 ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleClearAll}
                  style={styles.clearBtn}>
                  <Text style={styles.clearBtnText}>{tr('Clear All') || 'Clear All'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* List */}
            {loading && !refreshing ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#F67922" />
              </View>
            ) : paginatedNotifications.length > 0 ? (
              <View style={styles.itemsList}>
                {paginatedNotifications.map((item, idx) => {
                  const isRead = item.read === true || item.okundu === 1 || item.okundu === '1';
                  const timeFormatted = item.tarih
                    ? moment(item.tarih).fromNow()
                    : item.timeText || 'Recent';

                  return (
                    <TouchableOpacity
                      key={item.id ?? idx}
                      activeOpacity={0.8}
                      onPress={() => handleMarkAsRead(item, idx)}
                      style={[
                        styles.notifCard,
                        {
                          backgroundColor: cardBg,
                          borderColor: !isRead ? '#FDBA74' : borderColor,
                          borderLeftWidth: !isRead ? 4 : 1,
                          borderLeftColor: !isRead ? '#F67922' : borderColor,
                        },
                      ]}>
                      <View style={styles.cardHeaderRow}>
                        <View style={styles.iconCircle}>
                          {renderIconForNotification(item)}
                        </View>
                        <View style={styles.cardContentCol}>
                          <View style={styles.titleRow}>
                            <Text
                              style={[
                                styles.notifTitle,
                                { color: textColor, fontWeight: !isRead ? '700' : '600' },
                              ]}
                              numberOfLines={1}>
                              {item.baslik || tr('Notification') || 'Notification'}
                            </Text>
                            {!isRead ? <View style={styles.unreadDot} /> : null}
                          </View>

                          <Text style={[styles.notifMessage, { color: subTextColor }]}>
                            {item.mesaj || ''}
                          </Text>

                          <Text style={[styles.notifTime, { color: subTextColor }]}>
                            {timeFormatted}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              /* Empty State */
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <NotificationBingIcon width={36} height={36} stroke="#F67922" />
                </View>
                <Text style={[styles.emptyTitle, { color: textColor }]}>
                  {activeTab === 'unread'
                    ? tr('No unread notifications') || 'No unread notifications'
                    : tr('Hiç bildirim yok') || 'No notifications yet'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: subTextColor }]}>
                  {activeTab === 'unread'
                    ? tr("You're all caught up with your updates.") || "You're all caught up!"
                    : tr('Yeni bildirimleriniz burada görüntülenecektir.') ||
                      'Your latest order updates and alerts will appear here.'}
                </Text>
              </View>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 ? (
              <View style={[styles.paginationRow, { backgroundColor: cardBg, borderColor }]}>
                {/* Previous Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={currentPage <= 1}
                  onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  style={[styles.pageNavBtn, currentPage <= 1 && styles.pageNavBtnDisabled]}>
                  <Text
                    style={[
                      styles.pageNavBtnText,
                      { color: currentPage <= 1 ? '#94A3B8' : '#F67922' },
                    ]}>
                    ‹ {tr('Prev') || 'Prev'}
                  </Text>
                </TouchableOpacity>

                {/* Page Pill Indicators */}
                <View style={styles.pageNumbersWrap}>
                  {Array.from({ length: totalPages }).map((_, pIdx) => {
                    const p = pIdx + 1;
                    const isSelected = p === currentPage;
                    return (
                      <TouchableOpacity
                        key={p}
                        activeOpacity={0.75}
                        onPress={() => setCurrentPage(p)}
                        style={[
                          styles.pageNumPill,
                          isSelected && styles.pageNumPillActive,
                        ]}>
                        <Text
                          style={[
                            styles.pageNumText,
                            { color: isSelected ? '#FFFFFF' : textColor },
                          ]}>
                          {p}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Next Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={currentPage >= totalPages}
                  onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  style={[
                    styles.pageNavBtn,
                    currentPage >= totalPages && styles.pageNavBtnDisabled,
                  ]}>
                  <Text
                    style={[
                      styles.pageNavBtnText,
                      { color: currentPage >= totalPages ? '#94A3B8' : '#F67922' },
                    ]}>
                    {tr('Next') || 'Next'} ›
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  mainWrap: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 12,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#F67922',
  },
  tabText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#F67922',
    fontWeight: '700',
  },
  unreadTabWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeSmall: {
    marginLeft: 6,
    backgroundColor: '#F67922',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeSmallText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  actionInfoText: {
    fontSize: 13,
    fontWeight: '500',
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  clearBtnText: {
    color: '#DC2626',
    fontSize: 12.5,
    fontWeight: '700',
  },

  loadingWrap: {
    paddingVertical: 50,
    alignItems: 'center',
  },

  itemsList: {
    gap: 12,
  },
  notifCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF4EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContentCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14.5,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F67922',
    marginLeft: 8,
  },
  notifMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  notifTime: {
    fontSize: 11.5,
    fontWeight: '500',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF4EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },

  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  pageNavBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pageNavBtnDisabled: {
    opacity: 0.5,
  },
  pageNavBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  pageNumbersWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageNumPill: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumPillActive: {
    backgroundColor: '#F67922',
  },
  pageNumText: {
    fontSize: 13,
    fontWeight: '700',
  },

  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  prefCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  prefListCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  prefLeft: {
    flex: 1,
    marginRight: 16,
  },
  prefTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  prefSub: {
    fontSize: 12.5,
    lineHeight: 16,
  },
});
