import ReactNative, {
  Dimensions,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from 'react-native';

import { useContext, useEffect, useState } from 'react';
import Colors from '../assets/Colors';
import Logo from '../components/Logo';
import KeyboardAvoidingComponent from '../components/KeyboardAvoidingComponent';
import GlobalStyle from '../assets/GlobalStyle';
import { getToken, getUser, setUser } from '../helpers/auth';
import ai from '../helpers/ai';
import { EmContext } from '../contexts/EmContext';
import { delay, IS_DEV, lb } from '../helpers/common';
import { availableLanguages, i18n, tr } from '../translate/i18n';
import { IS_LOCAL } from '../../config';
import { storageAllKeys, storageGet, storageSet } from '../helpers/storage';
import Dump from '../components/Dump';
import { fcmUpdate, getFcmToken } from '../helpers/notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';

export default function ({ navigation }) {
  const { ctx, setCtx, ctxDil, setCtxDil } = useContext(EmContext);
  const FILL = true;
  let fillKod = 'TEST', fillSifre = '123';

  fillKod = '11';
  fillSifre = '7575';
  fillKod = 'Z1';
  fillSifre = '123';

  const [state, setState] = useState({
    kod: IS_LOCAL && FILL ? fillKod : '',
    sifre: IS_LOCAL && FILL ? fillSifre : '',
    user: null,
    fcmToken: null,
    language: null,
  });

  const [settingLoading, setSettingLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  const [settings, setSettings] = useState({
    register: null,
    login: null,
    forgot_password: null,
    customer_support: null,
  });

  const handleChange = (name, text) => {
    setState({ ...state, [name]: text });
  };

  const handleSubmit = async ({ kod, sifre }) => {
    if (!kod || !sifre) {
      alert(tr('Lütfen müşteri kodu ve parolanızı giriniz'));
      return;
    }

    setLoading(true);
    try {
      const cleanKod = typeof kod === 'string' ? kod.trim() : kod;
      const cleanSifre = typeof sifre === 'string' ? sifre.trim() : sifre;

      const activeDil = ctxDil || i18n.locale || (await storageGet('language')) || 'en';
      await storageSet('language', activeDil);
      i18n.locale = activeDil;
      setCtxDil(activeDil);

      const res = await ai.post('login', {
        kod: cleanKod,
        sifre: cleanSifre,
        dil: activeDil,
      });

      if (res && res.data && res.data.error === false) {
        console.log('Login Success Response:', res.data.s);
        await setUser(res.data.s);
        setCtx({ ...ctx, user: res.data.s, token: res.data.s.token });

        try {
          const fcmToken = await getFcmToken();
          console.log('fcmToken update --- ', fcmToken);
          await ai.post('update-language', {
            dil: activeDil,
            fcmToken: fcmToken,
          });
        } catch (fcmErr) {
          console.log('fcm / update-language error:', fcmErr?.message || fcmErr);
        }

        // Ensure language is firmly set before navigating
        await storageSet('language', activeDil);
        i18n.locale = activeDil;
        setCtxDil(activeDil);

        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'AuthAfter' }],
          }),
        );
      } else {
        console.log('Login Response Error:', JSON.stringify(res?.data));
        const errorMsg = res?.data?.msg || 'Hatalı Müşteri Kodu veya Parola';
        console.log('Login error message:', errorMsg);
        alert(tr(errorMsg));
      }
    } catch (error) {
      console.log('Login Request Exception:', error?.message || error);
      if (error?.response) {
        console.log('Login Response Status:', error.response.status);
        console.log('Login Response Data:', JSON.stringify(error.response.data));
      }
      const errorMsg = error?.response?.data?.msg || error?.message || 'Giriş yapılamadı';
      console.log('Login Error Displayed:', errorMsg);
      alert(tr(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  const userLoad = async () => {
    // await AsyncStorage.removeItem("user");

    const user = await getUser();
    // const storageUser = await getUser();
    console.log('userLoading...');
    let storageToken;
    try {
      storageToken = await getToken();
    } catch (e) {
      console.log('storageToken error', e);
    }

    let fcmToken = await getFcmToken();

    console.log('userLoad - storageToken', storageToken);
    // console.log("userLoad - fcmToken ", fcmToken);

    setState({ ...state, user, storageToken, fcmToken: fcmToken });

    console.log('after userLoad');
  };

  const fetchSettings = async () => {
    try {
      const res = await ai.get('settings');
      if (res?.data?.error === false) {
        setSettings(prev => ({ ...prev, ...res.data.settings }));
      }
    } catch (e) {
      console.log('fetchSettings error:', e?.message);
    } finally {
      setSettingLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    // navigation.navigate("ForgotPassword");
    const whatsappNo = settings.customer_support,
      whatsappMsg = tr('Şifremi Unuttum');
    let wa_url = `whatsapp://send?phone=${whatsappNo}&text=${whatsappMsg}`;

    try {
      let acilir = await Linking.canOpenURL(wa_url);
      if (acilir) {
        await Linking.openURL(wa_url);
      } else {
        alert('Contact to customer support : ' + whatsappNo);
      }
    } catch (e) {
      // console.log("whatsapp error", e);
      alert('Contact to customer support \n' + whatsappNo);
    }
  };

  const handleDilUpdate = async dil => {
    await storageSet('language', dil);
    i18n.locale = dil;
    const isRTL = dil === 'ar' || dil === 'ckb';
    ReactNative.I18nManager.allowRTL(isRTL);
    setCtxDil(dil);
  };

  const handleGuestLogin = async () => {
    await handleSubmit({
      kod: 'HG1000',
      sifre: '123',
    });
  };

  const submitPress = async () => {
    await handleSubmit({
      kod: state.kod,
      sifre: state.sifre,
    });
  };

  useEffect(() => {
    lb('Login useEffect');
    userLoad();
    fetchSettings();
    (async () => {
      try {
        const savedLang = await storageGet('language');
        if (savedLang) {
          i18n.locale = savedLang;
          setCtxDil(savedLang);
        }
      } catch (e) {
        console.log('Login init language error:', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoRatio = 963 / 741;
  const { width, height } = Dimensions.get('window');
  const logoHeight = height / 5;
  console.log('logoHeight', logoHeight);
  const logoWidth = logoHeight * logoRatio;

  return (
    <SafeAreaView style={GlobalStyle.safeArea}>
      {!settingLoading && (
        <View style={styles.container}>
          {/*<Dump state={[state]} />*/}

          <KeyboardAvoidingComponent
            style={{ width: '100%', flexDirection: 'column' }}>
            <Logo
              maxWidth={logoWidth}
              maxHeight={logoHeight}
              marginBottom={20}
            />

            <View style={styles.inputContainer}>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  onChangeText={s => handleChange('kod', s)}
                  placeholderTextColor={Colors.placeholderTextColor}
                  placeholder={tr('Müşteri Kodu, Telefon veya Eposta')}
                  autoComplete="off"
                  value={state.kod}
                  textContentType="none"
                />
              </View>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  textContentType="none"
                  onChangeText={s => handleChange('sifre', s)}
                  placeholderTextColor={Colors.placeholderTextColor}
                  placeholder={tr('Parola')}
                  autoComplete="off"

                  value={state.sifre}
                />
              </View>

              <View style={[styles.centeredInputRow]}>
                <View style={[styles.btnContainer, GlobalStyle.mb20]}>
                  <TouchableHighlight
                    onPress={() => submitPress()}
                    disabled={loading}>
                    <Text style={styles.button}>
                      {tr('Giriş')}
                      {loading ? '...' : ''}
                    </Text>
                  </TouchableHighlight>
                </View>
              </View>
            </View>
          </KeyboardAvoidingComponent>

          {settings.register && (
            <View style={[styles.centeredInputRow]}>
              <View
                style={[
                  styles.btnContainer,
                  { marginHorizontal: 20, alignItems: 'center' },
                ]}>
                <Text style={GlobalStyle.text}>{tr('Hesabın yok mu?')} </Text>
                <TouchableOpacity
                  style={styles.registerBtn}
                  onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.registerBtnText}>{tr('Kayıt Ol')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {settings.customer_support && (
            <View style={[styles.centeredInputRow]}>
              <View>
                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={{ color: 'blue' }}>{tr('Şifremi Unuttum')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={[styles.centeredInputRow]}>
            <View style={{ alignItems: 'center' }}>
              <TouchableOpacity onPress={async () => handleGuestLogin()}>
                <Text style={{ color: 'green', fontWeight: 'bold' }}>{tr('Misafir Girişi')}</Text>
              </TouchableOpacity>
            </View>
          </View>


          <View style={styles.inputContainer}>
            <View style={[styles.inputRow]}>
              {/*<View style={[GlobalStyle.w100]}>
              <Text style={[GlobalStyle.textCenter, GlobalStyle.mb10]}>{tr("Uygulama Dili")}</Text>
            </View>*/}


              <View
                style={[
                  {
                    justifyContent: 'center',
                    flexDirection: 'row',
                    marginTop: 10,
                    // backgroundColor: 'red',
                  },
                ]}>
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
          </View>

          {/*<Dump settings={settings}></Dump>*/}
          {/*__DEV__ && (
                  <View style={[styles.centeredInputRow]}>
                    <Text style={{color: '#333'}}>fcmToken {state.fcmToken}</Text>
                  </View>
                )*/}
        </View>
      )}
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  borderedBox: {
    padding: 20,
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 10,
    marginBottom: 20,
  },

  dil: {
    backgroundColor: Colors.primary,
    padding: 10,
    borderRadius: 5,
    margin: 5,
  },
  dilText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  aktifDil: {
    backgroundColor: Colors.secondary,
  },

  container: {
    flex: 1,
    // alignItems: 'center',
    // justifyContent: 'center',
    padding: 10,
    backgroundColor: Colors.bgColor,
  },
  logoContainer: {
    fleX: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 50,
    backgroundColor: 'red',
    width: '100%',
  },
  logo: {
    width: 200,
    height: 180,
    marginBottom: 20,
  },

  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: 20,
    backgroundColor: 'white',
  },

  inputContainer: {
    flexDirection: 'column',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  inputRow: {
    width: '100%',
    // backgroundColor: 'red',
    marginBottom: 20,
    maxWidth: 320,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',

    // maxWidth: width > 600 ? 500 : '100%',
  },
  centeredInputRow: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    height: 50,
    borderColor: 'gray',
    borderWidth: 1,
    width: '100%',
    backgroundColor: '#FFF',
    color: '#000',
    paddingLeft: 15,
    borderRadius: 5,
  },
  btnContainer: {
    minWidth: 200,
    maxWidth: 220,
  },
  button: {
    backgroundColor: Colors.btnColor,
    color: Colors.btnTextColor,
    paddingHorizontal: 20,
    paddingVertical: 15,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Colors.btnColor,
    overflow: 'hidden',
  },

  registerBtn: {
    minWidth: 200,
    maxWidth: 220,
    // backgroundColor: Colors.btnColor,
    color: Colors.btnTextColor,
    paddingHorizontal: 50,
    paddingVertical: 10,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Colors.btnColor,
    overflow: 'hidden',
  },

  registerBtnText: {
    color: Colors.btnColor,
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
});
