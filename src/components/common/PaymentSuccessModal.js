import React, { useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { tr } from '../../translate/i18n';
import { EmContext } from '../../contexts/EmContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PaymentSuccessModal({
  visible = false,
  amount = 0,
  currency = 'USD',
  paymentMethod = 'E-Dahab',
  phoneNumber = '',
  onViewOrders,
  onContinueShopping,
}) {
  const { ctx } = useContext(EmContext);
  const isDark = ctx?.isDark;

  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkScaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      // Card entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();

      // Checkmark pop animation with slight delay
      Animated.sequence([
        Animated.delay(180),
        Animated.spring(checkScaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();

      // Gentle pulsing halo
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.95,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      scaleAnim.setValue(0.5);
      fadeAnim.setValue(0);
      checkScaleAnim.setValue(0);
      pulseAnim.setValue(0.9);
    }
  }, [visible]);

  if (!visible) return null;

  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const textColor = isDark ? '#F8FAFC' : '#0F172A';
  const subTextColor = isDark ? '#94A3B8' : '#64748B';
  const detailBoxBg = isDark ? '#0F172A' : '#F8FAFC';
  const borderColor = isDark ? '#334155' : '#E2E8F0';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onViewOrders}>
      <View style={styles.modalBackdrop}>
        <Animated.View
          style={[
            styles.modalCard,
            {
              backgroundColor: cardBg,
              borderColor: borderColor,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}>
          
          {/* Animated Success Icon with Pulse Rings */}
          <View style={styles.iconContainer}>
            <Animated.View
              style={[
                styles.pulseRing,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <View style={styles.iconCircleOuter}>
              <Animated.View
                style={[
                  styles.iconCircleInner,
                  { transform: [{ scale: checkScaleAnim }] },
                ]}>
                <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M5 13l4 4L19 7"
                    stroke="#FFFFFF"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </Animated.View>
            </View>
          </View>

          {/* Heading & Confirmation Message */}
          <Text style={[styles.title, { color: textColor }]}>
            {tr('Payment Successful') || 'Payment Successful!'}
          </Text>
          <Text style={[styles.subtitle, { color: subTextColor }]}>
            {tr(
              'Your payment has been verified. Your order is confirmed and is now being processed.',
            ) ||
              'Your payment has been verified. Your order is confirmed and is now being processed.'}
          </Text>

          {/* Amount Highlight Card */}
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>
              {tr('Amount Paid') || 'AMOUNT PAID'}
            </Text>
            <Text style={styles.amountValue}>
              ${amount} {currency}
            </Text>
          </View>

          {/* Transaction Summary Card */}
          <View
            style={[
              styles.detailCard,
              { backgroundColor: detailBoxBg, borderColor: borderColor },
            ]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: subTextColor }]}>
                {tr('Payment Method') || 'Payment Method'}
              </Text>
              <View style={styles.badgeRow}>
                <View style={styles.onlineDot} />
                <Text style={[styles.detailValue, { color: textColor }]}>
                  {paymentMethod}
                </Text>
              </View>
            </View>

            {phoneNumber ? (
              <View
                style={[
                  styles.detailRow,
                  styles.detailBorder,
                  { borderTopColor: borderColor },
                ]}>
                <Text style={[styles.detailLabel, { color: subTextColor }]}>
                  {tr('Account / Phone') || 'Account / Phone'}
                </Text>
                <Text style={[styles.detailValue, { color: textColor }]}>
                  {phoneNumber}
                </Text>
              </View>
            ) : null}

            <View
              style={[
                styles.detailRow,
                styles.detailBorder,
                { borderTopColor: borderColor },
              ]}>
              <Text style={[styles.detailLabel, { color: subTextColor }]}>
                {tr('Status') || 'Status'}
              </Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {tr('Completed') || 'Completed'}
                </Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onViewOrders}
              style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>
                {tr('View Orders') || 'View Orders'}
              </Text>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={styles.btnIcon}>
                <Path
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                  stroke="#FFFFFF"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>

            {onContinueShopping ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onContinueShopping}
                style={[styles.secondaryBtn, { borderColor: borderColor }]}>
                <Text style={[styles.secondaryBtnText, { color: subTextColor }]}>
                  {tr('Continue Shopping') || 'Continue Shopping'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: Math.min(SCREEN_WIDTH - 40, 360),
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  iconContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  iconCircleOuter: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  amountBox: {
    width: '100%',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EA580C',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F67922',
  },
  detailCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  detailBorder: {
    borderTopWidth: 1,
    marginTop: 4,
    paddingTop: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  actionsContainer: {
    width: '100%',
    rowGap: 10,
  },
  primaryBtn: {
    backgroundColor: '#F67922',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F67922',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnIcon: {
    marginLeft: 6,
  },
  secondaryBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
