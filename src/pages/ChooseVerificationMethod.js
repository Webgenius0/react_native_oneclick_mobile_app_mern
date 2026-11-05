import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,

  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../components/common/AppHeader';
import AppButton from '../components/common/AppButton';
import Svg, { Path, Rect } from 'react-native-svg';
import ai from '../helpers/ai';

export default function ChooseVerificationMethod({ route, navigation }) {
  const {
    phone = '+880159854554',
    email = 'md@gmail.com',
    registrationData = null,
    isPasswordReset = false,
  } = route?.params || {};

  const [selectedMethod, setSelectedMethod] = useState('phone'); // 'phone' | 'email'
  const [loading, setLoading] = useState(false);

  const handleSendCode = () => {
    if (isPasswordReset) {
      const isPhone = selectedMethod === 'phone';
      const cleanTarget = (isPhone ? (phone || email) : (email || phone || '')).trim();
      ai.post('forget-password', {
        identifier: cleanTarget,
        email: cleanTarget,
        phone: cleanTarget,
        method: selectedMethod,
      }).catch(err => {
        console.log('Forget-password background dispatch note:', err?.message || err);
      });
      navigation.navigate('VerifyOtp', {
        method: selectedMethod,
        target: cleanTarget,
        identifier: cleanTarget,
        registrationData,
        isPasswordReset: true,
      });
      return;
    }

    // Registration flow
    if (!registrationData) {
      Alert.alert('Error', 'Registration data is missing. Please fill the form again.');
      navigation.navigate('Register');
      return;
    }

    const targetPhone = (registrationData.phone || phone || '').trim();
    const targetEmail = (registrationData.email || email || '').trim();
    const activeTarget = selectedMethod === 'phone' ? targetPhone : targetEmail;

    const payload = {
      terms_accepted: true,
      terms: 1,
      name: registrationData.fullName,
      ad: registrationData.fullName,
      email: targetEmail,
      eposta: targetEmail,
      phone: targetPhone,
      tel: targetPhone,
      password: registrationData.password,
      sifre: registrationData.password,
      password_confirmation: registrationData.confirmPassword,
      confirm_password: registrationData.confirmPassword,
      city_id: registrationData.cityId,
      city: registrationData.cityId,
      ilID: registrationData.cityId,
      method: selectedMethod,
      verification_method: selectedMethod,
    };

    // Dispatch register API request with method: "phone" or "email"
    ai.post('register', payload).then(res => {
      console.log('Register dispatched successfully:', res?.data);
    }).catch(err => {
      console.log('Register background dispatch note:', err?.message || err);
    });

    // Seamlessly navigate to VerifyOtp screen
    navigation.navigate('VerifyOtp', {
      method: selectedMethod,
      target: activeTarget,
      identifier: activeTarget,
      registrationData,
      isPasswordReset: false,
    });
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <AppHeader navigation={navigation} showBack={true} />

      <View style={styles.contentWrap}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Choose Verification Method</Text>
          <Text style={styles.subtitle}>
            How would you like to receive the verification code? Select your
            preferred option below to continue.
          </Text>
        </View>

        {/* Options List */}
        <View style={styles.optionsWrap}>
          {/* Option 1: Phone */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setSelectedMethod('phone')}
            style={[
              styles.optionCard,
              selectedMethod === 'phone' && styles.optionCardSelected,
            ]}>
            <View style={[styles.iconWrap, styles.phoneIconWrap]}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Rect
                  x="5"
                  y="2"
                  width="14"
                  height="20"
                  rx="3"
                  stroke="#F58423"
                  strokeWidth={2}
                />
                <Path
                  d="M12 18h.01"
                  stroke="#F58423"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </Svg>
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Verify with Phone Number</Text>
              <Text style={styles.optionSubtitle}>
                We'll send a verification code to {phone || 'your phone number'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Option 2: Email */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setSelectedMethod('email')}
            style={[
              styles.optionCard,
              selectedMethod === 'email' && styles.optionCardSelected,
            ]}>
            <View style={[styles.iconWrap, styles.emailIconWrap]}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Rect
                  x="3"
                  y="4"
                  width="18"
                  height="16"
                  rx="3"
                  stroke="#3B82F6"
                  strokeWidth={2}
                />
                <Path
                  d="M3 7l9 6 9-6"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Verify with Email</Text>
              <Text style={styles.optionSubtitle}>
                We'll send a verification code to {email || 'your email address'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Send Code Button */}
        <View style={styles.bottomArea}>
          <AppButton
            title="Send Code"
            variant="primary"
            loading={loading}
            onPress={handleSendCode}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 32,
  },
  headerTextWrap: {
    paddingTop: 12,
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
  optionsWrap: {
    marginVertical: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  optionCardSelected: {
    borderColor: '#F58423',
    backgroundColor: '#FFFBF7',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  phoneIconWrap: {
    backgroundColor: '#FFF7ED',
  },
  emailIconWrap: {
    backgroundColor: '#EFF6FF',
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    fontFamily: 'System',
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    fontFamily: 'System',
  },
  bottomArea: {
    width: '100%',
  },
});
