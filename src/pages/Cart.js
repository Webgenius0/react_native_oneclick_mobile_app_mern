import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t, tr } from '../translate/i18n';
import { useCartStore, isCartItemComplete } from '../store/useCartStore';
import CartItem from '../components/cart/CartItem';
import AppHeader from '../components/common/AppHeader';
import AppCheckbox from '../components/common/AppCheckbox';
import { getUser } from '../helpers/auth';
import { EmContext } from '../contexts/EmContext';
import { useExchangeRateStore } from '../store/useExchangeRateStore';
import { useSheinPriceStore } from '../store/useSheinPriceStore';
import {
  calculateConvertedPrice,
  parsePrice,
  detectItemCurrency,
  getReceivedCurrencyInfo,
} from '../helpers/currencyHelper';
import { cleanProductTitle, getStoreName } from '../helpers/storeHelper';
import CartIcon from '../assets/svg/cart.svg';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function CartPage({ navigation }) {
  const insets = useSafeAreaInsets();
  const { ctx } = useContext(EmContext);
  const {
    items,
    removeItem,
    checkItem,
    increaseCount,
    decreaseCount,
    clearCart,
    updateField,
    updateOption,
  } = useCartStore();

  const { rates, inverseRates, fetchRates } = useExchangeRateStore();
  const { fetchSheinPrice } = useSheinPriceStore();

  const [collapsedStores, setCollapsedStores] = useState({});

  const hasNonUsdItems = Boolean(
    items &&
      items.length > 0 &&
      items.some(it => {
        const isShein = Boolean(
          (it?.store && String(it.store).toLowerCase().includes('shein')) ||
            (it?.url && String(it.url).toLowerCase().includes('shein.com')) ||
            (it?.marketplace &&
              String(it.marketplace).toLowerCase().includes('shein')) ||
            String(getStoreName(it?.url, it?.store || '')).toLowerCase() ===
              'shein',
        );
        const info = getReceivedCurrencyInfo(it);
        if (isShein && info.isUsd) return false;
        return !info.isUsd;
      }),
  );

  useEffect(() => {
    if (hasNonUsdItems) {
      fetchRates(items);
    }
    fetchSheinPrice();
  }, [fetchRates, fetchSheinPrice, hasNonUsdItems, items]);

  const sheinPercent = useSheinPriceStore(state => state.percent) ?? 0;
  const safePercent = Number(sheinPercent) > 0 ? Number(sheinPercent) : 0;
  const checkedItems = useMemo(
    () => (items ? items.filter(item => item.checked === true) : []),
    [items],
  );
  const totalItems = items.reduce((sum, item) => sum + (item.count || 1), 0);

  const totalPrice = checkedItems.reduce((sum, item) => {
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
    return finalPrice > 0 ? sum + finalPrice * count : sum;
  }, 0);

  const totalUsdPrice = checkedItems.reduce((sum, item) => {
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
  }, 0);

  const primaryCurrency =
    checkedItems.length > 0
      ? detectItemCurrency(checkedItems[0], 'USD')
      : 'USD';

  // Group items by store for Figma layout
  const storeGroups = useMemo(() => {
    const groups = {};
    (items || []).forEach(item => {
      const storeName =
        (item.store || getStoreName(item.url, '') || 'Other')
          .trim()
          .toUpperCase();
      if (!groups[storeName]) {
        groups[storeName] = [];
      }
      groups[storeName].push(item);
    });
    return groups;
  }, [items]);

  const toggleStoreCollapse = storeName => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedStores(prev => ({
      ...prev,
      [storeName]: !prev[storeName],
    }));
  };

  const toggleStoreSelection = (storeName, selectAll) => {
    const storeItems = storeGroups[storeName] || [];
    storeItems.forEach(item => {
      if (item.checked !== selectAll) {
        checkItem(item);
      }
    });
  };

  const handleClearCart = () => {
    Alert.alert(
      tr('Sepeti Temizle') || 'Clear Cart',
      tr('Tüm ürünleri sepetten çıkarmak istediğinize emin misiniz?') ||
        'Are you sure you want to remove all items from your cart?',
      [
        { text: tr('İptal') || 'Cancel', style: 'cancel' },
        {
          text: tr('Temizle') || 'Clear All',
          style: 'destructive',
          onPress: () => clearCart(),
        },
      ],
    );
  };

  const handleCheckoutPress = async () => {
    const user = await getUser();
    if (user && user.kod === 'GUEST') {
      Alert.alert(
        tr('Giriş Gerekli') || 'Sign In Required',
        tr('Sipariş verebilmeniz için üye girişi yapın veya kayıt olun') ||
          'Please sign in or create an account to proceed with checkout.',
        [
          { text: tr('İptal') || 'Cancel', style: 'cancel' },
          {
            text: tr('Giriş Yap') || 'Sign In',
            onPress: () => navigation.navigate('Login'),
          },
        ],
      );
      return;
    }

    if (items.length === 0) {
      Alert.alert(
        tr('Sepet Boş') || 'Empty Cart',
        tr('Sepetinizde hiç ürün yok') || 'Your cart is currently empty.',
      );
      return;
    }

    if (checkedItems.length === 0) {
      Alert.alert(
        tr('Seçim Yapın') || 'Select Items',
        tr('Lütfen en az bir ürünü seçin') ||
          'Please select at least one item to proceed.',
      );
      return;
    }

    const incompleteItems = checkedItems.filter(
      item => !isCartItemComplete(item),
    );

    if (incompleteItems.length > 0) {
      const incompleteNames = incompleteItems
        .map(i => cleanProductTitle(i.title, i.url))
        .slice(0, 3)
        .join('\n• ');

      Alert.alert(
        tr('Uyarı') || 'Incomplete Options',
        `${
          tr('eksikUrunDetayi') ||
          'Please select size / color options for the selected products before checking out.'
        }\n\n• ${incompleteNames}`,
        [{ text: tr('Tamam') || 'OK' }],
      );
      return;
    }

    navigation.navigate('ReviewOrder', {
      items: checkedItems,
      totalUsdPrice: totalUsdPrice,
      totalPrice: totalPrice,
      primaryCurrency: primaryCurrency,
    });
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

      {/* Figma Header: Cart (X items) & Clear Cart */}
      <AppHeader
        navigation={navigation}
        showBack={navigation.canGoBack()}
        title={`${tr('Cart') || 'Cart'} (${totalItems} ${
          tr('items') || 'items'
        })`}
        rightComponent={
          items.length > 0 ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleClearCart}
              style={styles.clearCartBtn}>
              <Text style={styles.clearCartText}>
                {tr('Clear Cart') || 'Clear Cart'}
              </Text>
            </TouchableOpacity>
          ) : null
        }
        style={{
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          backgroundColor: cardBg,
        }}
      />

      {items.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: pageBg }]}>
          <View style={styles.emptyIconCircle}>
            <CartIcon width={36} height={36} fill="#F67922" />
          </View>
          <Text style={[styles.emptyTitle, { color: textColor }]}>
            {tr('Your Cart is Empty') || 'Your Cart is Empty'}
          </Text>
          <Text style={[styles.emptySub, { color: subTextColor }]}>
            {tr('Explore international stores and add items to your cart') ||
              'Explore international stores and add items to your cart.'}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Home')}
            style={styles.shopBtn}>
            <Text style={styles.shopBtnText}>
              {tr('Start Shopping') || 'Start Shopping'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.mainWrap, { backgroundColor: pageBg }]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {Object.keys(storeGroups).map(storeName => {
              const storeItems = storeGroups[storeName] || [];
              const isAllChecked =
                storeItems.length > 0 &&
                storeItems.every(it => it.checked === true);
              const isCollapsed = Boolean(collapsedStores[storeName]);

              return (
                <View
                  key={storeName}
                  style={[
                    styles.storeCard,
                    { backgroundColor: cardBg, borderColor: borderColor },
                  ]}>
                  {/* Store Header Row */}
                  <View
                    style={[
                      styles.storeHeaderRow,
                      { borderBottomColor: borderColor },
                    ]}>
                    <View style={styles.storeHeaderLeft}>
                      <AppCheckbox
                        checked={isAllChecked}
                        onChange={() =>
                          toggleStoreSelection(storeName, !isAllChecked)
                        }
                        style={styles.storeCheckbox}
                      />
                      <Text
                        style={[
                          styles.storeTitleText,
                          { color: textColor },
                        ]}>
                        {storeName} ({storeItems.length}{' '}
                        {storeItems.length === 1 ? 'item' : 'items'})
                      </Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => toggleStoreCollapse(storeName)}
                      style={styles.chevronBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Svg
                        width={18}
                        height={18}
                        viewBox="0 0 24 24"
                        fill="none"
                        style={{
                          transform: [
                            { rotate: isCollapsed ? '180deg' : '0deg' },
                          ],
                        }}>
                        <Path
                          d="M18 15l-6-6-6 6"
                          stroke={subTextColor}
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </TouchableOpacity>
                  </View>

                  {/* Store Item List */}
                  {!isCollapsed && (
                    <View style={styles.itemsList}>
                      {storeItems.map((item, idx) => (
                        <CartItem
                          key={item.id || item.url || idx}
                          item={item}
                          onRemove={removeItem}
                          onIncrease={increaseCount}
                          onDecrease={decreaseCount}
                          checkItem={checkItem}
                          onChange={updateField}
                          onUpdateOption={updateOption}
                          navigation={navigation}
                          isDark={isDark}
                        />
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Figma Sticky Bottom Summary & Checkout Bar */}
          <View
            style={[
              styles.bottomBar,
              {
                backgroundColor: cardBg,
                borderTopColor: borderColor,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryCountText, { color: textColor }]}>
                {checkedItems.length}{' '}
                {checkedItems.length === 1 ? 'Item' : 'Items'}:
              </Text>
              <Text style={styles.summaryTotalText}>
                ${totalUsdPrice.toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleCheckoutPress}
              style={[
                styles.checkoutBtn,
                checkedItems.length === 0 && styles.checkoutBtnDisabled,
              ]}
              disabled={checkedItems.length === 0}>
              <Text style={styles.checkoutBtnText}>
                {tr('Checkout') || 'Checkout'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mainWrap: {
    flex: 1,
  },
  clearCartBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearCartText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F67922',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  storeCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  storeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  storeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storeCheckbox: {
    marginVertical: 0,
    marginRight: 10,
  },
  storeTitleText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  chevronBtn: {
    padding: 4,
  },
  itemsList: {},
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  summaryCountText: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 6,
  },
  summaryTotalText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F67922',
  },
  checkoutBtn: {
    backgroundColor: '#F67922',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  checkoutBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  shopBtn: {
    backgroundColor: '#F67922',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  shopBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
