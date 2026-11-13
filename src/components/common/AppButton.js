import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import Colors from '../../assets/Colors';

export default function AppButton({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'outline' | 'ghost' | 'secondary'
  size = 'large', // 'normal' | 'large'
  loading = false,
  disabled = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
}) {
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';
  const isSecondary = variant === 'secondary';

  const containerStyles = [
    styles.button,
    size === 'large' ? styles.largeButton : styles.normalButton,
    isOutline && styles.outlineButton,
    isGhost && styles.ghostButton,
    isSecondary && styles.secondaryButton,
    disabled && styles.disabledButton,
    style,
  ];

  const labelStyles = [
    styles.text,
    isOutline && styles.outlineText,
    isGhost && styles.ghostText,
    isSecondary && styles.secondaryText,
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={containerStyles}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isOutline || isGhost ? Colors.primary : '#FFFFFF'}
        />
      ) : (
        <View style={styles.contentRow}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text style={labelStyles}>{title}</Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#F58423',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#F58423',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  normalButton: {
    height: 48,
    paddingHorizontal: 20,
  },
  largeButton: {
    height: 52,
    paddingHorizontal: 24,
  },
  outlineButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  ghostButton: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
    borderColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System',
    textAlign: 'center',
  },
  outlineText: {
    color: '#374151',
    fontWeight: '600',
  },
  ghostText: {
    color: '#F58423',
    fontWeight: '600',
  },
  secondaryText: {
    color: '#1F2937',
    fontWeight: '600',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
