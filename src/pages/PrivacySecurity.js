import React, { useContext, useState } from 'react';
import {
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { EmContext } from '../contexts/EmContext';
import { tr } from '../translate/i18n';
import ai from '../helpers/ai';
import { storageDelete, storageGet } from '../helpers/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '../store/useUserStore';
import AppHeader from '../components/common/AppHeader';

import ShieldIcon from '../assets/svg/menu_shield.svg';
import DocIcon from '../assets/svg/menu_doc.svg';
import ChevronRightIcon from '../assets/svg/chevron_right.svg';
import TrashIcon from '../assets/svg/trash.svg';

export default function PrivacySecurity({ navigation }) {
  const { ctx, setCtx } = useContext(EmContext);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  const isDark = ctx.isDark;
  const pageBg = isDark ? '#111827' : '#F8FAFC';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#252C34';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#E5E7EB';
  const itemBorder = isDark ? '#374151' : '#F1F5F9';

  const handleDeleteAccount = async () => {
    const isGuest =
      (await storageGet('is_guest')) === '1' ||
      ctx?.user?.kod === 'GUEST' ||
      ctx?.user?.kod === 'HG1000';

    if (isGuest) {
      Alert.alert(
        tr('Misafir Hesabı') || 'Guest Account',
        tr('Misafir hesabı silinemez') || 'Cannot delete guest account',
      );
      return;
    }

    Alert.alert(
      tr('Delete Account') || 'Delete Account',
      tr('Hesabınızı silmek istediğinize emin misiniz?') ||
        'Are you sure you want to delete your account? All your order history and data will be permanently removed.',
      [
        { text: tr('Cancel') || 'Cancel', style: 'cancel' },
        {
          text: tr('Delete Account') || 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await ai.get('delete-account');
              if (res?.data?.error === false) {
                Alert.alert(
                  tr('Hesabınız 24 saat içinde silinecektir') ||
                    'Your account will be deleted within 24 hours.',
                );
                await AsyncStorage.multiRemove([
                  'user',
                  'is_guest',
                  'user-storage',
                ]);
                await storageDelete('user');
                await storageDelete('is_guest');
                try {
                  useUserStore.getState().clearUser?.();
                } catch (e) {}
                if (setCtx) {
                  setCtx(prev => ({ ...prev, user: null, token: null }));
                }
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Onboarding' }],
                });
              } else {
                Alert.alert(
                  tr('Hata') || 'Error',
                  tr('Hesap silme işlemi başarısız oldu') ||
                    'Failed to delete account',
                );
              }
            } catch (delErr) {
              Alert.alert(
                tr('Hata') || 'Error',
                tr('Hesap silme işlemi başarısız oldu') ||
                  'Failed to delete account',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: cardBg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={cardBg}
      />

      <AppHeader
        navigation={navigation}
        showBack={true}
        title={tr('Privacy & Security') || 'Privacy & Security'}
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
            {tr('Security Settings') || 'Security Settings'}
          </Text>
          <Text style={[styles.introSub, { color: subTextColor }]}>
            Manage how you sign in and control your account data security.
          </Text>
        </View>

        {/* Security Options Card */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBg, borderColor: borderColor },
          ]}>
          {/* Change Password */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.menuRow, { borderBottomColor: itemBorder }]}
            onPress={() => navigation.navigate('SetNewPassword')}>
            <View style={styles.menuLeft}>
              <View style={styles.iconWrap}>
                <Text style={{ fontSize: 16 }}>🔒</Text>
              </View>
              <Text style={[styles.menuTitle, { color: textColor }]}>
                {tr('Change Password') || 'Change Password'}
              </Text>
            </View>
            <ChevronRightIcon width={18} height={18} />
          </TouchableOpacity>

          {/* Biometric Login */}
          <View style={[styles.menuRow, { borderBottomColor: itemBorder }]}>
            <View style={styles.menuLeft}>
              <View style={styles.iconWrap}>
                <Text style={{ fontSize: 16 }}>👆</Text>
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: textColor }]}>
                  {tr('Biometric Login') || 'Biometric Login'}
                </Text>
                <Text style={[styles.menuSub, { color: subTextColor }]}>
                  Use fingerprint or Face ID
                </Text>
              </View>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
              trackColor={{ false: '#E5E7EB', true: '#F67922' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Two-Factor Authentication */}
          <View style={[styles.menuRow, { borderBottomWidth: 0 }]}>
            <View style={styles.menuLeft}>
              <View style={styles.iconWrap}>
                <ShieldIcon width={20} height={20} />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: textColor }]}>
                  {tr('Two-Factor Authentication') || 'Two-Factor Authentication'}
                </Text>
                <Text style={[styles.menuSub, { color: subTextColor }]}>
                  SMS code confirmation on login
                </Text>
              </View>
            </View>
            <Switch
              value={twoFactorEnabled}
              onValueChange={setTwoFactorEnabled}
              trackColor={{ false: '#E5E7EB', true: '#F67922' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Legal & Policies */}
        <Text style={[styles.groupTitle, { color: subTextColor }]}>
          LEGAL & POLICIES
        </Text>
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBg, borderColor: borderColor },
          ]}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.menuRow, { borderBottomColor: itemBorder }]}
            onPress={() => navigation.navigate('PrivacyPolicy')}>
            <View style={styles.menuLeft}>
              <View style={styles.iconWrap}>
                <ShieldIcon width={20} height={20} />
              </View>
              <Text style={[styles.menuTitle, { color: textColor }]}>
                {tr('Privacy Policy') || 'Privacy Policy'}
              </Text>
            </View>
            <ChevronRightIcon width={18} height={18} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('TermsOfService')}>
            <View style={styles.menuLeft}>
              <View style={styles.iconWrap}>
                <DocIcon width={20} height={20} />
              </View>
              <Text style={[styles.menuTitle, { color: textColor }]}>
                {tr('Terms of Service') || 'Terms of Service'}
              </Text>
            </View>
            <ChevronRightIcon width={18} height={18} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <Text style={[styles.groupTitle, { color: '#EF4444' }]}>
          DANGER ZONE
        </Text>
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBg, borderColor: '#FEE2E2' },
          ]}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={handleDeleteAccount}>
            <View style={styles.menuLeft}>
              <View style={[styles.iconWrap, { backgroundColor: '#FEE2E2' }]}>
                <TrashIcon width={18} height={18} stroke="#EF4444" />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: '#EF4444' }]}>
                  {tr('Delete Account') || 'Delete Account'}
                </Text>
                <Text style={[styles.menuSub, { color: subTextColor }]}>
                  Permanently remove your account and data
                </Text>
              </View>
            </View>
            <ChevronRightIcon width={18} height={18} stroke="#EF4444" />
          </TouchableOpacity>
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
    marginBottom: 16,
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
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 8,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFF4EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  menuSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
