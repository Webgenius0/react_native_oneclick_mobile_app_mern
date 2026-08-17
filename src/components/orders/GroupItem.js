import React from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import OrderItem from '../OrderItem';
import Dump from '../Dump';
import {tr} from '../../translate/i18n';
import {ODENEBILIR_DURUMS, paymentTypes} from '../../../config';
import GlobalStyle from '../../assets/GlobalStyle';
import Colors from '../../assets/Colors';
import ai from '../../helpers/ai';
import {delay} from '../../helpers/common';
import Loading from '../Loading';

export default function GroupItem({s, ctx, navigation, refetch, setRefetch}) {
  const gs = GlobalStyle;
  const styles = StyleSheet.create({
    container: {
      backgroundColor: ctx.bgColor,
      borderColor: ctx.isLight ? '#e0e0e0' : '#676767',
      borderWidth: 1,
      // paddingVertical: 15,
      paddingBottom: 15,
      paddingHorizontal: 5,
      marginBottom: 5,
      borderRadius: 10,
      justifyContent: 'space-between',
      flexDirection: 'column',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.15,
    },

    detail: {
      flexDirection: 'row',
      paddingTop: 10,
    },
    detailLeft: {
      width: 100,
      alignItems: 'flex-end',
      paddingEnd: 20,
    },
    acceptBtn: {
      backgroundColor: Colors.btnColor,
      borderWidth: 1,
      borderColor: Colors.btnColor,
      borderRadius: 5,
      marginRight: 10,
      paddingVertical: 5,
      paddingHorizontal: 20,
      marginLeft: 10,
    },
    acceptBtnText: {
      color: ctx.isLight ? '#FFF' : '#000',
    },

    rejectBtn: {
      backgroundColor: 'transparent',
      borderColor: 'red',
      borderWidth: 1,
      paddingHorizontal: 5,
      paddingVertical: 5,
      borderRadius: 5,
      minWidth: 75,
    },
    rejectBtnText: {
      color: 'red',
      textAlign: 'center',
    },
  });

  const [cancelLoading, setCancelLoading] = React.useState(false);
  const [cancelEnabled, setCancelEnabled] = React.useState(true);

  let odenebilir = false;

  s.orders.map(order => {
    if (ODENEBILIR_DURUMS.includes(parseInt(order.durum))) {
      odenebilir = true;
    }
  });

  let iptalEdilebilir = false;
  s.orders.map(order => {
    if (order.durum === 14 || order.durum === 15 || order.durum === 21) {
      iptalEdilebilir = true;
    }
  });

  const showCancelDialog = grupID => {
    Alert.alert(
      tr('İşlemi Onayla'),
      tr('İptal etmek istediğinizden eminmisiniz?'),
      [
        {
          text: tr('Kapat'),
          onPress: () => {
            console.log('Cancel Pressed');
          },
          style: 'cancel', // Optional: Adds emphasis to the button
        },
        {
          text: tr('Evet, İptal Et'),
          onPress: () => orderCancel(grupID),
        },
      ],
      {cancelable: true}, // Dismiss the dialog by tapping outside
    );
  };

  const orderCancel = async grupID => {
    // confirm dialog
    if (!cancelEnabled) {
      Alert.alert(tr('İşlem devam ediyor'));
      return;
    }

    setCancelLoading(true);
    setCancelEnabled(false);

    await delay(2000);


    const c = await ai.post('order-group-update', {durum: 17, id: grupID});
    console.log('cancel', c.data);
    if (c.data.error === false) {
      setCancelLoading(false);
      setRefetch(refetch + 1);
    } else {
      setCancelLoading(false);
      setCancelEnabled(true);
      Alert.alert(tr('Hata Oluştu'));
    }
  };

  return (
    <View style={styles.container}>
      <Dump show={false} s={s} />

      {s.orders.map((order, index) => (
        <OrderItem key={index} item={order} grupID={s.grupID} />
      ))}

      <View style={styles.detail}>
        <View style={styles.detailLeft}>
          <Text style={{color: '#333', fontWeight: 'bold', fontSize: 16}}>
            {tr('Toplam')}
          </Text>
        </View>
        <View>
          <Text style={{color: '#333'}}>
            {tr('Ürün ücreti') + ' '}${parseFloat(s.urun_tutar_usd).toFixed(2)}
          </Text>

          <Text style={{color: '#333'}}>
            {tr('Nakliye ücreti')} $
            {s.nakliye_usd > 0 ? parseFloat(s.nakliye_usd).toFixed(2) : '0'}
          </Text>
          <Text style={{color: '#333'}}>
            {tr('Toplam') + ' '}${parseFloat(s.tutar_usd).toFixed(2)}
          </Text>
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginTop: 10,
        }}>
        {((s.hasOwnProperty('iptalEdilebilir') && s.iptalEdilebilir) ||
          iptalEdilebilir) && (
          <TouchableOpacity
            style={styles.rejectBtn}
            disabled={!cancelEnabled || cancelLoading}
            onPress={() => showCancelDialog(s.id)}>
            {cancelLoading && <Loading status={true} color="#FF0000" />}
            { !cancelLoading && <Text style={styles.rejectBtnText}>{tr('İPTAL ET')}</Text>}
          </TouchableOpacity>
        )}
        {
          // ODENEBILIR_DURUMS.includes(parseInt(item.durum)) &&
          ((s.hasOwnProperty('odenebilir') && s.odenebilir) || odenebilir) &&
            paymentTypes.length > 0 && (
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() =>
                  navigation.navigate('PaymentStart', {
                    tutar: s.tutar_usd,
                    quick: true,
                    siparis_ids: s.order_ids,
                    grup: s,
                    grupID: s.id,
                  })
                }>
                <Text style={styles.acceptBtnText}>
                  {tr('Ödeme Yap').toUpperCase()}
                </Text>
              </TouchableOpacity>
            )
        }
      </View>
    </View>
  );
}
