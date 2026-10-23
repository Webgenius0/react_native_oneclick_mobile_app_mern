import React, { useContext, useEffect, useState } from 'react';
import {
  SafeAreaView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Linking,
  ActivityIndicator,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import moment from 'moment';
import AppHeader from '../components/common/AppHeader';
import { tr } from '../translate/i18n';
import { EmContext } from '../contexts/EmContext';
import ai from '../helpers/ai';
import { cleanProductTitle, getStoreName } from '../helpers/storeHelper';
import WhatsAppIcon from '../assets/svg/whatsapp.svg';

export default function OrderDetail({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { ctx } = useContext(EmContext);

  const [order, setOrder] = useState(route.params?.s || null);
  const [loading, setLoading] = useState(!route.params?.s && Boolean(route.params?.id));

  const fetchOrderDetail = async () => {
    try {
      const orderId = route.params?.id || order?.id;
      if (!orderId) return;
      const c = await ai.get('order-detail', { id: orderId });
      if (c.data && c.data.error === false && c.data.data) {
        setOrder(c.data.data);
      }
    } catch (e) {
      console.log('fetchOrderDetail error:', e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!order && route.params?.id) {
      fetchOrderDetail();
    }
  }, [route.params?.id]);

  const orders = order?.orders || (order ? [order] : []);
  const firstItem = orders[0] || {};
  const orderId = order?.id || firstItem.id || route.params?.id || '1CLK-582941';

  const rawDate = order?.tarih || firstItem.tarih;
  const formattedDate = rawDate
    ? moment(rawDate).format('MMM DD, YYYY')
    : 'Sep 29, 2026';

  const expectedDate = rawDate
    ? moment(rawDate).add(3, 'days').format('MMM DD, YYYY')
    : 'Oct 02, 2026';

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
  } else if ([1, 14, 15, 16, 18, 19].includes(statusNum)) {
    statusTitle = 'Order Confirmed';
    statusDesc = 'Your order is confirmed and being prepared.';
    statusBadgeColor = '#D97706';
  }

  const deliveryCity =
    order?.sehir || firstItem.sehir || firstItem.teslimat_sehir || 'Borama';

  const totalAmount = parseFloat(order?.tutar || firstItem.tutar || 0);
  const shippingCost = 25.0;
  const subtotal = Math.max(0, totalAmount - shippingCost) || totalAmount;
  const finalTotal = totalAmount > 0 ? totalAmount : subtotal + shippingCost;

  const paymentMethodName =
    order?.odeme_yontemi || firstItem.odeme_yontemi || 'Visa**** 4582';
  const isPaid = statusNum !== 1 && statusNum !== 14 && statusNum !== 18;

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello 1Click Support, I need assistance with Order #${orderId}`,
    );
    Linking.openURL(`https://wa.me/+90?text=${text}`).catch(e => {
      console.log('WhatsApp open error:', e);
    });
  };

  const isDark = ctx?.isDark;
  const pageBg = isDark ? '#111827' : '#F8FAFC';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#1E293B';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#F1F5F9';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: cardBg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={cardBg}
      />

      {/* Figma Header */}
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
          showsVerticalScrollIndicator={false}>
          {/* Top Order & Status Card (Figma) */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: cardBg, borderColor: borderColor },
            ]}>
            <View style={styles.orderTopHeader}>
              <Text style={[styles.orderNumberTitle, { color: textColor }]}>
                Order #{orderId}
              </Text>
              <Text style={[styles.orderDateTitle, { color: subTextColor }]}>
                {formattedDate}
              </Text>
            </View>

            {/* In Progress / Status Banner */}
            <View style={styles.statusBannerWrap}>
              <View style={styles.statusTruckCircle}>
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"
                    stroke="#2563EB"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M5.5 18a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 18a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
                    fill="#2563EB"
                  />
                </Svg>
              </View>
              <View style={styles.statusBannerTextCol}>
                <Text
                  style={[
                    styles.statusBannerTitle,
                    { color: statusBadgeColor },
                  ]}>
                  {tr(statusTitle) || statusTitle}
                </Text>
                <Text
                  style={[styles.statusBannerDesc, { color: subTextColor }]}>
                  {statusDesc}
                </Text>
              </View>
            </View>
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
              {tr('Ordered Items') || 'Ordered Items'} ({orders.length})
            </Text>

            {orders.map((item, idx) => {
              const imgUri = item.resim || item.img || item.image;
              const store = item.magaza || item.store || 'Store';
              const price = parseFloat(item.tutar || item.price || 0).toFixed(2);
              const variant = [item.size || item.beden, item.color || item.renk]
                .filter(Boolean)
                .join(' • ');

              return (
                <View
                  key={idx}
                  style={[
                    styles.itemRow,
                    idx < orders.length - 1 && {
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
                      numberOfLines={1}
                      style={[styles.itemName, { color: textColor }]}>
                      {cleanProductTitle(item.ad || item.title || 'Product', '')}
                    </Text>
                    {variant ? (
                      <Text
                        numberOfLines={1}
                        style={[styles.itemSub, { color: subTextColor }]}>
                        {variant}
                      </Text>
                    ) : null}
                    <Text style={[styles.itemSub, { color: subTextColor }]}>
                      {tr('Qty') || 'Qty'}: {item.sayi || item.count || 1}
                    </Text>
                  </View>

                  <View style={styles.itemRightCol}>
                    <View style={styles.storeBadge}>
                      <Text style={styles.storeBadgeText}>{store}</Text>
                    </View>
                    <Text style={[styles.itemPrice, { color: textColor }]}>
                      ${price}
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
                {tr('Subtotal') || 'Subtotal'} ({orders.length}{' '}
                {orders.length === 1 ? 'item' : 'items'})
              </Text>
              <Text style={[styles.priceValue, { color: textColor }]}>
                ${subtotal.toFixed(2)}
              </Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: subTextColor }]}>
                {tr('Shipping Cost') || 'Shipping Cost'}
              </Text>
              <Text style={[styles.priceValue, { color: textColor }]}>
                ${shippingCost.toFixed(2)}
              </Text>
            </View>

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

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: subTextColor }]}>
                {tr('Payment method') || 'Payment method'}
              </Text>
              <Text style={[styles.infoValue, { color: textColor }]}>
                {paymentMethodName}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: subTextColor }]}>
                {tr('Payment Status') || 'Payment Status'}
              </Text>
              <View style={styles.paidStatusRow}>
                <View style={styles.paidCheckCircle}>
                  <Text style={styles.paidCheckmark}>✓</Text>
                </View>
                <Text style={styles.paidStatusText}>
                  {isPaid ? tr('Paid') || 'Paid' : tr('Pending') || 'Pending'}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: subTextColor }]}>
                {tr('Amount Paid') || 'Amount Paid'}
              </Text>
              <Text style={[styles.infoValue, { color: textColor }]}>
                ${finalTotal.toFixed(2)}
              </Text>
            </View>
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
  paidStatusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16A34A',
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
