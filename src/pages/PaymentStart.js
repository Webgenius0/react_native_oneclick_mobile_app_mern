import React, { useContext, useEffect, useState } from 'react';
import {
  SafeAreaView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tr } from '../translate/i18n';
import AppHeader from '../components/common/AppHeader';
import AppCheckbox from '../components/common/AppCheckbox';
import { EmContext } from '../contexts/EmContext';
import ai from '../helpers/ai';

export default function PaymentStart({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { ctx } = useContext(EmContext);

  const quick = route.params?.quick;
  const initialTutar = route.params?.tutar || '0.00';
  const paramSiparisIds = route.params?.siparis_ids || [];
  const grupID = route.params?.grupID;
  const subtotalParam = route.params?.subtotal;
  const shippingParam = route.params?.shipping;
  const itemCountParam = route.params?.itemCount;

  const [tutar, setTutar] = useState(initialTutar);
  const [selectedMethodId, setSelectedMethodId] = useState('waafipay');
  const [isProcessing, setIsProcessing] = useState(false);

  const numTutar = parseFloat(tutar) || 0;
  // Standard shipping cost ($25.00) - Temporarily commented out
  // const shipping = parseFloat(shippingParam) || 25.0;
  const shipping = parseFloat(shippingParam) || 0.0;
  const subtotal =
    parseFloat(subtotalParam) || (numTutar > 0 ? numTutar : 0);
  const total = numTutar > 0 ? numTutar : subtotal + shipping;

  const handlePayPress = () => {
    const navigateParams = {
      tutar: total.toFixed(2),
      ana_tutar: total.toFixed(2),
      komisyon_tutar: 0,
      siparis_ids: paramSiparisIds,
      grupID: grupID,
    };

    if (selectedMethodId === 'waafipay') {
      navigation.navigate('WaafiPay', navigateParams);
    } else {
      navigation.navigate('EDahab', navigateParams);
    }
  };

  const isDark = ctx?.isDark;
  const pageBg = isDark ? '#111827' : '#F8FAFC';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#1E293B';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#F1F5F9';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: cardBg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={cardBg}
      />

      {/* Figma Header */}
      <AppHeader
        navigation={navigation}
        showBack={true}
        title={tr('Payment Method') || 'Payment Method'}
        style={{
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          backgroundColor: cardBg,
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: pageBg }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={[styles.sectionTitle, { color: textColor }]}>
          {tr('Select Payment Option') || 'Select Payment Option'}
        </Text>

        {/* Option 1: WaafiPay (First) */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setSelectedMethodId('waafipay')}
          style={[
            styles.methodCard,
            { backgroundColor: cardBg, borderColor: borderColor },
            selectedMethodId === 'waafipay' && styles.methodCardSelected,
          ]}>
          <View style={styles.cardLeft}>
            <AppCheckbox
              checked={selectedMethodId === 'waafipay'}
              onChange={() => setSelectedMethodId('waafipay')}
              style={styles.checkbox}
            />
            <View style={[styles.logoWrap, { borderColor: borderColor }]}>
              <Image
                source={require('../assets/img/waafipay.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <View style={styles.cardDetailsCol}>
              <Text style={[styles.cardTitle, { color: textColor }]}>
                WaafiPay / ZAAD Service
              </Text>
              <Text style={[styles.cardExpiry, { color: subTextColor }]}>
                Mobile Wallet & Direct Checkout
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Option 2: E-Dahab */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setSelectedMethodId('edahab')}
          style={[
            styles.methodCard,
            { backgroundColor: cardBg, borderColor: borderColor },
            selectedMethodId === 'edahab' && styles.methodCardSelected,
          ]}>
          <View style={styles.cardLeft}>
            <AppCheckbox
              checked={selectedMethodId === 'edahab'}
              onChange={() => setSelectedMethodId('edahab')}
              style={styles.checkbox}
            />
            <View style={[styles.logoWrap, { borderColor: borderColor }]}>
              <Image
                source={require('../assets/img/edahab.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <View style={styles.cardDetailsCol}>
              <Text style={[styles.cardTitle, { color: textColor }]}>
                E-Dahab Mobile Money
              </Text>
              <Text style={[styles.cardExpiry, { color: subTextColor }]}>
                Telesom Mobile Wallet
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Price Summary (Figma) */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBg, borderColor: borderColor, marginTop: 20 },
          ]}>
          <Text style={[styles.summaryHeaderTitle, { color: textColor }]}>
            {tr('Price Summary') || 'Price Summary'}
          </Text>

          <View style={styles.priceSummaryRow}>
            <Text style={[styles.priceSummaryLabel, { color: subTextColor }]}>
              {tr('Subtotal') || 'Subtotal'} ({itemCountParam || 3}{' '}
              {itemCountParam === 1 ? 'item' : 'items'})
            </Text>
            <Text style={[styles.priceSummaryValue, { color: textColor }]}>
              ${subtotal.toFixed(2)}
            </Text>
          </View>

          {/* Shipping cost row - temporarily commented out
          <View style={styles.priceSummaryRow}>
            <Text style={[styles.priceSummaryLabel, { color: subTextColor }]}>
              {tr('Shipping Cost') || 'Shipping Cost'}
            </Text>
            <Text style={[styles.priceSummaryValue, { color: textColor }]}>
              ${shipping.toFixed(2)}
            </Text>
          </View>
          */}

          <View
            style={[
              styles.totalRow,
              { borderTopColor: borderColor, borderTopWidth: 1 },
            ]}>
            <Text style={[styles.totalLabel, { color: textColor }]}>
              {tr('Total') || 'Total'}
            </Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Pay Button (Figma) */}
      <View
        style={[
          styles.bottomCtaWrap,
          {
            backgroundColor: cardBg,
            borderTopColor: borderColor,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handlePayPress}
          disabled={isProcessing}
          style={styles.payBtn}>
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.payBtnText}>
              {tr('Pay') || 'Pay'} ${total.toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.securityCaptionRow}>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
              stroke="#64748B"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={[styles.securityCaption, { color: subTextColor }]}>
            {tr('Your payment information is secure') ||
              'Your payment information is secure'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  methodCardSelected: {
    borderColor: '#F67922',
    backgroundColor: '#FFFBF7',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    marginVertical: 0,
    marginRight: 12,
  },
  logoWrap: {
    width: 60,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  logoImg: {
    width: 48,
    height: 26,
  },
  cardDetailsCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardExpiry: {
    fontSize: 12,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  priceSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  priceSummaryLabel: {
    fontSize: 14,
  },
  priceSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F67922',
  },
  bottomCtaWrap: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
  },
  payBtn: {
    backgroundColor: '#F67922',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  securityCaptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  securityCaption: {
    fontSize: 12,
    marginLeft: 6,
  },
});
