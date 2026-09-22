import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  SafeAreaView,
  Touchable,
  TouchableOpacity, Keyboard, ActivityIndicator,
} from 'react-native';
import {t, tr} from '../translate/i18n';
import GlobalStyle from '../assets/GlobalStyle';
import Toast from 'react-native-toast-message';
import ai from '../helpers/ai';
import {CommonActions} from '@react-navigation/native';
import Dump from '../components/Dump';
import {IS_LOCAL} from '../../config';
import {SelectList} from 'react-native-dropdown-select-list/index';
import Loading from '../components/Loading';
import Colors from '../assets/Colors';
import DeviceInfo from 'react-native-device-info';
import {getUserAgent} from '../helpers/common';
import {useCartStore} from '../store/useCartStore';

export default function WaafiPay({navigation, route}) {
  const g = GlobalStyle;

  const [paymentType, setPaymentType] = useState('mwallet');
  const paymentTypes = [
    // {ad: 'Credit Card', key: 'card'},
    {ad: 'Mobile Wallet Account', key: 'mwallet'},
  ];

  const [request, setRequest] = useState(null);

  let fill = (__DEV__ && IS_LOCAL) || false;
  // fill = false;
  const defaultName = fill ? 'John Doe' : '';
  const defaultCardNumber = fill ? '4111111111111111' : '';
  const defaultAccountNumber = fill ? '252615214249' : '';
  const defaultCvv = fill ? '123' : '';
  const defaultExpiryYear = fill ? '2023' : '';
  const defaultExpiryMonth = fill ? '12' : '';

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(defaultName);
  const [cardNumber, setCardNumber] = useState(defaultCardNumber);
  const [accountNumber, setAccountNumber] = useState(defaultAccountNumber);
  const [cvv, setCvv] = useState(defaultCvv);
  const [expiryYear, setExpiryYear] = useState(defaultExpiryYear);
  const [expiryMonth, setExpiryMonth] = useState(defaultExpiryMonth);
  const [tutar, setTutar] = useState(route?.params?.tutar || 0);
  const [anaTutar, setAnaTutar] = useState(route?.params?.ana_tutar || 0);
  const [komisyonTutar, setKomisyonTutar] = useState(
    route?.params?.komisyon_tutar || 0,
  );
  const [siparis_ids, setSiparis_ids] = useState(
    route?.params?.siparis_ids || '',
  );
  const [submitting, setSubmitting] = useState(false);


  // range current year to 10 years later
  let years = [];
  let lastYear = new Date().getFullYear() - 1;
  let defaultYear = {
    key: lastYear.toString().slice(-2),
    value: lastYear.toString(),
  };
  const currentYear = new Date().getFullYear();
  for (let i = currentYear - 1; i <= currentYear + 15; i++) {
    // value 4 digit year, key 2 digit year
    years.push({ key: i.toString().slice(-2), value: i.toString() });
  }

  const handleCancel = () => {
    console.log('handleCancel');
    // abort request
    if (request) {
      request.abort();
    }

    setSubmitting(false);

    navigation.goBack();
  };


  const fillCheck = true;
  const handlePay = async () => {
    console.log('handlePay');

    // check keyboard status

    Keyboard.dismiss();



    if (submitting) {
      return false;
    }

    if (
      fillCheck &&
      (
        (paymentType === 'card' && (
        name === '' ||
        cardNumber === '' ||
        cvv === '' ||
        expiryYear === '' ||
        expiryMonth === '')
      )) || (
        paymentType === 'mwallet' && accountNumber === ''
      )
    ) {
      Toast.show({
        type: 'error',
        text1: t('Hata Oluştu'),
        text2: t('Lütfen tüm alanları doldurunuz'),
      });
      return false;
    }
    setSubmitting(true);

    const userAgent = getUserAgent();


    let data = {
      name: name,
      cardNumber: paymentType === 'card' ? cardNumber : accountNumber,
      cvv: cvv,
      expiryYear: expiryYear,
      expiryMonth: expiryMonth,
      tutar: tutar,
      siparis_ids: siparis_ids,
      paymentMethodType: paymentType,
      userAgent: userAgent,
    };

    console.log('isLocal', IS_LOCAL);

    const r = await ai.post('payment-waafipay', data);
    setRequest(r);
    console.log('r', r?.data);

    if (r?.data?.error === false) {
      useCartStore.getState().clearCart();
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
      Toast.show({
        type: 'error',
        text1: t('Hata Oluştu'),
        text2: t('Ödeme Başarısız'),
      });

      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>WaafiPay ${tutar}</Text>

        {paymentTypes.length > 1 && (
          <View style={styles.rowHorizontal}>
            {paymentTypes.map((item, index) => {
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    g.btn,
                    g.m5,
                    g.mw120,
                    paymentType === item.key ? g.btnActive : null,
                  ]}
                  onPress={() => setPaymentType(item.key)}>
                  <Text style={[g.btnText, g.bold]}>{item.ad}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {paymentType === 'card' && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>{t('Kart üstündeki isim')}</Text>
              <TextInput
                style={styles.txtInput}
                value={name}
                onChangeText={e => setName(e)}
                placeholder={t('Kart üstündeki isim')}
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{t('Kart Numarası')}</Text>
              <TextInput
                style={styles.txtInput}
                value={cardNumber}
                onChangeText={e => setCardNumber(e)}
                placeholder={t('Kart Numarası')}
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{t('CVV')}</Text>
              <TextInput
                style={styles.txtInput}
                value={cvv}
                onChangeText={e => setCvv(e)}
                placeholder={t('CVV')}
                maxLength={6}
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{t('Son Kullanma Yılı')}</Text>
              <SelectList
                setSelected={(val) => setExpiryYear(val)}
                data={years}
                selected={expiryYear}
                placeholder={tr("Son Kullanma Yılı")}
                label={tr("Son Kullanma Yılı")}
                save="key"
                boxStyles={{ color: "#333", width: '100%', borderRadius: 0 }}
                inputStyles={{ color: "#333" }}
                dropdownTextStyles={{ color: "#333", width: '100%' }}
                defaultOption={defaultYear}
              />
              {/*<TextInput
                style={styles.txtInput}
                value={expiryYear}
                keyboardType="numeric"
                maxLength={4}
                onChangeText={e => setExpiryYear(e)}
                placeholder={t('Son Kullanma Yılı')}
              />*/}
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{t('Son Kullanma Ayı')}</Text>
              <TextInput
                style={styles.txtInput}
                value={expiryMonth}
                keyboardType="numeric"
                onChangeText={e => setExpiryMonth(e)}
                maxLength={2}
                placeholder={t('Son Kullanma Ayı')}
              />
            </View>
          </>
        )}

        {paymentType === 'mwallet' && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>{t('Telefon')}</Text>
              <Text style={[styles.label, g.mb10]}>WaafiPay - ZAAD, EVC+  iyo SAHAL</Text>

              <View style={styles.info}>
                <Text style={[styles.label, g.mb10]}>{t('waafi_info')}</Text>
              </View>

              <TextInput
                style={styles.txtInput}
                value={accountNumber}
                onChangeText={e => setAccountNumber(e)}
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
        )}

        <Dump dev={__DEV__} show={false} />
*/}
        {submitting ? (
          <View style={[g.p10]}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : null}

        <View style={[styles.rowHorizontal, g.alignCenter, g.pt30]}>
          <TouchableOpacity
            style={[g.btnCancel, g.m5, g.mw120]}
            onPress={() => handleCancel()}>
            <Text style={[g.btnText, g.bold, styles.cancelBtnText]}>{t('İptal')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[g.btn, g.m5, g.mw120, styles.payBtn]}
            onPress={() => handlePay()}
            disabled={submitting}>
            {/*{submitting ? ( <Loading status={true} color="#FFF" /> ) : null}*/}
            <Text style={[g.btnText, g.bold, styles.payBtnText]}>{submitting ? t('Ödeme Yapılıyor') : t('Ödeme Yap')}</Text>
            {/*<Text style={[g.btnText, g.bold, styles.payBtnText]}>{t('Ödeme Yap')}</Text>*/}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  info:{
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
  label: {
    fontSize: 14,
    fontWeight: 'normal',
    marginBottom: 10,
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

  cancelBtnText:{
    color: '#FFF',
    fontSize: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    width: '100%',
    textAlign: 'left',
    color: '#000',
  },
});
