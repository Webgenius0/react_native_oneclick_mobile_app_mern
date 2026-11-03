import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
import FastImage from 'react-native-fast-image';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import moment from 'moment';
import AppHeader from '../components/common/AppHeader';
import { tr } from '../translate/i18n';
import { EmContext } from '../contexts/EmContext';
import ai from '../helpers/ai';
import { cleanProductTitle, getStoreName } from '../helpers/storeHelper';
import { supportPhone } from '../../config';
import WhatsAppIcon from '../assets/svg/whatsapp.svg';
import { useOrderStore } from '../store/useOrderStore';

const parsePrice = val => {
  if (val == null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

export default function OrderDetail({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { ctx } = useContext(EmContext);

  // 1. Initial State: prioritize route params, then check central order store cache
  const initialOrderData = useMemo(() => {
    if (route.params?.s) return route.params.s;
    const targetId = route.params?.id || route.params?.grupID;
    if (!targetId) return null;

    try {
      const storeState = useOrderStore.getState();
      const allOrders = [
        ...(storeState.tabs?.all?.orders || []),
        ...(storeState.tabs?.pending?.orders || []),
        ...(storeState.tabs?.in_progress?.orders || []),
        ...(storeState.tabs?.delivered?.orders || []),
        ...(storeState.tabs?.cancelled?.orders || []),
        ...(storeState.searchCache?.orders || []),
      ];
      return (
        allOrders.find(
          o =>
            String(o.id) === String(targetId) ||
            String(o.order_number) === String(targetId),
        ) || null
      );
    } catch (_) {
      return null;
    }
  }, [route.params?.s, route.params?.id, route.params?.grupID]);

  const [order, setOrder] = useState(initialOrderData);
  const [customerTracking, setCustomerTracking] = useState(null);
  // Zero-latency: do not show spinner if we already have initial order data
  const [loading, setLoading] = useState(!initialOrderData && Boolean(route.params?.id));
  const [refreshing, setRefreshing] = useState(false);

  // 2. High performance background fetch with strict 4s timeout (never hangs UI)
  const fetchOrderDetail = useCallback(
    async (isRefresh = false) => {
      const orderId =
        route.params?.id || order?.id || route.params?.grupID || route.params?.s?.id;
      const grupId = route.params?.grupID || order?.grupID || order?.id || orderId;
      if (!orderId) return;

      // Only show full loading spinner if we literally have no data in memory
      if (!isRefresh && !order) {
        setLoading(true);
      }

      try {
        const timeoutConfig = { timeout: 4000 };

        // Concurrently query order-detail (GET with fallback to POST) and order-tracking (GET)
        const fetchDetail = async () => {
          try {
            const res = await ai.get('order-detail', {
              params: { id: orderId, ...(grupId ? { grupID: grupId } : {}) },
              ...timeoutConfig,
            });
            if (res?.data && res.data.error === false) {
              return res;
            }
          } catch (_) {}
          return ai.post(
            'order-detail',
            { id: orderId, grupID: grupId },
            timeoutConfig,
          );
        };

        const [detailRes, trackingRes] = await Promise.allSettled([
          fetchDetail(),
          ai.get('order-tracking', {
            params: { id: orderId, ...(grupId ? { grupID: grupId } : {}) },
            ...timeoutConfig,
          }),
        ]);

        if (
          detailRes.status === 'fulfilled' &&
          detailRes.value?.data &&
          detailRes.value.data.error === false
        ) {
          const raw = detailRes.value.data;
          const orderData =
            raw.data ||
            raw.order ||
            raw.s ||
            raw;
          if (orderData) {
            setOrder(prev => ({
              ...(prev || {}),
              ...orderData,
              order_number: raw.order_number || orderData.order_number,
              order_date: raw.order_date || orderData.order_date,
              status_banner: raw.status_banner || orderData.status_banner,
              ordered_items: raw.ordered_items || orderData.ordered_items,
              price_summary: raw.price_summary || orderData.price_summary,
              customer_tracking: raw.customer_tracking || orderData.customer_tracking,
              payment_information:
                orderData.payment_information ||
                raw.payment_information ||
                raw.payment_info ||
                prev?.payment_information,
              payment_info:
                orderData.payment_info ||
                raw.payment_info ||
                raw.payment_information ||
                prev?.payment_info,
            }));
          }
          if (raw.customer_tracking) {
            setCustomerTracking(raw.customer_tracking);
          }
        }

        if (
          trackingRes.status === 'fulfilled' &&
          trackingRes.value?.data &&
          trackingRes.value.data.error === false
        ) {
          const trackData =
            trackingRes.value.data.customer_tracking ||
            trackingRes.value.data.tracking;
          if (trackData) {
            setCustomerTracking(prev => ({
              ...(prev || {}),
              ...trackData,
            }));
          }
        }
      } catch (e) {
        console.log('fetchOrderDetail note:', e?.message || e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [route.params?.id, route.params?.grupID, route.params?.s?.id, order],
  );

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrderDetail(true);
  };

  // 3. Normalize Ordered Items list
  const ordersList = useMemo(() => {
    if (!order) return [];
    if (Array.isArray(order.ordered_items) && order.ordered_items.length > 0) {
      return order.ordered_items;
    }
    if (Array.isArray(order.orders) && order.orders.length > 0) {
      return order.orders;
    }
    if (Array.isArray(order.items) && order.items.length > 0) {
      return order.items;
    }
    if (Array.isArray(order.products) && order.products.length > 0) {
      return order.products;
    }
    // Single order item passed directly
    return [order];
  }, [order]);

  const firstItem = ordersList[0] || {};
  const orderId =
    order?.id || firstItem.id || route.params?.id || '1CLK-582941';

  const rawDate = order?.tarih || firstItem.tarih || order?.order_date;
  const formattedDate = rawDate
    ? moment(rawDate).format('MMM DD, YYYY')
    : moment().format('MMM DD, YYYY');

  const expectedDate = rawDate
    ? moment(rawDate).add(3, 'days').format('MMM DD, YYYY')
    : moment().add(3, 'days').format('MMM DD, YYYY');

  // Status mapping
  const statusNum = parseInt(
    order?.durum !== undefined ? order.durum : firstItem.durum || 1,
    10,
  );
  let statusTitle = 'In Progress';
  let statusDesc = `Your order is on the way. Expected delivery on ${expectedDate}`;
  let statusBadgeColor = '#2563EB';

  if ([6].includes(statusNum)) {
    statusTitle = 'Delivered';
    statusDesc = 'Your order has been delivered successfully.';
    statusBadgeColor = '#16A34A';
  } else if ([7, 8, 9, 10, 12, 13, 17].includes(statusNum)) {
    statusTitle = 'Canceled';
    statusDesc = 'This order has been canceled.';
    statusBadgeColor = '#DC2626';
  } else if ([1, 14, 15, 16, 18, 19, 21].includes(statusNum)) {
    statusTitle = 'Pending';
    statusDesc = 'Your order is confirmed and being prepared.';
    statusBadgeColor = '#D97706';
  }

  const deliveryCity =
    order?.teslimatSehir ||
    order?.sehir ||
    order?.teslimat_sehir ||
    order?.delivery_city ||
    firstItem?.teslimatSehir ||
    firstItem?.sehir ||
    firstItem?.teslimat_sehir ||
    'Borama';

  // 4. Robust Price Summary Calculations (supports price_summary, urun_tutar_usd, fiyat_usd, total_usd)
  const calculatedItemsSubtotal = useMemo(() => {
    return ordersList.reduce((sum, it) => {
      const price = parsePrice(
        it.price ??
          it.fiyat_usd ??
          it.price_usd ??
          it.converted_price ??
          it.tutar_usd ??
          it.tutar ??
          it.fiyat ??
          0,
      );
      const qty =
        Number(it.quantity || it.sayi || it.count || it.qty || 1) || 1;
      return sum + price * qty;
    }, 0);
  }, [ordersList]);

  const subtotal =
    order?.price_summary?.subtotal != null
      ? parsePrice(order.price_summary.subtotal)
      : parseFloat(
          order?.urun_tutar_usd ??
            order?.subtotal_usd ??
            order?.subtotal ??
            order?.urun_fiyat_usd ??
            (calculatedItemsSubtotal > 0
              ? calculatedItemsSubtotal
              : order?.tutar_usd || order?.tutar || firstItem?.tutar || 0),
        ) || 0;

  const shippingCost =
    order?.price_summary?.shipping != null
      ? parsePrice(order.price_summary.shipping)
      : parseFloat(
          order?.nakliye_usd ??
            order?.nakliye ??
            order?.shipping_usd ??
            order?.shipping_cost ??
            firstItem?.nakliye ??
            0,
        ) || 0;

  const finalTotal =
    order?.price_summary?.total != null
      ? parsePrice(order.price_summary.total)
      : parseFloat(
          order?.total_usd ??
            order?.tutar_usd ??
            order?.total ??
            order?.total_amount ??
            order?.tutar ??
            firstItem?.tutar_usd ??
            firstItem?.tutar ??
            subtotal + shippingCost,
        ) || subtotal + shippingCost;

  // 5. Accurate Payment Information
  const paymentInfo =
    order?.payment_information ||
    order?.payment_info ||
    firstItem?.payment_information ||
    firstItem?.payment_info;

  const paymentMethodName =
    paymentInfo?.payment_method ||
    paymentInfo?.method ||
    order?.odeme_yontemi ||
    order?.odeme_turu ||
    order?.payment_method ||
    order?.odeme_tipi ||
    firstItem?.odeme_yontemi ||
    'WaafiPay / eDahab';

  // Status codes that indicate unpaid / pending payment:
  // 1 (New), 14 (Review), 15 (Price Offered), 16 (Approved), 18 (Unpaid), 19 (Action req), 21 (Ready to pay)
  const isPayable =
    [16, 21, 14, 15].includes(statusNum) || Boolean(order?.odenebilir);
  const isUnpaid =
    paymentInfo?.is_paid === false ||
    [1, 14, 15, 16, 18, 19, 21].includes(statusNum) ||
    order?.odendi === 0 ||
    order?.is_paid === false;
  const isPaid =
    paymentInfo?.is_paid === true ||
    paymentInfo?.payment_status?.toLowerCase() === 'paid' ||
    paymentInfo?.status?.toLowerCase() === 'paid' ||
    (!isUnpaid && statusNum > 0);

  const amountPaid =
    paymentInfo?.amount_paid != null
      ? parseFloat(paymentInfo.amount_paid)
      : isPaid
      ? finalTotal
      : 0.0;
  const formattedAmountPaid =
    paymentInfo?.amount_paid_formatted || `$${amountPaid.toFixed(2)}`;

  const paymentStatusText =
    paymentInfo?.payment_status ||
    paymentInfo?.status ||
    (isPaid
      ? tr('Paid') || 'Paid'
      : tr('Pending Payment') || 'Pending Payment');

  const handleOpenWhatsApp = () => {
    const phoneClean = (supportPhone || '+252637979636').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hello 1Click Support, I need assistance with ${displayOrderNumber}`,
    );
    Linking.openURL(`https://wa.me/${phoneClean}?text=${text}`).catch(e => {
      console.log('WhatsApp open error:', e);
    });
  };

  const handlePayNow = () => {
    const rawIds = order?.order_ids || ordersList.map(o => o.id);
    const resolvedIds =
      Array.isArray(rawIds) && rawIds.length > 0
        ? rawIds
        : (order?.id || orderId ? [order?.id || orderId] : []);

    navigation.navigate('PaymentStart', {
      tutar: finalTotal.toFixed(2),
      subtotal: subtotal.toFixed(2),
      shipping: shippingCost.toFixed(2),
      quick: true,
      siparis_ids: resolvedIds,
      siparis_id: resolvedIds[0] || order?.id || orderId,
      order_ids: resolvedIds,
      grup: order,
      grupID: order?.id || orderId,
    });
  };

  const isDark = ctx?.isDark;
  const pageBg = isDark ? '#111827' : '#F8FAFC';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#1E293B';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#F1F5F9';

  const banner = order?.status_banner;
  const displayOrderNumber =
    order?.order_number ||
    customerTracking?.order_number ||
    (orderId ? `1CLK-${orderId}` : '1CLK-582941');
  const displayDate =
    order?.order_date ||
    customerTracking?.order_date ||
    formattedDate;
  const displayStatusTitle =
    banner?.title ||
    customerTracking?.status_title ||
    statusTitle;
  const displayStatusDesc =
    banner?.subtitle ||
    customerTracking?.status_subtitle ||
    statusDesc;
  const badgeColorKey =
    banner?.badge_color ||
    customerTracking?.status_badge_color ||
    banner?.state ||
    '';
  const displayBadgeColor =
    badgeColorKey === 'green'
      ? '#16A34A'
      : badgeColorKey === 'red'
      ? '#DC2626'
      : badgeColorKey === 'orange'
      ? '#D97706'
      : badgeColorKey === 'blue' || badgeColorKey === 'shipped'
      ? '#2563EB'
      : statusBadgeColor;

  const canTrackOrder =
    customerTracking?.can_track !== undefined
      ? Boolean(customerTracking.can_track)
      : order?.customer_tracking?.can_track !== undefined
      ? Boolean(order.customer_tracking.can_track)
      : statusNum !== 6 &&
        statusNum !== 7 &&
        statusNum !== 8 &&
        statusNum !== 9 &&
        statusNum !== 10;

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
        title={tr('Order Details') || 'Order Details'}
        style={{
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          backgroundColor: cardBg,
        }}
      />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#F67922" size="large" />
        </View>
      ) : (
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
          {/* Top Order & Status Card */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: cardBg, borderColor: borderColor },
            ]}>
            <View style={styles.orderTopHeader}>
              <Text style={[styles.orderNumberTitle, { color: textColor }]}>
                {displayOrderNumber}
              </Text>
              <Text style={[styles.orderDateTitle, { color: subTextColor }]}>
                {displayDate}
              </Text>
            </View>

            {/* Status Banner */}
            <View style={styles.statusBannerWrap}>
              <View style={styles.statusTruckCircle}>
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"
                    stroke={displayBadgeColor}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M5.5 18a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 18a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
                    fill={displayBadgeColor}
                  />
                </Svg>
              </View>
              <View style={styles.statusBannerTextCol}>
                <Text
                  style={[
                    styles.statusBannerTitle,
                    { color: displayBadgeColor },
                  ]}>
                  {tr(displayStatusTitle) || displayStatusTitle}
                </Text>
                <Text
                  style={[styles.statusBannerDesc, { color: subTextColor }]}>
                  {displayStatusDesc}
                </Text>
              </View>
            </View>

            {canTrackOrder ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  navigation.navigate('TrackOrder', {
                    id: orderId,
                    s: order,
                    customerTracking: customerTracking || order?.customer_tracking,
                    statusText: displayStatusTitle,
                    formattedDate: displayDate,
                  });
                }}
                style={styles.trackOrderInlineBtn}>
                <Text style={styles.trackOrderInlineBtnText}>
                  {tr('Track Order Timeline') || 'Track Order Timeline'} →
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Delivery Information Card (Figma) */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: cardBg, borderColor: borderColor },
            ]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {tr('Delivery Information') || 'Delivery Information'}
            </Text>

            <View style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 21s-8-7.5-8-12a8 8 0 1116 0c0 4.5-8 12-8 12z"
                    fill="#F67922"
                  />
                  <Path
                    d="M12 12a3 3 0 100-6 3 3 0 000 6z"
                    fill="#FFFFFF"
                  />
                </Svg>
                <Text style={[styles.infoLabel, { color: subTextColor }]}>
                  {tr('Delivery City') || 'Delivery City'}
                </Text>
              </View>
              <Text style={[styles.infoValue, { color: textColor }]}>
                {deliveryCity}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18"
                    stroke="#F67922"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text style={[styles.infoLabel, { color: subTextColor }]}>
                  {tr('Expected Delivery') || 'Expected Delivery'}
                </Text>
              </View>
              <Text style={[styles.infoValue, { color: textColor }]}>
                {expectedDate}
              </Text>
            </View>
          </View>

          {/* Ordered Items Card (Figma) */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: cardBg, borderColor: borderColor },
            ]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {tr('Ordered Items') || 'Ordered Items'} ({ordersList.length})
            </Text>

            {ordersList.map((item, idx) => {
              const imgUri =
                item.image ||
                item.resim ||
                item.img ||
                item.pic ||
                item.photo ||
                (Array.isArray(item.images) && item.images[0]) ||
                (Array.isArray(order?.images) && order.images[idx]) ||
                null;

              const store =
                item.magaza ||
                item.store ||
                getStoreName(item.link || item.url, '') ||
                '1Click Store';

              const itemPrice = parsePrice(
                item.price ??
                  item.fiyat_usd ??
                  item.price_usd ??
                  item.converted_price ??
                  item.tutar_usd ??
                  item.tutar ??
                  item.fiyat ??
                  0,
              ).toFixed(2);

              const itemQty =
                Number(
                  item.quantity || item.sayi || item.count || item.qty || 1,
                ) || 1;

              const variantDetails = [
                item.size || item.beden
                  ? `${tr('Size') || 'Size'}: ${item.size || item.beden}`
                  : null,
                item.color || item.renk
                  ? `${tr('Color') || 'Color'}: ${item.color || item.renk}`
                  : null,
                item.note || item.acik
                  ? `${tr('Note') || 'Note'}: ${item.note || item.acik}`
                  : null,
              ]
                .filter(Boolean)
                .join(' • ');

              const itemName = cleanProductTitle(
                item.name ||
                  item.ad ||
                  item.title ||
                  item.product_name ||
                  item.urun_adi ||
                  item.acik ||
                  'Product Item',
                item.link || item.url || '',
              );

              return (
                <View
                  key={item.id ? `item-${item.id}` : `idx-${idx}`}
                  style={[
                    styles.itemRow,
                    idx < ordersList.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: borderColor,
                    },
                  ]}>
                  <View
                    style={[
                      styles.itemThumbWrap,
                      { borderColor: borderColor },
                    ]}>
                    {imgUri ? (
                      <FastImage
                        source={{ uri: imgUri }}
                        style={styles.itemThumb}
                        resizeMode={FastImage.resizeMode.contain}
                      />
                    ) : (
                      <View style={styles.placeholderThumb}>
                        <Text style={styles.placeholderText}>IMG</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.itemContentCol}>
                    <Text
                      numberOfLines={2}
                      style={[styles.itemName, { color: textColor }]}>
                      {itemName}
                    </Text>
                    {variantDetails ? (
                      <Text
                        numberOfLines={1}
                        style={[styles.itemSub, { color: subTextColor }]}>
                        {variantDetails}
                      </Text>
                    ) : null}
                    <Text style={[styles.itemSub, { color: subTextColor }]}>
                      {tr('Qty') || 'Qty'}: {itemQty}
                    </Text>
                  </View>

                  <View style={styles.itemRightCol}>
                    <View style={styles.storeBadge}>
                      <Text style={styles.storeBadgeText}>{store}</Text>
                    </View>
                    <Text style={[styles.itemPrice, { color: textColor }]}>
                      ${itemPrice}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Price Summary Card (Figma) */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: cardBg, borderColor: borderColor },
            ]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {tr('Price Summary') || 'Price Summary'}
            </Text>

            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: subTextColor }]}>
                {tr('Subtotal') || 'Subtotal'} ({ordersList.length}{' '}
                {ordersList.length === 1 ? 'item' : 'items'})
              </Text>
              <Text style={[styles.priceValue, { color: textColor }]}>
                ${subtotal.toFixed(2)}
              </Text>
            </View>

            {shippingCost > 0 ? (
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: subTextColor }]}>
                  {tr('Shipping') || 'Shipping'}
                </Text>
                <Text style={[styles.priceValue, { color: textColor }]}>
                  ${shippingCost.toFixed(2)}
                </Text>
              </View>
            ) : null}

            <View
              style={[
                styles.totalRow,
                { borderTopColor: borderColor, borderTopWidth: 1 },
              ]}>
              <Text style={[styles.totalLabel, { color: textColor }]}>
                {tr('Total') || 'Total'}
              </Text>
              <Text style={styles.totalValue}>${finalTotal.toFixed(2)}</Text>
            </View>
          </View>

          {/* Payment Information Card (Figma) */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: cardBg, borderColor: borderColor },
            ]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {tr('Payment Information') || 'Payment Information'}
            </Text>

            {/* Only show Payment method if order is paid */}
            {isPaid && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: subTextColor }]}>
                  {tr('Payment method') || 'Payment method'}
                </Text>
                <Text style={[styles.infoValue, { color: textColor }]}>
                  {paymentMethodName}
                </Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: subTextColor }]}>
                {tr('Payment Status') || 'Payment Status'}
              </Text>
              <View style={styles.paidStatusRow}>
                {isPaid ? (
                  <View style={styles.paidCheckCircle}>
                    <Text style={styles.paidCheckmark}>✓</Text>
                  </View>
                ) : (
                  <View style={styles.pendingCheckCircle}>
                    <Text style={styles.pendingCheckmark}>!</Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.paidStatusText,
                    { color: isPaid ? '#16A34A' : '#D97706' },
                  ]}>
                  {paymentStatusText}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: subTextColor }]}>
                {tr('Amount Paid') || 'Amount Paid'}
              </Text>
              <Text style={[styles.infoValue, { color: textColor }]}>
                {formattedAmountPaid}
              </Text>
            </View>

            {/* Direct Pay Now button if order is unpaid and payable */}
            {isPayable && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handlePayNow}
                style={styles.payNowBtn}>
                <Text style={styles.payNowBtnText}>
                  {tr('Pay Now') || 'Pay Now'} • ${finalTotal.toFixed(2)}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Need Help with Your Order Card (Figma) */}
          <View
            style={[
              styles.supportCard,
              { backgroundColor: cardBg, borderColor: borderColor },
            ]}>
            <Text style={[styles.supportTitle, { color: textColor }]}>
              {tr('Need Help with Your Order?') || 'Need Help with Your Order?'}
            </Text>
            <Text style={[styles.supportSub, { color: subTextColor }]}>
              {tr(
                'Have a question or issue with this order? Our support team is here to help.',
              ) ||
                'Have a question or issue with this order? Our support team is here to help.'}
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleOpenWhatsApp}
              style={styles.whatsAppBtn}>
              <WhatsAppIcon width={20} height={20} fill="#FFFFFF" />
              <Text style={styles.whatsAppBtnText}>
                {tr('Contact Support on WhatsApp') ||
                  'Contact Support on WhatsApp'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
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
    marginBottom: 2,
  },
  statusBannerDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  trackOrderInlineBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackOrderInlineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EA580C',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 7,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  paidStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paidCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  paidCheckmark: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '800',
  },
  pendingCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  pendingCheckmark: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '800',
  },
  paidStatusText: {
    fontSize: 14,
    fontWeight: '700',
  },
  payNowBtn: {
    backgroundColor: '#F67922',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  payNowBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  itemThumbWrap: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemThumb: {
    width: '100%',
    height: '100%',
  },
  placeholderThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  itemContentCol: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemSub: {
    fontSize: 12,
    marginBottom: 2,
  },
  itemRightCol: {
    alignItems: 'flex-end',
  },
  storeBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 6,
  },
  storeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  priceLabel: {
    fontSize: 14,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F67922',
  },
  supportCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  supportTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  supportSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  whatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 14,
  },
  whatsAppBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});
