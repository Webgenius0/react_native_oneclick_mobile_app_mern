import React, { useContext } from 'react';
import {
  Dimensions,
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

import CreditIcon from '../assets/svg/credit.svg';
import ShieldIcon from '../assets/svg/menu_shield.svg';

const PAYMENT_OPTIONS = [
  {
    id: 'cards',
    title: 'Credit / Debit Cards',
    subtitle: 'Visa, MasterCard & Troy',
    desc: 'Pay securely using any international credit or debit card with 3D Secure protection.',
    badge: 'Active',
    iconType: 'credit',
  },
  {
    id: 'edahab',
    title: 'E-Dahab Mobile Wallet',
    subtitle: 'Telesom mobile money',
    desc: 'Instant direct checkout with your registered E-Dahab wallet and zero transaction surcharges.',
    badge: 'Active',
    iconType: 'wallet',
  },
  {
    id: 'waafipay',
    title: 'WaafiPay / ZAAD Service',
    subtitle: 'Mobile Wallet & regional checkout',
    desc: 'Seamless local mobile payment for fast international order processing.',
    badge: 'Active',
    iconType: 'waafi',
  },
];

export default function PaymentMethods({ navigation }) {
  const { ctx } = useContext(EmContext);
  const isDark = ctx.isDark;
  const pageBg = isDark ? '#111827' : '#F8FAFC';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#252C34';
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
                  <View style={styles.iconBadge}>
                    {opt.iconType === 'credit' ? (
                      <CreditIcon width={24} height={24} fill="#F67922" />
                    ) : opt.iconType === 'wallet' ? (
                      <Text style={{ fontSize: 20 }}>📱</Text>
                    ) : (
                      <Text style={{ fontSize: 20 }}>💳</Text>
                    )}
                  </View>
                  <View style={styles.cardTitles}>
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

        {/* Bank Level Security Notice Card */}
        <View
          style={[
            styles.securityCard,
            { backgroundColor: cardBg, borderColor: borderColor },
          ]}>
          <View style={styles.securityIconWrap}>
            <ShieldIcon width={22} height={22} />
          </View>
          <View style={styles.securityInfo}>
            <Text style={[styles.securityTitle, { color: textColor }]}>
              Bank-Grade Encryption
            </Text>
            <Text style={[styles.securitySub, { color: subTextColor }]}>
              All transactions are encrypted with 256-bit SSL security. Your financial information is never stored directly on our servers.
            </Text>
          </View>
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
    paddingTop: 20,
    paddingBottom: 40,
  },
  introWrap: {
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  introSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardsList: {
    gap: 14,
    marginBottom: 24,
  },
  paymentCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
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
    marginRight: 8,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF4EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitles: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 12.5,
    marginTop: 2,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  securityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  securityIconWrap: {
    marginRight: 12,
    marginTop: 2,
  },
  securityInfo: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  securitySub: {
    fontSize: 12.5,
    lineHeight: 18,
  },
});
