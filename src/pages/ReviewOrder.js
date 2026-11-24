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
import { tr, localizeApiMessage } from '../translate/i18n';
import { EmContext } from '../contexts/EmContext';
import { getUser, getToken, isGuestUser } from '../helpers/auth';
import ai from '../helpers/ai';
import { cleanProductTitle, getStoreName, calculateMarketplacePrice } from '../helpers/storeHelper';
import {
  parsePrice,
  calculateConvertedPrice,
  getReceivedCurrencyInfo,
} from '../helpers/currencyHelper';
import { useExchangeRateStore } from '../store/useExchangeRateStore';
import { useSheinPriceStore } from '../store/useSheinPriceStore';
import { useCartStore } from '../store/useCartStore';
import { useOrderStore } from '../store/useOrderStore';

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
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { rates, inverseRates } = useExchangeRateStore();
  const marketplaces = useSheinPriceStore(state => state.marketplaces) || [];
  const fetchMarketplacePrices = useSheinPriceStore(
    state => state.fetchMarketplacePrices || state.fetchSheinPrice,
  );

  useEffect(() => {
    if (typeof fetchMarketplacePrices === 'function') {
      fetchMarketplacePrices();
    }
  }, [fetchMarketplacePrices]);

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
          const { finalPrice } = calculateMarketplacePrice(basePrice, item, marketplaces);
          const { code: itemCurrency, isUsd } = getReceivedCurrencyInfo(item);
          const count = Number(item?.count) > 0 ? Number(item.count) : 1;

          const usd = isUsd
            ? finalPrice
            : calculateConvertedPrice(finalPrice, itemCurrency, rates, inverseRates);
          const effectiveUsd = parseFloat(
            (usd !== null ? usd : finalPrice).toFixed(2),
          );
          return sum + effectiveUsd * count;
        }, 0)
      : initialTotalUsd || 0;

  // Standard shipping cost from Figma ($25.00) - Temporarily commented out
  // const shippingCost = 25.0;
  const shippingCost = 0.0;
  const totalAmount = subtotalUsd + shippingCost;

  const handleConfirmOrderPress = async () => {
    if (isSubmitting) return;

    const user = await getUser();
    const guest = await isGuestUser(user);
    if (guest) {
      Alert.alert(
        tr('Sign In Required') || 'Sign In Required',
        tr('Please sign in or create an account to proceed with checkout.') ||
          'Please sign in or create an account to proceed with checkout.',
        [
          { text: tr('Cancel') || 'Cancel', style: 'cancel' },
          {
            text: tr('Sign In') || 'Sign In',
            onPress: () => navigation.navigate('Login'),
          },
        ],
      );
      return;
    }

    setConfirmModalVisible(true);
  };

  const handleContinueToPayment = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const user = await getUser();
      const guest = await isGuestUser(user);
      if (guest) {
        setConfirmModalVisible(false);
        Alert.alert(
          tr('Sign In Required') || 'Sign In Required',
          tr('Please sign in or create an account to proceed with checkout.') ||
            'Please sign in or create an account to proceed with checkout.',
          [
            { text: tr('Cancel') || 'Cancel', style: 'cancel' },
            {
              text: tr('Sign In') || 'Sign In',
              onPress: () => navigation.navigate('Login'),
            },
          ],
        );
        setIsSubmitting(false);
        return;
      }

      let postData = new FormData();
      const token = (await getToken()) || user?.token;
      if (token) {
        postData.append('token', token);
      }
      postData.append('sehir', selectedCity);
      postData.append('city', selectedCity);
      postData.append('teslimatSehir', selectedCity);
      if (user?.teslimatSehirID) {
        postData.append('teslimatSehirID', user.teslimatSehirID);
      }

      var i = 0;
      items.forEach(item => {
        const storeName = item.store || getStoreName(item.url, '') || '';
        const parsedPriceVal = parsePrice(item.price);
        const { finalPrice: finalPriceVal } = calculateMarketplacePrice(
          parsedPriceVal,
          item,
          marketplaces,
        );
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

        const count = Number(item?.count) > 0 ? Number(item.count) : 1;
        const lineTotalUsd =
          convertedPriceVal !== null
            ? parseFloat((convertedPriceVal * count).toFixed(2))
            : null;

        postData.append(
          'cart[' + i + '][ad]',
          cleanProductTitle(item.title, item.url),
        );
        postData.append('cart[' + i + '][link]', item.url);
        postData.append('cart[' + i + '][sayi]', count);
        postData.append('cart[' + i + '][adet]', count);
        const customSizeVal = item.custom_size && String(item.custom_size).trim();
        const descVal =
          (item.desc && String(item.desc).trim()) ||
          (item.description && String(item.description).trim()) ||
          '';
        const combinedDesc = [
          customSizeVal ? `Size: ${customSizeVal}` : '',
          descVal ? descVal : '',
        ]
          .filter(Boolean)
          .join(' | ');

        postData.append('cart[' + i + '][size]', customSizeVal || item.size || '');
        postData.append('cart[' + i + '][color]', item.color || '');
        postData.append('cart[' + i + '][store]', storeName);
        postData.append('cart[' + i + '][img]', item.image || item.img || '');
        postData.append('cart[' + i + '][image]', item.image || item.img || '');
        postData.append('cart[' + i + '][acik]', combinedDesc);

        if (finalPriceVal !== null) {
          postData.append('cart[' + i + '][price]', finalPriceVal);
          postData.append('cart[' + i + '][fiyat]', finalPriceVal);
        }
        postData.append('cart[' + i + '][currency]', normalizedCurr);
        postData.append('cart[' + i + '][pb]', normalizedCurr);

        if (convertedPriceVal !== null) {
          postData.append(
            'cart[' + i + '][converted_price]',
            convertedPriceVal,
          );
          postData.append('cart[' + i + '][price_usd]', convertedPriceVal);
          postData.append('cart[' + i + '][fiyat_usd]', convertedPriceVal);
          postData.append('cart[' + i + '][tutar_usd]', lineTotalUsd);
          postData.append('cart[' + i + '][tutar]', lineTotalUsd);
          postData.append('cart[' + i + '][total_usd]', lineTotalUsd);
        }

        i++;
      });

      postData.append('total_usd', totalAmount.toFixed(2));
      postData.append('tutar_usd', totalAmount.toFixed(2));
      postData.append('tutar', totalAmount.toFixed(2));
      postData.append('total', totalAmount.toFixed(2));
      postData.append('subtotal', subtotalUsd.toFixed(2));
      postData.append('subtotal_usd', subtotalUsd.toFixed(2));

      let res = null;
      let resGrupID = null;
      let resOrderIds = [];

      try {
        res = await ai.post('new-order-multiple', postData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } catch (firstErr) {
        console.log('new-order-multiple attempt note:', firstErr?.message || firstErr);
        if (firstErr?.response?.status === 404 || firstErr?.response?.status === 405) {
          res = await ai.post('cart', postData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
        } else {
          throw firstErr;
        }
      }

      console.log('Order creation response:', res?.data);

      // Only treat as success when backend explicitly confirms no error.
      // Do NOT use presence of grupID/order_id/order_ids alone — the backend can
      // return those fields alongside error:true in some edge cases.
      const isSuccess =
        res?.data?.error === false ||
        (res?.data?.error !== true && res?.data?.success === true) ||
        (res?.data?.error !== true &&
          (Boolean(res?.data?.grupID) ||
           Boolean(res?.data?.order_id) ||
           Boolean(res?.data?.order_ids)));

      if (isSuccess) {
        resGrupID =
          res?.data?.grupID ||
          res?.data?.grup_id ||
          res?.data?.grup?.id ||
          null;

        if (res?.data?.order_ids) {
          resOrderIds = Array.isArray(res.data.order_ids)
            ? res.data.order_ids
            : String(res.data.order_ids).split(',').map(s => s.trim()).filter(Boolean);
        } else if (res?.data?.siparis_ids) {
          resOrderIds = Array.isArray(res.data.siparis_ids)
            ? res.data.siparis_ids
            : String(res.data.siparis_ids).split(',').map(s => s.trim()).filter(Boolean);
        } else if (Array.isArray(res?.data?.ss)) {
          resOrderIds = res.data.ss.map(s => s.id);
        } else if (Array.isArray(res?.data?.orders)) {
          resOrderIds = res.data.orders.map(s => s.id);
        } else if (res?.data?.order_id) {
          resOrderIds = [res.data.order_id];
        } else if (res?.data?.siparis_id) {
          resOrderIds = [res.data.siparis_id];
        } else if (res?.data?.id) {
          resOrderIds = [res.data.id];
        }

        useOrderStore.getState().invalidateOrders();

        const serverTutar =
          res?.data?.total_usd !== undefined
            ? parseFloat(res.data.total_usd).toFixed(2)
            : res?.data?.total !== undefined
            ? parseFloat(res.data.total).toFixed(2)
            : res?.data?.tutar !== undefined
            ? parseFloat(res.data.tutar).toFixed(2)
            : totalAmount.toFixed(2);

        // Preserve reviewed amount unless server total differs significantly (> 5 cents)
        const targetAmount =
          serverTutar && Math.abs(parseFloat(serverTutar) - totalAmount) > 0.05
            ? serverTutar
            : totalAmount.toFixed(2);

        setConfirmModalVisible(false);
        navigation.navigate('PaymentStart', {
          quick: true,
          tutar: targetAmount,
          subtotal: subtotalUsd.toFixed(2),
          shipping: shippingCost.toFixed(2),
          grupID: resGrupID,
          siparis_ids: resOrderIds,
          order_ids: resOrderIds,
          siparis_id: resOrderIds[0] || null,
          itemCount: totalItemCount,
          deliveryCity: selectedCity,
          items: items,
        });
      } else {
        setConfirmModalVisible(false);
        const rawMsg = res?.data?.msg || res?.data?.detail;
        const isSessionExpired =
          rawMsg &&
          (String(rawMsg).toLowerCase().includes('session') ||
            String(rawMsg).toLowerCase().includes('expired') ||
            String(rawMsg).toLowerCase().includes('token'));

        if (isSessionExpired) {
          Alert.alert(
            tr('Session Expired') || 'Session Expired',
            tr('Your session has expired. Please sign in again.') ||
              'Your session has expired. Please sign in again.',
            [
              { text: tr('Cancel') || 'Cancel', style: 'cancel' },
              {
                text: tr('Sign In') || 'Sign In',
                onPress: () => navigation.navigate('Login'),
              },
            ],
          );
        } else {
          const errorMsg =
            localizeApiMessage(rawMsg, 'Failed to place order.') ||
            rawMsg ||
            tr('Failed to place order. Please try again.') ||
            'Failed to place order. Please try again.';
          Alert.alert(tr('Order Failed') || 'Order Failed', errorMsg);
        }
      }
    } catch (err) {
      setConfirmModalVisible(false);
      console.log('handleContinueToPayment err:', err?.response?.data || err?.message || err);
      const rawMsg = err?.response?.data?.msg || err?.response?.data?.detail;
      const isSessionExpired =
        rawMsg &&
        (String(rawMsg).toLowerCase().includes('session') ||
          String(rawMsg).toLowerCase().includes('expired') ||
          String(rawMsg).toLowerCase().includes('token'));

      if (isSessionExpired) {
        Alert.alert(
          tr('Session Expired') || 'Session Expired',
          tr('Your session has expired. Please sign in again.') ||
            'Your session has expired. Please sign in again.',
          [
            { text: tr('Cancel') || 'Cancel', style: 'cancel' },
            {
              text: tr('Sign In') || 'Sign In',
              onPress: () => navigation.navigate('Login'),
            },
          ],
        );
      } else {
        const errorMsg =
          localizeApiMessage(rawMsg, 'Failed to place order.') ||
          rawMsg ||
          tr('Failed to place order. Please check your connection and try again.') ||
          'Failed to place order. Please check your connection and try again.';
        Alert.alert(tr('Order Failed') || 'Order Failed', errorMsg);
      }
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
              const { finalPrice } = calculateMarketplacePrice(
                basePrice,
                item,
                marketplaces,
              );
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
              if (item?.custom_size && String(item.custom_size).trim()) {
                variantParts.push(`Size: ${String(item.custom_size).trim()}`);
              }
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

                    {item?.desc || item?.description ? (
                      <Text
                        numberOfLines={1}
                        style={[styles.itemVariant, { color: subTextColor, fontStyle: 'italic' }]}>
                        {item.desc || item.description}
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
          onPress={handleConfirmOrderPress}
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

      {/* Order Confirmation Details Modal */}
      <Modal
        visible={confirmModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!isSubmitting) setConfirmModalVisible(false);
        }}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            if (!isSubmitting) setConfirmModalVisible(false);
          }}
          style={styles.modalBackdrop}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e?.stopPropagation?.()}
            style={[
              styles.confirmModalCard,
              { backgroundColor: cardBg, borderColor: borderColor },
            ]}>
            {/* Header */}
            <View style={styles.confirmModalHeader}>
              <View style={styles.confirmHeaderLeft}>
                <View
                  style={[
                    styles.confirmIconBadge,
                    { backgroundColor: isDark ? '#37281D' : '#FFF7ED' },
                  ]}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      stroke="#F67922"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.confirmModalTitle, { color: textColor }]}>
                    {tr('Order Summary') || 'Order Summary'}
                  </Text>
                  <Text
                    style={[styles.confirmModalSubtitle, { color: subTextColor }]}>
                    {tr('Review details before payment') ||
                      'Review details before payment'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                disabled={isSubmitting}
                activeOpacity={0.7}
                onPress={() => setConfirmModalVisible(false)}
                style={[
                  styles.confirmCloseBtn,
                  { backgroundColor: isDark ? '#374151' : '#F1F5F9' },
                ]}>
                <Text style={[styles.confirmCloseText, { color: subTextColor }]}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.confirmScrollBody}
              contentContainerStyle={{ paddingBottom: 4 }}>
              {/* Delivery destination preview */}
              <View
                style={[
                  styles.confirmInfoBox,
                  {
                    backgroundColor: isDark ? '#111827' : '#F8FAFC',
                    borderColor,
                  },
                ]}>
                <View style={styles.confirmInfoRow}>
                  <View style={styles.confirmInfoLabelRow}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M12 21s-8-7.5-8-12a8 8 0 1116 0c0 4.5-8 12-8 12z"
                        fill="#F67922"
                      />
                      <Path
                        d="M12 12a3 3 0 100-6 3 3 0 000 6z"
                        fill="#FFFFFF"
                      />
                    </Svg>
                    <Text
                      style={[styles.confirmInfoLabel, { color: subTextColor }]}>
                      {tr('Delivery to') || 'Delivery to'}
                    </Text>
                  </View>
                  <Text style={[styles.confirmInfoValue, { color: textColor }]}>
                    {selectedCity}
                  </Text>
                </View>

                <View style={[styles.confirmInfoRow, { marginTop: 8 }]}>
                  <View style={styles.confirmInfoLabelRow}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                        stroke="#F67922"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                    <Text
                      style={[styles.confirmInfoLabel, { color: subTextColor }]}>
                      {tr('Total Items') || 'Total Items'}
                    </Text>
                  </View>
                  <Text style={[styles.confirmInfoValue, { color: textColor }]}>
                    {totalItemCount}{' '}
                    {totalItemCount === 1
                      ? tr('item') || 'item'
                      : tr('items') || 'items'}
                  </Text>
                </View>
              </View>

              {/* Items Preview List */}
              <View
                style={[
                  styles.confirmItemsPreview,
                  {
                    borderColor,
                    backgroundColor: cardBg,
                  },
                ]}>
                {items.slice(0, 3).map((item, idx) => {
                  const basePrice = parsePrice(item?.price) || 0;
                  const { finalPrice } = calculateMarketplacePrice(
                    basePrice,
                    item,
                    marketplaces,
                  );
                  const { code: itemCurrency, isUsd } =
                    getReceivedCurrencyInfo(item);
                  const count = Number(item?.count) > 0 ? Number(item.count) : 1;
                  const usd = isUsd
                    ? finalPrice
                    : calculateConvertedPrice(
                        finalPrice,
                        itemCurrency,
                        rates,
                        inverseRates,
                      );
                  const itemTotalUsd = parseFloat(
                    ((usd !== null ? usd : finalPrice) * count).toFixed(2),
                  );

                  return (
                    <View
                      key={item?.id || item?.product_id || idx}
                      style={[
                        styles.confirmItemMiniRow,
                        idx > 0 && {
                          borderTopWidth: 1,
                          borderTopColor: borderColor,
                        },
                      ]}>
                      <View
                        style={[
                          styles.confirmItemMiniThumbWrap,
                          {
                            borderColor,
                            backgroundColor: isDark ? '#111827' : '#FFFFFF',
                          },
                        ]}>
                        {item.image || item.photo || item.img ? (
                          <FastImage
                            source={{
                              uri: item.image || item.photo || item.img,
                            }}
                            style={styles.confirmItemMiniThumb}
                            resizeMode={FastImage.resizeMode.cover}
                          />
                        ) : (
                          <View style={styles.confirmItemPlaceholder}>
                            <Text style={styles.placeholderText}>IMG</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.confirmItemMiniTitle,
                            { color: textColor },
                          ]}>
                          {cleanProductTitle(item.title, item.url)}
                        </Text>
                        <Text
                          style={[
                            styles.confirmItemMiniQty,
                            { color: subTextColor },
                          ]}>
                          {tr('Qty') || 'Qty'}: {item.count || 1}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.confirmItemMiniPrice,
                          { color: textColor },
                        ]}>
                        ${itemTotalUsd.toFixed(2)}
                      </Text>
                    </View>
                  );
                })}

                {items.length > 3 ? (
                  <View
                    style={[
                      styles.confirmMoreItemsWrap,
                      {
                        borderTopWidth: 1,
                        borderTopColor: borderColor,
                        backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                      },
                    ]}>
                    <Text
                      style={[
                        styles.confirmMoreItemsText,
                        { color: subTextColor },
                      ]}>
                      + {items.length - 3} {tr('more items') || 'more items'}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Price Breakdown */}
              <View
                style={[
                  styles.confirmPriceBreakdown,
                  {
                    backgroundColor: isDark ? '#111827' : '#F8FAFC',
                    borderColor,
                  },
                ]}>
                <View style={styles.confirmPriceRow}>
                  <Text
                    style={[
                      styles.confirmPriceLabel,
                      { color: subTextColor },
                    ]}>
                    {tr('Subtotal') || 'Subtotal'}
                  </Text>
                  <Text
                    style={[styles.confirmPriceValue, { color: textColor }]}>
                    ${subtotalUsd.toFixed(2)}
                  </Text>
                </View>

                {shippingCost > 0 ? (
                  <View style={[styles.confirmPriceRow, { marginTop: 6 }]}>
                    <Text
                      style={[
                        styles.confirmPriceLabel,
                        { color: subTextColor },
                      ]}>
                      {tr('Shipping') || 'Shipping'}
                    </Text>
                    <Text
                      style={[styles.confirmPriceValue, { color: textColor }]}>
                      ${shippingCost.toFixed(2)}
                    </Text>
                  </View>
                ) : null}

                <View
                  style={[
                    styles.confirmTotalRow,
                    { borderTopColor: borderColor, borderTopWidth: 1 },
                  ]}>
                  <Text
                    style={[styles.confirmTotalLabel, { color: textColor }]}>
                    {tr('Total to Pay') || 'Total to Pay'}
                  </Text>
                  <Text style={styles.confirmTotalValue}>
                    ${totalAmount.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Security note */}
              <View style={styles.confirmSecurityRow}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                    stroke="#10B981"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M9 12l2 2 4-4"
                    stroke="#10B981"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text style={styles.confirmSecurityText}>
                  {tr('Safe & Secure Checkout') || 'Safe & Secure Checkout'}
                </Text>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.confirmActionsRow}>
              <TouchableOpacity
                disabled={isSubmitting}
                activeOpacity={0.7}
                onPress={() => setConfirmModalVisible(false)}
                style={[styles.confirmCancelBtn, { borderColor }]}>
                <Text
                  style={[styles.confirmCancelBtnText, { color: textColor }]}>
                  {tr('Cancel') || 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={isSubmitting}
                activeOpacity={0.85}
                onPress={handleContinueToPayment}
                style={styles.confirmPayBtn}>
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmPayBtnText}>
                    {tr('Confirm & Pay') || 'Confirm & Pay'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
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
  confirmModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  confirmModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  confirmHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  confirmIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  confirmModalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  confirmModalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  confirmCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  confirmCloseText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
  },
  confirmScrollBody: {
    maxHeight: 340,
    marginBottom: 14,
  },
  confirmInfoBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  confirmInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confirmInfoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmInfoLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },
  confirmInfoValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  confirmItemsPreview: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  confirmItemMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  confirmItemMiniThumbWrap: {
    width: 38,
    height: 38,
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  confirmItemMiniThumb: {
    width: '100%',
    height: '100%',
  },
  confirmItemPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmItemMiniTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  confirmItemMiniQty: {
    fontSize: 11,
  },
  confirmItemMiniPrice: {
    fontSize: 13,
    fontWeight: '700',
  },
  confirmMoreItemsWrap: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmMoreItemsText: {
    fontSize: 11,
    fontWeight: '600',
  },
  confirmPriceBreakdown: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  confirmPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confirmPriceLabel: {
    fontSize: 13,
  },
  confirmPriceValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  confirmTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 8,
  },
  confirmTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F67922',
  },
  confirmSecurityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginTop: 2,
    marginBottom: 4,
  },
  confirmSecurityText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 6,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  confirmCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmPayBtn: {
    flex: 1.5,
    backgroundColor: '#F67922',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmPayBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
