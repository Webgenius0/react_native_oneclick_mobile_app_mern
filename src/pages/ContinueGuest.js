import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import AppButton from '../components/common/AppButton';
import IllustrationPlaceholder from '../components/common/IllustrationPlaceholder';
import AppHeader from '../components/common/AppHeader';
import { CommonActions } from '@react-navigation/native';
import { storageGet, storageSet } from '../helpers/storage';
import { setUser } from '../helpers/auth';
import { EmContext } from '../contexts/EmContext';
import ai from '../helpers/ai';
import { getFcmToken } from '../helpers/notificationV2';
import { i18n } from '../translate/i18n';

export default function ContinueGuest({ navigation }) {
  const { setCtx } = useContext(EmContext);
  const [loading, setLoading] = useState(false);

  const handleContinueGuest = async () => {
    setLoading(true);
    try {
      const activeDil = (await storageGet('language')) || i18n.locale || 'en';

      const res = await ai.post('login', {
        kod: 'HG1000',
        sifre: '123',
        dil: activeDil,
      });

      if (res && res.data && res.data.error === false) {
        const guestUser = res.data.s;
        await setUser(guestUser);
        await storageSet('is_guest', '1');
        await storageSet('has_seen_onboarding', '1');
        if (setCtx) {
          setCtx(prev => ({
            ...prev,
            user: guestUser,
            token: guestUser.token,
          }));
        }

        try {
          const fcmToken = await getFcmToken();
          if (fcmToken) {
            await ai.post('update-language', {
              dil: activeDil,
              fcmToken,
            });
          }
        } catch (fcmErr) {
          console.log('fcm update error:', fcmErr?.message || fcmErr);
        }

        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'AuthAfter' }],
          }),
        );
      } else {
        const errorMsg = res?.data?.msg || 'Could not log in as guest.';
        Alert.alert('Guest Login', errorMsg);
      }
    } catch (e) {
      console.log('Error logging in as guest:', e);
      // Offline fallback
      const offlineUser = {
        kod: 'HG1000',
        ad: 'Misafir',
        name: 'Guest User',
        token: 'GUEST',
      };
      await setUser(offlineUser);
      await storageSet('is_guest', '1');
      await storageSet('has_seen_onboarding', '1');
      if (setCtx) {
        setCtx(prev => ({
          ...prev,
          user: offlineUser,
          token: 'GUEST',
        }));
      }
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'AuthAfter' }],
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <AppHeader navigation={navigation} showBack={true} />

      <View style={styles.illustrationWrap}>
        <IllustrationPlaceholder type="guest" />
      </View>

      <View style={styles.contentWrap}>
        <Text style={styles.title}>Continue as Guest</Text>
        <Text style={styles.subtitle}>
          Explore and shop without an account. You can create an account later to
          track orders, save wishlist and more.
        </Text>

        <AppButton
          title="Continue as Guest"
          variant="primary"
          loading={loading}
          onPress={handleContinueGuest}
          style={styles.button}
        />

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  illustrationWrap: {
    flex: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  contentWrap: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 16,
    fontFamily: 'System',
  },
  button: {
    width: '100%',
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
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F58423',
  },
});
