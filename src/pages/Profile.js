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
import { CommonActions } from '@react-navigation/native';
import {availableLanguages, i18n, t, tr} from '../translate/i18n';
import {storageDelete, storageGet, storageSet} from '../helpers/storage';
import * as RootNavigation from '../services/RootNavigation';
import Phone from '../assets/svg/phone.svg';
import Facebook from '../assets/svg/facebook.svg';
import Instagram from '../assets/svg/instagram.svg';
import Whatsapp from '../assets/svg/whatsapp.svg';
import Youtube from '../assets/svg/youtube.svg';
import Snapchat from '../assets/svg/snapchat.svg';
import ProfileIcon from '../assets/svg/profile1.svg';
import {getFcmToken} from '../helpers/notification';
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
    isGuest: false,
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
    if (state.isGuest || state.s?.kod === 'GUEST' || state.s?.kod === 'HG1000') {
      Alert.alert(tr('Misafir hesabında değişiklik yapılamaz'));
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
    if (res?.data?.error === false) {
      Alert.alert(tr('Güncellendi'));
      ns.newPassword = '';
    } else {
      Alert.alert(tr('Hata Oluştu'), res?.data?.msg || '');
    }
    ns.update = false;

    setState(ns);
  };

  const handleLogout = async () => {
    try {
      // 1. Immediately remove all auth tokens and keys from storage
      await AsyncStorage.multiRemove(['user', 'is_guest', 'user-storage', 'tokenSend']);
      await storageDelete('user');
      await storageDelete('is_guest');
      await storageDelete('tokenSend');

      // 2. Clear zustand store
      try {
        useUserStore.getState().clearUser?.();
      } catch (storeErr) {
        console.log('User store clear error:', storeErr);
      }

      // 3. Clear context
      if (setCtx) {
        setCtx(prev => ({
          ...prev,
          user: null,
          token: null,
        }));
      }

      // 4. Reset navigation to Login
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } catch (e1) {
        try {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            }),
          );
        } catch (e2) {
          try {
            RootNavigation.reset('Login');
          } catch (e3) {
            navigation.navigate('Login');
          }
        }
      }
    } catch (err) {
      console.log('handleLogout error:', err);
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } catch (navErr) {
        try {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            }),
          );
        } catch (dErr) {
          navigation.navigate('Login');
        }
      }
    }
  };

  const handleGoToLogin = async () => {
    try {
      await AsyncStorage.multiRemove(['user', 'is_guest', 'user-storage']);
      await storageDelete('user');
      await storageDelete('is_guest');
      try {
        useUserStore.getState().clearUser?.();
      } catch (e) {}
      if (setCtx) {
        setCtx(prev => ({ ...prev, user: null, token: null }));
      }
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } catch (e1) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          }),
        );
      }
    } catch (e) {
      navigation.navigate('Login');
    }
  };

  const handleGoToRegister = async () => {
    try {
      await AsyncStorage.multiRemove(['user', 'is_guest', 'user-storage']);
      await storageDelete('user');
      await storageDelete('is_guest');
      try {
        useUserStore.getState().clearUser?.();
      } catch (e) {}
      if (setCtx) {
        setCtx(prev => ({ ...prev, user: null, token: null }));
      }
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Register' }],
        });
      } catch (e1) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Register' }],
          }),
        );
      }
    } catch (e) {
      navigation.navigate('Register');
    }
  };

  const handleDelete = async () => {
    if (state.isGuest || state.s?.kod === 'GUEST' || state.s?.kod === 'HG1000') {
      Alert.alert(tr('Misafir hesabı silinemez'));
      return;
    }

    return Alert.alert(
      tr('Hesabı Sil'),
      tr('Hesabınızı silmek istediğinize emin misiniz?'),
      [
        {
          text: tr('Hesabı Sil') + '!',
          onPress: async () => {
            try {
              const res = await ai.get('delete-account');
              if (res?.data?.error === false) {
                Alert.alert(tr('Hesabınız 24 saat içinde silinecektir'));
                await AsyncStorage.multiRemove(['user', 'is_guest', 'user-storage', 'tokenSend']);
                await storageDelete('user');
                await storageDelete('is_guest');
                await storageDelete('tokenSend');
                try {
                  useUserStore.getState().clearUser?.();
                } catch (storeErr) {}
                if (setCtx) {
                  setCtx(prev => ({
                    ...prev,
                    user: null,
                    token: null,
                  }));
                }
                try {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  });
                } catch (e1) {
                  try {
                    navigation.dispatch(
                      CommonActions.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                      }),
                    );
                  } catch (e2) {
                    RootNavigation.reset('Login');
                  }
                }
              } else {
                Alert.alert(tr('Hesap silme işlemi başarısız oldu'));
              }
            } catch (delErr) {
              Alert.alert(tr('Hesap silme işlemi başarısız oldu'));
            }
          },
        },
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
  };
  const fetchData = async () => {
    try {
      console.log('fetchData', +new Date());
      const isGuestStorage = (await storageGet('is_guest')) === '1';
      const currentUser = await storageGet('user');
      const isGuest =
        isGuestStorage ||
        currentUser?.kod === 'GUEST' ||
        currentUser?.kod === 'HG1000' ||
        currentUser?.token === 'GUEST' ||
        ctx?.user?.kod === 'GUEST' ||
        ctx?.user?.kod === 'HG1000' ||
        ctx?.token === 'GUEST';

      let language = await storageGet('language');
      let theme = await storageGet('theme');

      if (isGuest) {
        setState(prev => ({
          ...prev,
          s: currentUser || { kod: 'HG1000', ad: tr('Misafir') },
          language: language || 'en',
          theme: theme || 'light',
          loading: false,
          isGuest: true,
        }));
        return;
      }

      const c = await ai.get('profile');
      let ns = {...state, isGuest: false};
      if (c?.data && c.data.error === false) {
        ns = {
          ...state,
          s: c.data.s || {},
          fields: Array.isArray(c.data.require_fields) ? c.data.require_fields : ['tel', 'adres'],
          sosyal: Array.isArray(c.data.sosyal) ? c.data.sosyal : [],
          banka: Array.isArray(c.data.banka) ? c.data.banka : [],
          isGuest: false,
        };

        if (c.data.teslimatSehirs) {
          setTeslimatSehirs(c.data.teslimatSehirs);
        }
        if (c.data.teslimatSehirID) {
          setTeslimatSehirID(c.data.teslimatSehirID);
        }
      } else {
        ns = {
          ...state,
          s: currentUser || {},
          fields: ['tel', 'adres'],
          isGuest: false,
        };
      }

      ns.language = language;
      ns.theme = theme ? theme : 'light';
      ns.loading = false;
      setState(ns);
    } catch (err) {
      console.log('Profile fetch error fallback:', err);
      const currentUser = await storageGet('user');
      let language = await storageGet('language');
      let theme = await storageGet('theme');
      setState(prev => ({
        ...prev,
        s: currentUser || {},
        fields: ['tel', 'adres'],
        language: language || 'en',
        theme: theme || 'light',
        loading: false,
      }));
    }
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

    guestCard: {
      padding: 24,
      backgroundColor: ctx.isLight ? '#F9FAFB' : '#1F2937',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: ctx.isLight ? '#E5E7EB' : '#374151',
      alignItems: 'center',
      marginBottom: 20,
    },
    guestAvatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: ctx.isLight ? '#FFF3E8' : '#2D1F15',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    guestTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: ctx.color,
      marginBottom: 8,
      textAlign: 'center',
    },
    guestSubtitle: {
      fontSize: 14,
      color: ctx.isLight ? '#6B7280' : '#9CA3AF',
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
      paddingHorizontal: 10,
    },
    guestActionRow: {
      flexDirection: 'row',
      width: '100%',
      justifyContent: 'space-between',
    },
    guestLoginBtn: {
      flex: 1,
      backgroundColor: Colors.primary,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
    },
    guestLoginBtnText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 15,
    },
    guestRegisterBtn: {
      flex: 1,
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: Colors.primary,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 6,
    },
    guestRegisterBtnText: {
      color: Colors.primary,
      fontWeight: 'bold',
      fontSize: 15,
    },
    logoutBtnFull: {
      backgroundColor: '#DC2626',
      paddingVertical: 14,
      borderRadius: 10,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoutBtnFullText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 16,
    },

    safeArea: {
      flex: 1,
      backgroundColor: ctx.bgColor,
    },
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={{paddingBottom: 40, paddingTop: 20}}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/*<AuthHeader navigation={navigation} route={route} />*/}
          {/*<View style={styles.logoContainer}>
          <Logo maxWidth={120} />
        </View>*/}
          {state.loading ? (
            <View>
              <Text>{tr('Yükleniyor')}...</Text>
            </View>
          ) : null}

          {state.loading === false && (
            state.isGuest ? (
              <View style={styles.scroll}>
                {/* Guest Profile Card */}
                <View style={styles.guestCard}>
                  <View style={styles.guestAvatar}>
                    <ProfileIcon fill={Colors.primary} width={38} height={38} />
                  </View>
                  <Text style={styles.guestTitle}>
                    {tr('Misafir Kullanıcı')}
                  </Text>
                  <Text style={styles.guestSubtitle}>
                    {i18n.locale === 'tr'
                      ? 'Daha iyi bir alışveriş deneyimi ve sipariş takibi için giriş yapın veya hesap oluşturun.'
                      : i18n.locale === 'som'
                      ? 'Gal akoonkaaga ama sameyso akoon cusub si aad u hesho adeeg buuxa.'
                      : 'Log in or create an account for a better shopping experience and order tracking.'}
                  </Text>

                  <View style={styles.guestActionRow}>
                    <TouchableOpacity
                      style={styles.guestLoginBtn}
                      onPress={handleGoToLogin}>
                      <Text style={styles.guestLoginBtnText}>{tr('Giriş Yap')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.guestRegisterBtn}
                      onPress={handleGoToRegister}>
                      <Text style={styles.guestRegisterBtnText}>{tr('Kayıt Ol')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Language Selection */}
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

                {/* Theme Selection */}
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

                {/* Exit Guest Mode / Logout Button */}
                <View style={{marginVertical: 15, width: '100%'}}>
                  <TouchableOpacity
                    style={styles.logoutBtnFull}
                    onPress={handleLogout}>
                    <Text style={styles.logoutBtnFullText}>
                      {tr('Çıkış Yap')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
            <View style={styles.scroll}>
              <View style={styles.borderedBox}>
                <View style={styles.row}>
                  <Text style={styles.label}>{tr('Müşteri Kodu')}</Text>
                  <Text style={styles.text}>{state.s.kod}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>{tr('Ad')}</Text>
                  <Text style={styles.text}>{state.s.ad}</Text>
                </View>

                {state.fields?.includes('tel') && (
                  <View style={styles.row}>
                    <Text style={styles.label}>{tr('Telefon')}</Text>
                    <Text style={styles.text}>{state.s.tel}</Text>
                  </View>
                )}

                {state.fields?.includes('adres') && (
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
            </View>
            )
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
