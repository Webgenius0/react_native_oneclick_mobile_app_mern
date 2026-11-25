import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import AppButton from '../components/common/AppButton';
import IllustrationPlaceholder from '../components/common/IllustrationPlaceholder';
import { CommonActions } from '@react-navigation/native';
import { setUser } from '../helpers/auth';
import { storageSet } from '../helpers/storage';
import { EmContext } from '../contexts/EmContext';

export default function AccountCreatedSuccess({ route, navigation }) {
  const { setCtx } = useContext(EmContext);
  const { registrationData = null, user = null } = route?.params || {};

  const handleStartShopping = async () => {
    try {
      if (user) {
        await setUser(user);
        await storageSet('has_seen_onboarding', '1');
        if (setCtx) {
          setCtx(prev => ({
            ...prev,
            user: user,
            token: user.token,
          }));
        }
      } else if (registrationData) {
        const newUser = {
          name: registrationData.fullName || 'User',
          ad: registrationData.fullName || 'User',
          kod: registrationData.phone || registrationData.email || 'USER',
          email: registrationData.email || '',
          tel: registrationData.phone || '',
          token: 'registered-token-' + Date.now(),
        };
        await setUser(newUser);
        await storageSet('has_seen_onboarding', '1');
        if (setCtx) {
          setCtx(prev => ({
            ...prev,
            user: newUser,
            token: newUser.token,
          }));
        }
      } else {
        await storageSet('has_seen_onboarding', '1');
      }
    } catch (e) {
      console.log('Error saving session on account create success:', e);
    }

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'AuthAfter' }],
      }),
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top spacer */}
      <View style={styles.topSpacer} />

      {/* Celebration Illustration */}
      <View style={styles.illustrationWrap}>
        <IllustrationPlaceholder type="success" width={280} height={220} />
      </View>

      {/* Bottom Content */}
      <View style={styles.contentWrap}>
        <Text style={styles.title}>Your Account Create Successfully!</Text>
        <Text style={styles.subtitle}>
          Welcome to 1 Click. Start exploring global brands and amazing products.
        </Text>

        <AppButton
          title="Start Shopping"
          variant="primary"
          onPress={handleStartShopping}
          style={styles.button}
        />
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
  topSpacer: {
    height: 40,
  },
  illustrationWrap: {
    flex: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  contentWrap: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
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
  },
});
