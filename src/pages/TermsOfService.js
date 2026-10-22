import React, { useContext } from 'react';
import {
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

const TERMS_SECTIONS = [
  {
    title: '1. Agreement to Terms',
    body: 'By accessing or using the 1 Click mobile application, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.',
  },
  {
    title: '2. International Shopping & Procurement',
    body: '1 Click facilitates purchasing and courier delivery from international retailers (including Amazon, iHerb, YesStyle, Shein, etc.) on behalf of our users. While we ensure reliable order placement and safe transit, manufacturers and merchant warranties are subject to the original merchant policies.',
  },
  {
    title: '3. Pricing, Exchange Rates & Fees',
    body: 'Product prices displayed in the app reflect prevailing retail amounts converted to local currency, plus applicable shipping, handling, and customs processing fees. The total checkout price is the final amount due with no hidden delivery surcharges.',
  },
  {
    title: '4. Customs & Clearance',
    body: 'All items imported are subject to local customs regulations. 1 Click handles clearance documentation and administrative processes. Users must ensure that items ordered do not violate local import prohibitions.',
  },
  {
    title: '5. Delivery & Risk of Loss',
    body: 'Orders are shipped from overseas hubs and delivered to the recipient address provided during order placement. In the rare event of lost or damaged transit, 1 Click customer support investigates and provides insurance or replacement.',
  },
  {
    title: '6. Cancellations & Disputes',
    body: 'Due to international fulfillment speeds, cancellation requests must be submitted within 2 hours of payment. Disputes are handled promptly through our dedicated support representatives via Contact 1 Click.',
  },
];

export default function TermsOfService({ navigation }) {
  const { ctx } = useContext(EmContext);
  const isDark = ctx.isDark;
  const pageBg = isDark ? '#111827' : '#F8FAFC';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#252C34';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#E5E7EB';
  const dividerColor = isDark ? '#374151' : '#F1F5F9';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: cardBg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={cardBg}
      />

      <AppHeader
        navigation={navigation}
        showBack={true}
        title={tr('Terms of Service') || 'Terms of Service'}
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
        {/* Single Unified Document Container matching Figma */}
        <View
          style={[
            styles.documentCard,
            { backgroundColor: cardBg, borderColor: borderColor },
          ]}>
          {/* Header area */}
          <View style={styles.docHeader}>
            <View style={styles.badgeWrap}>
              <Text style={styles.badgeText}>USER AGREEMENT</Text>
            </View>
            <Text style={[styles.docTitle, { color: textColor }]}>
              1 Click Terms of Service
            </Text>
            <Text style={[styles.docSub, { color: subTextColor }]}>
              Version 1.0.0 · Effective: October 2026 · Please review our terms governing cross-border shopping and services.
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          {/* Continuous Sections inside one single card */}
          {TERMS_SECTIONS.map((sec, idx) => (
            <View key={idx} style={styles.sectionWrap}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                {sec.title}
              </Text>
              <Text style={[styles.sectionBody, { color: subTextColor }]}>
                {sec.body}
              </Text>
              {idx < TERMS_SECTIONS.length - 1 ? (
                <View style={[styles.sectionDivider, { backgroundColor: dividerColor }]} />
              ) : null}
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
  documentCard: {
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  docHeader: {
    marginBottom: 16,
  },
  badgeWrap: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(246, 121, 34, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F67922',
  },
  docTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 6,
  },
  docSub: {
    fontSize: 13,
    lineHeight: 19,
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  sectionWrap: {
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 13.5,
    lineHeight: 21,
  },
  sectionDivider: {
    height: 1,
    marginTop: 18,
    marginBottom: 18,
  },
});
