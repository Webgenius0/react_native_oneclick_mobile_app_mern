import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {useContext, useEffect, useState} from 'react';
import moment from 'moment';
import GlobalStyle from '../assets/GlobalStyle';
import Colors from '../assets/Colors';
import OrderStatus from '../components/OrderStatus';
import ai from '../helpers/ai';
import {tr} from '../translate/i18n';
import {useNavigation} from '@react-navigation/native';
import {EmContext} from '../contexts/EmContext';

export default function ({route, navigation}) {
  const {ctx} = useContext(EmContext);

  const gs = GlobalStyle;

  let s = route.params?.s;

  const [state, setState] = useState({
    data: [],
    loading: false,
    status_loading: false,
    refetch: null,
  });

  const fetchOrder = async () => {
    const c = await ai.get('order-detail', {id: route.params?.id});
    if (c.data.error === false) {
      s = c.data.data;
    } else {
      alert(tr('Hata Oluştu'));
    }
  };
  if (!s && route.params?.id) {
  }

  const updateStatus = async (id, status) => {
    const c = await ai.post('order-status-update', {durum: status, id: id});
    let ns = {...state, status_loading: false};
    if (c.data.error === false) {
      ns.refetch = +new Date();
      s.durum = status;
    } else {
      alert(tr('Hata Oluştu'));
    }

    setState(ns);
  };

  useEffect(() => {
    navigation.setOptions({
      title: tr('Sipariş Detay') + ' #' + s.id,
    });
  }, []);

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: ctx.bgColor,
    },
    container: {
      flex: 1,
      backgroundColor: ctx.bgColor,
      justifyContent: 'flex-start',
      flexDirection: 'column',
      paddingHorizontal: 15,
      paddingVertical: 20,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      paddingVertical: 5,
      borderBottomWidth: 1,
      borderBottomColor: ctx.isDark ? '#EEE' : '#a4a4a4',
    },
    noBorder: {
      borderBottomWidth: 0,
    },
    imgContainer: {
      width: '100%',
      maxHeight: 300,
      paddingHorizontal: 5,
      borderWidth: 1,
      borderColor: '#ccc',
      // backgroundColor: "#ccc",
      justifyContent: 'center',
      alignItems: 'center',
    },
    img: {
      width: 250,
      height: 250,
      borderRadius: 5,
    },
    label: {
      fontSize: 16,
      fontWeight: 'bold',
      paddingHorizontal: 10,
      color: ctx.color,
      flex: 0.8,
    },
    value: {
      fontSize: 16,
      textBreakStrategy: 'character',
      textWrap: 'wrap',
      maxWidth: '80%',
      color: ctx.color,
      flex: 1,
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
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView>
          {s.img && s.img.length > 0 ? (
            <View style={styles.row}>
              <View style={styles.imgContainer}>
                <Image
                  style={styles.img}
                  source={{uri: s.img}}
                  resizeMode="contain"
                />
              </View>
            </View>
          ) : null}

          <View style={styles.row}>
            <Text style={styles.label}>{tr('Fiş No')}</Text>
            <Text style={styles.value}>{s.id}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{tr('Durum')}</Text>
            <Text style={styles.value}>
              <OrderStatus durum={parseInt(s.durum)} />
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{tr('Tarih')}</Text>
            <Text style={styles.value}>
              {moment(s.tarih).format('DD.MM.YYYY') + ' ' + s.saat}
            </Text>
          </View>
          {/*<View style={styles.row}>
            <Text style={styles.label}>{tr("Fiyat")} ₺</Text>
            <Text style={styles.value}>{s.fiyat ? "₺" +s.fiyat : ""}</Text>
          </View>*/}
          <View style={styles.row}>
            <Text style={styles.label}>{tr('Fiyat')} $</Text>
            <Text style={styles.value}>
              {s.fiyat_usd > 0 ? '$' + s.fiyat_usd : ''}
            </Text>
          </View>
          {s.nakliye > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>
                {tr('Nakliye ücreti')} ${/*Shipping fee*/}
              </Text>
              <Text style={styles.value}>
                {s.nakliye > 0 ? s.nakliye : ''}{' '}
              </Text>
            </View>
          )}
          {/*<View style={styles.row}>
            <Text style={styles.label}>{tr("Komisyon ücreti")} $Shipping fee</Text>
            <Text style={styles.value}>{s.komisyon_usd > 0 ? '$'+s.komisyon_usd: ""} </Text>
          </View>*/}
          {/*<View style={styles.row}>
            <Text style={styles.label}>{tr("Kur")}</Text>
            <Text style={styles.value}>{s.kur > 0 ?  "₺"+s.kur : ""}</Text>
          </View>*/}
          <View style={styles.row}>
            <Text style={styles.label}>{tr('Beden')}</Text>
            <Text style={styles.value}>{s.size}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{tr('Teslimat Şehri')}</Text>
            <Text style={styles.value}>{s.teslimatSehir}</Text>
          </View>
          {s.acik.length > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>{tr('Açıklama')}</Text>
              <Text style={styles.value}>{s.acik}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>{tr('Link')}</Text>
            <View style={[gs.pr5, GlobalStyle.flex1]}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Webview', {url: s.link})}>
                <Text style={styles.value}>{s.link}</Text>
              </TouchableOpacity>
            </View>
          </View>
         {/* {parseInt(s.durum) === 15 && (
            <View style={[styles.row, gs.pl20, gs.pr20, gs.mt30]}>
              <>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => updateStatus(s.id, 16)}>
                  <Text style={styles.acceptBtnText}>{tr('KABUL ET')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => updateStatus(s.id, 17)}>
                  <Text style={styles.rejectBtnText}>{tr('REDDET')}</Text>
                </TouchableOpacity>
              </>
            </View>
          )}
          {parseInt(s.durum) === 14 && (
            <View
              style={[styles.row, styles.noBorder, gs.pl20, gs.pr20, gs.mt30]}>
              <>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => updateStatus(s.id, 17)}>
                  <Text style={styles.rejectBtnText}>{tr('İPTAL ET')}</Text>
                </TouchableOpacity>
              </>
            </View>
          )}*/}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
