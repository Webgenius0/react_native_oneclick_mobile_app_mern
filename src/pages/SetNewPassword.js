import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,

  ScrollView,
  Modal,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../components/common/AppHeader';
import AppTextInput from '../components/common/AppTextInput';
import AppButton from '../components/common/AppButton';
import IllustrationPlaceholder from '../components/common/IllustrationPlaceholder';
import KeyboardAvoidingComponent from '../components/KeyboardAvoidingComponent';
import { CommonActions } from '@react-navigation/native';
import ai from '../helpers/ai';

export default function SetNewPassword({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { email, resetToken, otp } = route?.params || {};
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async () => {
    const newErrors = {};
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Use at least 8 characters.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm Password is required';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        reset_token: resetToken,
        email: email,
        otp: otp,
        new_password: password,
        password: password,
        confirm_password: confirmPassword,
        password_confirmation: confirmPassword,
      };

      const res = await ai.post('reset-password', payload);

      if (res?.data && res.data.error === false) {
        setSuccessModalVisible(true);
      } else {
        const errorMsg =
          res?.data?.msg || 'Could not reset password. Please try again.';
        Alert.alert('Reset Failed', errorMsg);
      }
    } catch (err) {
      const errorMsg =
        err?.response?.data?.msg ||
        err?.message ||
        'Failed to reset password. Please check your connection and try again.';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginNow = () => {
    setSuccessModalVisible(false);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      }),
    );
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <AppHeader navigation={navigation} showBack={true} />

      <KeyboardAvoidingComponent>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 24 },
          ]}
          showsVerticalScrollIndicator={false}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Set New Password</Text>
            <Text style={styles.subtitle}>
              Create a new password for your account to keep it secure.
            </Text>
          </View>

          {/* Form Fields */}
          <AppTextInput
            label="Password"
            placeholder="Enter your password"
            secureTextEntry={true}
            value={password}
            onChangeText={t => {
              setPassword(t);
              if (errors.password) {
                setErrors(prev => ({ ...prev, password: null }));
              }
            }}
            helperText="Use at least 8 characters."
            error={errors.password}
          />

          <AppTextInput
            label="Confirm Password"
            placeholder="Re-enter your password"
            secureTextEntry={true}
            value={confirmPassword}
            onChangeText={t => {
              setConfirmPassword(t);
              if (errors.confirmPassword) {
                setErrors(prev => ({ ...prev, confirmPassword: null }));
              }
            }}
            error={errors.confirmPassword}
          />

          {/* Update Password CTA */}
          <AppButton
            title="Updated Password"
            variant="primary"
            loading={loading}
            onPress={handleUpdatePassword}
            style={styles.updateBtn}
          />
        </ScrollView>
      </KeyboardAvoidingComponent>

      {/* Password Updated Pop-up Modal */}
      <Modal
        visible={successModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Lock & Shield with Sparkles */}
            <IllustrationPlaceholder
              type="password-updated"
              width={160}
              height={120}
              style={styles.modalIllustration}
            />

            <Text style={styles.modalTitle}>Password Updated!</Text>
            <Text style={styles.modalSubtitle}>
              Your password has been changed. You're all set to log in now.
            </Text>

            <AppButton
              title="Login Now"
              variant="primary"
              onPress={handleLoginNow}
              style={styles.modalBtn}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    fontFamily: 'System',
  },
  updateBtn: {
    marginTop: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  modalIllustration: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'System',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 10,
    fontFamily: 'System',
  },
  modalBtn: {
    width: '100%',
  },
});
