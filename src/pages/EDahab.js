import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import {t, tr} from '../translate/i18n';
import GlobalStyle from '../assets/GlobalStyle';
import Toast from 'react-native-toast-message';
import ai from '../helpers/ai';
import {CommonActions} from '@react-navigation/native';
import Dump from '../components/Dump';
import {IS_LOCAL} from '../../config';
import {SelectList} from 'react-native-dropdown-select-list/index';
import Colors from '../assets/Colors';
import {delay, getUserAgent} from '../helpers/common';
import DeviceInfo from 'react-native-device-info';

export default function EDahab({navigation, route}) {
  const g = GlobalStyle;

  const [paymentType, setPaymentType] = useState('mwallet');
  const paymentTypes = [
    // {ad: 'Credit Card', key: 'card'},
    {ad: 'Mobile Wallet Account', key: 'mwallet'},
  ];
  let fill = (__DEV__ && IS_LOCAL) || false;
  // fill = false;
  const defaultPhoneNumber = fill ? '657654580' : '';

  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(defaultPhoneNumber);
  const [tutar, setTutar] = useState(route?.params?.tutar || 0);
  const [anaTutar, setAnaTutar] = useState(route?.params?.ana_tutar || 0);
  const [komisyonTutar, setKomisyonTutar] = useState(
    route?.params?.komisyon_tutar || 0,
  );
  const [invoiceId, setInvoiceId] = useState(route?.params?.invoiceId || '');
  const [siparis_ids, setSiparis_ids] = useState(
    route?.params?.siparis_ids || '',
  );
  const [submitting, setSubmitting] = useState(false);
  const [odemeID, setOdemeID] = useState('');

  const handleCancel = () => {
    console.log('handleCancel');
    navigation.goBack();
  };

  const fillCheck = true;
  const handlePay = async () => {
    console.log('handlePay');

    Keyboard.dismiss();

    if (submitting) {
      return false;
    }

    console.log('FillCheck before');

    if (fillCheck && paymentType === 'mwallet' && phoneNumber === '') {
      Toast.show({
        type: 'error',
        text1: t('Hata Oluştu'),
        text2: t('Lütfen tüm alanları doldurunuz'),
        text2Style: {fontSize: 14, color: '#000', wordWrap: 'break-word'},
      });
      return false;
    }

    console.log('setSubmit before');
    setSubmitting(true);

    await delay(500);

    // get device
    const userAgent = getUserAgent();

    let data = {
      phoneNumber: phoneNumber,
      tutar: tutar,
      ana_tutar: anaTutar,
      komisyon_tutar: komisyonTutar,
      komisyon_yuzde: route?.params?.komisyonYuzde || 0,
      siparis_ids: siparis_ids,
      paymentMethodType: paymentType,
      invoiceId: invoiceId,
      odemeID: odemeID,
      userAgent: userAgent,
    };

    console.log('isLocal', IS_LOCAL);

    const r = await ai.post('payment-edahab', data, {
      // set timeout to 60 seconds
      timeout: 60000,
    });
    console.log('r', r?.data);

    if (r?.data?.error === false) {
      Toast.show({
        type: 'success',
        text1: t('Ödeme Başarılı'),
        text2: t('Ödeme Başarılı'),
      });
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{name: 'AuthAfter', params: {screen: 'Orders'}}],
        }),
      );
    } else {
      var error = r?.data?.detail || "";

      Toast.show({
        type: 'error',
        //text1: t('Hata Oluştu'),
        text1: t('Ödeme Başarısız')+': '+error,
        text2Style: {fontSize: 14, color: '#000', wordWrap: 'break-word', width: '100%'},

      });

      if (r?.data?.invoiceId) {
        setInvoiceId(r?.data?.invoiceId);
        setOdemeID(r?.data?.odemeID || '');
      }

      setSubmitting(false);
    }
  };

  const info = t('edahab_info');


  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>eDahab ${tutar}</Text>

        {paymentType === 'mwallet' && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>{t('Telefon')}</Text>

              {info ? (
                <View style={styles.info}>
                  <Text style={[styles.label, g.mb10]}>{info}</Text>
                </View>
              ) : null}

              <TextInput
                style={styles.txtInput}
                value={phoneNumber}
                onChangeText={e => setPhoneNumber(e)}
                placeholder={t('Telefon')}
                placeholderTextColor={'#000'}
              />
            </View>
          </>
        )}
{/*
        <Text style={styles.subtitle}>
          {t('Tutar')} ${anaTutar}
        </Text>

        {komisyonTutar > 0 && (
          <>
            <Text style={styles.subtitle}>
              {t('Komisyon')} ${komisyonTutar}
            </Text>

            <Text style={styles.subtitle}>
              {t('Toplam Tutar')} ${tutar}
            </Text>
          </>
        )}*/}

        <Dump params={route?.params} show={false} />

        {submitting ? (
          <View style={[g.p10]}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : null}

        <View style={[styles.rowHorizontal, g.alignCenter, g.pt30]}>
          <TouchableOpacity
            style={[g.btnCancel, g.m5, g.mw120]}
            disabled={submitting}
            onPress={() => handleCancel()}>
            <Text style={[g.btnText, g.bold, styles.cancelBtnText]}>
              {t('İptal')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[g.btn, g.m5, g.mw120, styles.payBtn]}
            onPress={() => handlePay()}
            disabled={submitting}>
            {submitting ? (
              <>
                <Text style={[g.btnText, g.bold, styles.payBtnText]}>
                  {t('Ödeme Yapılıyor')}
                </Text>
              </>
            ) : (
              <Text style={[g.btnText, g.bold, styles.payBtnText]}>
                {t('Ödeme Yap')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Dump invoiceId={invoiceId} odemeID={odemeID} show={false} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  info: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    marginBottom: 20,
    width: '100%',
  },
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  rowHorizontal: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  col6: {
    width: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    width: '100%',
    textAlign: 'center',
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    width: '100%',
    textAlign: 'left',
    color: '#000',
  },
  txtInput: {
    height: 50,
    borderColor: 'gray',
    borderWidth: 1,
    width: '100%',
    backgroundColor: '#FFF',
    color: '#000',
    paddingLeft: 20,
  },
  payBtn: {
    // semi-light green
    backgroundColor: '#4CAF50',
  },
  payBtnText: {
    color: '#FFF',
    fontSize: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: 'normal',
    marginBottom: 10,
    color: '#000',
  },

  cancelBtnText: {
    color: '#FFF',
    fontSize: 16,
  },
});
