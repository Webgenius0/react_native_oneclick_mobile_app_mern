import React, { useContext } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmContext } from '../../contexts/EmContext';
import { tr } from '../../translate/i18n';

export default function AddToCart({ addChart, loading = false }) {
  const insets = useSafeAreaInsets();
  const { ctx } = useContext(EmContext);
  const isDark = ctx?.isDark;

  return (
    <View
      style={[
        styles.bottomBar,
        {
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderTopColor: isDark ? '#374151' : '#F1F5F9',
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={addChart}
        disabled={loading}
        style={[styles.button, loading && styles.buttonLoading]}>
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" style={styles.icon} />
        ) : (
          <Svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            style={styles.icon}>
            <Path
              d="M12 5v14M5 12h14"
              stroke="#FFFFFF"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )}
        <Text style={styles.text}>
          {loading
            ? tr('Sepete Ekleniyor...') || 'Adding Product...'
            : tr('Add Product') || 'Add Product'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  button: {
    width: '100%',
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F67922',
    borderRadius: 14,
    shadowColor: '#F67922',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonLoading: {
    opacity: 0.85,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
