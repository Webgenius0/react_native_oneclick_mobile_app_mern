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
import CartIcon from '../../assets/svg/cart.svg';
import Colors from '../../assets/Colors';

export default function AddToCart({
  addChart,
  loading = false,
  onOpenCart,
  cartCount = 0,
}) {
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
      <View style={styles.actionsRow}>
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
              ? tr('Adding Product...') || 'Adding Product...'
              : tr('Add Product') || 'Add Product'}
          </Text>
        </TouchableOpacity>

        {onOpenCart && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onOpenCart}
            accessibilityRole="button"
            accessibilityLabel="View Cart"
            style={[
              styles.cartIconButton,
              {
                backgroundColor: isDark ? '#374151' : '#FFE4D0',
                borderColor: isDark ? '#4B5563' : '#F67922',
              },
            ]}>
            <CartIcon
              width={24}
              height={24}
              fill={Colors.primary || '#F67922'}
            />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartCount > 99 ? '99+' : cartCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
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
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  button: {
    flex: 1,
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
  cartIconButton: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    lineHeight: 12,
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
