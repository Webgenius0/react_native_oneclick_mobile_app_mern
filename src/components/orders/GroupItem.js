import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { tr } from '../../translate/i18n';
import moment from 'moment';

const GroupItem = React.memo(function GroupItem({
  s,
  ctx,
  navigation,
  refetch,
  setRefetch,
}) {
  const isDark = ctx?.isDark;
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#1E293B';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#F1F5F9';

  const orders = s.orders || [s];
  const firstOrder = orders[0] || {};
  const orderId = s.id || firstOrder.id || '1CLK-582941';
  const totalAmount = parseFloat(s.tutar || firstOrder.tutar || 0).toFixed(2);
  const itemCount = orders.reduce((sum, o) => sum + (Number(o.sayi) || 1), 0);

  // Status mapping
  const statusNum = parseInt(s.durum !== undefined ? s.durum : firstOrder.durum || 1, 10);
  let statusText = 'Pending';
  let badgeBg = '#FEF3C7';
  let badgeColor = '#D97706';
  let isTrackable = true;

  if ([6].includes(statusNum)) {
    statusText = 'Delivered';
    badgeBg = '#DCFCE7';
    badgeColor = '#16A34A';
    isTrackable = false;
  } else if ([2, 3, 4, 5, 11].includes(statusNum)) {
    statusText = 'In Progress';
    badgeBg = '#EFF6FF';
    badgeColor = '#2563EB';
    isTrackable = true;
  } else if ([7, 8, 9, 10, 12, 13, 17].includes(statusNum)) {
    statusText = 'Canceled';
    badgeBg = '#FEE2E2';
    badgeColor = '#DC2626';
    isTrackable = false;
  } else {
    statusText = 'Pending';
    badgeBg = '#FEF3C7';
    badgeColor = '#D97706';
    isTrackable = true;
  }

  // Format Date
  const rawDate = s.tarih || firstOrder.tarih;
  const formattedDate = rawDate
    ? moment(rawDate).format('MMM DD, YYYY')
    : 'Sep 29, 2026';

  const handleViewDetails = () => {
    navigation.navigate('OrderDetail', {
      id: orderId,
      s: s,
      grupID: s.id,
    });
  };

  const handleTrackOrder = () => {
    navigation.navigate('TrackOrder', {
      id: orderId,
      s: s,
      statusText: statusText,
      formattedDate: formattedDate,
    });
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: cardBg, borderColor: borderColor },
      ]}>
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <Text style={[styles.orderNumber, { color: textColor }]}>
          Order #{orderId}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.statusBadgeText, { color: badgeColor }]}>
            {tr(statusText) || statusText}
          </Text>
        </View>
      </View>

      {/* Date & Item Count */}
      <Text style={[styles.dateText, { color: subTextColor }]}>
        {formattedDate} • {itemCount} {itemCount === 1 ? 'item' : 'items'}
      </Text>

      {/* Thumbnails Row & Total Price */}
      <View style={styles.middleRow}>
        <View style={styles.thumbsRow}>
          {orders.slice(0, 4).map((order, idx) => {
            const imgUri = order.resim || order.img || order.image;
            return (
              <View
                key={idx}
                style={[
                  styles.thumbBox,
                  { borderColor: borderColor, backgroundColor: '#FFFFFF' },
                ]}>
                {imgUri ? (
                  <FastImage
                    source={{ uri: imgUri }}
                    style={styles.thumbImage}
                    resizeMode={FastImage.resizeMode.contain}
                  />
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <Text style={styles.thumbPlaceholderText}>IMG</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <Text style={[styles.totalPriceText, { color: textColor }]}>
          {tr('Total') || 'Total'}: ${totalAmount}
        </Text>
      </View>

      {/* Bottom Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleViewDetails}
          style={[styles.outlineBtn, { borderColor: borderColor }]}>
          <Text style={[styles.outlineBtnText, { color: textColor }]}>
            {tr('View Details') || 'View Details'}
          </Text>
        </TouchableOpacity>

        {isTrackable ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleTrackOrder}
            style={styles.trackBtn}>
            <Text style={styles.trackBtnText}>
              {tr('Track Order') || 'Track Order'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
    marginBottom: 14,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  thumbsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderText: {
    fontSize: 9,
    color: '#94A3B8',
  },
  totalPriceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
  },
  outlineBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  trackBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F67922',
  },
});

export default GroupItem;
