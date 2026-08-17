import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Touchable,
  TouchableOpacity,
  Image,
  TextInput,
  Linking,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {tr} from '../translate/i18n';
import ai from '../helpers/ai';
import OrderItem from '../components/OrderItem';
import FastImage from 'react-native-fast-image';
import NoImage from '../assets/svg/no-image.svg';
import Colors from '../assets/Colors';
import GlobalStyle from '../assets/GlobalStyle';
import OrderStatus from '../components/OrderStatus';
import CheckBox from '@react-native-community/checkbox';
import {delay, formatDate, lb} from '../helpers/common';
import Dump from '../components/Dump';
import Toast from 'react-native-toast-message';
import {useFocusEffect, useIsFocused} from '@react-navigation/native';
import {EmContext} from '../contexts/EmContext';
import PaymentMethodIcon from '../components/paymentStart/PaymentMethodIcon';
import {isImage} from '../helpers/file';
import PaymentMethods from '../components/paymentStart/PaymentMethods';
import NoOrder from '../components/paymentStart/NoOrder';
import PaymentOrderList from '../components/paymentStart/PaymentOrderList';

const gs = GlobalStyle;
const {width, height} = Dimensions.get('window');

export default function ({navigation, route}) {
  const {ctx} = useContext(EmContext);

  let defaultTutar = '',
    default_siparis_ids = [];
  let defaultLoading = true;
  const quick = route.params?.quick;
  let siparis_id = null;
  let paramSiparisIds = null;
  let grup = null;
  let grupID = null;
  let inputAutoFocus = false;
  let inputEditable = false;
  const isFocused = useIsFocused();

  if (quick) {
    defaultTutar = route.params.tutar;
    defaultLoading = true;
    siparis_id = route.params.siparis_id;
    paramSiparisIds = route.params.siparis_ids;
    grupID = route.params.grupID;
    grup = route.params.grup;
    if (paramSiparisIds) {
      default_siparis_ids = [paramSiparisIds];
    }
  } else {
    inputAutoFocus = true;
    inputEditable = true;
  }

  const [loading, setLoading] = useState(defaultLoading);
  const [tutar, setTutar] = useState(defaultTutar);
  const [siparisler, setSiparisler] = useState([]);
  const [siparis_ids, setSiparisIds] = useState(default_siparis_ids);
  const [methods, setMethods] = useState([]);
  const [gettingPaymentUrl, setGettingPaymentUrl] = useState(false);
  const [isNavigatedBack, setIsNavigatedBack] = useState(false);
  const tutarRef = useRef();

  const fetchOrders = async () => {
    // console.log("fecth", +new Date());
    lb('FETCH UNPAID ORDERS');
    setLoading(true);
    const c = await ai.post('orders-unpaid', {
      siparis_id: siparis_id,
      grupID: grupID,
    });
    console.log(c.data);
    console.log('\n');

    if (c.data.error === false) {
      let new_siparisler = c.data.ss;
      // sort siparisler by id is = siparis_id
      if (quick) {
        new_siparisler = new_siparisler.sort((a, b) =>
          a.id === siparis_id || a.grupID === grupID ? -1 : a.id - b.id,
        );
      }

      let new_siparis_ids = new_siparisler
        .filter(item => item.grupID === grupID)
        .map(item => item.id);
      if (!quick) {
        new_siparis_ids = new_siparisler.map(item => item.id);
      }
      setSiparisler(c.data.ss);
      setSiparisIds(new_siparis_ids);
      setLoading(false);
    } else {
      setSiparisIds([]);
      setLoading(false);
    }
  };

  const tutarHesapla = (siparisler, siparis_ids, grup) => {
    let tutar = 0;
    siparisler.map(item => {
      if (siparis_ids.includes(item.id)) {
        tutar += parseFloat(item.tutar);
      }
    });

    if (grup) {
      tutar += parseFloat(grup.nakliye_usd);
    }

    console.log('calculatedTutar', tutar);

    return tutar.toFixed(2);
  };

  const checkFocus = async () => {
    console.log('checkFocus', +new Date());
    console.log(!loading, siparisler.length === 0);
  };

  const fetchMethods = async () => {
    const c = await ai.get('payment-methods');
    console.log(c.data);
    if (c.data.error === false && c.data.ss.length > 0) {
      setMethods(c.data.ss);
      // console.log(c.data.ss);
    }

    // console.log(c.data);
  };

  const init = async () => {
    await fetchOrders();
    await fetchMethods();
  };

  useEffect(() => {
    if (!isFocused) {
      setIsNavigatedBack(true);
      if (gettingPaymentUrl) {
        setGettingPaymentUrl(false);
      }
    }
  }, [isFocused]);

  useEffect(() => {
    if (!quick) {
      init();
      console.log('useEffect', +new Date());
      checkFocus();
    } else {
      init();
      // fastPay();
    }
  }, []);

  useEffect(() => {
    let newTutar = tutarHesapla(siparisler, siparis_ids, grup);
    setTutar(newTutar);
  }, [siparisler, siparis_ids, grup]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ctx.bgColor,
      alignItems: 'center',
      justifyContent: 'flex-start',
      flexDirection: 'column',
    },

    altContainer: {
      padding: 0,
      // backgroundColor: 'red',
      justifyContent: 'flex-start',
    },
    img: {
      width: 90,
      height: 50,
      // borderWidth: 1,
      // borderColor: "#c5c5c5",
      borderRadius: 5,
      resizeMode: 'contain',
    },
    tutarRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 10,
    },
    tutarLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 0,
      marginEnd: 20,
      color: ctx.color,
    },
    tutarInput: {
      fontSize: 25,
      fontWeight: 'bold',
      // marginBottom: 20,
      textAlign: 'center',
      color: ctx.color,
      minWidth: 200,
      borderWidth: 1,
      borderColor: '#c5c5c5',
    },
  });

  const formatTutar = tutar => {
    console.log({tutar});
    return '$' + parseFloat(tutar).toFixed(2);
  };

  return (
    <View style={styles.container}>
      <NoOrder siparisler={siparisler} />

      <PaymentOrderList
        siparisler={siparisler}
        siparis_ids={siparis_ids}
        grupID={grupID}
        grup={grup}
        setSiparisIds={setSiparisIds}
        tutarHesapla={tutarHesapla}
        setTutar={setTutar}
        tutar={tutar}
      />

      {/*<Dump state={state} isFocused={isFocused} isNavigatedBack={isNavigatedBack}></Dump>*/}

      <View style={styles.altContainer}>
        <View style={styles.tutarRow}>
          <Text style={styles.tutarLabel}>{tr('Tutar')}</Text>
          <TextInput
            defaultValue={tutar > 0 ? formatTutar(tutar) : ''}
            ref={tutarRef}
            autoFocus={inputAutoFocus}
            editable={inputEditable}
            style={styles.tutarInput}
            onChangeText={e => setTutar(e)}
            onFocus={() => {
              if (tutar === 0) {
                setTutar('');
              }
            }}
            keyboardType="numeric"
            placeholder={tr('Tutar')}
            placeholderTextColor={ctx.color}
          />
        </View>

        <Dump show={false} tutar={tutar} siparis_ids={siparis_ids} />

        <PaymentMethods
          methods={methods}
          tutar={tutar}
          siparis_ids={siparis_ids}
          grupID={grupID}
          navigation={navigation}
        />
      </View>
    </View>
  );
}
