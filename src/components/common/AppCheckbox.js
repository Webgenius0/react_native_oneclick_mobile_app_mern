import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export default function AppCheckbox({
  checked = false,
  onChange,
  label,
  children,
  style,
  fullWidth = false,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onChange && onChange(!checked)}
      style={[styles.container, style]}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked && (
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
            <Path
              d="M20 6L9 17l-5-5"
              stroke="#FFFFFF"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )}
      </View>
      <View
        style={[
          styles.labelContainer,
          (fullWidth || Boolean(children)) && styles.labelContainerFull,
        ]}>
        {children ? (
          children
        ) : label ? (
          <Text style={styles.label}>{label}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  boxChecked: {
    backgroundColor: '#F58423',
    borderColor: '#F58423',
  },
  labelContainer: {
    justifyContent: 'center',
  },
  labelContainerFull: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: '#4B5563',
    fontFamily: 'System',
    lineHeight: 18,
  },
});
