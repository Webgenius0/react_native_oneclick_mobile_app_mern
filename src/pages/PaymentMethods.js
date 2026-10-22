import React, { useContext } from 'react';
import {
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { EmContext } from '../contexts/EmContext';
import { tr } from '../translate/i18n';
import AppHeader from '../components/common/AppHeader';

const { width } = Dimensions.get('window');

const PAYMENT_OPTIONS = [
  {
    id: 'edahab',
    title: 'E-Dahab Mobile Money',
    subtitle: 'Telesom Mobile Money',
    desc: 'Instant direct checkout with your registered E-Dahab wallet. Fast, secure, and fee-free payment for international orders.',
    badge: 'Active',
    logo: require('../assets/img/edahab.png'),
    logoWidth: 100,
    logoHeight: 46,
  },
  {
    id: 'waafipay',
    title: 'WaafiPay / ZAAD Service',
    subtitle: 'Mobile Wallet & Regional Checkout',
    desc: 'Seamless local mobile payment with WaafiPay and ZAAD. Fast order processing and instant verification.',
    badge: 'Active',
    logo: require('../assets/img/waafipay.png'),
    logoWidth: 120,
    logoHeight: 44,
  },
];

export default function PaymentMethods({ navigation }) {
  const { ctx } = useContext(EmContext);

  const isDark = ctx.isDark;
  const pageBg = isDark ? '#111827' : '#F8FAFC';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#1E293B';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: cardBg }]}>
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
            {tr('Manage your payment options') || 'Manage your payment options'}
          </Text>
          <Text style={[styles.introSub, { color: subTextColor }]}>
            Current supported payment options for your international orders and fast checkout.
          </Text>
        </View>

        {/* Payment Options Cards */}
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
                  <View style={styles.logoWrap}>
                    <Image
                      source={opt.logo}
                      style={{
                        width: opt.logoWidth,
                        height: opt.logoHeight,
                      }}
                      resizeMode="contain"
                    />
                  </View>
                </View>

                <View style={styles.activeBadge}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeBadgeText}>
                    {tr('Active') || 'Active'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardTitles}>
                <Text style={[styles.cardTitle, { color: textColor }]}>
                  {opt.title}
                </Text>
                <Text style={[styles.cardSub, { color: subTextColor }]}>
                  {opt.subtitle}
                </Text>
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
    paddingTop: 14,
    paddingBottom: 40,
  },
  introWrap: {
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  introSub: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },
  cardsList: {
    gap: 14,
  },
  paymentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
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
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoWrap: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  cardTitles: {
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  cardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },
});
