import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmContext } from '../contexts/EmContext';
import ai from '../helpers/ai';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { availableLanguages, i18n, tr } from '../translate/i18n';
import { storageDelete, storageGet, storageSet } from '../helpers/storage';
import { getFcmToken } from '../helpers/notification';
import * as RootNavigation from '../services/RootNavigation';
import { logoutUser, setUser } from '../helpers/auth';

// SVG Icons matching Figma design
import ProfileIcon from '../assets/svg/profile1.svg';
import CreditIcon from '../assets/svg/credit.svg';
import NotificationBingIcon from '../assets/svg/notification_bing.svg';
import SupportIcon from '../assets/svg/support.svg';
import GlobeIcon from '../assets/svg/menu_globe.svg';
import ShieldIcon from '../assets/svg/menu_shield.svg';
import FaqIcon from '../assets/svg/menu_faq.svg';
import DocIcon from '../assets/svg/menu_doc.svg';
import LogoutIcon from '../assets/svg/menu_logout.svg';
import ChevronRightIcon from '../assets/svg/chevron_right.svg';

export default function Account({ navigation }) {
  const { ctx, setCtx, ctxDil, setCtxDil } = useContext(EmContext);

  const initialUser = ctx?.user || null;
  const initialIsGuest = !initialUser || !Object.keys(initialUser).length;

  const [state, setState] = useState({
    s: initialUser || {},
    loading: false,
    isGuest: initialIsGuest,
  });

  const [refreshing, setRefreshing] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  const handleLogout = async () => {
    await logoutUser(navigation, setCtx);
  };

  const fetchData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        }

        const currentUser = (await storageGet('user')) || ctx?.user;
        const storedToken =
          (await storageGet('auth_token')) ||
          (await AsyncStorage.getItem('auth_token')) ||
          currentUser?.token ||
          ctx?.token;

        // Check if user has an active session (real user or dummy user)
        const hasUserSession = Boolean(
          currentUser &&
          (currentUser.id || currentUser.kod || currentUser.email || currentUser.ad || currentUser.name || currentUser.tel || storedToken),
        );

        if (!hasUserSession) {
          setState({
            s: {},
            loading: false,
            isGuest: true,
          });
          return;
        }

        // Active authenticated session (real user or dummy/mock user)
        const activeUser = {
          ...currentUser,
          token: storedToken || currentUser?.token,
        };

        setState({
          s: activeUser,
          isGuest: false,
          loading: false,
        });

        if (setCtx && (!ctx?.user || !ctx?.token)) {
          setCtx(prev => ({
            ...prev,
            user: activeUser,
            token: activeUser.token,
          }));
        }

        // Only call profile API if token looks like a real server JWT/bearer token (not offline mock)
        if (
          storedToken &&
          storedToken !== 'GUEST' &&
          !String(storedToken).startsWith('mock-token-') &&
          String(storedToken).trim().length > 10
        ) {
          try {
            const c = await ai.get('profile');
            if (c?.data && c.data.error === false) {
              const profileData = c.data.user || c.data.s || {};
              const freshUser = {
                ...activeUser,
                ...profileData,
                token: storedToken,
              };
              setState({
                s: freshUser,
                loading: false,
                isGuest: false,
              });
              await setUser(freshUser);
              if (setCtx) {
                setCtx(prev => ({
                  ...prev,
                  user: freshUser,
                  token: storedToken,
                }));
              }
            }
          } catch (profileErr) {
            console.log('Account profile fetch note:', profileErr?.message);
          }
        }
      } catch (err) {
        console.log('Account fetchData error:', err);
      } finally {
        setRefreshing(false);
        setState(prev => ({ ...prev, loading: false }));
      }
    },
    [ctx?.user, ctx?.token, setCtx],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const handleGoToLogin = async () => {
    try {
      await storageDelete('is_guest');
      await AsyncStorage.removeItem('is_guest');
    } catch (e) {}
    try {
      const parentNav = navigation?.getParent ? navigation.getParent() : null;
      if (parentNav && typeof parentNav.navigate === 'function') {
        parentNav.navigate('Login');
        return;
      }
    } catch (e) {}
    try {
      navigation.navigate('Login');
    } catch (e) {
      RootNavigation.navigate('Login');
    }
  };

  const handleGoToRegister = async () => {
    try {
      await storageDelete('is_guest');
      await AsyncStorage.removeItem('is_guest');
    } catch (e) {}
    try {
      const parentNav = navigation?.getParent ? navigation.getParent() : null;
      if (parentNav && typeof parentNav.navigate === 'function') {
        parentNav.navigate('Register');
        return;
      }
    } catch (e) {}
    try {
      navigation.navigate('Register');
    } catch (e) {
      RootNavigation.navigate('Register');
    }
  };

  const handleDilUpdate = async dil => {
    setLangModalVisible(false);
    await storageSet('language', dil);
    i18n.locale = dil;
    try {
      const fcmToken = await getFcmToken();
      await ai.post('update-language', {
        dil: dil,
        fcmToken: fcmToken,
      });
    } catch (e) {}
    setCtxDil(dil);
  };

  const isDark = ctx?.isDark;
  const pageBg = isDark ? '#111827' : '#FFFFFF';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#252C34';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#F1F5F9';
  const cardBorder = isDark ? '#374151' : '#E5E7EB';

  const userDisplayName =
    state.s?.ad ||
    state.s?.name ||
    (state.s?.kod ? (state.s.kod === 'HG1000' ? 'Dummy User' : `User ${state.s.kod}`) : '') ||
    tr('User');
  const userSubtitle =
    state.s?.email ||
    state.s?.eposta ||
    state.s?.tel ||
    (state.s?.kod ? `ID: ${state.s.kod}` : '');

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: pageBg }]}
      edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={pageBg}
      />

      {/* Header matching Figma: Left-aligned bold "Account" */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          {tr('Account') || 'Account'}
        </Text>
      </View>

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
        {state.loading && !refreshing ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#F67922" />
          </View>
        ) : state.isGuest ? (
          /* ================= GUEST ACCOUNT SCREEN (Figma: 37932:6736) ================= */
          <View style={styles.contentWrap}>
            {/* Top Card: Support illustration & Auth CTAs */}
            <View
              style={[
                styles.guestTopCard,
                { backgroundColor: cardBg, borderColor: cardBorder },
              ]}>
              <View style={styles.illustrationWrap}>
                <Image
                  source={require('../assets/img/account/guest_support_ill.png')}
                  style={styles.guestIllImage}
                  resizeMode="contain"
                />
              </View>

              <Text style={[styles.guestCardTitle, { color: textColor }]}>
                {tr('Create an Account or Log in') || 'Create an Account or Log in'}
              </Text>
              <Text style={[styles.guestCardSub, { color: subTextColor }]}>
                {tr(
                  'Sign in to save your favorite products, track your orders and manage your account easily.'
                ) ||
                  'Sign in to save your favorite products, track your orders and manage your account easily.'}
              </Text>

              {/* Action Buttons */}
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.createAccountBtn}
                onPress={handleGoToRegister}>
                <Text style={styles.createAccountBtnText}>
                  {tr('Create Account') || 'Create Account'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.loginOutlineBtn, { borderColor: cardBorder }]}
                onPress={handleGoToLogin}>
                <Text style={[styles.loginOutlineBtnText, { color: textColor }]}>
                  {tr('Log In') || 'Log In'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Menu List Card for Guest */}
            <View
              style={[
                styles.menuCard,
                { backgroundColor: cardBg, borderColor: cardBorder },
              ]}>
              {/* Language */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Language')}
                style={[styles.menuItem, { borderBottomColor: borderColor }]}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIconWrap}>
                    <GlobeIcon width={20} height={20} />
                  </View>
                  <Text style={[styles.menuText, { color: textColor }]}>
                    {tr('Language') || 'Language'}
                  </Text>
                </View>
                <ChevronRightIcon width={18} height={18} />
              </TouchableOpacity>

              {/* FAQ */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Faq')}
                style={[styles.menuItem, { borderBottomColor: borderColor }]}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIconWrap}>
                    <FaqIcon width={20} height={20} />
                  </View>
                  <Text style={[styles.menuText, { color: textColor }]}>
                    {tr('FAQ') || 'FAQ'}
                  </Text>
                </View>
                <ChevronRightIcon width={18} height={18} />
              </TouchableOpacity>

              {/* Contact 1 Click */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ContactOneClick')}
                style={[styles.menuItem, { borderBottomColor: borderColor }]}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIconWrap}>
                    <SupportIcon width={20} height={20} fill="#F67922" />
                  </View>
                  <Text style={[styles.menuText, { color: textColor }]}>
                    {tr('Contact 1 Click') || 'Contact 1 Click'}
                  </Text>
                </View>
                <ChevronRightIcon width={18} height={18} />
              </TouchableOpacity>

              {/* Privacy Policy */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('PrivacyPolicy')}
                style={[styles.menuItem, { borderBottomColor: borderColor }]}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIconWrap}>
                    <ShieldIcon width={20} height={20} />
                  </View>
                  <Text style={[styles.menuText, { color: textColor }]}>
                    {tr('Privacy Policy') || 'Privacy Policy'}
                  </Text>
                </View>
                <ChevronRightIcon width={18} height={18} />
              </TouchableOpacity>

              {/* Terms of Service */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('TermsOfService')}
                style={[styles.menuItem, { borderBottomWidth: 0 }]}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIconWrap}>
                    <DocIcon width={20} height={20} />
                  </View>
                  <Text style={[styles.menuText, { color: textColor }]}>
                    {tr('Terms of Service') || 'Terms of Service'}
                  </Text>
                </View>
                <ChevronRightIcon width={18} height={18} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.versionText, { color: subTextColor }]}>
              1 Click version 1.0.0
            </Text>
          </View>
        ) : (
          /* ================= LOGIN ACCOUNT SCREEN (Figma: 37929:2001) ================= */
          <View style={styles.contentWrap}>
            {/* Top Card: Avatar & Name */}
            <View
              style={[
                styles.userTopCard,
                { backgroundColor: cardBg, borderColor: cardBorder },
              ]}>
              <View style={styles.avatarRing}>
                <View style={styles.avatarInner}>
                  <ProfileIcon width={44} height={44} fill="#F67922" />
                </View>
              </View>

              <Text style={[styles.userNameTitle, { color: textColor }]}>
                {userDisplayName}
              </Text>
              <Text style={[styles.userEmailSub, { color: subTextColor }]}>
                {userSubtitle}
              </Text>
            </View>

            {/* Menu List Card for Logged In User */}
            <View
              style={[
                styles.menuCard,
                { backgroundColor: cardBg, borderColor: cardBorder },
              ]}>
              {/* Personal Information */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('PersonalInformation')}
                style={[styles.menuItem, { borderBottomColor: borderColor }]}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIconWrap}>
                    <ProfileIcon width={18} height={18} fill="#F67922" />
                  </View>
                  <Text style={[styles.menuText, { color: textColor }]}>
                    {tr('Personal Information') || 'Personal Information'}
                  </Text>
                </View>
                <ChevronRightIcon width={18} height={18} />
              </TouchableOpacity>

              {/* Payment Methods */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('PaymentMethods')}
                style={[styles.menuItem, { borderBottomColor: borderColor }]}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIconWrap}>
                    <CreditIcon width={20} height={20} fill="#F67922" />
                  </View>
                  <Text style={[styles.menuText, { color: textColor }]}>
                    {tr('Payment Methods') || 'Payment Methods'}
                  </Text>
                </View>
                <ChevronRightIcon width={18} height={18} />
              </TouchableOpacity>

              {/* Notification Settings */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('NotificationSettings')}
                style={[styles.menuItem, { borderBottomColor: borderColor }]}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIconWrap}>
                    <NotificationBingIcon width={20} height={20} stroke="#F67922" color="#F67922" />
                  </View>
                  <Text style={[styles.menuText, { color: textColor }]}>
                    {tr('Notifications') || 'Notifications'}
                  </Text>
                </View>
                <ChevronRightIcon width={18} height={18} />
              </TouchableOpacity>

              {/* Language */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Language')}
                style={[styles.menuItem, { borderBottomColor: borderColor }]}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIconWrap}>
                    <GlobeIcon width={20} height={20} />
                  </View>
                  <Text style={[styles.menuText, { color: textColor }]}>
                    {tr('Language') || 'Language'}
                  </Text>
                </View>
                <ChevronRightIcon width={18} height={18} />
              </TouchableOpacity>

              {/* Privacy & Security */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('PrivacySecurity')}
                style={[styles.menuItem, { borderBottomColor: borderColor }]}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIconWrap}>
                    <ShieldIcon width={20} height={20} />
                  </View>
                  <Text style={[styles.menuText, { color: textColor }]}>
                    {tr('Privacy & Security') || 'Privacy & Security'}
                  </Text>
                </View>
                <ChevronRightIcon width={18} height={18} />
              </TouchableOpacity>

              {/* FAQ */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Faq')}
                style={[styles.menuItem, { borderBottomColor: borderColor }]}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIconWrap}>
                    <FaqIcon width={20} height={20} />
                  </View>
                  <Text style={[styles.menuText, { color: textColor }]}>
                    {tr('FAQ') || 'FAQ'}
                  </Text>
                </View>
                <ChevronRightIcon width={18} height={18} />
              </TouchableOpacity>

              {/* Contact 1 Click */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ContactOneClick')}
                style={[styles.menuItem, { borderBottomColor: borderColor }]}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIconWrap}>
                    <SupportIcon width={20} height={20} fill="#F67922" />
                  </View>
                  <Text style={[styles.menuText, { color: textColor }]}>
                    {tr('Contact 1 Click') || 'Contact 1 Click'}
                  </Text>
                </View>
                <ChevronRightIcon width={18} height={18} />
              </TouchableOpacity>

              {/* Terms of Service */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('TermsOfService')}
                style={[styles.menuItem, { borderBottomWidth: 0 }]}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIconWrap}>
                    <DocIcon width={20} height={20} />
                  </View>
                  <Text style={[styles.menuText, { color: textColor }]}>
                    {tr('Terms of Service') || 'Terms of Service'}
                  </Text>
                </View>
                <ChevronRightIcon width={18} height={18} />
              </TouchableOpacity>
            </View>

            {/* Log Out Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleLogout}
              style={[styles.logoutPillBtn, { backgroundColor: cardBg }]}>
              <LogoutIcon width={20} height={20} />
              <Text style={styles.logoutPillText}>
                {tr('Log Out') || 'Log Out'}
              </Text>
              <ChevronRightIcon width={18} height={18} stroke="#EF4444" />
            </TouchableOpacity>

            <Text style={[styles.versionText, { color: subTextColor }]}>
              1 Click version 1.0.0
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={langModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLangModalVisible(false)}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: cardBg, borderColor: cardBorder },
            ]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              {tr('Dil Seçimi') || 'Select Language'}
            </Text>
            {availableLanguages.map(dil => {
              const isSelected = dil.id === ctxDil;
              return (
                <TouchableOpacity
                  key={dil.id}
                  style={[
                    styles.langItem,
                    isSelected && styles.langItemActive,
                  ]}
                  onPress={() => handleDilUpdate(dil.id)}>
                  <Text
                    style={[
                      styles.langItemText,
                      isSelected && styles.langItemTextActive,
                    ]}>
                    {dil.ad}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Payment Methods Modal */}
      <Modal
        visible={paymentModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPaymentModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPaymentModalVisible(false)}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: cardBg, borderColor: cardBorder },
            ]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              {tr('Ödeme Yöntemleri') || 'Payment Methods'}
            </Text>
            <Text style={[styles.paymentModalSub, { color: subTextColor }]}>
              {tr('Desteklenen güvenli ödeme seçenekleri') ||
                'Supported secure payment options for your orders'}
            </Text>

            <View style={styles.paymentMethodsList}>
              <View style={[styles.paymentMethodItem, { borderColor: cardBorder }]}>
                <View style={styles.paymentIconBadge}>
                  <CreditIcon width={22} height={22} fill="#F67922" />
                </View>
                <View style={styles.paymentMethodInfo}>
                  <Text style={[styles.paymentMethodName, { color: textColor }]}>
                    Credit / Debit Cards
                  </Text>
                  <Text style={[styles.paymentMethodDesc, { color: subTextColor }]}>
                    Visa, MasterCard & Troy
                  </Text>
                </View>
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>Active</Text>
                </View>
              </View>

              <View style={[styles.paymentMethodItem, { borderColor: cardBorder }]}>
                <View style={[styles.paymentIconBadge, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={{ fontSize: 16 }}>📱</Text>
                </View>
                <View style={styles.paymentMethodInfo}>
                  <Text style={[styles.paymentMethodName, { color: textColor }]}>
                    E-Dahab & WaafiPay
                  </Text>
                  <Text style={[styles.paymentMethodDesc, { color: subTextColor }]}>
                    Mobile Wallet & ZAAD service
                  </Text>
                </View>
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>Active</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.modalCloseBtn}
              onPress={() => setPaymentModalVisible(false)}>
              <Text style={styles.modalCloseBtnText}>
                {tr('Tamam') || 'Got it'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 56,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#252C34',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  loadingWrap: {
    paddingTop: 80,
    alignItems: 'center',
  },
  contentWrap: {
    width: '100%',
  },

  // Guest Top Card
  guestTopCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  illustrationWrap: {
    width: '100%',
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  guestIllImage: {
    width: '100%',
    height: '100%',
  },
  guestCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#252C34',
    textAlign: 'center',
    marginBottom: 6,
  },
  guestCardSub: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 6,
  },
  createAccountBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F67922',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#F67922',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  createAccountBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loginOutlineBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  loginOutlineBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#252C34',
  },

  // User Top Card (Logged In)
  userTopCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2.5,
    borderColor: '#F67922',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(246, 121, 34, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userNameTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#252C34',
    marginBottom: 4,
  },
  userEmailSub: {
    fontSize: 14,
    color: '#64748B',
  },

  // Menu List Card
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFF4EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#252C34',
  },

  // Log Out Pill Button
  logoutPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 25,
    borderWidth: 1.2,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  logoutPillText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
    marginBottom: 24,
  },

  // Language Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 20,
    padding: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  langItem: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 4,
    backgroundColor: '#F9FAFB',
  },
  langItemActive: {
    backgroundColor: '#F67922',
  },
  langItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#252C34',
  },
  langItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Payment Methods Modal
  paymentModalSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  paymentMethodsList: {
    gap: 10,
    marginBottom: 18,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF4EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#252C34',
  },
  paymentMethodDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  activePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  modalCloseBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F67922',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

