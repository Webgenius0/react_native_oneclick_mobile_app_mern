import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,

  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '../components/common/AppHeader';
import AppButton from '../components/common/AppButton';
import OtpInput from '../components/common/OtpInput';
import IllustrationPlaceholder from '../components/common/IllustrationPlaceholder';
import KeyboardAvoidingComponent from '../components/KeyboardAvoidingComponent';
import ai from '../helpers/ai';
import { setUser } from '../helpers/auth';
import { storageSet } from '../helpers/storage';
import { EmContext } from '../contexts/EmContext';

export default function VerifyOtp({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { setCtx } = useContext(EmContext);
  const {
    method = 'phone', // 'phone' | 'email'
    target = '+880159854554',
    identifier = '',
    isPasswordReset = false,
    registrationData = null,
  } = route?.params || {};

  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Timer countdown
  useEffect(() => {
    let timer = null;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [countdown]);

  const handleResend = async () => {
    if (!canResend || resending) {
      return;
    }

    const cleanIdentifier = (
      identifier ||
      (isPasswordReset
        ? target
        : method === 'phone'
        ? registrationData?.phone || target
        : registrationData?.email || target)
    ).trim();

    const isEmail = cleanIdentifier.includes('@');
    const emailVal = isEmail ? cleanIdentifier : (registrationData?.email || '').trim();
    const phoneVal = !isEmail ? cleanIdentifier : (registrationData?.phone || '').trim();

    try {
      setResending(true);
      const endpoint = isPasswordReset ? 'resend-password-otp' : 'resend-otp';
      const payload = {
        identifier: cleanIdentifier,
        method: method,
      };
      if (emailVal) {
        payload.email = emailVal;
        payload.eposta = emailVal;
      }
      if (phoneVal) {
        payload.phone = phoneVal;
        payload.tel = phoneVal;
      }

      const res = await ai.post(endpoint, payload);

      if (res?.data && res.data.error === false) {
        setCountdown(res?.data?.expires_in ? Math.min(60, res.data.expires_in) : 60);
        setCanResend(false);
        const sentDesc =
          res.data.sent_to ||
          res.data.phone_masked ||
          res.data.email_masked ||
          cleanIdentifier;
        Alert.alert(
          'Code Sent',
          res.data.msg || `A new verification code has been sent to ${sentDesc}`,
        );
      } else {
        Alert.alert(
          'Resend Failed',
          res?.data?.msg || 'Could not resend code. Please try again.',
        );
      }
    } catch (err) {
      const msg =
        err?.response?.data?.msg ||
        err?.message ||
        'Could not resend code. Please try again in a moment.';
      Alert.alert('Resend Failed', msg);
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async () => {
    if (otpCode.length < 6) {
      Alert.alert(
        'Invalid Code',
        'Please enter the complete 6-digit verification code.',
      );
      return;
    }

    setLoading(true);

    try {
      const cleanIdentifier = (
        identifier ||
        (isPasswordReset
          ? target
          : method === 'phone'
          ? registrationData?.phone || target
          : registrationData?.email || target)
      ).trim();

      const isEmail = cleanIdentifier.includes('@');
      const emailVal = isEmail ? cleanIdentifier : (registrationData?.email || '').trim();
      const phoneVal = !isEmail ? cleanIdentifier : (registrationData?.phone || '').trim();

      if (isPasswordReset) {
        const payload = {
          identifier: cleanIdentifier,
          otp: otpCode.trim(),
          code: otpCode.trim(),
        };
        if (emailVal) {
          payload.email = emailVal;
          payload.eposta = emailVal;
        }
        if (phoneVal) {
          payload.phone = phoneVal;
          payload.tel = phoneVal;
        }

        const res = await ai.post('verify-password-otp', payload);

        if (res?.data && res.data.error === false && (res.data.verified || res.data.reset_token)) {
          const resetToken = res.data.reset_token;
          navigation.navigate('SetNewPassword', {
            email: emailVal || cleanIdentifier,
            resetToken: resetToken,
            otp: otpCode.trim(),
          });
        } else {
          const errorMsg =
            res?.data?.msg || 'Invalid or expired verification code.';
          Alert.alert('Verification Failed', errorMsg);
        }
      } else {
        const payload = {
          identifier: cleanIdentifier,
          otp: otpCode.trim(),
          code: otpCode.trim(),
        };
        if (emailVal) {
          payload.email = emailVal;
          payload.eposta = emailVal;
        }
        if (phoneVal) {
          payload.phone = phoneVal;
          payload.tel = phoneVal;
        }

        const res = await ai.post('verify-otp', payload);

        if (res?.data && res.data.error === false) {
          const userObj = res.data.s;
          if (userObj) {
            await setUser(userObj);
            await storageSet('has_seen_onboarding', '1');
            if (setCtx) {
              setCtx(prev => ({
                ...prev,
                user: userObj,
                token: userObj.token,
              }));
            }
          }

          navigation.navigate('AccountCreatedSuccess', {
            registrationData,
            user: userObj,
          });
        } else {
          const errorMsg =
            res?.data?.msg || 'Invalid verification code. Please try again.';
          Alert.alert('Verification Failed', errorMsg);
        }
      }
    } catch (err) {
      const errorMsg =
        err?.response?.data?.msg ||
        err?.message ||
        'Verification failed. Please check your connection and try again.';
      Alert.alert('Verification Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const formattedTimer = `00:${countdown < 10 ? '0' : ''}${countdown}`;

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
          {/* Header Title & Subtitle */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>
              {isPasswordReset
                ? method === 'phone'
                  ? 'Verify Your Phone'
                  : 'Verify Your Email'
                : 'Verify Your Account'}
            </Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit code to{' '}
              <Text style={styles.targetHighlight}>{target}</Text>
              {method === 'phone' ? ' via SMS' : ''}. Enter the code below to verify your account.
            </Text>
          </View>

          {/* Illustration */}
          <View style={styles.illustrationWrap}>
            <IllustrationPlaceholder
              type={method === 'phone' ? 'phone-verify' : 'email-verify'}
              width={260}
              height={180}
            />
          </View>

          {/* 6-Digit OTP Boxes */}
          <OtpInput
            length={6}
            value={otpCode}
            onChangeCode={setOtpCode}
          />

          {/* Resend Row */}
          <View style={styles.resendRow}>
            <Text style={styles.resendQuery}>Didn't receive code? </Text>
            {canResend ? (
              <TouchableOpacity activeOpacity={0.7} onPress={handleResend}>
                <Text style={styles.resendActive}>Resend Now</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendCountdown}>Resend ({formattedTimer})</Text>
            )}
          </View>

          {/* Verify Button */}
          <AppButton
            title="Verify"
            variant="primary"
            loading={loading}
            onPress={handleVerify}
            style={styles.verifyBtn}
          />

          {/* Change Verification Method Link */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('ChooseVerificationMethod', {
                  phone: target,
                  email: target,
                  isPasswordReset,
                  registrationData,
                });
              }
            }}
            style={styles.changeMethodBtn}>
            <Text style={styles.changeMethodText}>
              Change Verification Method
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingComponent>
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
    paddingTop: 10,
    paddingBottom: 40,
    alignItems: 'center',
  },
  headerSection: {
    width: '100%',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
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
  targetHighlight: {
    color: '#F58423',
    fontWeight: '700',
  },
  illustrationWrap: {
    marginVertical: 12,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  resendQuery: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'System',
  },
  resendCountdown: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F58423',
    fontFamily: 'System',
  },
  resendActive: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F58423',
    textDecorationLine: 'underline',
  },
  verifyBtn: {
    width: '100%',
    marginTop: 8,
    marginBottom: 18,
  },
  changeMethodBtn: {
    paddingVertical: 8,
  },
  changeMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F58423',
    textAlign: 'center',
    fontFamily: 'System',
  },
});
