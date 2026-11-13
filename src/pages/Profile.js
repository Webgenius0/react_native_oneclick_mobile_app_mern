import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ReactNative from 'react-native';
import { EmContext } from '../contexts/EmContext';
import ai from '../helpers/ai';
import Colors from '../assets/Colors';
import { availableLanguages, i18n, tr } from '../translate/i18n';
import { storageGet, storageSet } from '../helpers/storage';
import { getFcmToken, fcmUpdate } from '../helpers/notification';
import AppHeader from '../components/common/AppHeader';
import { logoutUser } from '../helpers/auth';

import ProfileIcon from '../assets/svg/profile1.svg';
import BagIcon from '../assets/svg/bag.svg';
import NotificationBingIcon from '../assets/svg/notification_bing.svg';
import CartIcon from '../assets/svg/cart.svg';

const { width } = Dimensions.get('window');

export default function Profile({ navigation }) {
  const { ctx, setCtx, ctxDil, setCtxDil } = useContext(EmContext);

  const initialUser = ctx?.user || {};
  const isInitialGuest =
    initialUser?.kod === 'GUEST' ||
    initialUser?.kod === 'HG1000' ||
    ctx?.token === 'GUEST';

  const [state, setState] = useState({
    s: initialUser,
    loading: false,
    isGuest: isInitialGuest,
    updating: false,
  });

  const [tel, setTel] = useState(initialUser?.tel || '');
  const [email, setEmail] = useState(initialUser?.email || initialUser?.eposta || '');
  const [adres, setAdres] = useState(initialUser?.adres || initialUser?.sehir || '');
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isDark = ctx?.isDark;
  const pageBg = isDark ? '#111827' : '#F8FAFC';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#252C34';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#E5E7EB';
  const inputBg = isDark ? '#1F2937' : '#F8FAFC';

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }

      const isGuestStorage = (await storageGet('is_guest')) === '1';
      const currentUser = (await storageGet('user')) || ctx?.user;
      const isGuest =
        isGuestStorage ||
        currentUser?.kod === 'GUEST' ||
        currentUser?.kod === 'HG1000' ||
        ctx?.user?.kod === 'GUEST' ||
        ctx?.user?.kod === 'HG1000';

      if (isGuest || !currentUser || (!currentUser.token && !ctx?.token)) {
        setState({
          s: currentUser || { kod: 'HG1000', ad: tr('Guest') || 'Guest' },
          loading: false,
          isGuest: true,
          updating: false,
        });
        return;
      }

      if (currentUser) {
        setState(prev => ({
          ...prev,
          s: currentUser,
          loading: false,
        }));
        if (!tel && currentUser.tel) setTel(currentUser.tel);
        if (!adres && (currentUser.adres || currentUser.sehir)) {
          setAdres(currentUser.adres || currentUser.sehir);
        }
        if (!email && (currentUser.email || currentUser.eposta)) {
          setEmail(currentUser.email || currentUser.eposta);
        }
      }

      const c = await ai.get('profile');
      let userData = currentUser || {};
      if (c?.data && c.data.error === false && c.data.s) {
        userData = c.data.s;
        await storageSet('user', userData);
        if (setCtx) {
          setCtx(prev => ({ ...prev, user: userData }));
        }
      }

      setState({
        s: userData,
        loading: false,
        isGuest: false,
        updating: false,
      });

      if (userData.tel) setTel(userData.tel);
      if (userData.adres || userData.sehir) setAdres(userData.adres || userData.sehir);
      const userEmail = userData.email || userData.eposta || '';
      if (userEmail) setEmail(userEmail);
    } catch (err) {
      console.log('Profile fetchData error:', err);
    } finally {
      setRefreshing(false);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (state.isGuest) {
      Alert.alert(tr('Cannot edit guest account') || 'Cannot edit guest account');
      return;
    }

    setState(prev => ({ ...prev, updating: true }));
    try {
      const payload = {
        phone: tel,
        tel: tel,
        adres: adres,
        email: email,
        eposta: email,
      };

      const res = await ai.post('profile-update', payload);
      if (res?.data && res.data.error === false) {
        Alert.alert(
          tr('Success') || 'Success',
          tr('Profile updated successfully') || 'Profile updated successfully',
        );
        const updated = {
          ...(state.s || {}),
          tel: tel,
          adres: adres,
          email: email,
          eposta: email,
        };
        await storageSet('user', updated);
        if (setCtx) {
          setCtx(prev => ({ ...prev, user: updated }));
        }
      } else {
        Alert.alert(
          tr('Error') || 'Error',
          res?.data?.msg || tr('Update failed') || 'Update failed',
        );
      }
    } catch (e) {
      console.log('Profile update error:', e);
      Alert.alert(tr('Error') || 'Error', tr('Update failed') || 'Update failed');
    } finally {
      setState(prev => ({ ...prev, updating: false }));
    }
  };

  const handleDilUpdate = async dil => {
    try {
      await storageSet('language', dil);
      i18n.locale = dil;
      const isRTL = dil === 'ar' || dil === 'ckb';
      ReactNative.I18nManager.allowRTL(isRTL);
      setCtxDil(dil);

      const fcmToken = await getFcmToken();
      if (fcmToken) {
        await fcmUpdate(fcmToken, true);
      }
    } catch (e) {
      // safe fallback
    }
  };

  const handleLogout = () => {
    if (loggingOut) {
      return;
    }
    setLoggingOut(true);
    setTimeout(() => {
      logoutUser(navigation, setCtx);
    }, 120);
  };

  const displayName = state.s.ad || state.s.name || tr('User') || 'User';
  const displayEmail = email || state.s?.email || state.s?.eposta || '';

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
        title={tr('Profile') || 'Profile'}
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
        keyboardShouldPersistTaps="handled"
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
        ) : (
          <>
            {/* Top Card: Big User Icon & Name */}
            <View
              style={[
                styles.topUserCard,
                { backgroundColor: cardBg, borderColor: borderColor },
              ]}>
              <View style={styles.topAvatarCircle}>
                <ProfileIcon fill="#F67922" width={48} height={48} />
              </View>
              <Text style={[styles.userNameText, { color: textColor }]}>
                {displayName}
              </Text>
              {displayEmail ? (
                <Text style={[styles.userEmailText, { color: subTextColor }]}>
                  {displayEmail}
                </Text>
              ) : null}
              {state.s.kod && state.s.kod !== 'GUEST' && state.s.kod !== 'HG1000' ? (
                <Text style={[styles.userCodeText, { color: subTextColor }]}>
                  {state.s.kod}
                </Text>
              ) : null}
            </View>

            {/* 3 Action Cards Row (Orders, Notifications, Cart) */}
            <View style={styles.threeCardsRow}>
              {/* Orders */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.quickCard,
                  { backgroundColor: cardBg, borderColor: borderColor },
                ]}
                onPress={() => navigation.navigate('Orders')}>
                <View style={[styles.quickIconWrap, { backgroundColor: '#FFF7ED' }]}>
                  <BagIcon width={22} height={22} fill="#F67922" />
                </View>
                <Text style={[styles.quickTitle, { color: textColor }]}>
                  {tr('Orders') || 'Orders'}
                </Text>
                <Text style={[styles.quickSub, { color: subTextColor }]}>
                  {tr('Track & History') || 'Track & History'}
                </Text>
              </TouchableOpacity>

              {/* Notifications */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.quickCard,
                  { backgroundColor: cardBg, borderColor: borderColor },
                ]}
                onPress={() => navigation.navigate('Notifications')}>
                <View style={[styles.quickIconWrap, { backgroundColor: '#FFF1F2' }]}>
                  <NotificationBingIcon width={22} height={22} stroke="#F43F5E" />
                </View>
                <Text style={[styles.quickTitle, { color: textColor }]}>
                  {tr('Notifications') || 'Notifications'}
                </Text>
                <Text style={[styles.quickSub, { color: subTextColor }]}>
                  {tr('Updates') || 'Updates'}
                </Text>
              </TouchableOpacity>

              {/* Cart */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.quickCard,
                  { backgroundColor: cardBg, borderColor: borderColor },
                ]}
                onPress={() => navigation.navigate('Cart')}>
                <View style={[styles.quickIconWrap, { backgroundColor: '#F0FDF4' }]}>
                  <CartIcon width={22} height={22} fill="#10B981" />
                </View>
                <Text style={[styles.quickTitle, { color: textColor }]}>
                  {tr('Cart') || 'Cart'}
                </Text>
                <Text style={[styles.quickSub, { color: subTextColor }]}>
                  {tr('Items') || 'Items'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Hesap Bilgileri Card */}
            <View
              style={[
                styles.formCard,
                { backgroundColor: cardBg, borderColor: borderColor },
              ]}>
              <Text style={[styles.formCardTitle, { color: textColor }]}>
                {tr('Account Information') || 'Account Information'}
              </Text>

              {/* Phone */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: subTextColor }]}>
                  {tr('Phone') || 'Phone'}
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    { backgroundColor: inputBg, borderColor: borderColor, color: textColor },
                  ]}
                  value={tel}
                  onChangeText={setTel}
                  placeholder={tr('Your phone number') || 'Your phone number'}
                  placeholderTextColor={subTextColor}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Email */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: subTextColor }]}>
                  {tr('Email address') || 'Email'}
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    { backgroundColor: inputBg, borderColor: borderColor, color: textColor },
                  ]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={tr('Your email address') || 'Your email address'}
                  placeholderTextColor={subTextColor}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Address */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: subTextColor }]}>
                  {tr('Address') || 'Address'}
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    { backgroundColor: inputBg, borderColor: borderColor, color: textColor },
                  ]}
                  value={adres}
                  onChangeText={setAdres}
                  placeholder={tr('Your delivery address') || 'Your delivery address'}
                  placeholderTextColor={subTextColor}
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={state.updating}>
                {state.updating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {tr('Save Changes') || 'Save Changes'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* App Language Card */}
            <View
              style={[
                styles.settingsCard,
                { backgroundColor: cardBg, borderColor: borderColor },
              ]}>
              <Text style={[styles.settingsCardTitle, { color: textColor }]}>
                {tr('App Language') || 'App Language'}
              </Text>
              <View style={styles.langPillsRow}>
                {availableLanguages.map(dil => {
                  const isSelected = dil.id === ctxDil;
                  return (
                    <TouchableOpacity
                      key={dil.id}
                      activeOpacity={0.8}
                      onPress={() => handleDilUpdate(dil.id)}
                      style={[
                        styles.langPill,
                        { borderColor: borderColor },
                        isSelected && styles.langPillActive,
                      ]}>
                      <Text
                        style={[
                          styles.langPillText,
                          { color: textColor },
                          isSelected && styles.langPillTextActive,
                        ]}>
                        {dil.ad}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Logout Action */}
            <View style={styles.footerActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={loggingOut}
                style={[
                  styles.footerBtn,
                  { backgroundColor: cardBg, borderColor: borderColor },
                  loggingOut && { opacity: 0.7 },
                ]}
                onPress={handleLogout}>
                {loggingOut ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Text style={[styles.footerBtnText, { color: '#EF4444' }]}>
                    {tr('Log Out') || 'Log Out'}
                  </Text>
                )}
              </TouchableOpacity>
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
    paddingTop: 16,
    paddingBottom: 60,
  },
  loadingWrap: {
    paddingTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Top User Card
  topUserCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  topAvatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  userNameText: {
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  userEmailText: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  userCodeText: {
    fontSize: 13,
    marginTop: 4,
  },

  // Three Quick Cards
  threeCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  quickCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  quickIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickSub: {
    fontSize: 10,
    textAlign: 'center',
  },

  // Hesap Bilgileri Form Card
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  formCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  formInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  saveBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F67922',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#F67922',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Settings Card (Language)
  settingsCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  settingsCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  langPillsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  langPill: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langPillActive: {
    backgroundColor: '#F67922',
    borderColor: '#F67922',
  },
  langPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  langPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Footer Actions
  footerActions: {
    marginTop: 6,
  },
  footerBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
