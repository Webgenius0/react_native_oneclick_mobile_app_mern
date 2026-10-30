import React, { useContext, useEffect, useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../components/common/AppHeader';
import { tr } from '../translate/i18n';
import { EmContext } from '../contexts/EmContext';
import { getUser } from '../helpers/auth';
import ai from '../helpers/ai';
import { cleanProductTitle, getStoreName } from '../helpers/storeHelper';
import {
  parsePrice,
  calculateConvertedPrice,
  getReceivedCurrencyInfo,
} from '../helpers/currencyHelper';
import { useExchangeRateStore } from '../store/useExchangeRateStore';
import { useSheinPriceStore } from '../store/useSheinPriceStore';
import { useCartStore } from '../store/useCartStore';

const CITIES = ['Borama', 'Hargeisa', 'Mogadishu', 'Berbera', 'Garowe', 'Kismayo', 'Bossaso'];

export default function ReviewOrder({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { ctx } = useContext(EmContext);
  const { removeItem } = useCartStore();

  const items = route.params?.items || [];
  const initialTotalUsd = route.params?.totalUsdPrice || 0;
  const initialTotalPrice = route.params?.totalPrice || 0;
  const primaryCurrency = route.params?.primaryCurrency || 'USD';

  const [selectedCity, setSelectedCity] = useState('Borama');
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { rates, inverseRates } = useExchangeRateStore();
  const sheinPercent = useSheinPriceStore(state => state.percent) ?? 0;
  const safePercent = Number(sheinPercent) > 0 ? Number(sheinPercent) : 0;

  useEffect(() => {
    async function loadUserCity() {
      try {
        const user = await getUser();
        if (user && (user.sehir || user.city)) {
          setSelectedCity(user.sehir || user.city);
        }
      } catch (e) {
        console.log('Error loading user city:', e);
      }
    }
    loadUserCity();
  }, []);

  const totalItemCount = items.reduce(
    (acc, it) => acc + (Number(it?.count) > 0 ? Number(it.count) : 1),
    0,
  );

  const subtotalUsd =
    items.length > 0
      ? items.reduce((sum, item) => {
          const basePrice = parsePrice(item?.price) || 0;
          const isShein = Boolean(
            (item?.store && String(item.store).toLowerCase().includes('shein')) ||
              (item?.url && String(item.url).toLowerCase().includes('shein.com')) ||
              (item?.marketplace &&
                String(item.marketplace).toLowerCase().includes('shein')) ||
              String(getStoreName(item?.url, item?.store || '')).toLowerCase() ===
                'shein',
          );
          const percentAmount =
            isShein && safePercent > 0 ? basePrice * (safePercent / 100) : 0;
          const finalPrice = basePrice + percentAmount;
          const count = Number(item?.count) > 0 ? Number(item.count) : 1;

          const { code: itemCurrency, isUsd } = getReceivedCurrencyInfo(item);
          const usd = isUsd
            ? finalPrice
            : calculateConvertedPrice(finalPrice, itemCurrency, rates, inverseRates);
          const effectiveUsd = usd !== null ? usd : finalPrice;
          return sum + effectiveUsd * count;
        }, 0)
      : initialTotalUsd || 0;

  // Standard shipping cost from Figma ($25.00) - Temporarily commented out
  // const shippingCost = 25.0;
  const shippingCost = 0.0;
  const totalAmount = subtotalUsd + shippingCost;

  const handleContinueToPayment = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const user = await getUser();
      if (!user || user.kod === 'GUEST') {
        Alert.alert(
          tr('Sign In') || 'Sign In',
          tr('Please sign in to place your order.') ||
            'Please sign in to place your order.',
        );
        setIsSubmitting(false);
        return;
      }

      let postData = new FormData();
      postData.append('sehir', selectedCity);

      var i = 0;
      items.forEach(item => {
        const storeName = item.store || getStoreName(item.url, '') || '';
        const parsedPriceVal = parsePrice(item.price);
        const isShein = Boolean(
          (item?.store && String(item.store).toLowerCase().includes('shein')) ||
            (item?.url && String(item.url).toLowerCase().includes('shein.com')) ||
            (item?.marketplace &&
              String(item.marketplace).toLowerCase().includes('shein')) ||
            String(getStoreName(item?.url, item?.store || '')).toLowerCase() ===
              'shein',
        );
        const percentAmount =
          isShein && safePercent > 0 && parsedPriceVal !== null
            ? parsedPriceVal * (safePercent / 100)
            : 0;
        const finalPriceVal =
          parsedPriceVal !== null
            ? parseFloat((parsedPriceVal + percentAmount).toFixed(2))
            : null;

        const { code: normalizedCurr, isUsd } = getReceivedCurrencyInfo(item);
        const convertedPriceVal =
          finalPriceVal !== null
            ? isUsd
              ? finalPriceVal
              : calculateConvertedPrice(
                  finalPriceVal,
                  normalizedCurr,
                  rates,
                  inverseRates,
                )
            : null;

        postData.append(
          'cart[' + i + '][ad]',
          cleanProductTitle(item.title, item.url),
        );
        postData.append('cart[' + i + '][link]', item.url);
        postData.append('cart[' + i + '][sayi]', item.count || 1);
        postData.append('cart[' + i + '][size]', item.size || '');
        postData.append('cart[' + i + '][color]', item.color || '');
        postData.append('cart[' + i + '][store]', storeName);

        if (finalPriceVal !== null) {
          postData.append('cart[' + i + '][price]', finalPriceVal);
          postData.append('cart[' + i + '][fiyat]', finalPriceVal);
        }
        postData.append('cart[' + i + '][currency]', normalizedCurr);

        if (convertedPriceVal !== null) {
          postData.append(
            'cart[' + i + '][converted_price]',
            convertedPriceVal,
          );
          postData.append('cart[' + i + '][price_usd]', convertedPriceVal);
        }

        i++;
      });

      let resGrupID = null;
      try {
        const res = await ai.post('cart', postData);
        if (res?.data?.grupID) {
          resGrupID = res.data.grupID;
        }
      } catch (apiErr) {
        console.log('cart post note:', apiErr?.message || apiErr);
      }

      // Navigate to Payment Method
      navigation.navigate('PaymentStart', {
        quick: true,
        tutar: totalAmount.toFixed(2),
        subtotal: subtotalUsd.toFixed(2),
        shipping: shippingCost.toFixed(2),
        grupID: resGrupID,
        itemCount: totalItemCount,
        deliveryCity: selectedCity,
        items: items,
      });
    } catch (err) {
      console.log('handleContinueToPayment err:', err);
      navigation.navigate('PaymentStart', {
        quick: true,
        tutar: totalAmount.toFixed(2),
        subtotal: subtotalUsd.toFixed(2),
        shipping: shippingCost.toFixed(2),
        itemCount: totalItemCount,
        deliveryCity: selectedCity,
        items: items,
      });
    } finally {
      setIsSubmitting(false);
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
        title={tr('Review Your Order') || 'Review Your Order'}
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
        {/* Delivering to Card (Figma) */}
        <View
          style={[
            styles.deliveryCard,
            { backgroundColor: cardBg, borderColor: borderColor },
          ]}>
          <View style={styles.deliveryLeft}>
            <View style={styles.pinCircle}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 21s-8-7.5-8-12a8 8 0 1116 0c0 4.5-8 12-8 12z"
                  fill="#F67922"
                />
                <Path
                  d="M12 12a3 3 0 100-6 3 3 0 000 6z"
                  fill="#FFFFFF"
                />
              </Svg>
            </View>
            <View style={styles.deliveryTextCol}>
              <Text style={[styles.deliverySub, { color: subTextColor }]}>
                {tr('Delivering to') || 'Delivering to'}
              </Text>
              <Text style={[styles.deliveryCity, { color: textColor }]}>
                {selectedCity}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setCityModalVisible(true)}
            style={styles.changeBtn}>
            <Text style={styles.changeBtnText}>
              {tr('Change') || 'Change'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Selected Items Card (Figma) */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBg, borderColor: borderColor },
          ]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {tr('Selected Items') || 'Selected Items'} ({items.length})
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.goBack()}
              style={styles.editBtn}>
              <Text style={styles.editBtnText}>{tr('Edit') || 'Edit'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.itemsList}>
            {items.map((item, idx) => {
              const imageUri =
                item.image ||
                item.img ||
                (item.options &&
                  item.options.find(o => o.selectedImage)?.selectedImage) ||
                null;
              const storeName =
                item.store || getStoreName(item.url, '') || 'Store';

              const basePrice = parsePrice(item?.price) || 0;
              const isShein = Boolean(
                (item?.store &&
                  String(item.store).toLowerCase().includes('shein')) ||
                  (item?.url &&
                    String(item.url).toLowerCase().includes('shein.com')) ||
                  (item?.marketplace &&
                    String(item.marketplace).toLowerCase().includes('shein')) ||
                  String(
                    getStoreName(item?.url, item?.store || ''),
                  ).toLowerCase() === 'shein',
              );
              const percentAmount =
                isShein && safePercent > 0 ? basePrice * (safePercent / 100) : 0;
              const finalPrice = basePrice + percentAmount;
              const { code: itemCurrency, isUsd } =
                getReceivedCurrencyInfo(item);
              const usd = isUsd
                ? finalPrice
                : calculateConvertedPrice(
                    finalPrice,
                    itemCurrency,
                    rates,
                    inverseRates,
                  );
              const itemTotalUsd = (usd !== null ? usd : finalPrice) * (item.count || 1);

              const variantParts = [];
              if (Array.isArray(item?.options) && item.options.length > 0) {
                item.options.forEach(opt => {
                  if (opt && opt.selected) variantParts.push(opt.selected);
                });
              }
              if (variantParts.length === 0) {
                if (item?.size) variantParts.push(item.size);
                if (item?.color) variantParts.push(item.color);
              }
              const variantText = variantParts.join(' • ');

              return (
                <View
                  key={idx}
                  style={[
                    styles.reviewItemRow,
                    idx < items.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: borderColor,
                    },
                  ]}>
                  {/* Thumbnail */}
                  <View
                    style={[
                      styles.itemThumbWrap,
                      { borderColor: borderColor },
                    ]}>
                    {imageUri ? (
                      <FastImage
                        source={{ uri: imageUri }}
                        style={styles.itemThumb}
                        resizeMode={FastImage.resizeMode.contain}
                      />
                    ) : (
                      <View style={styles.itemThumbPlaceholder}>
                        <Text style={styles.placeholderText}>IMG</Text>
                      </View>
                    )}
                  </View>

                  {/* Middle Details */}
                  <View style={styles.itemDetailsCol}>
                    <Text
                      numberOfLines={1}
                      style={[styles.itemTitle, { color: textColor }]}>
                      {cleanProductTitle(item.title, item.url)}
                    </Text>

                    {variantText ? (
                      <Text
                        numberOfLines={1}
                        style={[styles.itemVariant, { color: subTextColor }]}>
                        {variantText}
                      </Text>
                    ) : null}

                    <Text
                      style={[styles.itemQty, { color: subTextColor }]}>
                      {tr('Qty') || 'Qty'}: {item.count || 1}
                    </Text>
                  </View>

                  {/* Right Column: Store Badge & Price */}
                  <View style={styles.itemRightCol}>
                    <View style={styles.storeBadge}>
                      <Text style={styles.storeBadgeText}>{storeName}</Text>
                    </View>
                    <Text style={styles.itemPriceText}>
                      ${itemTotalUsd.toFixed(2)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Price Summary Card (Figma) */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBg, borderColor: borderColor },
          ]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {tr('Price Summary') || 'Price Summary'}
          </Text>

          <View style={styles.priceSummaryRow}>
            <Text style={[styles.priceSummaryLabel, { color: subTextColor }]}>
              {tr('Subtotal') || 'Subtotal'} ({totalItemCount}{' '}
              {totalItemCount === 1 ? 'item' : 'items'})
            </Text>
            <Text style={[styles.priceSummaryValue, { color: textColor }]}>
              ${subtotalUsd.toFixed(2)}
            </Text>
          </View>

          {/* Shipping cost row - temporarily commented out
          <View style={styles.priceSummaryRow}>
            <Text style={[styles.priceSummaryLabel, { color: subTextColor }]}>
              {tr('Shipping Cost') || 'Shipping Cost'}
            </Text>
            <Text style={[styles.priceSummaryValue, { color: textColor }]}>
              ${shippingCost.toFixed(2)}
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
            <Text style={styles.totalValue}>${totalAmount.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom CTA Button */}
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
          onPress={handleContinueToPayment}
          disabled={isSubmitting}
          style={styles.continueBtn}>
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.continueBtnText}>
              {tr('Continue to Payment') || 'Continue to Payment'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* City Picker Modal */}
      <Modal
        visible={cityModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCityModalVisible(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setCityModalVisible(false)}
          style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: cardBg, borderColor: borderColor },
            ]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              {tr('Select Delivery City') || 'Select Delivery City'}
            </Text>
            {CITIES.map(city => (
              <TouchableOpacity
                key={city}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedCity(city);
                  setCityModalVisible(false);
                }}
                style={[
                  styles.cityOption,
                  selectedCity === city && styles.cityOptionSelected,
                  { borderBottomColor: borderColor },
                ]}>
                <Text
                  style={[
                    styles.cityName,
                    { color: selectedCity === city ? '#F67922' : textColor },
                  ]}>
                  {city}
                </Text>
                {selectedCity === city ? (
                  <Text style={styles.cityCheckmark}>✓</Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  deliveryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pinCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deliveryTextCol: {
    flex: 1,
  },
  deliverySub: {
    fontSize: 12,
    marginBottom: 2,
  },
  deliveryCity: {
    fontSize: 15,
    fontWeight: '700',
  },
  changeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  changeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F67922',
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  editBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F67922',
  },
  itemsList: {},
  reviewItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  itemThumbWrap: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemThumb: {
    width: '100%',
    height: '100%',
  },
  itemThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  itemDetailsCol: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
    marginBottom: 2,
  },
  itemVariant: {
    fontSize: 12,
    marginBottom: 2,
  },
  itemQty: {
    fontSize: 12,
  },
  itemRightCol: {
    alignItems: 'flex-end',
  },
  storeBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 6,
  },
  storeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  itemPriceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
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
  continueBtn: {
    backgroundColor: '#F67922',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalSheet: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    maxHeight: 400,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  cityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cityOptionSelected: {
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  cityName: {
    fontSize: 15,
    fontWeight: '600',
  },
  cityCheckmark: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F67922',
  },
});
