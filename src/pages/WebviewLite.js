import React, { useContext, useEffect, useRef, useState } from 'react';
import WebView from 'react-native-webview';
import {
  BackHandler,
  Linking,
  Platform,
  SafeAreaView,
  Text,
  View,

} from 'react-native';
import { tr } from '../translate/i18n';
import GlobalStyle from '../assets/GlobalStyle';
import { HeaderBackButton } from '@react-navigation/elements';
import { injectedJavascript } from '../helpers/webview';

const BLANK_WEBVIEW_SOURCE = {
  html: '',
  baseUrl: 'about:blank',
};
const BLANK_SOURCE_URL = 'about:blank';

export default function WebviewLite({ route, navigation }) {
  let page_url = route?.params?.url || '';

  if (!page_url && __DEV__) {
    page_url = 'https://1clicktoshop.com/sestest.php';
  }

  useEffect(() => {
    // alert(page_url);
  }, [page_url]);

  const [canGoBack, setCanGoBack] = useState(false);
  const webView = useRef(null);
  const [image, setImage] = useState('');
  const HandleBackPressed = () => {
    if (webView.current.canGoBack) {
      webView.current.goBack();
      return true; // PREVENT DEFAULT BEHAVIOUR (EXITING THE APP)
    }
    return false;
  };

  const [state, setState] = useState({
    url: page_url,
    loading: false,
  });

  useEffect(() => {
    navigation.setOptions({
      title: route.params?.ad || '',
      headerLeft: props => (
        <HeaderBackButton
          {...props}
          labelVisible={false}
          backTitleVisible={false}
          onPress={() => {
            if (webView.current.canGoBack) {
              webView.current.goBack();
            } else {
              navigation.goBack();
            }
          }}
        />
      ),
    });

    if (Platform.OS === 'android') {
      BackHandler.addEventListener('hardwareBackPress', HandleBackPressed);

      return () => {
        BackHandler.removeEventListener('hardwareBackPress', HandleBackPressed);
      };
    }
  }, []);

  const INJECTED_JAVASCRIPT = injectedJavascript({ page_url });

  const onMessage = (event) => { }
  const onLoad = (event) => { }
  const onLoadStart = (event) => { }
  const onLoadEnd = (event) => { }

  // WhatsApp linklerini dış uygulamada açmak için
  const onShouldStartLoadWithRequest = (request) => {
    const { url = '' } = request;
    
    // WhatsApp linkleri kontrol et
    if (url.includes('whatsapp.com') || url.includes('wa.me') || url.startsWith('whatsapp://')) {
      // WhatsApp linkini dış uygulamada aç
      Linking.openURL(url).catch(err => {
        console.error('WhatsApp linki açılamadı:', err);
      });
      return false; // WebView'da açmasını engelle
    }
    
    // Diğer linkler için normal davranış
    return true;
  };

  const source =
    page_url && page_url !== BLANK_SOURCE_URL
      ? { uri: page_url }
      : BLANK_WEBVIEW_SOURCE;

  return (
    <SafeAreaView style={GlobalStyle.safeArea}>
      <>
        <View
          style={{
            height: '100%',
          }}>
          <WebView
            originWhitelist={['*']}
            ref={webView}
            source={source}
            // injectedJavaScript={INJECTED_JAVASCRIPT}
            cookiesEnabled={true}
            domStorageEnabled={true}
            thirdPartyCookiesEnabled={true}
            sharedCookiesEnabled={true}
            incognito={false}
            cacheEnabled={true}

            onLoadStart={onLoadStart}
            onLoadEnd={onLoadEnd}
            onLoad={onLoad}
            onMessage={onMessage}
            onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
            ></WebView>

          {state.loading ? (
            <View
              style={{
                position: 'absolute',
                // backgroundColor: "red",
                left: '50%',
                right: '50%',
                bottom: 150,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <View
                style={{
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: '#DDD',
                }}>
                <Text>{tr('Loading') || 'Loading'}...</Text>
              </View>
            </View>
          ) : null}
        </View>
      </>
    </SafeAreaView>
  );
}
