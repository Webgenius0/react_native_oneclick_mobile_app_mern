import {
  Button,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Touchable,
  ScrollView,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import CartItemCountArea from './CartItemCountArea';
import {t} from '../../translate/i18n';
import TrashIcon from '../../assets/svg/trash.svg';
import CartItemImage from './CartItemImage';
import Colors from '../../assets/Colors';
import CheckBox from '@react-native-community/checkbox';
import React from 'react';
import Dump from '../Dump';
import { useExchangeRateStore } from '../../store/useExchangeRateStore';
import { normalizeCurrency } from '../../helpers/currencyHelper';
import { cleanProductTitle, getStoreName } from '../../helpers/storeHelper';

const CartItem = ({
  item,
  onRemove,
  onIncrease,
  onDecrease,
  checkItem,
  onChange,
  onUpdateOption,
  navigation,
}) => {
  const targetId = item.id || item.url;
  const convertedUsd = useExchangeRateStore(state =>
    state.convertPrice(item?.price, item?.currency),
  );

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
      opt => opt && opt.name && opt.name.toLowerCase() === optionName.toLowerCase(),
    );
    const updatedOptions = currentOptions.map(opt =>
      opt && opt.name && opt.name.toLowerCase() === optionName.toLowerCase()
        ? { ...opt, selected: selectedValue }
        : opt,
    );
    onChange(targetId, 'options', updatedOptions);

    if (targetOpt && targetOpt.prices && targetOpt.prices[selectedValue]) {
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
    // TODO: check webview
    navigation.navigate('Webview', {url: url});
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.column}>
          <View style={styles.row}>
            <View style={{flexDirection: 'column', alignItems: 'flex-start'}}>
              <CheckBox
                disabled={false}
                checked={item.checked}
                style={styles.cb}
                value={item.checked}
                color={'#000'}
                tintColors={{true: '#F15927', false: 'black'}}
                onValueChange={newValue => {
                  console.log('NewValue', newValue, item);
                  checkItem(item);
                }}
              />
              <CartItemImage item={item} onChange={onChange} />
            </View>
            <View style={styles.flexColumn}>
              <View style={styles.itemHeader}>
                <View style={styles.flex1}>
                  {Boolean(item?.store || getStoreName(item?.url, '')) && (
                    <View style={styles.storeBadge}>
                      <Text style={styles.storeBadgeText}>
                        {item?.store || getStoreName(item?.url, '')}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => openUrl(item.url)}>
                    <Text
                      numberOfLines={2}
                      ellipsizeMode="tail"
                      style={styles.url}>
                      {cleanProductTitle(item.title, item.url)}
                    </Text>
                  </TouchableOpacity>
                  {Boolean(item?.price) ? (
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceText}>
                        {String(item.price).toLowerCase().includes(String(item.currency || '').toLowerCase())
                          ? item.price
                          : `${item.price} ${item.currency || 'TL'}`}
                      </Text>
                      {convertedUsd !== null && normalizeCurrency(item?.currency, item?.price) !== 'USD' && (
                        <Text style={styles.convertedPriceText}>
                          {` (~$${convertedUsd.toFixed(2)} USD)`}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <View style={styles.priceContainer}>
                      <Text style={styles.pendingPriceText}>
                        {t('Fiyat Hesaplanıyor')}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.trashIconWrapper}>
                  <TouchableOpacity
                    title="Sil"
                    onPress={() => onRemove(targetId)}
                    style={styles.trashButton}>
                    <TrashIcon width={20} height={20} fill={'red'} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Dynamic Product Options (Model, Weight, Size, Color, etc.) */}
              {Array.isArray(item?.options) && item.options.length > 0 ? (
                item.options.map((opt, optIdx) => {
                  if (!opt || !opt.name) {
                    return null;
                  }
                  const selectedVal = (opt.selected || (Array.isArray(opt.values) && opt.values.length === 1 ? opt.values[0] : '') || '').trim();
                  return (
                    <View key={optIdx} style={styles.optionContainer}>
                      <View style={styles.optionHeaderRow}>
                        <Text style={styles.optionLabel}>{opt.name}:</Text>
                        {Boolean(selectedVal) ? (
                          <View style={styles.selectedBadge}>
                            <Text style={styles.selectedBadgeText}>
                              {selectedVal}
                              {Boolean(
                                opt.prices &&
                                  opt.prices[selectedVal] &&
                                  opt.prices[selectedVal] !== item.price,
                              ) && (
                                <Text style={styles.badgePriceText}>
                                  {` (${opt.prices[selectedVal]} ${item.currency || ''})`}
                                </Text>
                              )}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      {/* Only show selection choices if no option is selected yet */}
                      {!selectedVal && Array.isArray(opt.values) && opt.values.length > 0 && (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.chipsScrollContent}>
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
                })
              ) : (
                <>
                  {/* Conditional Size Option */}
                  {Boolean(item?.hasSize) && (
                    <View style={styles.optionContainer}>
                      <View style={styles.optionHeaderRow}>
                        <Text style={styles.optionLabel}>{t('Beden')}:</Text>
                        {Boolean(item?.size) && (
                          <View style={styles.selectedBadge}>
                            <Text style={styles.selectedBadgeText}>{item.size}</Text>
                          </View>
                        )}
                      </View>
                      {!item?.size && (
                        Array.isArray(item.sizes) && item.sizes.length > 0 ? (
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.chipsScrollContent}>
                            {item.sizes.map((s, idx) => (
                              <TouchableOpacity
                                key={idx}
                                onPress={() => changeItem('size', s)}
                                style={styles.chip}>
                                <Text style={styles.chipText}>{s}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        ) : (
                          <TextInput
                            style={styles.input}
                            value={item?.size ?? ''}
                            placeholder={t('Beden')}
                            placeholderTextColor={'#8f8f8f'}
                            onChangeText={text => changeItem('size', text)}
                          />
                        )
                      )}
                    </View>
                  )}

                  {/* Conditional Color Option */}
                  {Boolean(item?.hasColor) && (
                    <View style={styles.optionContainer}>
                      <View style={styles.optionHeaderRow}>
                        <Text style={styles.optionLabel}>
                          {t('Renk') || 'Renk'}:
                        </Text>
                        {Boolean(item?.color) && (
                          <View style={styles.selectedBadge}>
                            <Text style={styles.selectedBadgeText}>{item.color}</Text>
                          </View>
                        )}
                      </View>
                      {!item?.color && (
                        Array.isArray(item.colors) && item.colors.length > 0 ? (
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.chipsScrollContent}>
                            {item.colors.map((c, idx) => (
                              <TouchableOpacity
                                key={idx}
                                onPress={() => changeItem('color', c)}
                                style={styles.chip}>
                                <Text style={styles.chipText}>{c}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        ) : (
                          <TextInput
                            style={styles.input}
                            value={item?.color ?? ''}
                            placeholder={t('Renk') || 'Renk'}
                            placeholderTextColor={'#8f8f8f'}
                            onChangeText={text => changeItem('color', text)}
                          />
                        )
                      )}
                    </View>
                  )}
                </>
              )}

              <View style={styles.countRow}>
                <CartItemCountArea
                  item={item}
                  onIncrease={onIncrease}
                  onDecrease={onDecrease}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
      <View>
        <TextInput
          style={styles.textarea}
          multiline={true}
          textAlignVertical="top"
          value={item?.desc ?? item?.description ?? ''}
          maxLength={500}
          returnKeyType="done"
          placeholderTextColor={'#8f8f8f'}
          placeholder={t('sepetAciklama')}
          onKeyPress={e => {
            if (e.nativeEvent.key === 'Enter') {
              Keyboard.dismiss();
            }
          }}
          onChangeText={text => changeItem('desc', text)}
        />
      </View>
      {/*<Dump item={item} />*/}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    width: '100%',
    borderWidth: 1,
    borderColor: '#cfcfcf',
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 10,
    marginVertical: 7,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  column: {
    flexDirection: 'column',
    flex: 1,
  },
  flexColumn: {
    flex: 1,
    flexDirection: 'column',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    flex: 1,
    marginBottom: 5,
  },
  flex1: {
    flex: 1,
  },
  trashIconWrapper: {
    width: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trashButton: {
    padding: 5,
    borderRadius: 5,
  },
  storeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1EC',
    borderColor: '#F15927',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  storeBadgeText: {
    color: '#F15927',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  optionSelectedValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F15927',
    marginLeft: 5,
  },
  selectedBadge: {
    backgroundColor: '#FFF1EC',
    borderColor: '#F15927',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 6,
  },
  selectedBadgeText: {
    color: '#F15927',
    fontSize: 12,
    fontWeight: '700',
  },
  badgePriceText: {
    color: '#666',
    fontSize: 11,
    fontWeight: '500',
  },
  optionContainer: {
    marginVertical: 4,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  chipsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    backgroundColor: '#FAFAFA',
    marginRight: 6,
  },
  chipSelected: {
    borderColor: '#F15927',
    backgroundColor: '#F15927',
  },
  chipText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  chipPriceText: {
    fontSize: 10,
    fontWeight: '400',
    color: '#666',
  },
  chipPriceTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  sizeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    flex: 1,
    paddingRight: 10,
  },
  textarea: {
    width: '100%',
    height: 60,
    padding: 10,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    color: '#000',
  },
  input: {
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    padding: 5,
    minHeight: 30,
    flex: 1,
    color: '#000',
  },
  url: {
    marginBottom: 5,
    color: '#000',
    flexShrink: 1,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 5,
  },
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F15927',
  },
  convertedPriceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2e7d32',
  },
  pendingPriceText: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  cb: {
    marginBottom: 10,
    color: Colors.btnColor,
    // borderColor: Colors.btnColor,
    // borderWidth: 2,
    // borderRadius: 5,
    // borderColor: '#c5c5c5',
  },
});

export default CartItem;
