import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { EmContext } from '../contexts/EmContext';
import ai from '../helpers/ai';
import { tr } from '../translate/i18n';
import { storageGet, storageSet } from '../helpers/storage';
import { supportPhone } from '../../config';
import AppHeader from '../components/common/AppHeader';

// Icons
import SupportIcon from '../assets/svg/support.svg';
import WhatsappIcon from '../assets/svg/whatsapp.svg';
import PhoneIcon from '../assets/svg/phone.svg';
import MailIcon from '../assets/svg/mail.svg';
import InfoCircleIcon from '../assets/svg/info_circle.svg';

const { width } = Dimensions.get('window');

export default function ContactOneClick({ navigation, route }) {
  const { ctx } = useContext(EmContext);
  const [phoneList, setPhoneList] = useState([]);
  const [socialMedia, setSocialMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }
      if (!isRefresh) {
        const cached = await storageGet('contact_cache');
        if (cached) {
          if (Array.isArray(cached.phone)) setPhoneList(cached.phone);
          if (Array.isArray(cached.social)) setSocialMedia(cached.social);
          setLoading(false);
        }
      }

      const res = await ai.get('contact');
      if (res?.data && res.data.error === false) {
        if (Array.isArray(res.data.phone)) {
          setPhoneList(res.data.phone);
        }
        if (Array.isArray(res.data.social)) {
          setSocialMedia(res.data.social);
        }
        await storageSet('contact_cache', res.data);
      }
    } catch (err) {
      console.log('ContactOneClick fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isDark = ctx?.isDark;
  const pageBg = isDark ? '#111827' : '#F8FAFC';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#252C34';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#E5E7EB';
  const heroBg = isDark ? '#282015' : '#FEF7EC';
  const heroBorder = isDark ? '#45331E' : '#FEEBD3';

  // Determine phone number to call (from API or official supportPhone)
  const primaryPhone =
    phoneList.find(p => p.tel)?.tel ||
    supportPhone ||
    '';

  const emailAddress = 'support@1click.com';

  const handleWhatsApp = async () => {
    const waSocial = socialMedia.find(
      s => s.ad?.toLowerCase() === 'whatsapp' || s.url?.includes('wa.me'),
    );
    const waPhone = phoneList.find(p => p.link?.includes('wa.me'));
    const phoneWithTel = phoneList.find(p => p.tel)?.tel || supportPhone;
    const cleanPhone = phoneWithTel ? phoneWithTel.replace(/[^0-9]/g, '') : '252637979636';
    const fallbackWa =
      `https://wa.me/${cleanPhone}?text=` +
      encodeURIComponent('Hello 1 Click, I need assistance.');
    const url = waSocial?.url || waPhone?.link || fallbackWa;

    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert(tr('Hata') || 'Error', 'Could not open WhatsApp');
    }
  };

  const handleEmail = async () => {
    try {
      await Linking.openURL(`mailto:${emailAddress}`);
    } catch (e) {
      Alert.alert(tr('Hata') || 'Error', 'Could not open mail app');
    }
  };

  const handleCall = async () => {
    if (!primaryPhone) {
      Alert.alert(tr('Hata') || 'Error', 'No phone number available');
      return;
    }
    try {
      await Linking.openURL(`tel:${primaryPhone.replace(/\s+/g, '')}`);
    } catch (e) {
      Alert.alert(tr('Hata') || 'Error', 'Could not initiate call');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: cardBg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={cardBg}
      />

      {/* Header */}
      <AppHeader
        navigation={navigation}
        showBack={true}
        title={tr('Contact 1 Click') || 'Contact 1 Click'}
        style={{
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          backgroundColor: cardBg,
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: pageBg }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={['#F67922']}
            tintColor="#F67922"
          />
        }>
        {loading && !refreshing ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#F67922" />
          </View>
        ) : (
          <>
            {/* Top Hero Card: Cream Background */}
            <View
              style={[
                styles.heroCard,
                { backgroundColor: heroBg, borderColor: heroBorder },
              ]}>
              <View style={styles.heroIconWrap}>
                <SupportIcon width={36} height={36} fill="#F67922" />
              </View>
              <Text style={[styles.heroTitle, { color: textColor }]}>
                {tr("We're here to help!") || "We're here to help!"}
              </Text>
              <Text style={[styles.heroSub, { color: subTextColor }]}>
                {tr(
                  'Have a question or need assistance? Our support team is ready to help you.',
                ) ||
                  'Have a question or need assistance? Our support team is ready to help you.'}
              </Text>
            </View>

            {/* WhatsApp Button: Full Width Green */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.whatsappButton}
              onPress={handleWhatsApp}>
              <WhatsappIcon width={22} height={22} />
              <Text style={styles.whatsappButtonText}>
                {tr('Chat with us on WhatsApp') || 'Chat with us on WhatsApp'}
              </Text>
            </TouchableOpacity>

            {/* Email Us Card */}
            <TouchableOpacity
              activeOpacity={0.75}
              style={[
                styles.actionCard,
                { backgroundColor: cardBg, borderColor: borderColor },
              ]}
              onPress={handleEmail}>
              <View style={styles.actionIconBadge}>
                <MailIcon width={22} height={22} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={[styles.actionLabel, { color: subTextColor }]}>
                  {tr('Email Us') || 'Email Us'}
                </Text>
                <Text style={[styles.actionValue, { color: textColor }]}>
                  {emailAddress}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Call Us Card - only if phone exists */}
            {primaryPhone ? (
              <TouchableOpacity
                activeOpacity={0.75}
                style={[
                  styles.actionCard,
                  { backgroundColor: cardBg, borderColor: borderColor },
                ]}
                onPress={handleCall}>
                <View style={styles.actionIconBadge}>
                  <PhoneIcon width={22} height={22} fill="#F67922" />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={[styles.actionLabel, { color: subTextColor }]}>
                    {tr('Call Us') || 'Call Us'}
                  </Text>
                  <Text style={[styles.actionValue, { color: textColor }]}>
                    {primaryPhone}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {/* Expected Response Time Card */}
            <View
              style={[
                styles.infoCard,
                { backgroundColor: cardBg, borderColor: borderColor },
              ]}>
              <View style={styles.infoIconWrap}>
                <InfoCircleIcon width={24} height={24} />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={[styles.infoTitle, { color: textColor }]}>
                  {tr('Expected Response Time') || 'Expected Response Time'}
                </Text>
                <Text style={[styles.infoSub, { color: subTextColor }]}>
                  {tr(
                    'We usually respond within a few hours during working hours.',
                  ) ||
                    'We usually respond within a few hours during working hours.'}
                </Text>
              </View>
            </View>
          </>
        )}
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
    paddingTop: 12,
    paddingBottom: 40,
    gap: 14,
  },

  // Hero Card
  heroCard: {
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FEEBD3',
    backgroundColor: '#FEF7EC',
  },
  heroIconWrap: {
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#252C34',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 10,
  },

  // WhatsApp Button
  whatsappButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  whatsappButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Action Cards (Email & Call)
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  actionIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF4EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  actionValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#252C34',
    marginTop: 2,
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  infoIconWrap: {
    marginRight: 12,
    marginTop: 2,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#252C34',
  },
  infoSub: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    marginTop: 4,
  },
  loadingWrap: {
    paddingTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
