import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Linking,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import moment from 'moment';
import AppHeader from '../components/common/AppHeader';
import { tr } from '../translate/i18n';
import { EmContext } from '../contexts/EmContext';
import ai from '../helpers/ai';
import { supportPhone } from '../../config';
import WhatsAppIcon from '../assets/svg/whatsapp.svg';

const DEFAULT_TIMELINE_STEPS = [
  { step: 1, key: 'order_received', title: 'Order Received', state: 'completed', is_completed: true, is_current: false, date: null },
  { step: 2, key: 'order_placed', title: 'Order Placed', state: 'completed', is_completed: true, is_current: false, date: null },
  { step: 3, key: 'in_transit', title: 'In Transit', state: 'completed', is_completed: true, is_current: false, date: null },
  { step: 4, key: 'shipped', title: 'Shipped', state: 'current', is_completed: false, is_current: true, date: null },
  { step: 5, key: 'in_delivery_warehouse', title: 'In Delivery Warehouse', state: 'pending', is_completed: false, is_current: false, date: null },
  { step: 6, key: 'out_for_delivery', title: 'Out For Delivery', state: 'pending', is_completed: false, is_current: false, date: null },
  { step: 7, key: 'delivered', title: 'Delivered', state: 'pending', is_completed: false, is_current: false, date: null },
];

