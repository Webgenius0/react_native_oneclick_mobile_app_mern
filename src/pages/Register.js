import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from 'react-native';
import {useEffect, useState} from 'react';
import Colors from '../assets/Colors';
import Logo from '../components/Logo';
import KeyboardAvoidingComponent from '../components/KeyboardAvoidingComponent';
import DocumentPicker from 'react-native-document-picker';
import IdentityIcon from '../assets/svg/identity.svg';
import GlobalStyle from '../assets/GlobalStyle';
import {getToken, setUser} from '../helpers/auth';
import ai from '../helpers/ai';
import {SelectList} from 'react-native-dropdown-select-list/index';
import Dump from '../components/Dump';
import {i18n, tr, t} from '../translate/i18n';
import {getFcmToken} from '../helpers/notification';
import CheckBox from '@react-native-community/checkbox';

export default function ({navigation}) {
  let initalData = {
    ad: '',
    tel: '',
    tel2: '',
    ilID: 0,
    sifre: '',
    sifre_tekrar: '',
    adres: '',
    eposta: '',
    error: '',
    loading: true,
    cities: [],
    fields: [],
  };

  const defaultIl = null; // {"key":"2","value":"ERBİL"};
  const devFill = true;
  if (__DEV__ && devFill) {
    initalData = {
      ...initalData,
      ad: 'test',
      tel: '123456789',
      // tel: Math.random().toString().slice(2, 11),
      tel2: '',
      eposta: 'test@msn.com',
      ilID: 2,
      sifre: '123456',
      sifre_tekrar: '123456',
      adres: 'test',
    };
  }

  const [state, setState] = useState(initalData);

  const [policyChecked, setPolicyChecked] = useState(false);
  const [policyText, setPolicyText] = useState('');
  const [modalShow, setModalShow] = useState(false);

  const [uploadFile, setUploadFile] = useState(null);

  const selectFile = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.images],
        allowMultiSelection: false,
      });

      setUploadFile(res[0]);
      console.log('select file res : ' + JSON.stringify(res[0]));
    } catch (err) {
      setUploadFile(null);
      console.log('catch', err);
      if (DocumentPicker.isCancel(err)) {
        alert(t('İptal Edildi'));
      } else {
        alert('Unknown Error: ' + JSON.stringify(err));
        throw err;
      }
    }
  };

  const handleChange = (name, text) => {
    console.log('name : ' + name + ' text : ' + text);
    setState({...state, [name]: text});
  };

  const handleSubmit = async () => {
    if (state.ad.length === 0) {
      alert(tr('Lütfen ad alanını boş bırakmayın'));
      return;
    }

    if (state.sifre.length < 3) {
      alert(tr('Lütfen en az 3 karakter şifre girin'));
      return;
    }
    if (state.sifre !== state.sifre_tekrar) {
      alert(tr('Şifreler uyuşmuyor'));
      return;
    }

    if (state.req_fields.includes('tel') && state.tel.length < 6) {
      alert(tr('Lütfen geçerli bir telefon numarası girin'));
      return;
    }
    if (state.req_fields.includes('eposta') && state.eposta.length < 6) {
      alert(tr('Lütfen geçerli bir eposta girin'));
      return;
    }

    if (state.req_fields.includes('il') && state.ilID === 0) {
      alert(tr('Lütfen il seçin'));
      return;
    }

    if (state.req_fields.includes('adres') && state.adres.adres < 3) {
      alert(tr('Lütfen geçerli bir adres girin'));
      return;
    }

    if (state.req_fields.includes('kimlik') && uploadFile == null) {
      alert(tr('Lütfen bir kimlik veya pasaport fotoğrafı seçiniz'));
      return;
    }

    if (policyText.length > 0 && !policyChecked) {
      alert(tr('Kullanıcı politikasını kabul etmelisiniz'));
      return;
    }

    let postData = new FormData(),
      token = await getToken();
    console.log('token', token);

    postData.append('ad', state.ad);
    postData.append('tel', state.tel);
    postData.append('tel2', state.tel2);
    postData.append('ilID', state.ilID);
    postData.append('sifre', state.sifre);
    postData.append('sifre_tekrar', state.sifre_tekrar);
    postData.append('adres', state.adres);
    postData.append('eposta', state.eposta);
    postData.append('dil', i18n.locale);

    if (uploadFile) {
      // postData.append("file", file.uri, file.name);
      let imgData = {
        uri: uploadFile?.uri,
        type: uploadFile?.type, // or photo.type
        name: uploadFile?.name,
      };

      console.log('imgData', imgData);
      postData.append('file', imgData);
    }
    postData.append('token', token);

    console.log('postData', postData);

    const response = await ai.post('register', postData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.error === false) {
      await setUser(response.data.s);
      let fcm = await getFcmToken();
      console.log('Error false', response.data);
      alert(
        tr('Kayıt Tamamlandı') +
          ', ' +
          tr('Müşteri Kodu') +
          ' : ' +
          response.data.s.kod,
      );
      setTimeout(function () {
        let d = +new Date();
        navigation.navigate('AuthAfter');
        // navigation.navigate('Home');
      }, 1000);
    } else {
      let msg = response.data.msg;
      if (i18n.exists(msg)) {
        msg = tr(msg);
      }
      alert(msg);
      console.log('Hata Oluştu', response.data);
    }
  };

  const fetchRegisterData = async () => {
    setState({...state, loading: true});
    let ns = {...state, loading: false};
    const response = await ai.get('register-data');
    if (response.data.error === false) {
      ns.cities = response.data.cities;
      ns.fields = response.data.fields;
      ns.req_fields = response.data.req_fields;

      if (response.data.policy) {
        let lang = i18n.locale;
        console.log('lang', lang);
        let policyText =
          response.data?.policy[lang] || response.data.policy['en'];
        setPolicyText(policyText);
      }
    } else {
      console.log(response.data);
      alert(tr('Şehir listesi getirilirken hata oluştu'));
      // console.log("Hata Oluştu", response.data);
      ns.cities = [];
    }

    setState(ns);
  };

  useEffect(() => {
    fetchRegisterData();
  }, []);

  return (
    <SafeAreaView style={GlobalStyle.safeArea}>
      <KeyboardAvoidingComponent>
        <View style={styles.container}>
          {state.loading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <ScrollView>
              <Logo maxWidth={200} maxHeight={75} marginBottom={20} />

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  onChangeText={s => handleChange('ad', s)}
                  placeholderTextColor={Colors.placeholderTextColor}
                  defaultValue={state.ad}
                  placeholder={tr('Ad')}></TextInput>
              </View>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  onChangeText={s => handleChange('sifre', s)}
                  placeholderTextColor={Colors.placeholderTextColor}
                  defaultValue={state.sifre}
                  placeholder={tr('Parola')}></TextInput>
              </View>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  onChangeText={s => handleChange('sifre_tekrar', s)}
                  placeholderTextColor={Colors.placeholderTextColor}
                  defaultValue={state.sifre_tekrar}
                  placeholder={tr('Parola Tekrar')}></TextInput>
              </View>

              <View style={styles.inputRow}>
                <SelectList
                  setSelected={val => handleChange('ilID', val)}
                  data={state.cities}
                  selected={state.ilID}
                  placeholder={tr('Şehir Seçiniz')}
                  label={tr('Şehir')}
                  save="key"
                  boxStyles={{color: '#333'}}
                  inputStyles={{color: '#333'}}
                  dropdownTextStyles={{color: '#333'}}
                  defaultOption={defaultIl}
                />

                {/*<TextInput style={styles.textInput} onChangeText={s => handleChange("sehir", s)}
                     placeholderTextColor={Colors.placeholderTextColor}
                     placeholder="Şehir"></TextInput>*/}
              </View>

              {state.fields.includes('tel') && (
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.textInput}
                    onChangeText={s => handleChange('tel', s)}
                    placeholderTextColor={Colors.placeholderTextColor}
                    defaultValue={state.tel}
                    keyboardType="phone-pad"
                    placeholder={tr('Telefon')}></TextInput>
                </View>
              )}

              {state.fields.includes('tel2') && (
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.textInput}
                    onChangeText={s => handleChange('tel2', s)}
                    placeholderTextColor={Colors.placeholderTextColor}
                    defaultValue={state.tel2}
                    keyboardType="phone-pad"
                    placeholder={tr('Telefon 2')}></TextInput>
                </View>
              )}

              {state.fields.includes('adres') && (
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.textInputAdres]}
                    onChangeText={s => handleChange('adres', s)}
                    multiline={true}
                    numberOfLines={2}
                    placeholderTextColor={Colors.placeholderTextColor}
                    placeholder={tr('Adres')}></TextInput>
                </View>
              )}

              {state.fields.includes('eposta') && (
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.textInput}
                    onChangeText={s => handleChange('eposta', s)}
                    placeholderTextColor={Colors.placeholderTextColor}
                    keyboardType="email-address"
                    placeholder={tr('Eposta')}></TextInput>
                </View>
              )}

              {policyText.length > 0 ? (
                <View
                  style={[
                    styles.inputRow,
                    {flexDirection: 'row', alignItems: 'center'},
                  ]}>
                  <CheckBox
                    value={policyChecked}
                    tintColors={{true: '#F15927', false: 'black'}}
                    onValueChange={setPolicyChecked}
                    size={'small'}
                  />
                  <TouchableOpacity onPress={() => setModalShow(true)}>
                    <Text
                      style={{
                        marginLeft: 10,
                        color: 'blue',
                      }}>
                      {tr('Kullanıcı politikasını okudum ve kabul ediyorum')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {state.fields.includes('kimlik') ? (
                <View style={styles.inputRow}>
                  <TouchableOpacity
                    onPress={async () => selectFile()}
                    style={styles.uploadArea}>
                    <View style={{flexDirection: 'column', marginBottom: 20}}>
                      <View style={[GlobalStyle.pr10]}>
                        <Text style={styles.uploadText}>
                          {tr('Kimlik / Pasaport Resmi')}
                        </Text>
                      </View>
                      <View
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          borderWidth: 2,
                          borderStyle: 'dashed',
                          alignItems: 'center',
                        }}>
                        {uploadFile ? (
                          <Image
                            source={{uri: uploadFile.uri}}
                            style={{
                              width: 100,
                              height: 100,
                              resizeMode: 'contain',
                            }}
                          />
                        ) : (
                          <IdentityIcon height={40} width={40} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/*<Dump state={state} />*/}

              <View style={[styles.inputRow, {alignItems: 'center'}]}>
                <TouchableHighlight
                  style={styles.button}
                  onPress={() => handleSubmit()}>
                  <Text style={styles.buttonText}>{tr('Kayıt Ol')}</Text>
                </TouchableHighlight>
              </View>

              <View style={[styles.inputRow, {alignItems: 'center'}]}>
                <Text style={styles.textColor}>
                  {tr('Zaten hesabın var mı?')}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={{color: 'blue'}}>{tr('Giriş Yap')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingComponent>

      <Modal animationType="slide" transparent={true} visible={modalShow}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            padding: 20,
          }}>
          <Text style={{color: '#000', marginBottom: 30}}>{policyText}</Text>

          <TouchableHighlight
            style={styles.button}
            onPress={() => setModalShow(false)}>
            <Text style={styles.buttonText}>{tr('Kapat')}</Text>
          </TouchableHighlight>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const {width, height} = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },

  inputRow: {
    marginBottom: 10,
    width: '100%',
    maxWidth: 400,
    // justifyContent: "center",
    alignSelf: 'center',
  },
  textInput: {
    height: 45,
    borderColor: '#cbc9c9',
    borderWidth: 1,
    width: '100%',
    backgroundColor: '#FFF',
    color: '#000',
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  textInputAdres: {
    minHeight: 60,
    borderColor: '#cbc9c9',
    borderWidth: 1,
    width: '100%',
    backgroundColor: '#FFF',
    color: '#000',
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  button: {
    backgroundColor: Colors.btnColor,
    padding: 10,
    borderRadius: 5,
    minWidth: 200,
    marginBottom: 10,
  },
  buttonText: {
    color: Colors.btnTextColor,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  textColor: {
    color: Colors.textColor,
  },
});
