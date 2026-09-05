import {
  Button,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Touchable,
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

const CartItem = ({
  item,
  onRemove,
  onIncrease,
  onDecrease,
  checkItem,
  onChange,
  navigation,
}) => {
  const changeItem = (field, value) => {
    onChange(item.url, field, value);
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
                  <TouchableOpacity onPress={() => openUrl(item.url)}>
                    <Text style={styles.url}>{item.title || item.url}</Text>
                  </TouchableOpacity>
                  {Boolean(item?.price) && (
                    <Text style={styles.priceText}>
                      {String(item.price).toLowerCase().includes(String(item.currency || '').toLowerCase())
                        ? item.price
                        : `${item.price} ${item.currency || 'TL'}`}
                    </Text>
                  )}
                </View>
                <View style={styles.trashIconWrapper}>
                  <TouchableOpacity
                    title="Sil"
                    onPress={() => onRemove(item.url)}
                    style={styles.trashButton}>
                    <TrashIcon width={20} height={20} fill={'red'} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.sizeInputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={item?.size ?? ''}
                    placeholder={t('Beden')}
                    placeholderTextColor={'#8f8f8f'}
                    onChangeText={text => changeItem('size', text)}
                  />
                </View>
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
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F15927',
    marginBottom: 5,
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
