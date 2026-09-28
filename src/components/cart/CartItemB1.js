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
import {cleanProductTitle} from '../../helpers/storeHelper';

const CartItemB1 = ({
  item,
  onRemove,
  onIncrease,
  onDecrease,
  onChange,
  navigation,
}) => {
  const changeItem = (field, value) => {
    onChange(item.url, field, value);
  };

  const openUrl = url => {
    navigation.navigate('WebviewLite', {url: url});
  };

  return (
    <View
      style={{
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
      }}>
      <View
        style={{
          flexDirection: 'row',
          marginBottom: 10,
        }}>
        <View
          style={{
            flexDirection: 'column',
            flex: 1,
          }}>
          <View
            style={{
              flexDirection: 'row',
            }}>
            <CartItemImage item={item} onChange={onChange} />
            <View style={{flex: 1, flexDirection: 'column'}}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  // justifyContent: 'space-between',
                  width: '100%',
                  flex: 1,
                  marginBottom: 5,
                 //   backgroundColor: '#FAA',
                }}>
                <View style={{flex: 1}}>
                  <TouchableOpacity onPress={() => openUrl(item.url)}>
                    <Text
                      numberOfLines={2}
                      ellipsizeMode="tail"
                      style={styles.url}>
                      {cleanProductTitle(item.title, item.url)}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{width: 30,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <TouchableOpacity
                    title="Sil"
                    onPress={() => onRemove(item.url)}
                    style={{
                      // backgroundColor: 'red',
                      padding: 5,
                      borderRadius: 5,
                    }}>
                    <TrashIcon width={20} height={20} fill={'red'} />
                    {/*<Text style={{color: 'white'}}>Sil</Text>*/}
                  </TouchableOpacity>
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    flex: 1,
                    // backgroundColor: '#FAA',
                    paddingRight: 10,
                  }}>
                  {/*<Text style={styles.label}>Size</Text>*/}
                  <TextInput
                    style={styles.input}
                    value={item?.size}
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
          value={item.desc}
          maxLength={500}
          returnKeyType="done"
          placeholderTextColor={'#8f8f8f'}
          placeholder={t('Açıklama')}
          onKeyPress={e => {
            if (e.nativeEvent.key === 'Enter') {
              Keyboard.dismiss();
            }
          }}
          onChangeText={text => changeItem('desc', text)}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  textarea: {
    width: '100%',
    height: 60,
    padding: 10,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
  },
  input: {
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    padding: 5,
    minHeight: 30,
    flex: 1,
  },
  url: {
    marginBottom: 10,
    flexShrink: 1,
  },
});

export default CartItemB1;
