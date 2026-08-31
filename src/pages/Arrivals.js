import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TouchableHighlight,
  Image,
  SafeAreaView,
} from 'react-native';
import {useCallback, useContext, useEffect, useState} from 'react';
import FastImage from 'react-native-fast-image';
import GlobalStyle from '../assets/GlobalStyle';
import Colors from '../assets/Colors';
import ai from '../helpers/ai';
import Dump from '../components/Dump';
import {delay, lb} from '../helpers/common';
import {useFocusEffect, useIsFocused} from '@react-navigation/native';
import OrderStatus from '../components/OrderStatus';
import {tr} from '../translate/i18n';
import AuthHeader from '../components/AuthHeader';
import NotifyIcon from '../assets/svg/notification.svg';
import NotificationButton from '../components/NotificationButton';
import {EmContext} from '../contexts/EmContext';
import OrderItem from '../components/OrderItem';
import FadeInBottom from '../components/FadeInBottom';

const gs = GlobalStyle;
const cs = Colors;

export default function ({route, navigation}) {
  const {ctx} = useContext(EmContext);

  const isFocused = useIsFocused();
  const [state, setState] = useState({
    data: [],
    loading: true,
    status_loading: false,
    aktif: [5, 11, 6],
    refetch: route?.params?.refetch || 0,
  });

  const btns = [
    {durum: [5, 11, 6], ad: tr('Tüm Siparişler')}, // All Orders
    {durum: 5, ad: tr('Teslimat Deposunda')}, // Irak Depoda
    {durum: 11, ad: tr('Dağıtımda')}, // In Transit
    {durum: 6, ad: tr('Teslim Edildi')}, // Delivered
  ];

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [state.aktif, state.refetch]),
  );

  const fetchData = async () => {
    lb('FETCH ARRIVAL ORDERS');

    setState({...state, loading: true});

    const c = await ai.post('orders', {durum: state.aktif});
    let ns;
    // console.log("data", c.data);
    if (c.data.error === false) {
      ns = {...state, data: c.data.ss, loading: false};
    } else {
      alert(tr('Hata Oluştu'));
      ns = {...state, data: [], loading: false};
    }

    setState(ns);
  };

  const styles = StyleSheet.create({
    deliveredBtnText: {
      color: ctx.color,
      fontSize: 12,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    text: {
      color: ctx.color,
    },
    acceptBtn: {
      backgroundColor: Colors.btnColor,
      borderRadius: 5,
      marginRight: 10,
      paddingVertical: 5,
      paddingHorizontal: 5,
    },
    acceptBtnText: {
      color: '#FFF',
    },
    rejectBtn: {
      backgroundColor: 'transparent',
      borderColor: 'red',
      borderWidth: 1,
      paddingHorizontal: 5,
      paddingVertical: 5,
      borderRadius: 5,
    },
    rejectBtnText: {
      color: 'red',
    },
    detailBtn: {
      //backgroundColor: '#00BFA6',
      paddingHorizontal: 10,
      alignItems: 'center',
    },
    detailBtnText: {
      color: Colors.btnColor,
      fontWeight: 'bold',
    },
    imgColumn: {
      // backgroundColor: "#000",
      alignItems: 'center',
      minWidth: 150,
    },
    detailColumn: {
      flex: 2,
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'flex-start',
      // backgroundColor: "gray",
    },
    detailCol1: {
      flex: 1,
      flexDirection: 'column',
      // backgroundColor: "blue",
      justifyContent: 'flex-start',
    },
    detailCol2: {flexDirection: 'row', justifyContent: 'space-between'},
    detailRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      // backgroundColor: 'red'
    },
    detailLabel: {
      minWidth: 40,
      color: ctx.color,
    },

    container: {
      flex: 1,
      backgroundColor: ctx.bgColor,
      justifyContent: 'flex-start',
      flexDirection: 'column',
    },
    btn: {
      backgroundColor: '#f4511e',
      borderColor: '#f4511e',
      padding: 8,
      marginHorizontal: 5,
      marginVertical: 7,
      borderRadius: 5,
    },
    aktifBtn: {
      backgroundColor: '#ff8800',
      borderColor: '#f4511e',
      padding: 8,
      marginHorizontal: 5,
      marginVertical: 7,
      borderRadius: 5,
    },
    btnText: {
      color: ctx.isLight ? '#FFF' : '#000',
      fontSize: 14,
      textAlign: 'center',
    },
    itemContainer: {
      padding: 10,
      paddingBottom: 200,
      // flexDirection: "column",
    },

    item: {
      borderColor: '#EEE',
      borderWidth: 1,
      padding: 5,
      marginBottom: 5,
      borderRadius: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },

    title: {
      fontSize: 16,
    },
    img: {
      width: 100,
      height: 100,
      // borderRadius: 10,
    },

    safeArea: {
      flex: 1,
      backgroundColor: ctx.bgColor,
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <AuthHeader route={route} navigation={navigation} />

        <View style={{height: 50}}>
          <ScrollView horizontal={true} snapToStart={0}>
            {btns.map((item, index) => {
              return (
                <TouchableOpacity
                  key={index}
                  style={
                    JSON.stringify(state.aktif) === JSON.stringify(item.durum)
                      ? styles.aktifBtn
                      : styles.btn
                  }
                  onPress={() => setState({...state, aktif: item.durum})}>
                  <Text style={styles.btnText}>{item.ad}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {state.loading ? (
          <View
            style={[
              gs.justifyCenter,
              gs.alignCenter,
              {backgroundColor: ctx.bgColor, flex: 5},
            ]}>
            <Text>{tr('Yükleniyor')}...</Text>
          </View>
        ) : null}

        {!state.loading && state.data.length > 0 ? (
          <ScrollView
            style={styles.itemContainer}
            contentContainerStyle={{paddingBottom: 20}}>
            {state.data.map((item, index) => (
              <OrderItem
                key={index}
                item={item}
                state={state}
                setState={setState}
              />
            ))}
          </ScrollView>
        ) : null}

        {!state.loading && state.data.length === 0 ? (
          <View
            style={[
              gs.justifyCenter,
              gs.alignCenter,
              {backgroundColor: '#FFF', flex: 5, paddingBottom: 50},
            ]}>
            <Image
              source={require('../assets/img/cart.png')}
              style={{width: 100, height: 100, marginBottom: 20}}
            />
            <FadeInBottom duration={500}>

            <Text style={[gs.f14]}>{tr('Hiç Sipariş Yok')}</Text>
            </FadeInBottom>
            {/*You have no orders*/}
            <FadeInBottom duration={2000}>
              <TouchableOpacity
                style={[gs.btn, gs.p10, gs.mt10]}
                onPress={() => navigation.navigate('CategoryList')}>
                <Text style={[gs.bold, gs.textWhite]}>
                  {tr('Alışverişe Başla')}
                </Text>
                {/*Start to order*/}
              </TouchableOpacity>
            </FadeInBottom>

            {/*<Dump data={state} />*/}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
