import React, { useContext, useState } from 'react';
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
import AppTextInput from '../components/common/AppTextInput';
import AppButton from '../components/common/AppButton';
import AppCheckbox from '../components/common/AppCheckbox';
import KeyboardAvoidingComponent from '../components/KeyboardAvoidingComponent';
import { EmContext } from '../contexts/EmContext';
import { setUser } from '../helpers/auth';
import ai from '../helpers/ai';
import { storageDelete, storageGet, storageSet } from '../helpers/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { i18n, tr } from '../translate/i18n';
import { CommonActions } from '@react-navigation/native';
import { getFcmToken } from '../helpers/notification';

export default function Login({ navigation }) {
  const { setCtx, setCtxDil } = useContext(EmContext);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleLogin = async () => {
    const newErrors = {};
    if (!identifier.trim()) {
      newErrors.identifier = 'Please enter your phone number or email';
    }
    if (!password.trim()) {
      newErrors.password = 'Please enter your password';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const cleanKod = identifier.trim();
      const cleanSifre = password.trim();

      const savedLang = await storageGet('language');
      const activeDil = savedLang && ['en', 'tr', 'som'].includes(savedLang)
        ? savedLang
        : (i18n.locale || 'en');
      i18n.defaultLocale = 'en';
      i18n.locale = activeDil;
      if (setCtxDil) {
        setCtxDil(activeDil);
      }

      const res = await ai.post('login', {
        kod: cleanKod,
        sifre: cleanSifre,
        dil: activeDil,
      });

      if (res?.data && res.data.error === false) {
        try {
          await storageDelete('is_guest');
          await AsyncStorage.removeItem('is_guest');
        } catch (e) {}
        await setUser(res.data.s);
        setCtx(prev => ({
          ...prev,
          user: res.data.s,
          token: res.data.s.token,
        }));

        try {
          const fcmToken = await getFcmToken();
          await ai.post('update-language', {
            dil: activeDil,
            fcmToken,
          });
        } catch (fcmErr) {
          console.log('fcm error:', fcmErr?.message);
        }

        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'AuthAfter' }],
          }),
        );
      } else {
        const rawMsg = res?.data?.msg || 'Hatalı Müşteri Kodu, Eposta veya Parola';
        let errorMsg = tr(rawMsg);
        if (activeDil === 'en') {
          if (
            errorMsg === rawMsg ||
            rawMsg.includes('Hatalı') ||
            rawMsg.includes('Parola') ||
            rawMsg.includes('Müşteri')
          ) {
            errorMsg = 'Wrong Customer Code, E-mail or Password';
          }
        }
        const title =
          activeDil === 'tr'
            ? 'Giriş Başarısız'
            : activeDil === 'som'
            ? 'Galitaanku Wuu Fashilmay'
            : 'Login Failed';
        Alert.alert(title, errorMsg);
      }
    } catch (err) {
      console.log('Login error:', err);
      // For testing / offline mock fallback if API is unreachable
      Alert.alert(
        'Login Information',
        'Unable to connect to server. Logging in with offline session for preview.',
        [
          {
            text: 'OK',
            onPress: async () => {
              try {
                await storageDelete('is_guest');
                await AsyncStorage.removeItem('is_guest');
              } catch (e) {}
              const mockUser = {
                name: 'Guest User',
                token: 'mock-token-' + Date.now(),
                kod: identifier,
              };
              await setUser(mockUser);
              setCtx(prev => ({ ...prev, user: mockUser, token: mockUser.token }));
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'AuthAfter' }],
                }),
              );
            },
          },
        ],
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <AppHeader
        navigation={navigation}
        showBack={true}
        onBackPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('AuthWelcome');
          }
        }}
      />

      <KeyboardAvoidingComponent>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Header Section */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Log in to your account to continue shopping
            </Text>
          </View>

          {/* Form Inputs */}
          <AppTextInput
            label="Phone Number/Email Address"
            placeholder="Enter your phone number or email"
            value={identifier}
            onChangeText={t => {
              setIdentifier(t);
              if (errors.identifier) {
                setErrors(prev => ({ ...prev, identifier: null }));
              }
            }}
            error={errors.identifier}
          />

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
            error={errors.password}
          />

          {/* Remember me & Forgot Password Row */}
          <View style={styles.optionsRow}>
            <AppCheckbox
              checked={rememberMe}
              onChange={setRememberMe}
              label="Remember me"
              style={styles.checkbox}
            />

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotBtn}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Login CTA */}
          <AppButton
            title="Log In"
            variant="primary"
            loading={loading}
            onPress={handleLogin}
            style={styles.loginBtn}
          />

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Register')}>
              <Text style={styles.orangeLinkBold}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* Continue as Guest option */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ContinueGuest')}
            style={styles.guestLinkWrap}>
            <Text style={styles.guestLinkText}>Continue as Guest</Text>
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'System',
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
    width: '100%',
  },
  checkbox: {
    marginVertical: 0,
    flexShrink: 1,
  },
  forgotBtn: {
    paddingVertical: 4,
    paddingLeft: 8,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F58423',
    fontFamily: 'System',
    textAlign: 'right',
  },
  loginBtn: {
    marginTop: 20,
    marginBottom: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  orangeLinkBold: {
    color: '#F58423',
    fontWeight: '700',
    fontSize: 14,
  },
  guestLinkWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 8,
  },
  guestLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
});
