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

const CartItem = ({
  item,
  onRemove,
  onIncrease,
  onDecrease,
  checkItem,
  onChange,
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
    const currentOptions = Array.isArray(item.options) ? item.options : [];
    const updatedOptions = currentOptions.map(opt =>
      opt.name.toLowerCase() === optionName.toLowerCase()
        ? { ...opt, selected: selectedValue }
        : opt,
    );
    onChange(targetId, 'options', updatedOptions);

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
                  {Boolean(item?.store) && (
                    <View style={styles.storeBadge}>
                      <Text style={styles.storeBadgeText}>{item.store}</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => openUrl(item.url)}>
                    <Text style={styles.url}>{item.title || item.url}</Text>
                  </TouchableOpacity>
                  {Boolean(item?.price) && (
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
                  if (
                    !opt ||
                    !opt.name ||
                    !Array.isArray(opt.values) ||
                    opt.values.length === 0
                  ) {
                    return null;
                  }
                  return (
                    <View key={optIdx} style={styles.optionContainer}>
                      <View style={styles.optionHeaderRow}>
                        <Text style={styles.optionLabel}>{opt.name}:</Text>
                        {Boolean(opt.selected) && (
                          <Text style={styles.optionSelectedValue}>
                            {opt.selected}
                          </Text>
                        )}
                      </View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.chipsScrollContent}>
                        {opt.values.map((val, valIdx) => {
                          const isSelected =
                            String(opt.selected || '').trim().toLowerCase() ===
                            String(val).trim().toLowerCase();
                          return (
                            <TouchableOpacity
                              key={valIdx}
                              onPress={() => changeOption(opt.name, val)}
                              style={[
                                styles.chip,
                                isSelected && styles.chipSelected,
                              ]}>
                              <Text
                                style={[
                                  styles.chipText,
                                  isSelected && styles.chipTextSelected,
                                ]}>
                                {val}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  );
                })
              ) : (
                <>
                  {/* Conditional Size Option */}
                  {Boolean(item?.hasSize) && (
                    <View style={styles.optionContainer}>
                      <Text style={styles.optionLabel}>{t('Beden')}:</Text>
                      {Array.isArray(item.sizes) && item.sizes.length > 0 ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.chipsScrollContent}>
                          {item.sizes.map((s, idx) => {
                            const isSelected =
                              String(item.size || '').trim() ===
                              String(s).trim();
                            return (
                              <TouchableOpacity
                                key={idx}
                                onPress={() => changeItem('size', s)}
                                style={[
                                  styles.chip,
                                  isSelected && styles.chipSelected,
                                ]}>
                                <Text
                                  style={[
                                    styles.chipText,
                                    isSelected && styles.chipTextSelected,
                                  ]}>
                                  {s}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      ) : (
                        <TextInput
                          style={styles.input}
                          value={item?.size ?? ''}
                          placeholder={t('Beden')}
                          placeholderTextColor={'#8f8f8f'}
                          onChangeText={text => changeItem('size', text)}
                        />
                      )}
                    </View>
                  )}

                  {/* Conditional Color Option */}
                  {Boolean(item?.hasColor) && (
                    <View style={styles.optionContainer}>
                      <Text style={styles.optionLabel}>
                        {t('Renk') || 'Renk'}:
                      </Text>
                      {Array.isArray(item.colors) && item.colors.length > 0 ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.chipsScrollContent}>
                          {item.colors.map((c, idx) => {
                            const isSelected =
                              String(item.color || '').trim() ===
                              String(c).trim();
                            return (
                              <TouchableOpacity
                                key={idx}
                                onPress={() => changeItem('color', c)}
                                style={[
                                  styles.chip,
                                  isSelected && styles.chipSelected,
                                ]}>
                                <Text
                                  style={[
                                    styles.chipText,
                                    isSelected && styles.chipTextSelected,
                                  ]}>
                                  {c}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      ) : (
                        <TextInput
                          style={styles.input}
                          value={item?.color ?? ''}
                          placeholder={t('Renk') || 'Renk'}
                          placeholderTextColor={'#8f8f8f'}
                          onChangeText={text => changeItem('color', text)}
                        />
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
