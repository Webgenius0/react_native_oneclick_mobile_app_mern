import ReactNative, {
  Alert,
  Dimensions,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {createRef, useContext, useEffect, useState} from 'react';

import {EmContext} from '../contexts/EmContext';
import ai from '../helpers/ai';
import GlobalStyle from '../assets/GlobalStyle';
import Colors from '../assets/Colors';
import Logo from '../components/Logo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {availableLanguages, i18n, t, tr} from '../translate/i18n';
import {storageGet, storageSet} from '../helpers/storage';
import Phone from '../assets/svg/phone.svg';
import Facebook from '../assets/svg/facebook.svg';
import Instagram from '../assets/svg/instagram.svg';
import Whatsapp from '../assets/svg/whatsapp.svg';
import Youtube from '../assets/svg/youtube.svg';
import Snapchat from '../assets/svg/snapchat.svg';
import {fcmUpdate, getFcmToken} from '../helpers/notification';
import CopyItem from '../components/CopyItem';
import {themeParams} from '../helpers/theme';
import BankaItem from '../components/BankaItem';
import {SelectList} from 'react-native-dropdown-select-list/index';
import Loading from '../components/Loading';
import RNPickerSelect from 'react-native-picker-select';

import {useUserStore} from '../store/useUserStore';
import TeslimatSehirPicker from '../components/TeslimatSehirPicker';

export default function ({route, navigation}) {
  const {ctx, setCtx, ctxDil, setCtxDil} = useContext(EmContext);
  const {width, height} = Dimensions.get('window');
  const [showBox, setShowBox] = useState(true);
  const [adres, setAdres] = useState('');
  const [tel, setTel] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [state, setState] = useState({
    s: [],
    firstLoad: false,
    loading: true,
    update: false,
    token: '',
    dils: availableLanguages,
    language: null,
    theme: ctx.theme,
    themes: [
      {id: 'light', ad: 'Açık Tema'},
      {id: 'dark', ad: 'Koyu Tema'},
    ],
    fields: [],

    iletisim: [{tel: '+90 555 666 44 33'}],
    sosyal: [
    ],
    banka: [],
  });

  // const {teslimatSehirID, setTeslimatSehirID} = useUserStore();
  const [teslimatSehirID, setTeslimatSehirID] = useState(0);
  const [teslimatSehirs, setTeslimatSehirs] = useState([]);

  const teslimatRef = createRef();

  const handleSubmit = async () => {
    if (state.s.kod === 'GUEST') {
      alert(tr('Misafir hesabında değişiklik yapılamaz'));
      return;
    }

    /*if (state.newPassword.length < 3) {
      alert(tr("Şifreniz en az 3 karakter olmalıdır"));
      return;
    }*/
    setState({...state, update: true});

    console.log('Teslimat Şehir ID', teslimatSehirID);

    const res = await ai.post('profile-update', {
      token: state.token,
      new_password: newPassword,
      adres: state.adres,
      tel: state.tel,
      teslimatSehirID: teslimatSehirID,
    });
    let ns = {...state};
    if (res.data.error === false) {
      Alert.alert(tr('Güncellendi'));
      // window.alert(tr("Şifreniz başarıyla değiştirildi"));
      ns.newPassword = '';
      // navigation.navigate("Login");
    } else {
      window.alert(tr('Hata Oluştu'));
    }
    ns.update = false;

    setState(ns);
  };
  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');

    const fcm = await getFcmToken();
    await fcmUpdate(fcm, true);

    navigation.navigate('Login');
  };
  const handleDelete = async () => {
    if (state.s.kod === 'GUEST') {
      alert(tr('Misafir hesabı silinemez'));
      return;
    }

    return Alert.alert(
      tr('Hesabı Sil'),
      tr('Hesabınızı silmek istediğinize emin misiniz?'),
      [
        // The "Yes" button
        {
          text: tr('Hesabı Sil') + '!',
          onPress: async () => {
            const res = await ai.get('delete-account');

            if (res.data.error === false) {
              window.alert(tr('Hesabınız 24 saat içinde silinecektir'));

              await AsyncStorage.removeItem('user');

              const fcm = await getFcmToken();
              await fcmUpdate(fcm, true);

              navigation.navigate('Login');
            } else {
              window.alert(tr('Hesap silme işlemi başarısız oldu'));
            }
          },
        },
        // The "No" button
        // Does nothing but dismiss the dialog when tapped
        {
          text: tr('Hayır'),
        },
      ],
    );
  };
  const handleDilUpdate = async dil => {
    console.log('dil güncelleniyor...', dil);
    await storageSet('language', dil);
    i18n.locale = dil;
    const isRTL = dil === 'ar' || dil === 'ckb';
    ReactNative.I18nManager.allowRTL(isRTL);
    const fcmToken = await getFcmToken();
    const upr = await ai.post('update-language', {
      dil: dil,
      fcmToken: fcmToken,
    });
    console.log('dil api update', upr?.data);
    setCtxDil(dil);
  };
  const handleThemeUpdate = async theme => {
    await storageSet('theme', theme);
    setState({...state, theme: theme});
    const {bgColor, color, isDark, isLight} = themeParams(theme);
    setCtx({...ctx, theme, bgColor, color, isDark, isLight});
    // setCtxDil(dil);
  };
  const fetchData = async () => {
    console.log('fetchData', +new Date());
    const c = await ai.get('profile');
    let ns;
    if (c.data.error === false) {
      let tmpData = [];
      ns = {
        ...state,
        s: c.data.s,
        fields: c.data.require_fields,
        sosyal: c.data.sosyal,
        banka: c.data.banka,
      };

      setTeslimatSehirs(c.data.teslimatSehirs);
      setTeslimatSehirID(c.data.teslimatSehirID);
    } else {
      window.alert(tr('Hata Oluştu'));
      ns = {...state, s: {}};
    }

    let language = await storageGet('language');
    console.log('storage language', language);
    ns.language = language;

    let theme = await storageGet('theme');
    console.log('storage theme', theme);
    ns.theme = theme ? theme : 'light';

    console.log('profile ns', ns);

    ns.loading = false;
    setState(ns);
  };

  const styles = StyleSheet.create({
    borderedBox: {
      padding: 20,
      borderWidth: 1,
      borderColor: '#EEE',
      borderRadius: 10,
      marginBottom: 20,
    },
    paymentItem: {
      padding: 10,
      borderBottomWidth: 1,
      borderColor: '#EEE',
      borderRadius: 10,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      // justifyContent  : "space-between",
      flexDirection: 'column',
    },
    paymentItemText: {
      color: ctx.color,
      fontSize: 16,
      textAlign: 'center',
    },
    dil: {
      backgroundColor: Colors.primary,
      padding: 10,
      borderRadius: 5,
      margin: 5,
    },
    dilText: {
      color: ctx.isLight ? '#FFF' : '#000',
      fontWeight: 'bold',
    },
    aktifDil: {
      backgroundColor: ctx.isLight ? '#333' : '#FFF',
    },
    container: {
      flex: 1,
      backgroundColor: ctx.bgColor,
      // alignItems: "center",
      // justifyContent: "center",
      flexDirection: 'column',
    },
    logoContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: {
      paddingHorizontal: 10,
      paddingBottom: 10,
    },
    row: {
      flexDirection: 'row',
      marginBottom: 20,
    },
    column: {
      flexDirection: 'column',
      marginBottom: 15,
    },
    label: {
      width: 110,
      fontWeight: 'bold',
      color: ctx.color,
    },
    labelw100: {
      width: '100%',
      fontWeight: 'bold',
      color: ctx.color,
    },
    text: {
      color: ctx.color,
    },
    input: {
      borderWidth: 1,
      borderColor: '#ccc',
      padding: 5,
      borderRadius: 5,
      width: '60%',
      color: ctx.color || '#000000',
      // placeholderTextColor: "black" || ctx.color,
    },
    button: {
      backgroundColor: Colors.btnColor,
      padding: 10,
      borderRadius: 5,
      maxWidth: 220,
      textAlign: 'center',
      flexDirection: 'row',
    },
    logoutBtn: {
      backgroundColor: '#333',
      padding: 10,
      borderRadius: 5,
      maxWidth: 220,
      textAlign: 'center',
      marginHorizontal: 15,
    },
    deleteBtn: {
      backgroundColor: '#e14646',
      padding: 10,
      borderRadius: 5,
      maxWidth: 220,
      textAlign: 'center',
      marginHorizontal: 15,
    },
    buttonText: {
      color: ctx.isLight ? '#fff' : '#000',
      textAlign: 'center',
      fontWeight: 'bold',
    },

    safeArea: {
      flex: 1,
      backgroundColor: ctx.bgColor,
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={{paddingBottom: 100, paddingTop: 20}}>
          {/*<AuthHeader navigation={navigation} route={route} />*/}
          {/*<View style={styles.logoContainer}>
          <Logo maxWidth={120} />
        </View>*/}
          {state.loading ? (
            <View>
              <Text>{tr('Yükleniyor')}...</Text>
            </View>
          ) : null}

          {state.loading === false && state.s && (
            <ScrollView style={styles.scroll}>
              <View style={styles.borderedBox}>
                <View style={styles.row}>
                  <Text style={styles.label}>{tr('Müşteri Kodu')}</Text>
                  <Text style={styles.text}>{state.s.kod}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>{tr('Ad')}</Text>
                  <Text style={styles.text}>{state.s.ad}</Text>
                </View>

                {state.fields.includes('tel') && (
                  <View style={styles.row}>
                    <Text style={styles.label}>{tr('Telefon')}</Text>
                    <Text style={styles.text}>{state.s.tel}</Text>
                  </View>
                )}

                {state.fields.includes('adres') && (
                  <View style={styles.row}>
                    <Text style={styles.label}>{tr('Adres')}</Text>
                    <Text style={styles.text}>{state.s.adres}</Text>
                  </View>
                )}

                <View style={styles.row}>
                  <Text style={styles.label}>{tr('Yeni Parola')}</Text>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={e => setNewPassword(e)}
                  />
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>{tr('Teslimat Şehri')}</Text>
                  <TeslimatSehirPicker
                    teslimatSehirID={teslimatSehirID}
                    setTeslimatSehirID={setTeslimatSehirID}
                    teslimatSehirs={teslimatSehirs}
                    changeText={true}
                  />



                    {/*
                  <View style={{flexDirection: 'row', display: 'flex'}}>

                    <TouchableOpacity
                      onPress={() => teslimatRef.current.togglePicker(true)}>
                      <Text
                        style={{
                          color: ctx.color,
                          fontSize: 12,
                          textAlign: 'center',
                          marginStart: 10,
                        }}>
                        {tr('Değiştir')}
                      </Text>
                    </TouchableOpacity>
                    */}
                    {/*<SelectList
                      setSelected={(val) => setTeslimatSehirID(val)}
                      data={teslimatSehirs}
                      selected={state.ilID}
                      placeholder={tr("Şehir Seçiniz")}
                      label={tr("Teslimat Şehri")}
                      search={false}
                      save="key"
                      boxStyles={{ color: "#333", height: 40,}}
                      inputStyles={{ color: "#333",  }}
                      dropdownTextStyles={{ color: "#333",   }}
                      defaultOption={teslimatSehirID}
                    />
                  </View>

                    */}

                </View>

                <View style={[GlobalStyle.pt10, GlobalStyle.alignCenter]}>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleSubmit}
                    disabled={state.update}>
                    {state.update ? (
                      <Loading status={true} color="#FFFFFF" />
                    ) : null}
                    <Text style={styles.buttonText}>
                      {state.update
                        ? tr('Güncelleniyor').toUpperCase() + '...'
                        : tr('Güncelle').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {state.banka.length > 0 ? (
                <View style={[styles.borderedBox, GlobalStyle.pb5]}>
                  <View style={styles.row}>
                    <Text style={[styles.labelw100, GlobalStyle.textCenter]}>
                      {tr('Ödeme Yöntemleri')}
                    </Text>
                  </View>
                  <View style={[styles.column, GlobalStyle.p0]}>
                    {state.banka.map((item, i) => (
                      <BankaItem key={i} item={item} />
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={[styles.borderedBox, GlobalStyle.pb5]}>
                <View style={styles.row}>
                  <Text style={[styles.labelw100, GlobalStyle.textCenter]}>
                    {tr('Uygulama Dili')}
                  </Text>
                </View>

                <View style={[styles.row, {justifyContent: 'center'}]}>
                  {availableLanguages.map((dil, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => handleDilUpdate(dil.id)}
                      style={[
                        styles.dil,
                        dil.id === ctxDil ? styles.aktifDil : null,
                      ]}>
                      <Text style={styles.dilText}>{dil.ad.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[styles.borderedBox, GlobalStyle.pb5]}>
                <View style={styles.row}>
                  <Text style={[styles.labelw100, GlobalStyle.textCenter]}>
                    {tr('Tema')}
                  </Text>
                </View>

                <View style={[styles.row, {justifyContent: 'center'}]}>
                  {state.themes.map((x, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => handleThemeUpdate(x.id)}
                      style={[
                        styles.dil,
                        x.id === state.theme ? styles.aktifDil : null,
                      ]}>
                      <Text style={styles.dilText}>
                        {tr(x.ad).toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/*
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: "#EEE",
                    backgroundColor: ctx.bgColor,
                    borderRadius: 10,
                    overflow: "hidden",
                  }}>


                  <View
                    style={{
                      backgroundColor: Colors.primary, padding: 10,
                      borderTopRightWidth: 1, borderTopLeftWidth: 1,
                      borderColor: Colors.primary,
                      borderTopRightRadius: 10, borderTopLeftRadius: 10,
                    }}>
                    <Text
                      style={{
                        textAlign: "center",
                        color: "#FFF",
                        fontWeight: "500",
                        fontSize: 20,
                      }}>{tr("İletişim")}</Text>
                  </View>


                </View>

                {
                  state.sosyal.length > 0 ? (
                <View style={{ marginVertical: 20, borderWidth: 1, borderColor: "#EEE", padding: 20 }}>
                  <Text style={{ textAlign: "center", color: ctx.color, fontWeight: "400", fontSize: 22 }}>
                    {tr("Bizi Takip Edin")}
                  </Text>
                  <View style={{ flexDirection: "row", justifyContent: "center" }}>
                    {
                      state.sosyal.map((item, i) => (
                        <TouchableOpacity
                          key={i} style={{
                          marginVertical: 10,
                          marginHorizontal: 10,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                        }} onPress={() => Linking.openURL(item.link)}>
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              // backgroundColor: "#EEE",
                              justifyContent: "center",
                              alignItems: "center",
                            }}>
                            {item.ad === "facebook" ? <Facebook width={30} height={30} /> : null}
                            {item.ad === "instagram" ? <Instagram width={30} height={30} /> : null}
                            {item.ad === "whatsapp" ? <Whatsapp width={44} height={44} /> : null}
                            {item.ad === "youtube" ? <Youtube width={44} height={44} /> : null}
                            {item.ad === "snapchat" ? <Snapchat width={44} height={44} /> : null}
                          </View>
                          <Text style={{ marginLeft: 10, color: "#333", fontWeight: "500", fontSize: 22 }}>{item.ad}</Text>
                        </TouchableOpacity>
                      ))
                    }
                  </View>
                </View>
                  ) : null
                }*/}

              <View
                style={{
                  flex: 1,
                  width: '100%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginVertical: 20,
                }}>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={handleDelete}
                  disabled={state.update}>
                  <Text style={styles.buttonText}>{tr('Hesabı Sil')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.logoutBtn}
                  onPress={handleLogout}
                  disabled={state.update}>
                  <Text style={styles.buttonText}>{tr('Çıkış Yap')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
