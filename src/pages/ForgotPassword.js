import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import AppHeader from '../components/common/AppHeader';
import AppTextInput from '../components/common/AppTextInput';
import AppButton from '../components/common/AppButton';
import KeyboardAvoidingComponent from '../components/KeyboardAvoidingComponent';

export default function ForgotPassword({ navigation }) {
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = () => {
    if (!target.trim()) {
      setError('Please enter your phone number or email');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const isEmail = target.includes('@');
      navigation.navigate('VerifyOtp', {
        method: isEmail ? 'email' : 'phone',
        target: target.trim(),
        isPasswordReset: true,
      });
    }, 500);
  };

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
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              No worries! Enter your phone number or email address and we'll
              send you a verification code to reset your password.
            </Text>
          </View>

          {/* Input Field */}
          <AppTextInput
            label="Phone Number/Email Address"
            placeholder="Enter your phone number or email"
            value={target}
            onChangeText={t => {
              setTarget(t);
              if (error) {
                setError('');
              }
            }}
            error={error}
          />

          {/* Send Code Button */}
          <AppButton
            title="Send Code"
            variant="primary"
            loading={loading}
            onPress={handleSendCode}
            style={styles.sendBtn}
          />
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
  sendBtn: {
    marginTop: 20,
  },
});
