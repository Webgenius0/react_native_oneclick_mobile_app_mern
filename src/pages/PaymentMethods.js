import React, { useContext } from 'react';
import {
  Dimensions,
  Image,

  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmContext } from '../contexts/EmContext';
import { tr } from '../translate/i18n';
import AppHeader from '../components/common/AppHeader';

const PAYMENT_OPTIONS = [
  {
    id: 'waafipay',
    title: 'WaafiPay / ZAAD Service',
    subtitle: 'Mobile Wallet & Direct Checkout',
    desc: 'Seamless local mobile payment with WaafiPay and ZAAD. Fast order processing and instant verification.',
    badge: 'Active',
    logo: require('../assets/img/waafipay.png'),
    logoWidth: 75,
    logoHeight: 28,
  },
  {
    id: 'edahab',
    title: 'E-Dahab Mobile Money',
    subtitle: 'Telesom Somalia',
    desc: 'Instant direct checkout with your registered E-Dahab wallet. Fast, secure, and fee-free payment for international orders.',
    badge: 'Active',
    logo: require('../assets/img/edahab.png'),
    logoWidth: 70,
    logoHeight: 32,
  },
];

export default function PaymentMethods({ navigation, route }) {
  const { ctx } = useContext(EmContext);

  const isDark = ctx?.isDark;
  const pageBg = isDark ? '#111827' : '#F8FAFC';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#1E293B';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#F1F5F9';

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: cardBg }]}
      edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={cardBg}
      />

      <AppHeader
        navigation={navigation}
        showBack={true}
        title={tr('Payment Methods') || 'Payment Methods'}
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
        {/* Intro */}
        <View style={styles.introWrap}>
          <Text style={[styles.introTitle, { color: textColor }]}>
            {tr('Supported Payment Methods') || 'Supported Payment Methods'}
          </Text>
          <Text style={[styles.introSub, { color: subTextColor }]}>
            {tr(
              '1 Click supports fast and secure local mobile payments for all orders.',
            ) ||
              '1 Click supports fast and secure local mobile payments for all orders.'}
          </Text>
        </View>

        {/* Payment Options (E-Dahab & WaafiPay Only) */}
        <View style={styles.cardsList}>
          {PAYMENT_OPTIONS.map(opt => (
            <View
              key={opt.id}
              style={[
                styles.paymentCard,
                { backgroundColor: cardBg, borderColor: borderColor },
              ]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.logoWrap, { borderColor: borderColor }]}>
                    <Image
                      source={opt.logo}
                      style={{
                        width: opt.logoWidth,
                        height: opt.logoHeight,
                      }}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.titleCol}>
                    <Text style={[styles.cardTitle, { color: textColor }]}>
                      {opt.title}
                    </Text>
                    <Text style={[styles.cardSub, { color: subTextColor }]}>
                      {opt.subtitle}
                    </Text>
                  </View>
                </View>

                <View style={styles.activeBadge}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeBadgeText}>
                    {tr('Active') || 'Active'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.cardDesc, { color: subTextColor }]}>
                {opt.desc}
              </Text>
            </View>
          ))}
        </View>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  introWrap: {
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  introSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardsList: {
    rowGap: 16,
  },
  paymentCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoWrap: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 12,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 5,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },
});
