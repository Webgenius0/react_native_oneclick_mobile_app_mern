import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import BrandLogo from '../components/common/BrandLogo';
import AppButton from '../components/common/AppButton';
import IllustrationPlaceholder from '../components/common/IllustrationPlaceholder';

export default function AuthWelcome({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Logo */}
      <View style={styles.logoWrap}>
        <BrandLogo size="normal" />
      </View>

      {/* Illustration */}
      <View style={styles.illustrationWrap}>
        <IllustrationPlaceholder type="welcome" />
      </View>

      {/* Content */}
      <View style={styles.contentWrap}>
        <Text style={styles.title}>Welcome to 1 Click</Text>
        <Text style={styles.subtitle}>
          Create an account for a better shopping experience, or continue as a guest.
        </Text>

        {/* Buttons */}
        <View style={styles.buttonGroup}>
          <AppButton
            title="Create Account"
            variant="primary"
            onPress={() => navigation.navigate('Register')}
            style={styles.primaryBtn}
          />
          <AppButton
            title="Continue as Guest"
            variant="outline"
            onPress={() => navigation.navigate('ContinueGuest')}
            style={styles.guestBtn}
          />
        </View>

        {/* Footer */}
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
  logoWrap: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 14 : 16,
    alignItems: 'center',
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
    marginBottom: 8,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 12,
    fontFamily: 'System',
  },
  buttonGroup: {
    width: '100%',
    marginBottom: 20,
  },
  primaryBtn: {
    marginBottom: 12,
  },
  guestBtn: {
    backgroundColor: '#FFFFFF',
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
