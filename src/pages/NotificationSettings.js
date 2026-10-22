import React, { useContext, useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { EmContext } from '../contexts/EmContext';
import { tr } from '../translate/i18n';
import { storageGet, storageSet } from '../helpers/storage';

const STORAGE_KEY = 'notification_settings_prefs';

export default function NotificationSettings({ navigation }) {
  const { ctx } = useContext(EmContext);

  const [allNotifications, setAllNotifications] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [promoOffers, setPromoOffers] = useState(true);
  const [paymentUpdates, setPaymentUpdates] = useState(true);
  const [accountSecurity, setAccountSecurity] = useState(true);
  const [appUpdates, setAppUpdates] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await storageGet(STORAGE_KEY);
        if (saved && typeof saved === 'object') {
          if (saved.allNotifications !== undefined) setAllNotifications(saved.allNotifications);
          if (saved.orderUpdates !== undefined) setOrderUpdates(saved.orderUpdates);
          if (saved.promoOffers !== undefined) setPromoOffers(saved.promoOffers);
          if (saved.paymentUpdates !== undefined) setPaymentUpdates(saved.paymentUpdates);
          if (saved.accountSecurity !== undefined) setAccountSecurity(saved.accountSecurity);
          if (saved.appUpdates !== undefined) setAppUpdates(saved.appUpdates);
        }
      } catch (e) {}
    })();
  }, []);

  const savePref = async (key, value) => {
    try {
      const current = (await storageGet(STORAGE_KEY)) || {};
      const updated = { ...current, [key]: value };
      await storageSet(STORAGE_KEY, updated);
    } catch (e) {}
  };

  const handleToggleAll = (val) => {
    setAllNotifications(val);
    setOrderUpdates(val);
    setPromoOffers(val);
    setPaymentUpdates(val);
    setAccountSecurity(val);
    setAppUpdates(val);
    storageSet(STORAGE_KEY, {
      allNotifications: val,
      orderUpdates: val,
      promoOffers: val,
      paymentUpdates: val,
      accountSecurity: val,
      appUpdates: val,
    });
  };

  const isDark = ctx.isDark;
  const pageBg = isDark ? '#111827' : '#FFFFFF';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#1E293B';
  const subTextColor = isDark ? '#9CA3AF' : '#94A3B8';
  const borderColor = isDark ? '#374151' : '#E2E8F0';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: pageBg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={pageBg}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: pageBg }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Circular Back Button matching Figma */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { borderColor: borderColor, backgroundColor: cardBg }]}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M19 12H5M12 19l-7-7 7-7"
              stroke={textColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>

        {/* Page Title & Subtitle */}
        <Text style={[styles.title, { color: textColor }]}>
          {tr('Notification Settings') || 'Notification Settings'}
        </Text>
        <Text style={styles.subtitle}>
          {tr('Control which updates and activities you want to receive.') ||
            'Control which updates and activities you want to receive.'}
        </Text>

        {/* All Notifications Top Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardLeft}>
            <View style={styles.iconWrap}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                  stroke="#F67922"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M13.73 21a2 2 0 0 1-3.46 0"
                  stroke="#F67922"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.itemTitle, { color: textColor }]}>
                {tr('All Notifications') || 'All Notifications'}
              </Text>
              <Text style={[styles.itemSub, { color: subTextColor }]}>
                {tr('Turn on or off all notifications') || 'Turn on or off all notifications'}
              </Text>
            </View>
          </View>
          <Switch
            value={allNotifications}
            onValueChange={handleToggleAll}
            trackColor={{ false: '#E2E8F0', true: '#F67922' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Section Header */}
        <Text style={styles.sectionHeader}>
          {tr('Notification Types') || 'Notification Types'}
        </Text>

        {/* 1. Order Updates Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.textWrapFull}>
            <Text style={[styles.itemTitle, { color: textColor }]}>
              {tr('Order Updates') || 'Order Updates'}
            </Text>
            <Text style={[styles.itemSub, { color: subTextColor }]}>
              {tr('Updates about your orders and delivery') ||
                'Updates about your orders and delivery'}
            </Text>
          </View>
          <Switch
            value={orderUpdates}
            onValueChange={v => {
              setOrderUpdates(v);
              savePref('orderUpdates', v);
            }}
            trackColor={{ false: '#E2E8F0', true: '#F67922' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* 2. Promotions & Offers Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.textWrapFull}>
            <Text style={[styles.itemTitle, { color: textColor }]}>
              {tr('Promotions & Offers') || 'Promotions & Offers'}
            </Text>
            <Text style={[styles.itemSub, { color: subTextColor }]}>
              {tr('Get notified about deals and special offers') ||
                'Get notified about deals and special offers'}
            </Text>
          </View>
          <Switch
            value={promoOffers}
            onValueChange={v => {
              setPromoOffers(v);
              savePref('promoOffers', v);
            }}
            trackColor={{ false: '#E2E8F0', true: '#F67922' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* 3. Payment Updates Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.textWrapFull}>
            <Text style={[styles.itemTitle, { color: textColor }]}>
              {tr('Payment Updates') || 'Payment Updates'}
            </Text>
            <Text style={[styles.itemSub, { color: subTextColor }]}>
              {tr('Receive payment and transaction updates') ||
                'Receive payment and transaction updates'}
            </Text>
          </View>
          <Switch
            value={paymentUpdates}
            onValueChange={v => {
              setPaymentUpdates(v);
              savePref('paymentUpdates', v);
            }}
            trackColor={{ false: '#E2E8F0', true: '#F67922' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* 4. Account & Security Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.textWrapFull}>
            <Text style={[styles.itemTitle, { color: textColor }]}>
              {tr('Account & Security') || 'Account & Security'}
            </Text>
            <Text style={[styles.itemSub, { color: subTextColor }]}>
              {tr('Important updates about your account and security') ||
                'Important updates about your account and security'}
            </Text>
          </View>
          <Switch
            value={accountSecurity}
            onValueChange={v => {
              setAccountSecurity(v);
              savePref('accountSecurity', v);
            }}
            trackColor={{ false: '#E2E8F0', true: '#F67922' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* 5. App Updates Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.textWrapFull}>
            <Text style={[styles.itemTitle, { color: textColor }]}>
              {tr('App Updates') || 'App Updates'}
            </Text>
            <Text style={[styles.itemSub, { color: subTextColor }]}>
              {tr('Get notified about important app updates') ||
                'Get notified about important app updates'}
            </Text>
          </View>
          <Switch
            value={appUpdates}
            onValueChange={v => {
              setAppUpdates(v);
              savePref('appUpdates', v);
            }}
            trackColor={{ false: '#E2E8F0', true: '#F67922' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Bottom Notice Box */}
        <View style={styles.noticeBox}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={styles.noticeIcon}>
            <Circle cx={12} cy={12} r={10} stroke="#D97706" strokeWidth={1.8} />
            <Path d="M12 8v5M12 16h.01" stroke="#D97706" strokeWidth={2} strokeLinecap="round" />
          </Svg>
          <Text style={styles.noticeText}>
            {tr('Changes to your notification preferences are saved automatically.') ||
              'Changes to your notification preferences are saved automatically.'}
          </Text>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 22,
  },
  sectionHeader: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 10,
    marginBottom: 12,
    marginLeft: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF8F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
  },
  textWrapFull: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 15.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  itemSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 3,
    lineHeight: 18,
  },
  noticeBox: {
    backgroundColor: '#FFFDF5',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noticeIcon: {
    marginTop: 1,
    marginRight: 10,
  },
  noticeText: {
    fontSize: 13,
    color: '#D97706',
    lineHeight: 18,
    flex: 1,
  },
});
