import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';
import { EmContext } from '../contexts/EmContext';
import { tr } from '../translate/i18n';
import ai from '../helpers/ai';
import { storageDelete, storageGet } from '../helpers/storage';
import { useUserStore } from '../store/useUserStore';
import * as RootNavigation from '../services/RootNavigation';
import { CommonActions } from '@react-navigation/native';
import { logoutUser } from '../helpers/auth';

export default function DeleteAccount({ navigation }) {
  const { ctx, setCtx } = useContext(EmContext);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isDark = ctx.isDark;
  const pageBg = isDark ? '#111827' : '#FFFFFF';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#1E293B';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#E2E8F0';

  const handleOpenConfirmModal = async () => {
    const isGuest =
      (await storageGet('is_guest')) === '1' ||
      ctx?.user?.kod === 'GUEST' ||
      ctx?.user?.kod === 'HG1000';

    if (isGuest) {
      Alert.alert(
        tr('Misafir Hesabı') || 'Guest Account',
        tr('Misafir hesabı silinemez. Oturumu kapatmak ister misiniz?') ||
          'Guest account does not have stored permanent profile. You can log out instead.',
        [
          { text: tr('İptal') || 'Cancel', style: 'cancel' },
          {
            text: tr('Log Out') || 'Log Out',
            style: 'destructive',
            onPress: async () => {
              await logoutUser(navigation, setCtx);
            },
          },
        ],
      );
      return;
    }

    setPassword('');
    setShowPasswordModal(true);
  };

  const performPermanentDelete = async () => {
    if (!password) {
      Alert.alert(
        tr('Password Required') || 'Password Required',
        tr('Please enter your password to confirm account deletion.') ||
          'For security reasons, please enter your password to continue.',
      );
      return;
    }

    try {
      setLoading(true);
      const res = await ai.get('delete-account');
      if (res?.data?.error === false) {
        setShowPasswordModal(false);
        Alert.alert(
          tr('Account Deleted') || 'Account Deleted',
          tr('Hesabınız 24 saat içinde silinecektir') ||
            'Your account and all associated data have been scheduled for permanent deletion.',
        );

        await logoutUser(navigation, setCtx);
      } else {
        Alert.alert(
          tr('Hata') || 'Error',
          res?.data?.msg ||
            tr('Hesap silme işlemi başarısız oldu') ||
            'Failed to delete account. Please verify your password.',
        );
      }
    } catch (err) {
      console.log('Delete account error:', err);
      Alert.alert(
        tr('Hata') || 'Error',
        tr('Hesap silme işlemi başarısız oldu') || 'Failed to delete account.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: pageBg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={pageBg}
      />

      <View style={styles.mainContainer}>
        {/* Top Back Button */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { borderColor, backgroundColor: cardBg }]}>
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
        </View>

        {/* Center Content Matching Image 3 */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Big Circular Trash Icon Container */}
          <View style={styles.trashCircle}>
            <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
              <Path
                d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                stroke="#EF4444"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M10 11v6M14 11v6"
                stroke="#EF4444"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>

          {/* Heading */}
          <Text style={[styles.title, { color: textColor }]}>
            {tr('Delete Account?') || 'Delete Account?'}
          </Text>

          {/* Subtitle Description */}
          <Text style={[styles.subtitle, { color: subTextColor }]}>
            {tr(
              'Deleting your account will permanently remove your account information, saved preferences and order-related account data. This action cannot be undone.'
            ) ||
              'Deleting your account will permanently remove your account information, saved preferences and order-related account data. This action cannot be undone.'}
          </Text>
        </ScrollView>

        {/* Bottom Action Buttons Matching Image 3 */}
        <View style={styles.bottomButtonsWrap}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.deletePillBtn}
            onPress={handleOpenConfirmModal}>
            <Text style={styles.deletePillBtnText}>
              {tr('Delete Account') || 'Delete Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.keepPillBtn}
            onPress={() => navigation.goBack()}>
            <Text style={styles.keepPillBtnText}>
              {tr('Keep My Account') || 'Keep My Account'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= Image 4: Confirm Your Password Modal ================= */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            {/* Trash icon circle */}
            <View style={styles.modalTrashCircle}>
              <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                  stroke="#EF4444"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M10 11v6M14 11v6"
                  stroke="#EF4444"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>

            {/* Modal Heading */}
            <Text style={[styles.modalTitle, { color: textColor }]}>
              {tr('Confirm Your Password') || 'Confirm Your Password'}
            </Text>
            <Text style={[styles.modalSub, { color: subTextColor }]}>
              {tr('For security reasons, please enter your password to continue.') ||
                'For security reasons, please enter your password to continue.'}
            </Text>

            {/* Password Input Section */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: textColor }]}>
                {tr('Password') || 'Password'}
              </Text>

              <View
                style={[
                  styles.inputWrap,
                  { backgroundColor: isDark ? '#1F2937' : '#F8FAFC', borderColor },
                ]}>
                <TextInput
                  style={[styles.inputField, { color: textColor }]}
                  placeholder={tr('Enter your  password') || 'Enter your  password'}
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    {showPassword ? (
                      <>
                        <Path
                          d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                          stroke="#94A3B8"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <Path
                          d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 6z"
                          stroke="#94A3B8"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    ) : (
                      <>
                        <Path
                          d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"
                          stroke="#94A3B8"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    )}
                  </Svg>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.forgotBtn}
                onPress={() => {
                  setShowPasswordModal(false);
                  navigation.navigate('ForgotPassword');
                }}>
                <Text style={styles.forgotText}>
                  {tr('Forgot password?') || 'Forgot password?'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Pink Notice Box */}
            <View style={styles.modalNoticeBox}>
              <Text style={styles.modalNoticeText}>
                {tr(
                  'Your account will be permanently deleted after successful verification.'
                ) ||
                  'Your account will be permanently deleted after successful verification.'}
              </Text>
            </View>

            {/* Modal Buttons */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.deletePermanentBtn}
              disabled={loading}
              onPress={performPermanentDelete}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.deletePermanentBtnText}>
                  {tr('Delete Permanently') || 'Delete Permanently'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.modalBackBtn}
              disabled={loading}
              onPress={() => setShowPasswordModal(false)}>
              <Text style={styles.modalBackBtnText}>
                {tr('Back') || 'Back'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
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
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  trashCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  bottomButtonsWrap: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  deletePillBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  deletePillBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  keepPillBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF4F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  keepPillBtnText: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '600',
  },

  /* Modal Bottom Sheet */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
  },
  modalTrashCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
    lineHeight: 19,
  },
  inputSection: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  inputWrap: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 2,
  },
  forgotText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
  },
  modalNoticeBox: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    padding: 13,
    marginVertical: 16,
  },
  modalNoticeText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  deletePermanentBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePermanentBtnText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
  },
  modalBackBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EFF4F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  modalBackBtnText: {
    color: '#1E293B',
    fontSize: 15.5,
    fontWeight: '600',
  },
});
