import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export default function AppHeader({
  navigation,
  onBackPress,
  title,
  showBack = true,
  rightText,
  onRightPress,
  rightComponent,
  centerComponent,
  style,
}) {
  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation && navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Left Back Button */}
      <View style={styles.leftContainer}>
        {showBack ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleBack}
            style={styles.backButton}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 18l-6-6 6-6"
                stroke="#1F2937"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Center Title or Component */}
      <View style={styles.centerContainer}>
        {centerComponent ? (
          centerComponent
        ) : title ? (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>

      {/* Right Action */}
      <View style={styles.rightContainer}>
        {rightComponent ? (
          rightComponent
        ) : rightText ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onRightPress}
            style={styles.rightButton}>
            <Text style={styles.rightText}>{rightText}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  leftContainer: {
    minWidth: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  rightContainer: {
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  rightText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F58423',
  },
});
