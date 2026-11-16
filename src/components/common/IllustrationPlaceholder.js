import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FIGMA_IMAGE_ASSETS = {
  stores: require('../../assets/img/onboarding/onboarding_1_stores.png'),
  cart: require('../../assets/img/onboarding/onboarding_2_cart.png'),
  delivery: require('../../assets/img/onboarding/onboarding_3_delivery.png'),
  welcome: require('../../assets/img/onboarding/auth_welcome.png'),
  guest: require('../../assets/img/onboarding/continue_guest.png'),
  'phone-verify': require('../../assets/img/onboarding/verify_phone.png'),
  'email-verify': require('../../assets/img/onboarding/verify_email.png'),
  success: require('../../assets/img/onboarding/account_success.png'),
  'password-updated': require('../../assets/img/onboarding/password_updated.png'),
};

export default function IllustrationPlaceholder({
  type = 'stores',
  imageSource,
  width = Math.min(SCREEN_WIDTH * 0.88, 350),
  height = Math.min(SCREEN_WIDTH * 0.88 * 1.02, 350),
  style,
}) {
  const source = imageSource || FIGMA_IMAGE_ASSETS[type];

  if (!source) {
    return null;
  }

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Image
        source={source}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
