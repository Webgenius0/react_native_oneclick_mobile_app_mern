import React, { useContext } from 'react';
import {
  SafeAreaView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Linking,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import moment from 'moment';
import AppHeader from '../components/common/AppHeader';
import { tr } from '../translate/i18n';
import { EmContext } from '../contexts/EmContext';
import WhatsAppIcon from '../assets/svg/whatsapp.svg';

const TIMELINE_STEPS = [
  { id: 1, title: 'Order Placed', durums: [1] },
  { id: 2, title: 'Order Confirmed', durums: [18, 19, 73] },
  { id: 3, title: 'Preparing Your Order', durums: [2, 14, 15] },
  { id: 4, title: 'Shipped', durums: [3, 4] },
  { id: 5, title: 'Out for Delivery', durums: [5, 11] },
  { id: 6, title: 'Delivered', durums: [6] },
];

export default function TrackOrder({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { ctx } = useContext(EmContext);

  const order = route.params?.s || {};
  const orderId = route.params?.id || order.id || '1CLK-582941';
  const rawDate = order.tarih || new Date();
  const formattedDate = route.params?.formattedDate || moment(rawDate).format('MMM DD, YYYY');
  const expectedDate = moment(rawDate).add(3, 'days').format('MMM DD, YYYY');

  const statusNum = parseInt(order.durum || 2, 10);
  let activeStepIndex = 2; // Default to 'Preparing Your Order' (index 2 in 0-indexed)

  if (statusNum === 6) {
    activeStepIndex = 5;
  } else if ([5, 11].includes(statusNum)) {
    activeStepIndex = 4;
  } else if ([3, 4].includes(statusNum)) {
    activeStepIndex = 3;
  } else if ([2, 14, 15].includes(statusNum)) {
    activeStepIndex = 2;
  } else if ([18, 19, 73].includes(statusNum)) {
    activeStepIndex = 1;
  } else {
    activeStepIndex = 0;
  }

  const statusTitle =
    activeStepIndex === 5
      ? 'Delivered'
      : activeStepIndex >= 2
      ? 'In Progress'
      : 'Order Confirmed';

  const statusDesc =
    activeStepIndex === 5
      ? 'Your order has been delivered successfully.'
      : `Your order is on the way. Expected delivery on ${expectedDate}`;

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
        showsVerticalScrollIndicator={false}>
        {/* Top Order Card (Figma) */}
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

          {/* Status Banner */}
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
              <Text style={styles.statusBannerTitle}>
                {tr(statusTitle) || statusTitle}
              </Text>
              <Text style={[styles.statusBannerDesc, { color: subTextColor }]}>
                {statusDesc}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Tracking Timeline Card (Figma) */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBg, borderColor: borderColor },
          ]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {tr('Order Tracking') || 'Order Tracking'}
          </Text>

          <View style={styles.timelineList}>
            {TIMELINE_STEPS.map((step, idx) => {
              const isCompleted = idx < activeStepIndex;
              const isCurrent = idx === activeStepIndex;
              const isPending = idx > activeStepIndex;
              const isLast = idx === TIMELINE_STEPS.length - 1;

              return (
                <View key={step.id} style={styles.stepRow}>
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
                            backgroundColor:
                              idx < activeStepIndex ? '#16A34A' : '#E2E8F0',
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
                      {tr(step.title) || step.title}
                    </Text>

                    {(isCompleted || isCurrent) ? (
                      <Text
                        style={[styles.stepTimestamp, { color: subTextColor }]}>
                        {formattedDate} • 10:32 AM
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Help CTA */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            const text = encodeURIComponent(
              `Hello 1Click Support, I want to track my Order #${orderId}`,
            );
            Linking.openURL(`https://wa.me/+90?text=${text}`).catch(e => {
              console.log('WhatsApp open error:', e);
            });
          }}
          style={styles.whatsAppBtn}>
          <WhatsAppIcon width={20} height={20} fill="#FFFFFF" />
          <Text style={styles.whatsAppBtnText}>
            {tr('Need Help? Contact Support') || 'Need Help? Contact Support'}
          </Text>
        </TouchableOpacity>
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
    backgroundColor: '#16A34A',
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
    borderColor: '#F67922',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F67922',
  },
  pendingCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#CBD5E1',
    marginVertical: 4,
  },
  verticalLine: {
    width: 2,
    height: 42,
    marginVertical: 2,
  },
  stepContentCol: {
    flex: 1,
    paddingLeft: 12,
    paddingTop: 1,
    marginBottom: 18,
  },
  stepTitle: {
    fontSize: 14,
    marginBottom: 3,
  },
  stepTimestamp: {
    fontSize: 12,
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
