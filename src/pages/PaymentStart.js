import React, { useContext, useEffect, useState } from 'react';
import {
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
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { tr } from '../translate/i18n';
import AppHeader from '../components/common/AppHeader';
import AppCheckbox from '../components/common/AppCheckbox';
import { EmContext } from '../contexts/EmContext';
import ai from '../helpers/ai';
import { round } from '../helpers/common';

const DEFAULT_PAYMENT_METHODS = [
  {
    id: 'waafipay',
    ad: 'WaafiPay',
    name: 'WaafiPay / ZAAD Service',
    target: 'waafipay',
    komisyonYuzde: 1,
    komisyonFixed: 0,
  },
  {
    id: 'edahab',
    ad: 'E-Dahab',
    name: 'E-Dahab Mobile Money',
    target: 'edahab',
    komisyonYuzde: 0,
    komisyonFixed: 0,
  },
];

export default function PaymentStart({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { ctx } = useContext(EmContext);

  const quick = route.params?.quick;
  const initialTutar = route.params?.tutar || '0.00';
  const grupID = route.params?.grupID;
  const subtotalParam = route.params?.subtotal;
  const shippingParam = route.params?.shipping;
  const itemCountParam = route.params?.itemCount;

  const extractIds = raw => {
    if (!raw && raw !== 0) return [];
    if (Array.isArray(raw)) return raw.filter(id => id !== null && id !== undefined && id !== '');
    if (typeof raw === 'string') {
      return raw.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [raw];
  };

  const incomingIds = [
    ...extractIds(route.params?.siparis_ids),
    ...extractIds(route.params?.siparis_id),
    ...extractIds(route.params?.order_ids),
    ...extractIds(route.params?.order_id),
  ];
  const uniqueIncomingIds = Array.from(new Set(incomingIds.map(String)));

  const [siparisIds, setSiparisIds] = useState(uniqueIncomingIds);
  const [tutar, setTutar] = useState(initialTutar);
  const [methods, setMethods] = useState(DEFAULT_PAYMENT_METHODS);
  const [selectedMethodId, setSelectedMethodId] = useState('waafipay');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function fetchPaymentMethods() {
      try {
        const res = await ai.get('payment-methods');
        if (res?.data?.error === false && Array.isArray(res?.data?.ss) && res.data.ss.length > 0) {
          setMethods(res.data.ss);
        }
      } catch (err) {
        console.log('PaymentStart fetch payment-methods err:', err);
      }
    }
    fetchPaymentMethods();
  }, []);

  useEffect(() => {
    async function syncOrdersAndAmount() {
      if (grupID || route.params?.siparis_id || uniqueIncomingIds.length > 0) {
        try {
          const res = await ai.post('orders-unpaid', {
            siparis_id: route.params?.siparis_id || (uniqueIncomingIds.length === 1 ? uniqueIncomingIds[0] : null),
            grupID: grupID || null,
          });
          if (res?.data?.error === false && Array.isArray(res?.data?.ss)) {
            const unpaidOrders = res.data.ss;
            let targetOrderIds = [];

            if (uniqueIncomingIds.length > 0) {
              targetOrderIds = uniqueIncomingIds;
            } else if (grupID) {
              targetOrderIds = unpaidOrders
                .filter(item => String(item.grupID) === String(grupID))
                .map(item => String(item.id));
            } else {
              targetOrderIds = unpaidOrders.map(item => String(item.id));
            }

            if (targetOrderIds.length > 0) {
              setSiparisIds(targetOrderIds);
            }

            let calculatedSum = 0;
            unpaidOrders.forEach(item => {
              if (targetOrderIds.includes(String(item.id))) {
                calculatedSum += parseFloat(
                  item.tutar_usd ??
                    item.tutar ??
                    item.price_usd ??
                    item.fiyat_usd ??
                    0,
                ) || 0;
              }
            });

            if (res.data.grup && res.data.grup.nakliye_usd > 0) {
              calculatedSum += parseFloat(res.data.grup.nakliye_usd);
            }

            if (calculatedSum > 0) {
              console.log('PaymentStart synchronized base tutar with server orders-unpaid:', calculatedSum.toFixed(2));
              setTutar(calculatedSum.toFixed(2));
            }
          }
        } catch (e) {
          console.log('PaymentStart fetch unpaid orders err:', e);
        }
      }
    }
    syncOrdersAndAmount();
  }, [grupID, route.params?.siparis_id, uniqueIncomingIds.join(',')]);

  const selectedMethodObj =
    methods.find(
      m =>
        (m?.ad || m?.target || m?.name || '')
          .toLowerCase()
          .includes(selectedMethodId.toLowerCase()),
    ) ||
    DEFAULT_PAYMENT_METHODS.find(
      m => m.id === selectedMethodId || m.target === selectedMethodId,
    );

  const numTutar = parseFloat(tutar) || 0;
  // Standard shipping cost ($25.00) - Temporarily commented out
  // const shipping = parseFloat(shippingParam) || 25.0;
  const shipping = parseFloat(shippingParam) || 0.0;
  const subtotal =
    numTutar > 0
      ? (shipping > 0 ? numTutar - shipping : numTutar)
      : parseFloat(subtotalParam) || 0;
  const baseTotal = numTutar > 0 ? numTutar : subtotal + shipping;

  let komisyonTutar = 0;
  let komisyonYuzde = selectedMethodId === 'waafipay' ? 1 : 0;
  let komisyonFixed = 0;

  if (selectedMethodObj) {
    komisyonYuzde =
      selectedMethodObj.komisyonYuzde !== undefined &&
      selectedMethodObj.komisyonYuzde !== null
        ? parseFloat(selectedMethodObj.komisyonYuzde) || 0
        : (selectedMethodId === 'waafipay' ? 1 : 0);
    komisyonFixed = parseFloat(selectedMethodObj.komisyonFixed) || 0;
    if (komisyonYuzde > 0) {
      komisyonTutar = round(baseTotal * (komisyonYuzde / 100));
    } else if (komisyonFixed > 0) {
      komisyonTutar = komisyonFixed;
    }
  } else if (komisyonYuzde > 0) {
    komisyonTutar = round(baseTotal * (komisyonYuzde / 100));
  }

  const finalPayTotal = round(baseTotal + komisyonTutar);

  const handlePayPress = async () => {
    let activeIds = siparisIds.length > 0 ? siparisIds : uniqueIncomingIds;
    let freshBaseAmount = baseTotal;

    // Refresh orders-unpaid right before paying to ensure 100% price synchronization
    if (grupID || route.params?.siparis_id || activeIds.length > 0) {
      setIsProcessing(true);
      try {
        const res = await ai.post('orders-unpaid', {
          siparis_id: route.params?.siparis_id || (activeIds.length === 1 ? activeIds[0] : null),
          grupID: grupID || null,
        });
        if (res?.data?.error === false && Array.isArray(res?.data?.ss)) {
          const unpaidOrders = res.data.ss;
          let targetOrderIds = [];
          if (uniqueIncomingIds.length > 0) {
            targetOrderIds = uniqueIncomingIds;
          } else if (grupID) {
            targetOrderIds = unpaidOrders
              .filter(item => String(item.grupID) === String(grupID))
              .map(item => String(item.id));
          } else {
            targetOrderIds = unpaidOrders.map(item => String(item.id));
          }

          if (targetOrderIds.length > 0) {
            activeIds = targetOrderIds;
            setSiparisIds(targetOrderIds);
          }

          let calculatedSum = 0;
          unpaidOrders.forEach(item => {
            if (activeIds.includes(String(item.id))) {
              calculatedSum += parseFloat(item.tutar ?? item.tutar_usd ?? 0) || 0;
            }
          });
          if (res.data.grup && res.data.grup.nakliye_usd > 0) {
            calculatedSum += parseFloat(res.data.grup.nakliye_usd);
          }
          if (calculatedSum > 0) {
            freshBaseAmount = calculatedSum;
            setTutar(calculatedSum.toFixed(2));
          }
        }
      } catch (err) {
        console.log('Error resolving unpaid orders on Pay press:', err);
      } finally {
        setIsProcessing(false);
      }
    }

    // Recompute commission on latest freshBaseAmount
    let freshKomisyonTutar = 0;
    if (komisyonYuzde > 0) {
      freshKomisyonTutar = round(freshBaseAmount * (komisyonYuzde / 100));
    } else if (komisyonFixed > 0) {
      freshKomisyonTutar = komisyonFixed;
    }
    const freshFinalTotal = round(freshBaseAmount + freshKomisyonTutar);

    const normalizedStr = activeIds.join(',');
    const primaryId = activeIds[0] || '';

    const navigateParams = {
      tutar: freshFinalTotal.toFixed(2),
      ana_tutar: freshBaseAmount.toFixed(2),
      komisyon_tutar: freshKomisyonTutar,
      komisyonYuzde: komisyonYuzde,
      komisyonFixed: komisyonFixed,
      siparis_ids: normalizedStr,
      order_ids: normalizedStr,
      siparis_id: primaryId,
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
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: cardBg }]}
      edges={['top', 'left', 'right']}>
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
              {tr('Subtotal') || 'Subtotal'} (
              {itemCountParam !== undefined && itemCountParam !== null && Number(itemCountParam) > 0
                ? Number(itemCountParam)
                : (route.params?.items?.length || 1)}{' '}
              {(itemCountParam !== undefined && itemCountParam !== null && Number(itemCountParam) > 0
                ? Number(itemCountParam)
                : (route.params?.items?.length || 1)) === 1
                ? 'item'
                : 'items'}
              )
            </Text>
            <Text style={[styles.priceSummaryValue, { color: textColor }]}>
              ${subtotal.toFixed(2)}
            </Text>
          </View>

          {komisyonTutar > 0 ? (
            <View style={styles.priceSummaryRow}>
              <Text style={[styles.priceSummaryLabel, { color: subTextColor }]}>
                {tr('Commission fee') || 'Commission fee'}{' '}
                {komisyonYuzde > 0 ? `(${komisyonYuzde}%)` : ''}
              </Text>
              <Text style={[styles.priceSummaryValue, { color: textColor }]}>
                ${komisyonTutar.toFixed(2)}
              </Text>
            </View>
          ) : null}

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
            <Text style={styles.totalValue}>${finalPayTotal.toFixed(2)}</Text>
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
              {tr('Pay') || 'Pay'} ${finalPayTotal.toFixed(2)}
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
