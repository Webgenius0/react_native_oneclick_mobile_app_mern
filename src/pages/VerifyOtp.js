import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import AppHeader from '../components/common/AppHeader';
import AppButton from '../components/common/AppButton';
import OtpInput from '../components/common/OtpInput';
import IllustrationPlaceholder from '../components/common/IllustrationPlaceholder';
import KeyboardAvoidingComponent from '../components/KeyboardAvoidingComponent';

export default function VerifyOtp({ route, navigation }) {
  const {
    method = 'phone', // 'phone' | 'email'
    target = '+880159854554',
    isPasswordReset = false,
    registrationData = null,
  } = route?.params || {};

  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const handleResend = () => {
    if (!canResend) {
      return;
    }
    setCountdown(45);
    setCanResend(false);
    Alert.alert('Code Sent', `A new verification code has been sent to ${target}`);
  };

  const handleVerify = () => {
    if (otpCode.length < 5) {
      Alert.alert('Invalid Code', 'Please enter the complete 5-digit verification code.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (isPasswordReset) {
        navigation.navigate('SetNewPassword');
      } else {
        navigation.navigate('AccountCreatedSuccess', {
          registrationData,
        });
      }
    }, 600);
  };

  const formattedTimer = `00:${countdown < 10 ? '0' : ''}${countdown}`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <AppHeader navigation={navigation} showBack={true} />

      <KeyboardAvoidingComponent>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Header Title & Subtitle */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>
              {isPasswordReset ? 'Verify Your Email' : 'Verify Your Account'}
            </Text>
            <Text style={styles.subtitle}>
              We've sent a 5-digit code to{' '}
              <Text style={styles.targetHighlight}>{target}</Text>. Enter the
              code below to verify your account.
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

          {/* 5-Digit OTP Boxes */}
          <OtpInput
            length={5}
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
