import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { t, tr } from '../../translate/i18n';
import TrashIcon from '../../assets/svg/trash.svg';
import AppCheckbox from '../common/AppCheckbox';
import { useExchangeRateStore } from '../../store/useExchangeRateStore';
import { useSheinPriceStore } from '../../store/useSheinPriceStore';
import {
  parsePrice,
  calculateConvertedPrice,
  getReceivedCurrencyInfo,
} from '../../helpers/currencyHelper';
import { cleanProductTitle, getStoreName, calculateMarketplacePrice } from '../../helpers/storeHelper';
import { isAgeOrMeasurement } from '../../helpers/variantUtils';

export default function CartItem({
  item,
  onRemove,
  onIncrease,
  onDecrease,
  checkItem,
  onChange,
  onUpdateOption,
  navigation,
  isDark = false,
}) {
  const targetId = item.id || item.url;
  const { rates, inverseRates } = useExchangeRateStore();
  const marketplaces = useSheinPriceStore(state => state.marketplaces) || [];

  const { code: itemCurrency, display: receivedDisplay, isUsd } =
    getReceivedCurrencyInfo(item);
  const basePrice = parsePrice(item?.price) || 0;
  const { finalPrice } = calculateMarketplacePrice(basePrice, item, marketplaces);
  const displayPrice =
    finalPrice > 0
      ? (finalPrice % 1 === 0 ? finalPrice.toFixed(0) : finalPrice.toFixed(2))
      : item?.price || '';

  const convertedUsd =
    finalPrice > 0
      ? isUsd
        ? finalPrice
        : calculateConvertedPrice(finalPrice, itemCurrency, rates, inverseRates)
      : null;

  const changeItem = (field, value) => {
    onChange(targetId, field, value);
  };

  const changeOption = (optionName, selectedValue) => {
    if (typeof onUpdateOption === 'function') {
      onUpdateOption(targetId, optionName, selectedValue);
      return;
    }

    const currentOptions = Array.isArray(item.options) ? item.options : [];
    const targetOpt = currentOptions.find(
      opt =>
        opt && opt.name && opt.name.toLowerCase() === optionName.toLowerCase(),
    );
    const updatedOptions = currentOptions.map(opt =>
      opt && opt.name && opt.name.toLowerCase() === optionName.toLowerCase()
        ? { ...opt, selected: selectedValue }
        : opt,
    );
    onChange(targetId, 'options', updatedOptions);

    if (
      targetOpt &&
      targetOpt.prices &&
      targetOpt.prices[selectedValue] &&
      !isAgeOrMeasurement(selectedValue)
    ) {
      onChange(targetId, 'price', targetOpt.prices[selectedValue]);
    }

    const lowerName = optionName.toLowerCase();
    if (lowerName.includes('size') || lowerName.includes('beden')) {
      onChange(targetId, 'size', selectedValue);
    }
    if (lowerName.includes('color') || lowerName.includes('renk')) {
      onChange(targetId, 'color', selectedValue);
    }
  };

  const openUrl = url => {
    if (url && navigation) {
      navigation.navigate('Webview', { url: url });
    }
  };

  const confirmRemove = () => {
    Alert.alert(
      tr('Remove Item') || 'Remove Item',
      tr('Are you sure you want to remove this item from your cart?') ||
        'Are you sure you want to remove this item from your cart?',
      [
        { text: tr('Cancel') || 'Cancel', style: 'cancel' },
        {
          text: tr('Remove') || 'Remove',
          style: 'destructive',
          onPress: () => onRemove(targetId),
        },
      ],
    );
  };

  // Compile variant summary (e.g. "Black" or "US 8 • White")
  const variantParts = [];
  if (Array.isArray(item?.options) && item.options.length > 0) {
    item.options.forEach(opt => {
      if (opt && opt.selected) {
        variantParts.push(opt.selected);
      }
    });
  }
  if (variantParts.length === 0) {
    if (item?.size) variantParts.push(item.size);
    if (item?.color) variantParts.push(item.color);
  }
  const variantText = variantParts.join(' • ');

  const imageUri =
    item.image ||
    item.img ||
    (item.options &&
      item.options.find(o => o.selectedImage)?.selectedImage) ||
    null;

  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#1E293B';
  const subTextColor = isDark ? '#9CA3AF' : '#64748B';
  const borderColor = isDark ? '#374151' : '#F1F5F9';
  const stepperBg = isDark ? '#374151' : '#F8FAFC';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: cardBg, borderColor: borderColor },
      ]}>
      <View style={styles.topRow}>
        {/* Checkbox */}
        <AppCheckbox
          checked={Boolean(item.checked)}
          onChange={() => checkItem(item)}
          style={styles.checkbox}
        />

        {/* Product Image */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => openUrl(item.url)}
          style={[styles.imageContainer, { borderColor: borderColor }]}>
          {imageUri ? (
            <FastImage
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode={FastImage.resizeMode.contain}
            />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: stepperBg }]}>
              <Text style={styles.imagePlaceholderText}>No Image</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Content Column */}
        <View style={styles.contentCol}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => openUrl(item.url)}>
            <Text
              numberOfLines={2}
              ellipsizeMode="tail"
              style={[styles.title, { color: textColor }]}>
              {cleanProductTitle(item.title, item.url)}
            </Text>
          </TouchableOpacity>

          {variantText ? (
            <Text
              numberOfLines={1}
              style={[styles.variantText, { color: subTextColor }]}>
              {variantText}
            </Text>
          ) : null}

          {/* Price */}
          <View style={styles.priceRow}>
            {finalPrice > 0 ? (
              <Text style={styles.priceText}>
                {isUsd
                  ? receivedDisplay === '$'
                    ? `$${finalPrice.toFixed(2)}`
                    : `${finalPrice.toFixed(2)} USD`
                  : `$${(convertedUsd ?? finalPrice).toFixed(2)}`}
              </Text>
            ) : (
              <Text style={styles.pendingPriceText}>
                {t('Calculating Price...') || 'Calculating price...'}
              </Text>
            )}
            {!isUsd && finalPrice > 0 ? (
              <Text style={[styles.originalPriceText, { color: subTextColor }]}>
                {` (${displayPrice} ${itemCurrency})`}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Quantity Stepper & Trash */}
        <View style={styles.actionsCol}>
          <View style={[styles.stepperWrap, { backgroundColor: stepperBg, borderColor: borderColor }]}>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => onDecrease(targetId)}
              style={styles.stepperBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.stepperSymbol, { color: textColor }]}>−</Text>
            </TouchableOpacity>

            <Text style={[styles.stepperCount, { color: textColor }]}>
              {item.count || 1}
            </Text>

            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => onIncrease(targetId)}
              style={styles.stepperBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.stepperSymbol, { color: textColor }]}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={confirmRemove}
            style={styles.trashBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <TrashIcon width={18} height={18} fill="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dynamic Product Options if not completed */}
      {Array.isArray(item?.options) && item.options.length > 0 ? (
        <View style={styles.optionsWrap}>
          {item.options.map((opt, optIdx) => {
            if (!opt || !opt.name) return null;
            const selectedVal = (
              opt.selected ||
              (Array.isArray(opt.values) && opt.values.length === 1
                ? opt.values[0]
                : '') ||
              ''
            ).trim();

            if (selectedVal) return null; // already displayed in variantText

            return (
              <View key={optIdx} style={styles.optionRow}>
                <Text style={[styles.optionLabel, { color: subTextColor }]}>
                  {opt.name}:
                </Text>
                {Array.isArray(opt.values) && opt.values.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsScroll}>
                    {opt.values.map((val, valIdx) => (
                      <TouchableOpacity
                        key={valIdx}
                        onPress={() => changeOption(opt.name, val)}
                        style={styles.chip}>
                        <Text style={styles.chipText}>{val}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: 8,
    marginVertical: 0,
  },
  imageContainer: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  contentCol: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 3,
  },
  variantText: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F67922',
  },
  originalPriceText: {
    fontSize: 11,
    marginLeft: 4,
  },
  pendingPriceText: {
    fontSize: 12,
    color: '#F59E0B',
    fontStyle: 'italic',
  },
  actionsCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 64,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepperBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSymbol: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 18,
  },
  stepperCount: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 18,
    textAlign: 'center',
    marginHorizontal: 2,
  },
  trashBtn: {
    padding: 4,
    marginTop: 6,
  },
  optionsWrap: {
    marginTop: 10,
    paddingLeft: 28,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  chipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
  },
  chipText: {
    fontSize: 11,
    color: '#F67922',
    fontWeight: '600',
  },
});