export default function TrackOrder({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { ctx } = useContext(EmContext);

  const orderParam = route.params?.s || {};
  const orderId = route.params?.id || orderParam.id || '1CLK-582941';
  const grupId = route.params?.grupID || orderParam.grupID || orderParam.id;

  const [loading, setLoading] = useState(!route.params?.customerTracking);
  const [refreshing, setRefreshing] = useState(false);
  const [customerTracking, setCustomerTracking] = useState(
    route.params?.customerTracking || null,
  );

  // Fallback defaults if API call fails or while loading
  const rawDate = orderParam.tarih || new Date();
  const initialFormattedDate = route.params?.formattedDate || moment(rawDate).format('MMM DD, YYYY');
  const initialExpectedDate = moment(rawDate).add(3, 'days').format('MMM DD, YYYY');

  const fetchTracking = useCallback(async (isRefresh = false) => {
    if (!isRefresh && !customerTracking) {
      setLoading(true);
    }
    try {
      // Primary endpoint: GET /api/order-tracking?id={orderId}
      const res = await ai.get('order-tracking', {
        params: {
          id: orderId,
          ...(grupId ? { grupID: grupId } : {}),
        },
      });

      if (res?.data && res.data.error === false) {
        if (res.data.customer_tracking) {
          setCustomerTracking(res.data.customer_tracking);
        } else if (res.data.tracking) {
          setCustomerTracking(res.data.tracking);
        }
      }
    } catch (e) {
      console.log('fetchTracking API note:', e?.message || e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId, grupId, customerTracking]);

  useEffect(() => {
    fetchTracking();
  }, [fetchTracking]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTracking(true);
  }, [fetchTracking]);

  // Derive display values from customer_tracking or fallback to params
  const orderNumber = customerTracking?.order_number || `Order #${orderId}`;
  const orderDate = customerTracking?.order_date || initialFormattedDate;
  const statusTitle = customerTracking?.status_title || route.params?.statusText || 'In Progress';
  const statusDesc = customerTracking?.status_subtitle || `Your order is on the way. Expected delivery on ${initialExpectedDate}`;
  const rawBadgeColor = customerTracking?.status_badge_color || customerTracking?.status_badge || 'blue';
  const badgeColor =
    rawBadgeColor === 'green'
      ? 'green'
      : rawBadgeColor === 'red'
      ? 'red'
      : rawBadgeColor === 'orange'
      ? 'orange'
      : 'blue';

  const steps = (customerTracking?.steps && Array.isArray(customerTracking.steps) && customerTracking.steps.length > 0)
    ? customerTracking.steps
    : DEFAULT_TIMELINE_STEPS;

  const isDark = ctx?.isDark;
  const pageBg = isDark ? '#111827' : '#F8FAFC';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#1E293B';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#F1F5F9';

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
        showBack={true}
        title={tr('Track Order') || 'Track Order'}
        style={{
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          backgroundColor: cardBg,
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: pageBg }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#F67922']}
            tintColor="#F67922"
          />
        }>
        {loading && !customerTracking ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#F67922" />
            <Text style={[styles.loadingText, { color: subTextColor }]}>
              {tr('Tracking order status...') || 'Tracking order status...'}
            </Text>
          </View>
        ) : (
          <>
            {/* Top Order Info Card */}
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: cardBg, borderColor: borderColor },
              ]}>
              <View style={styles.orderTopHeader}>
                <Text style={[styles.orderNumberTitle, { color: textColor }]}>
                  {orderNumber}
                </Text>
                <Text style={[styles.orderDateTitle, { color: subTextColor }]}>
                  {orderDate}
                </Text>
              </View>

              {/* Status Banner */}
              <View
                style={[
                  styles.statusBannerWrap,
                  badgeColor === 'green'
                    ? { backgroundColor: '#DCFCE7' }
                    : badgeColor === 'red'
                    ? { backgroundColor: '#FEE2E2' }
                    : badgeColor === 'orange'
                    ? { backgroundColor: '#FEF3C7' }
                    : { backgroundColor: '#EFF6FF' },
                ]}>
                <View
                  style={[
                    styles.statusTruckCircle,
                    badgeColor === 'green'
                      ? { backgroundColor: '#BBF7D0' }
                      : badgeColor === 'red'
                      ? { backgroundColor: '#FECACA' }
                      : badgeColor === 'orange'
                      ? { backgroundColor: '#FDE68A' }
                      : { backgroundColor: '#DBEAFE' },
                  ]}>
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"
                      stroke={badgeColor === 'green' ? '#16A34A' : badgeColor === 'red' ? '#DC2626' : badgeColor === 'orange' ? '#D97706' : '#2563EB'}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Path
                      d="M5.5 18a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 18a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
                      fill={badgeColor === 'green' ? '#16A34A' : badgeColor === 'red' ? '#DC2626' : badgeColor === 'orange' ? '#D97706' : '#2563EB'}
                    />
                  </Svg>
                </View>
                <View style={styles.statusBannerTextCol}>
                  <Text
                    style={[
                      styles.statusBannerTitle,
                      badgeColor === 'green'
                        ? { color: '#16A34A' }
                        : badgeColor === 'red'
                        ? { color: '#DC2626' }
                        : badgeColor === 'orange'
                        ? { color: '#D97706' }
                        : { color: '#2563EB' },
                    ]}>
                    {tr(statusTitle) || statusTitle}
                  </Text>
                  <Text style={[styles.statusBannerDesc, { color: subTextColor }]}>
                    {statusDesc}
                  </Text>
                </View>
              </View>
            </View>

            {/* 6-Step Order Tracking Timeline Card */}
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: cardBg, borderColor: borderColor },
              ]}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                {tr('Order Tracking') || 'Order Tracking'}
              </Text>

              <View style={styles.timelineList}>
                {steps.map((stepItem, idx) => {
                  const state = stepItem.state || (stepItem.is_completed ? 'completed' : stepItem.is_current ? 'current' : 'pending');
                  const isCompleted = state === 'completed';
                  const isCurrent = state === 'current';
                  const isPending = state === 'pending';
                  const isLast = idx === steps.length - 1;

                  return (
                    <View key={stepItem.key || stepItem.step || idx} style={styles.stepRow}>
                      {/* Stepper Indicator & Vertical Line */}
                      <View style={styles.indicatorCol}>
                        {isCompleted ? (
                          <View style={styles.completedCircle}>
                            <Text style={styles.checkmark}>✓</Text>
                          </View>
                        ) : isCurrent ? (
                          <View style={styles.currentOuterCircle}>
                            <View style={styles.currentInnerDot} />
                          </View>
                        ) : (
                          <View style={styles.pendingCircle} />
                        )}

                        {!isLast && (
                          <View
                            style={[
                              styles.verticalLine,
                              {
                                backgroundColor: isCompleted ? '#10B981' : isCurrent ? '#F97316' : '#E2E8F0',
                              },
                            ]}
                          />
                        )}
                      </View>

                      {/* Step Content */}
                      <View style={styles.stepContentCol}>
                        <Text
                          style={[
                            styles.stepTitle,
                            {
                              color: isPending ? subTextColor : textColor,
                              fontWeight: isCurrent ? '700' : '600',
                            },
                          ]}>
                          {tr(stepItem.title) || stepItem.title}
                        </Text>

                        {stepItem.description ? (
                          <Text style={[styles.stepDesc, { color: subTextColor }]}>
                            {tr(stepItem.description) || stepItem.description}
                          </Text>
                        ) : null}

                        {stepItem.date ? (
                          <Text style={[styles.stepTimestamp, { color: subTextColor }]}>
                            {stepItem.date}
                          </Text>
                        ) : isCompleted || isCurrent ? (
                          <Text style={[styles.stepTimestamp, { color: subTextColor }]}>
                            {orderDate}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Help / WhatsApp CTA */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                const phoneClean = (supportPhone || '+252637979636').replace(/[^0-9]/g, '');
                const text = encodeURIComponent(
                  `Hello 1Click Support, I want to track my ${orderNumber}`,
                );
                Linking.openURL(`https://wa.me/${phoneClean}?text=${text}`).catch(e => {
                  console.log('WhatsApp open error:', e);
                });
              }}
              style={styles.whatsAppBtn}>
              <WhatsAppIcon width={20} height={20} fill="#FFFFFF" />
              <Text style={styles.whatsAppBtnText}>
                {tr('Need Help? Contact Support') || 'Need Help? Contact Support'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingWrap: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  orderTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderNumberTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  orderDateTitle: {
    fontSize: 13,
  },
  statusBannerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
  },
  statusTruckCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusBannerTextCol: {
    flex: 1,
  },
  statusBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 2,
  },
  statusBannerDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
  },
  timelineList: {
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  indicatorCol: {
    alignItems: 'center',
    width: 28,
  },
  completedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  currentOuterCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: '#F97316',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F97316',
  },
  pendingCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  verticalLine: {
    width: 2,
    minHeight: 46,
    flex: 1,
    marginVertical: 2,
  },
  stepContentCol: {
    flex: 1,
    paddingLeft: 12,
    paddingTop: 1,
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  stepTimestamp: {
    fontSize: 11,
    marginTop: 2,
  },
  whatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  whatsAppBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});
