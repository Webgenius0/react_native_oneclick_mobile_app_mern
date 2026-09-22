import {useCallback, useContext, useEffect, useState, createRef} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  SafeAreaView,
  Text,
  View,
  StyleSheet,
  Image,
  Touchable,
  TouchableOpacity,
  Alert,
  ScrollView,
  Button,
  FlatList,
  TextInput,
  Pressable,
  RefreshControl,
} from 'react-native';

import {t, tr} from '../translate/i18n';
import {EmContext} from '../contexts/EmContext';
import Dump from '../components/Dump';
import FastImage from 'react-native-fast-image';
import gs from '../assets/GlobalStyle';
import {delay, randomNumber, shorten} from '../helpers/common';

import {devCart, useCartStore, isCartItemComplete} from '../store/useCartStore';
import CartItem from '../components/cart/CartItem';
import Colors from '../assets/Colors';
import CartManuelItemModal from '../components/cart/CartManuelItemModal';
import {getToken, getUser} from '../helpers/auth';
import ai from '../helpers/ai';
import Loading from '../components/Loading';
import RNPickerSelect from 'react-native-picker-select';
import {useFocusEffect} from '@react-navigation/native';
import TeslimatSehirPicker from '../components/TeslimatSehirPicker';
import { useExchangeRateStore } from '../store/useExchangeRateStore';
import {
  calculateConvertedPrice,
  parsePrice,
  normalizeCurrency,
} from '../helpers/currencyHelper';

