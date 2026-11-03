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

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: 'When you create an account, browse products, or make purchases through 1 Click, we collect necessary personal details such as your name, email address, telephone number, and delivery address. When uploading identification or recipient data for customs clearance, these documents are handled with strict privacy protocols.',
  },
  {
    title: '2. How We Use Your Information',
    body: 'We use your data to process orders with international retailers, manage customs clearance, coordinate courier deliveries, provide order tracking updates, and deliver responsive customer service through our live support channels.',
  },
  {
    title: '3. Data Security & Storage',
    body: 'Your sensitive personal data is protected using industry-standard SSL encryption during transmission and secure tokenized authentication. Payment transactions are processed directly by certified payment gateways (e.g., E-Dahab, WaafiPay, Visa/MasterCard) and 1 Click never stores full credit card numbers on our servers.',
  },
  {
    title: '4. Information Sharing',
    body: 'We only share necessary shipping information with authorized logistics partners and customs authorities to facilitate the international delivery of your orders. We never sell, rent, or trade your personal data to third parties for marketing purposes.',
  },
  {
    title: '5. Your Rights & Account Control',
    body: 'You have full access to view, update, or edit your personal profile information at any time. You may also request account deletion or data removal by contacting our privacy compliance team.',
  },
  {
    title: '6. Contact Privacy Team',
    body: 'If you have questions regarding this Privacy Policy or your personal data handling, reach out to us at privacy@1clicktoshop.com or through Contact 1 Click.',
  },
];

export default function PrivacyPolicy({ navigation }) {
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
        title={tr('Privacy Policy') || 'Privacy Policy'}
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
              <Text style={styles.badgeText}>CONFIDENTIAL & SECURE</Text>
            </View>
            <Text style={[styles.docTitle, { color: textColor }]}>
              1 Click Privacy Policy
            </Text>
            <Text style={[styles.docSub, { color: subTextColor }]}>
              Last updated: October 2026 · We value your privacy and are committed to protecting your personal information.
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          {/* Continuous Sections inside one single card */}
          {SECTIONS.map((sec, idx) => (
            <View key={idx} style={styles.sectionWrap}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                {sec.title}
              </Text>
              <Text style={[styles.sectionBody, { color: subTextColor }]}>
                {sec.body}
              </Text>
              {idx < SECTIONS.length - 1 ? (
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
