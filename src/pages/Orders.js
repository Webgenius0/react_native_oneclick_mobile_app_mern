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
  RefreshControl,
} from 'react-native';
import {useCallback, useContext, useEffect, useState} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import FastImage from 'react-native-fast-image';
import GlobalStyle from '../assets/GlobalStyle';
import Colors from '../assets/Colors';
import ai from '../helpers/ai';
import Dump from '../components/Dump';
import {delay, lb, trDate} from '../helpers/common';
import {CommonActions, useFocusEffect, useIsFocused} from '@react-navigation/native';
import {getMessaging, onMessage} from '@react-native-firebase/messaging';
import OrderStatus from '../components/OrderStatus';
import {tr} from '../translate/i18n';
import NoImage from '../assets/svg/no-image.svg';
import OrderItem from '../components/OrderItem';
import {EmContext} from '../contexts/EmContext';
import FadeInBottom from '../components/FadeInBottom';
import Loading from '../components/Loading';
import NoOrders from '../components/orders/NoOrders';
import OrdersLoading from '../components/orders/Loading';
import GroupItem from '../components/orders/GroupItem';
import {FIREBASE_ENABLED} from '../../config';

const gs = GlobalStyle;

export default function ({route, navigation}) {
  const insets = useSafeAreaInsets();
  const {ctx, setCtx} = useContext(EmContext);
  const isFocused = useIsFocused();

  const [data, setData] = useState([]);
  const [grups, setGrups] = useState([]);
  const [aktif, setAktif] = useState(0);
  const [refetch, setRefetch] = useState(route?.params?.refetch || 0);
  // const [id, setId] = useState(route?.params?.id || 0);
  const [grupID, setGrupID] = useState(route?.params?.grupID || 0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const btns = [
    {durum: 0, ad: tr('Tüm Siparişler')}, // All Orders
    {durum: [7, 8, 9, 10, 12, 13, 17], ad: tr('İptal Edildi')}, // Canceled
    {durum: [1, 14, 15, 16, 18, 19], ad: tr('Beklemede')}, // Waiting
    {durum: [2], ad: tr('Sipariş Verildi')}, // In Transit
    {durum: [5], ad: tr('Teslimat Deposunda')}, // Delivered
    {durum: [3, 4], ad: tr('Taşımada')}, // In Transit
    {durum: [11], ad: tr('Dağıtımda')}, // In Transit
    {durum: [6], ad: tr('Teslim Edildi')}, // Delivered
  ];

  const resetId = () => {
    //setId(0);
    // setGrupID(0);
    // setRefetch(+new Date());

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'AuthAfter',
            params: {
              screen: 'Orders',
              params: {
                grupID: 0,
                refetch: +new Date(),
              },
            },
          },
        ],
      }),
    );
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [aktif, refetch, grupID]),
  );

  useEffect(() => {
    if (!isFocused || !FIREBASE_ENABLED) {
      return;
    }

    let unsubscribe;
    try {
      unsubscribe = onMessage(getMessaging(), () => {
        setRefetch(+new Date());
      });
    } catch (e) {
      console.log('Orders onMessage error:', e?.message || e);
    }

    return unsubscribe;
  }, [isFocused]);
  /*
    useEffect(() => {
      fetchData();
    }, [id]);*/

  const fetchData = async () => {
    // lb('FETCH ORDERS '+trDate());

    if (grups.length === 0) {
      setLoading(true);
    }
    // await delay(100);

    const c = await ai.post('orders', {
      durum: aktif,
      // id: id,
      grupID: route?.params?.grupID || 0,
    });

    let ns, nGrups;
    // console.log('data', c.data);
    if (c.data.error === false) {
      ns = c.data.ss;
      nGrups = c.data.grups;
    } else {
      alert(tr('Hata Oluştu'));
      ns = [];
      nGrups = [];
    }
    setData(ns);
    setGrups(nGrups);
    setLoading(false);
  };

  const onRefresh = useCallback(() => {
    console.log('onRefresh');
    var newD = +new Date();
    setRefetch(newD);
  }, []);

  const goToCategoryList = () => {
    navigation.navigate('CategoryList');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'flex-start',
      flexDirection: 'column',
      backgroundColor: ctx.bgColor,
    },

    btn: {
      backgroundColor: '#f4511e',
      borderColor: '#f4511e',
      padding: 10,
      marginHorizontal: 5,
      marginVertical: 7,
      borderRadius: 10,
    },

    aktifBtn: {
      backgroundColor: '#ff8800',
      borderColor: '#f4511e',
      padding: 10,
      marginHorizontal: 5,
      marginVertical: 7,
      borderRadius: 10,
    },

    btnText: {
      color: '#fff',
      fontSize: 14,
      textAlign: 'center',
    },
    scrollContainer: {
      backgroundColor: ctx.isLight ? '#ececec' : '#2c2c2c',
      // flexDirection: "column",
    },
    itemContainer: {
      padding: 10,
      backgroundColor: ctx.isLight ? '#ececec' : '#2c2c2c',
      // flexDirection: "column",
    },
    itemContainerStyle: {
      paddingBottom: 20,
      backgroundColor: ctx.isLight ? '#ececec' : '#2c2c2c',
    },
    title: {
      fontSize: 16,
    },
    safeArea: {
      flex: 1,
      backgroundColor: ctx.bgColor,
      paddingTop: insets.top,
    },
    btnContainerStyle: {
      backgroundColor: ctx.bgColor,
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={{height: 50, backgroundColor: ctx.bgColor}}>
          <ScrollView
            horizontal={true}
            style={styles.scrollContainer}
            containerStyle={styles.btnContainerStyle}
            snapToStart={0}>
            {btns.map((item, index) => {
              return (
                <TouchableOpacity
                  key={index}
                  style={
                    JSON.stringify(aktif) === JSON.stringify(item.durum)
                      ? styles.aktifBtn
                      : styles.btn
                  }
                  onPress={() => {
                    setLoading(true);
                    setAktif(item.durum);
                  }}>
                  <Text style={styles.btnText}>{item.ad}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <OrdersLoading loading={loading} gs={gs} />
        </View>

        {!loading && grups.length > 0 ? (
          <>
            <ScrollView
              style={styles.itemContainer}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              contentContainerStyle={styles.itemContainerStyle}>

              {grups.map((item, index) => (
                <GroupItem
                  key={index}
                  s={item}
                  ctx={ctx}
                  navigation={navigation}
                  refetch={refetch}
                  setRefetch={setRefetch}
                />
              ))}

              {grupID > 0 ? (
                <FadeInBottom>
                  <TouchableOpacity
                    style={[gs.btn, gs.p10, gs.mt10]}
                    onPress={() => resetId()}>
                    <Text style={[gs.bold, gs.textWhite]}>
                      {tr('Tüm Siparişler')}
                    </Text>
                    {/*Start to order*/}
                  </TouchableOpacity>
                </FadeInBottom>
              ) : null}

            </ScrollView>
          </>
        ) : null}

        <Dump show={false} grups={grups} />

        {loading ? (
          <View
            style={[
              gs.justifyCenter,
              gs.alignCenter,
              gs.p20,
              {backgroundColor: '#FFF', height: '70%'},
            ]}>
            <Loading status={true} size={'large'} color={'#707070'} />
          </View>
        ) : null}

        {!loading && data.length === 0 ? (
          <NoOrders goToCategoryList={goToCategoryList} ctx={ctx} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}