export default function CartPage({navigation, route}) {
  const insets = useSafeAreaInsets();
  // Ana sepet bileşeni
  const {
    items,
    addItem,
    removeItem,
    checkItem,
    updateItem,
    updateAll,
    increaseCount,
    decreaseCount,
    clearCart,
    updateField,
    updateOption,
  } = useCartStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedValue, setSelectedValue] = useState(null);
  const [teslimatSehirs, setTeslimatSehirs] = useState([]);
  const [teslimatSehirID, setTeslimatSehirID] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reRender, setReRender] = useState(0);
  const deliveryRef = createRef();

  const { rates, inverseRates, fetchRates } = useExchangeRateStore();

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const checkedItems = items ? items.filter(item => item.checked === true) : [];
  const totalItems = items.reduce((sum, item) => sum + item.count, 0);
  const totalUsd = checkedItems.reduce((sum, item) => {
    const unitUsd = calculateConvertedPrice(
      item.price,
      item.currency,
      rates,
      inverseRates,
    );
    if (unitUsd !== null && unitUsd > 0) {
      return sum + unitUsd * (item.count || 1);
    }
    return sum;
  }, 0);

  // setTitle
  useEffect(() => {
    let title = t('Sepet');
    if (totalItems > 0) {
      title += ' - ' + totalItems + ' ' + t('Ürün');
    }

    navigation.setOptions({
      headerTitle: title,
    });
  }, [navigation, totalItems]);

  const changeItem = (url, field, value) => {
    updateField(url, field, value);
  };

  const addItemPress = () => {
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      Alert.alert(t('Lütfen bekleyin'));
      return;
    }

    setIsSubmitting(true);

    // Sepeti onayla
    const user = await getUser();
    if (user && user.kod === 'GUEST') {
      Alert.alert(
        t('Sipariş verebilmeniz için üye girişi yapın veya kayıt olun'),
      );
      setIsSubmitting(false);
      return;
    }

    if (items.length === 0) {
      Alert.alert(t('Sepetinizde hiç ürün yok'));
      setIsSubmitting(false);
      return;
    }

    if (teslimatSehirID === null || teslimatSehirID === 0) {
      Alert.alert(t('Lütfen teslimat şehri seçin'));
      setIsSubmitting(false);
      return;
    }

    let postData = new FormData();
    const checkedLen = (items ? items.filter(item => item.checked === true).length : 0) || 0;

    if(checkedLen === 0){
      Alert.alert(t('Lütfen en az bir ürünü seçin'));
      setIsSubmitting(false);
      return;
    }


    // Check if any checked item has incomplete variant details
    const incompleteItems = items.filter(
      item => item.checked === true && !isCartItemComplete(item),
    );

    if (incompleteItems.length > 0) {
      const incompleteNames = incompleteItems
        .map(i => i.title || i.url)
        .slice(0, 3)
        .join('\n• ');

      Alert.alert(
        t('Uyarı'),
        `${t('eksikUrunDetayi') || 'Lütfen sipariş vermeden önce seçili ürünlerin beden / renk detaylarını tamamlayınız.'}\n\n• ${incompleteNames}`,
        [{ text: t('Tamam') || 'Tamam' }]
      );
      setIsSubmitting(false);
      return;
    }

    var i = 0;
    let commonMarketplace = '';
    items.forEach(item => {
      if (item.checked === false) {
        return;
      }

      const storeName = item.store ? item.store : '';
      if (!commonMarketplace && storeName) {
        commonMarketplace = storeName;
      }

      const parsedPriceVal = parsePrice(item.price);
      const normalizedCurr = normalizeCurrency(item.currency, item.price);
      const convertedPriceVal = calculateConvertedPrice(
        item.price,
        item.currency,
        rates,
        inverseRates,
      );

      // fill post data with both new schema fields and backwards compatibility fields
      postData.append('cart[' + i + '][ad]', item.title);
      postData.append('cart[' + i + '][link]', item.url);
      postData.append('cart[' + i + '][sayi]', item.count);
      postData.append('cart[' + i + '][size]', item.size ? item.size : '');
      postData.append('cart[' + i + '][color]', item.color ? item.color : '');
      postData.append('cart[' + i + '][renk]', item.color ? item.color : '');
      postData.append('cart[' + i + '][store]', storeName);
      postData.append('cart[' + i + '][store_name]', storeName);
      postData.append('cart[' + i + '][magaza]', storeName);
      postData.append('cart[' + i + '][marketplace]', storeName);

      if (parsedPriceVal !== null) {
        postData.append('cart[' + i + '][price]', parsedPriceVal);
        postData.append('cart[' + i + '][original_price]', parsedPriceVal);
        postData.append('cart[' + i + '][fiyat]', parsedPriceVal);
      } else {
        postData.append('cart[' + i + '][fiyat]', item.price ? item.price : '');
      }

      postData.append('cart[' + i + '][currency]', normalizedCurr);
      postData.append('cart[' + i + '][original_currency]', normalizedCurr);
      postData.append('cart[' + i + '][parabirim]', normalizedCurr);

      if (convertedPriceVal !== null) {
        postData.append('cart[' + i + '][converted_price]', convertedPriceVal);
        postData.append('cart[' + i + '][price_usd]', convertedPriceVal);
        postData.append('cart[' + i + '][fiyat_usd]', convertedPriceVal);
        postData.append('cart[' + i + '][converted_currency]', 'USD');
        postData.append('cart[' + i + '][target_currency]', 'USD');
      }

      let optionsStr = '';
      if (Array.isArray(item.options) && item.options.length > 0) {
        optionsStr = item.options
          .filter(o => o && o.name && o.selected)
          .map(o => `${o.name}: ${o.selected}`)
          .join(', ');
        if (optionsStr) {
          postData.append('cart[' + i + '][options]', optionsStr);
        }
      }

      const combinedDesc = [item.desc, optionsStr].filter(Boolean).join(' | ');
      postData.append('cart[' + i + '][acik]', combinedDesc);
      postData.append('cart[' + i + '][img]', item.image);
      postData.append('file[' + i + ']', item?.imageData || '');
      i++;
      // add imageData file to postData
    });

    let token = await getToken();
    postData.append('token', token);
    postData.append('teslimatSehirID', teslimatSehirID);
    if (commonMarketplace) {
      postData.append('marketplace', commonMarketplace);
    }
    // console.log("postData", postData);
    const response = await ai.post('new-order-multiple', postData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.error === false) {
      console.log('Error false', response.data);

      setIsSubmitting(false);

      const orderIds = response.data.order_ids || (response.data.order_id ? [response.data.order_id] : []);
      const grupID = response.data.grupID;
      const totalUsd = response.data.total_usd;

      // If backend returned direct approval (Status 16) with total_usd and IDs, go directly to PaymentStart.
      // DO NOT clear cart here: cart items remain until payment is successfully completed!
      if (totalUsd !== undefined && (grupID || (orderIds && orderIds.length > 0))) {
        navigation.navigate('PaymentStart', {
          quick: true,
          tutar: totalUsd,
          siparis_ids: orderIds,
          siparis_id: orderIds.length > 0 ? orderIds[0] : null,
          grupID: grupID,
        });
      } else {
        // For orders that do not go to online payment (quote request or manual review), clear cart
        if (checkedLen === items.length) {
          clearCart();
        } else {
          let newItems = items.filter(item => item.checked !== true);
          updateAll(newItems);
        }

        Alert.alert(tr('Sipariş Alındı'));
        setTimeout(function () {
          let d = +new Date();
          navigation.navigate('Orders', {refetch: d});
        }, 1000);
      }
    } else {
      Alert.alert(tr('Hata Oluştu'));
      setIsSubmitting(false);

      console.log('Hata Oluştu', response.data);
    }
  };

  const styles = StyleSheet.create({
    safe: {
      backgroundColor: '#EEE',
      flex: 1,
      width: '100%',
      height: '100%',
    },
    flatContainer: {
      flex: 1,
      paddingHorizontal: 10,
      paddingTop: 10,
      borderBottomWidth: 3,
      borderBottomColor: '#dad8d8',
    },
    noItemsContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
    btnContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      // backgroundColor: '#FFF',
      paddingTop: 5,
      paddingHorizontal: 7,
      paddingBottom: 5 + insets.bottom,
    },
    infoContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#FFF',
      paddingTop: 5,
      paddingHorizontal: 7,
      paddingBottom: 5,
    },
    totalUsdText: {
      fontSize: 15,
      fontWeight: 'bold',
      color: Colors.primary || '#F15927',
      marginTop: 2,
    },
    btn: {
      backgroundColor: '#FF5D5D',
      padding: 10,
      width: '32%',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#EEE',
      borderRadius: 10,
      flexDirection: 'row',
    },
    btnText: {
      color: '#FFF',
      fontSize: 14,
      textAlign: 'center',
      width: '100%',
    },
    btnTemizle: {
      backgroundColor: '#FF5D5D',
    },
    btnUrunEkle: {
      backgroundColor: '#757575',
    },
    btnOnayla: {
      backgroundColor: Colors.primary,
    },
  });

  const itemsLen = items.length;
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);

    setReRender(prev => prev + 1);
    setRefreshing(false);
    console.log('Rendered');
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const response = await ai.post('cart-data');
    // console.log(response?.data);
    if (response?.data?.error === false) {
      setTeslimatSehirs(response.data.teslimatSehirs);
      setTeslimatSehirID(response.data.teslimatSehirID);
      setLoading(false);
    } else {
      console.log('Hata Oluştu', response.data.msg);
      Alert.alert(tr('Hata Oluştu'));
      setLoading(false);
    }
  };

  /*useEffect(() => {
    fetchData();
    return () => {
      // fetchData();
    };
  }, []);*/

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  /*  useFocusEffect(useCallback(() => {
      console.log('CartPage focused');
    }, [totalItems]));*/

  // console.log('Rendered ' + +new Date());
  // console.log('items len ', items.length);

  return (
    <SafeAreaView style={styles.safe}>
      {itemsLen > 0 && (
        <View style={styles.flatContainer}>
          <FlatList
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            data={items}
            renderItem={({item}) => (
              <CartItem
                item={item}
                onRemove={removeItem}
                checkItem={checkItem}
                onIncrease={increaseCount}
                onDecrease={decreaseCount}
                onChange={changeItem}
                onUpdateOption={updateOption}
                navigation={navigation}
              />
            )}
            keyExtractor={(item, index) => item.id || `${item.url}_${index}`}
          />
        </View>
      )}

      {itemsLen === 0 && (
        <View style={styles.noItemsContainer}>
          <Image
            source={require('../assets/img/cart.png')}
            style={{width: 100, height: 100, marginBottom: 20}}
          />
          <Text style={{fontSize: 20, color: '#888'}}>
            {t('Sepetinizde hiç ürün yok')}
          </Text>
        </View>
      )}

      <Dump teslimatSehirs={teslimatSehirs} show={false} />

      <CartManuelItemModal
        addItem={addItem}
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
      />

      <Dump items={items} scroll={true} show={false} />

      {!loading && (
        <>
          <View style={styles.infoContainer}>
            <View style={{flexDirection: 'column', alignItems: 'flex-start'}}>
              <Text style={{fontSize: 14, color: '#888'}}>
                {
                  totalItems > 0 ? totalItems + ' ' + t('Ürün') : ''
                }
              </Text>
              {totalUsd > 0 && (
                <Text style={styles.totalUsdText}>
                  {`$${totalUsd.toFixed(2)} USD`}
                </Text>
              )}
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              {/*<TouchableOpacity
                onPress={() => {
                  deliveryRef.current.togglePicker(true);
                }}>*/}
               {/* <Text
                  style={{
                    color: '#333',
                    marginEnd: 10,
                    marginBottom: Platform.select({
                      ios: 0,
                      android: 15,
                    }),
                  }}>
                  {t('Teslimat Şehri')}
                </Text>*/}
              {/*</TouchableOpacity>*/}
              <TeslimatSehirPicker
                refProps={deliveryRef}
                teslimatSehirID={teslimatSehirID}
                setTeslimatSehirID={setTeslimatSehirID}
                teslimatSehirs={teslimatSehirs}
                changeText={false}
                label={true}
              />

              {/*<RNPickerSelect
                ref={deliveryRef}
                onValueChange={value => setTeslimatSehirID(value)}
                placeholder={{label: ('Şehir Seçin'), value: null}}
                items={teslimatSehirs}
                value={teslimatSehirID || 0}
                useNativeAndroidPickerStyle={false}
                style={{
                  inputAndroid: {
                    color: '#333',
                    fontSize: 14,
                    padding: 0,
                    margin: 0,
                    marginBottom: 15,
                  },
                  inputIOS: {
                    color: '#333',
                    fontSize: 14,
                    padding: 0,
                    margin: 0,
                    paddingBottom: 0,
                  },
                  iconContainer: {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    paddingBottom: 0,
                  },
                  viewContainer: {
                    padding: 0,
                    margin:0,
                  },
                  placeholder: {
                    margin: 0,
                    padding: 0
                  },
                }}
                color={"#000"}
              />*/}
            </View>
          </View>

          <View style={styles.btnContainer}>
            <TouchableOpacity
              style={[styles.btn, styles.btnTemizle]}
              onPress={clearCart}>
              <Text style={styles.btnText}>{t('Sepeti Temizle')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnUrunEkle]}
              onPress={addItemPress}>
              <Text style={styles.btnText}>{t('Ürün Ekle')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnOnayla]}
              disabled={isSubmitting}
              onPress={handleSubmit}>
              {isSubmitting && <Loading status={true} color="#FFF" />}
              {!isSubmitting && (
                <Text style={styles.btnText}>{t('Sepeti Onayla')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
