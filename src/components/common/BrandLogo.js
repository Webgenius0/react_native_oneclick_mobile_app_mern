import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

export default function BrandLogo({
  variant = 'dark', // 'dark' (for white backgrounds) | 'light' (for orange/dark backgrounds)
  size = 'normal',
  align = 'center',
  style,
}) {
  const isLarge = size === 'large';
  const width = isLarge ? 150 : size === 'small' ? 95 : 120;
  const height = width / 2.7;

  const imageSource =
    variant === 'light'
      ? require('../../assets/img/onboarding/splash_logo.png')
      : require('../../assets/img/onboarding/header_logo.png');

  return (
    <View style={[styles.container, align === 'left' && styles.alignLeft, style]}>
      <Image
        source={imageSource}
        style={{ width, height }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  alignLeft: {
    alignItems: 'flex-start',
  },
});
