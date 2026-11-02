import React, { useContext } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { tr } from '../../translate/i18n';
import { EmContext } from '../../contexts/EmContext';
import {
  parsePrice,
  normalizeCurrency,
  calculateConvertedPrice,
  detectItemCurrency,
  getReceivedCurrencyInfo,
} from '../../helpers/currencyHelper';
import { cleanProductTitle, getStoreName, calculateMarketplacePrice } from '../../helpers/storeHelper';
import { useSheinPriceStore } from '../../store/useSheinPriceStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CartOrderConfirmModal = ({
  visible,
  onClose,
  onConfirm,
  isSubmitting,
  items = [],
  totalUsdPrice = 0,
  totalPrice = 0,
  primaryCurrency = 'USD',
  rates = {},
  inverseRates = {},
  safePercent = 0,
}) => {
  const { ctxDil } = useContext(EmContext);
  const marketplaces = useSheinPriceStore(state => state.marketplaces) || [];

  if (!visible) {
    return null;
  }

  const checkedItems = Array.isArray(items)
    ? items.filter(item => item && item.checked !== false)
    : [];

  const safeTotalUsd = Number(totalUsdPrice) > 0 ? Number(totalUsdPrice) : 0;
  const safeTotalPrice = Number(totalPrice) > 0 ? Number(totalPrice) : 0;

  const totalItemCount = checkedItems.reduce(
    (acc, it) => acc + (Number(it?.count) > 0 ? Number(it.count) : 1),
    0,
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>
                {tr('Order Summary') || 'Order Summary'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {tr('Review items before payment') || 'Review items before payment'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSubmitting}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Items List */}
          <ScrollView
            style={styles.itemListScroll}
            contentContainerStyle={styles.itemListContent}
            showsVerticalScrollIndicator={true}>
            {checkedItems.map((item, index) => {
              const isShein = Boolean(
                (item?.store &&
                  String(item.store).toLowerCase().includes('shein')) ||
                  (item?.url &&
                    String(item.url).toLowerCase().includes('shein.com')) ||
                  (item?.marketplace &&
                    String(item.marketplace).toLowerCase().includes('shein')) ||
                  String(getStoreName(item?.url, item?.store || ''))
                    .toLowerCase() === 'shein',
              );

              const store =
                item?.store ||
                getStoreName(item?.url, item?.store || '') ||
                'Store';

              const { code: itemCurr, display: receivedDisplay, isUsd } = getReceivedCurrencyInfo(item);
              const basePrice = parsePrice(item?.price) || 0;
              const { finalPrice } = calculateMarketplacePrice(basePrice, item, marketplaces);
              const displayLocal =
                finalPrice > 0 ? finalPrice.toFixed(2) : item?.price || '';
              const originalProductPrice =
                basePrice > 0
                  ? (basePrice % 1 === 0 ? basePrice.toFixed(0) : basePrice.toFixed(2))
                  : item?.price || '';

              const convertedUsd =
                finalPrice > 0
                  ? (isUsd ? finalPrice : calculateConvertedPrice(
                      finalPrice,
                      itemCurr,
                      rates,
                      inverseRates,
                    ))
                  : null;

              // Extract options label
              let optionsSummary = '';
              if (Array.isArray(item?.options) && item.options.length > 0) {
                optionsSummary = item.options
                  .filter(o => o && o.name && o.selected)
                  .map(o => `${o.name}: ${o.selected}`)
                  .join(' | ');
              } else {
                const parts = [];
                if (item?.color) parts.push(`Color: ${item.color}`);
                if (item?.size) parts.push(`Size: ${item.size}`);
                optionsSummary = parts.join(' | ');
              }

              const qty = Number(item?.count) > 0 ? Number(item.count) : 1;

              return (
                <View key={item?.id || item?.url || index} style={styles.itemRow}>
                  {Boolean(item?.image) ? (
                    <Image
                      source={{ uri: item.image }}
                      style={styles.itemImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.itemImage, styles.placeholderImage]}>
                      <Text style={styles.placeholderImageText}>📦</Text>
                    </View>
                  )}

                  <View style={styles.itemDetails}>
                    <View style={styles.storeBadge}>
                      <Text style={styles.storeBadgeText}>{store}</Text>
                    </View>

                    <Text
                      numberOfLines={2}
                      ellipsizeMode="tail"
                      style={styles.itemTitle}>
                      {cleanProductTitle(item?.title, item?.url)}
                    </Text>

                    {Boolean(optionsSummary) && (
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={styles.itemOptions}>
                        {optionsSummary}
                      </Text>
                    )}

                    <View style={styles.itemPriceRow}>
                      <View style={styles.itemPriceCol}>
                        {finalPrice > 0 ? (
                          <View style={styles.priceInline}>
                            <Text style={styles.itemUsdPrice}>
                              {isUsd
                                ? (receivedDisplay === '$' ? `$${finalPrice.toFixed(2)}` : `${finalPrice.toFixed(2)} USD`)
                                : `$${(convertedUsd ?? finalPrice).toFixed(2)}`}
                            </Text>
                            {!isUsd && basePrice > 0 && (
                              <Text style={styles.itemOriginalPrice}>
                                {` (${originalProductPrice} ${itemCurr})`}
                              </Text>
                            )}
                          </View>
                        ) : (
                          <Text style={styles.itemUsdPrice}>
                            {`${displayLocal} ${itemCurr}`}
                          </Text>
                        )}
                      </View>
                      <View style={styles.qtyBadge}>
                        <Text style={styles.qtyText}>{`x${qty}`}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Totals Section */}
          <View style={styles.totalsCard}>
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>
                {tr('Total Items') || 'Total Items'}
              </Text>
              <Text style={styles.totalValue}>
                {`${totalItemCount} ${tr('Items') || 'Items'}`}
              </Text>
            </View>

            {safeTotalPrice > 0 && primaryCurrency !== 'USD' && (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>
                  {tr('Original Amount') || 'Original Amount'}
                </Text>
                <Text style={styles.totalValueMuted}>
                  {`${safeTotalPrice.toFixed(2)} ${primaryCurrency}`}
                </Text>
              </View>
            )}

            <View style={[styles.totalLine, styles.totalLineGrand]}>
              <Text style={styles.grandTotalLabel}>
                {tr('Total to Pay') || 'Total to Pay'}
              </Text>
              <Text style={styles.grandTotalValue}>
                {safeTotalUsd > 0
                  ? `$${safeTotalUsd.toFixed(2)} USD`
                  : `${safeTotalPrice.toFixed(2)} ${primaryCurrency}`}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              disabled={isSubmitting}
              onPress={onClose}>
              <Text style={styles.cancelBtnText}>
                {tr('Cancel') || 'Cancel'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                isSubmitting && styles.confirmBtnDisabled,
              ]}
              disabled={isSubmitting}
              onPress={onConfirm}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>
                  {tr('Proceed to Payment') || 'Proceed to Payment'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#777777',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    marginLeft: 10,
  },
  closeBtnText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#888888',
  },
  itemListScroll: {
    maxHeight: 250,
    marginVertical: 10,
  },
  itemListContent: {
    paddingVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#EEEEEE',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderImageText: {
    fontSize: 24,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 10,
  },
  storeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1EC',
    borderColor: '#F15927',
    borderWidth: 0.7,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginBottom: 2,
  },
  storeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F15927',
    textTransform: 'uppercase',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
    lineHeight: 17,
  },
  itemOptions: {
    fontSize: 11,
    color: '#777777',
    marginTop: 2,
  },
  itemPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  itemPriceCol: {
    flex: 1,
  },
  priceInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemUsdPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F15927',
  },
  itemOriginalPrice: {
    fontSize: 11,
    color: '#777777',
    marginLeft: 4,
  },
  qtyBadge: {
    backgroundColor: '#EBEBEB',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  qtyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#444444',
  },
  totalsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  totalLineGrand: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E4E4E4',
  },
  totalLabel: {
    fontSize: 13,
    color: '#666666',
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
  },
  totalValueMuted: {
    fontSize: 12,
    color: '#777777',
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222222',
  },
  grandTotalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F15927',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555555',
  },
  confirmBtn: {
    flex: 1.8,
    backgroundColor: '#F15927',
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F15927',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default CartOrderConfirmModal;
