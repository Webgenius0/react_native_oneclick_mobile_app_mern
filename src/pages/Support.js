import React, {useContext, useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Animated,
  Share,
  Alert,
  Platform,
} from 'react-native';
import ai from '../helpers/ai';
import {t} from '../translate/i18n';
import {EmContext} from '../contexts/EmContext';
import Logo from '../components/Logo';
import FadeInBottom from '../components/FadeInBottom';

import Phone from '../assets/svg/phone.svg';
import Facebook from '../assets/svg/facebook.svg';
import Instagram from '../assets/svg/instagram.svg';
import Whatsapp from '../assets/svg/whatsapp.svg';
import Youtube from '../assets/svg/youtube.svg';
import Tiktok from '../assets/svg/tiktok.svg';
import SupportList from '../components/support/SupportList';
import SupportSocial from '../components/support/SupportSocial';

export default function ({route, navigation}) {
  const {ctx} = useContext(EmContext);
  const [iletisim, setIletisim] = useState([]);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current; // Animasyon değeri
  const translateY = useRef(new Animated.Value(30)).current; // Y ekseninde hareket

  const [socialMedia, setSocialMedia] = useState([]);
  const [appLinks, setAppLinks] = useState(null);
  const [howToOrder, setHowToOrder] = useState("");
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFF',
      width: '100%',
    },
    touch: {
      padding: 15,
      // backgroundColor: '#DDD',
      justifyContent: 'flex-start',
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#EEE',
      width: '100%',
      maxWidth: 500,
    },
    tel: {
      textAlign: 'center',
      color: ctx.color,
      fontWeight: '500',
      fontSize: 22,
    },
    telColumnRow: {
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#000',
      margin: 20,
      width: '100%',
      alignItems: 'center',
      textAlign: 'center',
    },
    title2: {
      fontSize: 22,
      fontWeight: 'bold',
      marginHorizontal: 20,
      marginVertical: 10,
      width: '100%',
      alignItems: 'center',
      textAlign: 'center',
    },
    loading: {
      margin: 20,
    },
    phoneIcon: {
      marginEnd: 10,
      minWidth: 44,
    },
    howToOrder: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 10,
      // backgroundColor: ctx.color,
    },
    shareApp:{
      marginTop: 20,
      // backgroundColor: ctx.color,
    }
  });

  const diaCall = async item => {
    if (item.hasOwnProperty('link') && item.link) {
      await Linking.openURL(item.link);
    } else {
      await Linking.openURL(`tel:${item.tel}`);
    }
  };

  const onShare = async () => {

    const link = Platform.select({
      ios: appLinks?.ios,
      android: appLinks?.android,
    });

    try {
      const result = await Share.share({
        message:
        link,
      });
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
        } else {
          // shared
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
      }
    } catch (error) {
      Alert.alert(error.message);
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const res = await ai.get('contact');
      if (res?.data?.error === false) {
        console.log(res.data);
        setIletisim(res.data.phone);
        setSocialMedia(res.data.social);
        setHowToOrder(res.data?.howToOrder || "");
        setAppLinks(res.data?.appLinks || null);
      } else {
        console.log(res.data.msg);
      }
      setLoading(false);

      // FadeIn animasyonunu başlat
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    };

    fetchData();
  }, [fadeAnim, translateY]);

  return (
    <View style={styles.container}>
      <FadeInBottom>
        <Logo maxWidth={135} maxHeight={120} animation={false}  />
      </FadeInBottom>
      <Text style={styles.title}>{t('Destek')}</Text>

      {loading && <Text style={styles.loading}>{t('Yükleniyor')}</Text>}
      {!loading && iletisim.length === 0 && <Text>{t('Kayıt Yok')}</Text>}


      <SupportList iletisim={iletisim} loading={loading} diaCall={diaCall} ctx={ctx} styles={styles} />

      {!loading && howToOrder.length > 0 && (
        <View style={{marginTop: 30, marginHorizontal: 20}}>
          <TouchableOpacity onPress={() => Linking.openURL(howToOrder)}
                            style={styles.howToOrder}>
            <Youtube width={44} height={44} />
            <Text style={{textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: '#000'}}>
              {t('Nasıl Sipariş Verilir?')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <SupportSocial loading={loading} socialMedia={socialMedia} styles={styles} />

      {
        !loading && (
          <TouchableOpacity onPress={onShare} style={styles.shareApp}>
            <Text style={{textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: '#000'}}>
              {t('Uygulamayı Paylaş')}
            </Text>
          </TouchableOpacity>
        )
      }


    </View>
  );
}
