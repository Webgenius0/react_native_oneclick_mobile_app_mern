import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import Svg, { Path, Circle } from 'react-native-svg';
import { EmContext } from '../contexts/EmContext';
import { tr } from '../translate/i18n';
import ai from '../helpers/ai';

export default function ChangePassword({ navigation }) {
  const { ctx } = useContext(EmContext);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);

  const isDark = ctx?.isDark;
  const pageBg = isDark ? '#111827' : '#FFFFFF';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#1E293B';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#EDF2F7';
  const inputBg = isDark ? '#1F2937' : '#F8FAFC';

  const isFormFilled =
    currentPassword.trim().length > 0 &&
    newPassword.trim().length >= 8 &&
    confirmPassword.trim().length >= 8;

  const handleSave = async () => {
    if (!currentPassword) {
      Alert.alert(
        tr('Hata') || 'Error',
        tr('Lütfen mevcut şifrenizi girin') || 'Please enter your current password.',
      );
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      Alert.alert(
        tr('Hata') || 'Error',
        tr('Şifreniz en az 8 karakter olmalıdır') || 'Password must be at least 8 characters.',
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        tr('Hata') || 'Error',
        tr('Şifreler uyuşmuyor') || 'New password and confirmation password do not match.',
      );
      return;
    }

    try {
      setLoading(true);
      const payload = {
        current_password: currentPassword.trim(),
        old_password: currentPassword.trim(),
        eski_sifre: currentPassword.trim(),
        new_password: newPassword.trim(),
        password: newPassword.trim(),
        yeni_sifre: newPassword.trim(),
        confirm_password: confirmPassword.trim(),
        password_confirmation: confirmPassword.trim(),
      };

      let res = null;
      let errorThrown = null;
      try {
        // 1. Primary dedicated API endpoint: POST /api/change-password
        res = await ai.post('change-password', payload);
      } catch (err1) {
        errorThrown = err1;
        // Only if 404 (endpoint not defined on current server), attempt legacy aliases
        if (err1?.response?.status === 404) {
          try {
            res = await ai.post('update-password-old', payload);
          } catch (_err2) {
            try {
              res = await ai.post('profile-update', payload);
            } catch (err3) {
              errorThrown = err3;
            }
          }
        }
      }

      if (res?.data && res.data.error === false) {
        Alert.alert(
          tr('Başarılı') || 'Success',
          res.data.msg ||
            tr('Şifreniz başarıyla değiştirildi') ||
            'Password updated successfully.',
          [
            {
              text: tr('Tamam') || 'OK',
              onPress: () => navigation.goBack(),
            },
          ],
        );
      } else {
        const serverData = res?.data || errorThrown?.response?.data;
        let errorMsg =
          serverData?.msg ||
          serverData?.message ||
          (serverData?.errors &&
            (typeof serverData.errors === 'string'
              ? serverData.errors
              : Object.values(serverData.errors).flat().join('\n'))) ||
          serverData?.error;
        if (typeof errorMsg !== 'string' || !errorMsg) {
          errorMsg =
            tr('Şifre değiştirme işlemi başarısız oldu') ||
            'Failed to change password. Please verify your current password.';
        }
        Alert.alert(tr('Hata') || 'Error', errorMsg);
      }
    } catch (err) {
      console.log('ChangePassword unexpected error:', err);
      const errorMsg =
        err?.response?.data?.msg ||
        err?.response?.data?.message ||
        tr('Şifre değiştirme işlemi başarısız oldu') ||
        'Failed to change password. Please verify your current password.';
      Alert.alert(tr('Hata') || 'Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const renderEyeIcon = visible => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {visible ? (
        // Open Eye (Active / Password visible)
        <>
          <Path
            d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
            stroke="#F67922"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle
            cx={12}
            cy={12}
            r={3}
            stroke="#F67922"
            strokeWidth={2}
          />
        </>
      ) : (
        // Slashed Eye (Hidden / Password obscured)
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
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: pageBg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={pageBg}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <View style={styles.mainContainer}>
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {/* Circular Back Button matching Figma */}
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

            {/* Title & Subtitle */}
            <Text style={[styles.title, { color: textColor }]}>
              {tr('Change Password') || 'Change Password'}
            </Text>
            <Text style={[styles.subtitle, { color: subTextColor }]}>
              {tr(
                'Protect your account by updating your password. Enter your current password and set a new one to keep your account safe.',
              ) ||
                'Protect your account by updating your password. Enter your current password and set a new one to keep your account safe.'}
            </Text>

            {/* Field 1: Current Password */}
            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: textColor }]}>
                {tr('Current Password') || 'Current Password'}
              </Text>
              <View
                style={[
                  styles.inputBox,
                  { backgroundColor: inputBg, borderColor },
                ]}>
                <TextInput
                  style={[styles.inputField, { color: textColor }]}
                  placeholder={tr('Enter your current password') || 'Enter your current password'}
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showCurrent}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="none"
                />
                <TouchableOpacity
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => setShowCurrent(prev => !prev)}
                  style={styles.eyeBtn}>
                  {renderEyeIcon(showCurrent)}
                </TouchableOpacity>
              </View>
            </View>

            {/* Field 2: New Password */}
            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: textColor }]}>
                {tr('New Password') || 'New Password'}
              </Text>
              <View
                style={[
                  styles.inputBox,
                  { backgroundColor: inputBg, borderColor },
                ]}>
                <TextInput
                  style={[styles.inputField, { color: textColor }]}
                  placeholder={tr('Enter your new password') || 'Enter your new password'}
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="none"
                />
                <TouchableOpacity
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => setShowNew(prev => !prev)}
                  style={styles.eyeBtn}>
                  {renderEyeIcon(showNew)}
                </TouchableOpacity>
              </View>
            </View>

            {/* Field 3: Confirm Password */}
            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: textColor }]}>
                {tr('Confirm Password') || 'Confirm Password'}
              </Text>
              <View
                style={[
                  styles.inputBox,
                  { backgroundColor: inputBg, borderColor },
                ]}>
                <TextInput
                  style={[styles.inputField, { color: textColor }]}
                  placeholder={tr('Enter your confirm password') || 'Enter your confirm password'}
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="none"
                />
                <TouchableOpacity
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => setShowConfirm(prev => !prev)}
                  style={styles.eyeBtn}>
                  {renderEyeIcon(showConfirm)}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Action Button matching Figma */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={[
                styles.saveBtn,
                { backgroundColor: isFormFilled ? '#F67922' : '#FDBA74' },
              ]}
              disabled={loading}
              onPress={handleSave}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {tr('Save Changes') || 'Save Changes'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
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
    marginBottom: 18,
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
    marginBottom: 24,
  },
  fieldWrap: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  inputBox: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    marginRight: 4,
  },
  eyeBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -8,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FDBA74',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
