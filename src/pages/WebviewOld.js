import React, {useEffect, useRef, useState, useCallback, useMemo} from 'react';
import {BackHandler, Linking, Platform, SafeAreaView, View, TouchableOpacity, Text} from 'react-native';
import {HeaderBackButton} from '@react-navigation/elements';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import GlobalStyle from '../assets/GlobalStyle';
import Colors from '../assets/Colors';
import {useCartStore} from '../store/useCartStore';
import {delay} from '../helpers/common';
import AddToCart from '../components/webview/AddToCart';
import MasterWebView from '../components/webview/MasterWebView';
import {useScriptServiceStore} from '../store/useScriptServiceStore';
import {useWebviewStore} from '../store/useWebviewStore';
import WebView from 'react-native-webview';
import { userAgent } from '../helpers/webview';

export default function Webview({route, navigation}) {
  const {addItem} = useCartStore();
  const {injectScript} = useScriptServiceStore();
  const translateActive = useWebviewStore(state => state.translateActive);
  const setTranslateUrl = useWebviewStore(state => state.setTranslateUrl);

  const sourceUrl = useMemo(() => {
    const routeUrl = route?.params?.url || '';
    if (routeUrl) return routeUrl;
    if (!__DEV__) return '';

    return 'https://www.trendyol.com/en/';
    return 'https://www.trendyol.com/erkek-pantolon-x-g2-c70';
    // return 'https://www.trendyol.com/avva/erkek-siyah-yandan-cepli-beli-lastikli-bagcikli-duble-paca-jogger-pantolon-e003000-p-91684429';
   // return 'https://www.trendyol.com/en/takasat/stainless-steel-cutting-board-2-pcs-antibacterial-surface-level-quality-p-890963615?boutiqueId=61&merchantId=357658';
    // return 'https://www.trendyol.com/en/puma/men-sportswear-fit-short-sleeve-outdoor-t-shirt-black-p-927611741';
    return 'https://www.trendyol.com/en/men-t-shirts-x-g2-c73';
    // return 'https://1clicktoshop.com/sestest.php';
  }, [route?.params?.url]);

  // Ekrandaki temel state
  const [url, setUrl] = useState(sourceUrl);
  const [loading, setLoading] = useState(true);
  const currentUrlRef = useRef(sourceUrl);
  const lastInjectedUrlRef = useRef('');
  const lastInjectedScriptRef = useRef('');
  const routeChangeTimerRef = useRef(null);
  const [lastImage, setLastImage] = useState('');

  // Ürüne dair bilgiler
  const [image, setImage] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('');

  // Çeviri butonu göster/gizle (route parametresi, varsayılan: gizli)
  const showTranslateButton = route?.params?.showTranslateButton || false;
  const webViewRef = useRef(null);

  /* const INJECTED_JAVASCRIPT = useMemo(
    () =>
    injectedJavascript({
      page_url: url || sourceUrl,
      getMetaTagImage: true,
      getMetaTitle: true,
    }),
    [url, sourceUrl],
  ); */

  /*************************** HELPER FONKSİYONLAR ***************************/

  // Geri tuşuna basıldığında önce sayfa geri gider, yoksa sayfadan çıkar
  const handleBackPressed = useCallback(() => {
    if (webViewRef.current?.canGoBack) {
      webViewRef.current.goBack();
      return true;
    }
    return false;
  }, []);

  // Çevrimi başlatma
  const startInject = useCallback((targetUrl = currentUrlRef.current) => {
    if (!injectScript || !translateActive || !targetUrl) {
      return;
    }

    const shouldInject =
      lastInjectedUrlRef.current !== targetUrl ||
      lastInjectedScriptRef.current !== injectScript;

    if (!shouldInject) {
      return;
    }

    if (webViewRef.current) {
      try {
        console.log('[startInject inject] worked', injectScript.length);
        webViewRef.current.injectJavaScript(`;${injectScript};true;`);
        lastInjectedUrlRef.current = targetUrl;
        lastInjectedScriptRef.current = injectScript;
      } catch (error) {
        console.error('[startInject inject Error]', error);
      }
    }
  }, [injectScript, translateActive]);

  const addChart = useCallback(async () => {
    addItem({
      title,
      url,
      count: 1,
      checked: true,
      image,
      price,
      currency,
    });
    await delay(500);
    navigation.navigate('Cart');
  }, [addItem, title, url, image, price, currency, navigation]);

  // WebView içerisinden gelen mesajları işleme
  const lastMessageRef = useRef('');
  const onMessage = useCallback(({nativeEvent}) => {
    try {
      const message = JSON.parse(nativeEvent.data);
      console.log('[onMessage]', message);
      switch (message?.type) {
        case 'image':
          setImage(message.data);
          lastMessageRef.current = message.data;
          break;
        case 'title':
          setTitle(message.data);
          lastMessageRef.current = message.data;
          break;
        case 'price':
          setPrice(message.data);
          lastMessageRef.current = message.data;
          break;
        case 'currency':
          setCurrency(message.data);
          lastMessageRef.current = message.data;
          break;
        case 'routeChange': {
          const nextUrl = message?.data?.url;
          if (!nextUrl) {
            break;
          }

          setUrl(prevUrl => prevUrl === nextUrl ? prevUrl : nextUrl);
          setTranslateUrl(nextUrl);
          currentUrlRef.current = nextUrl;
          lastMessageRef.current = nextUrl;

          if (routeChangeTimerRef.current) {
            clearTimeout(routeChangeTimerRef.current);
          }

          routeChangeTimerRef.current = setTimeout(() => {
            startInject(nextUrl);
          }, 180);
          break;
        }
        case "navtitle":
          navigation.setOptions({
            title: `${message.data}`,
          });
          lastMessageRef.current = message.data;
          break;
        case "redirect":
          webViewRef.current?.injectJavaScript(`window.location.href = '${message.data}';`);
          break;
        case 'error':
          if (lastMessageRef.current !== message.data) console.error('Error:', message.data);
          lastMessageRef.current = message.data;
          break;
        default:
          if (lastMessageRef.current !== message.data) console.log('onMessage:', JSON.stringify(message));
          lastMessageRef.current = message.data;
          break;
      }
    } catch (error) {
      // parse error
    }
  }, [navigation, setTranslateUrl, startInject]);

  // WebView yüklenmeye başladı
  const onLoadStart = useCallback(() => {
    setLoading(true);
  }, []);

  // WebView yüklenme bitti
  const onLoadEnd = useCallback(() => {
    setLoading(false);

  }, []);

  const onNavigationStateChange = useCallback(navState => {
    setUrl(navState.url);
    setLoading(navState.loading);
    setTranslateUrl(navState.url);
    webViewRef.current.canGoBack = navState.canGoBack;
    currentUrlRef.current = navState.url;

    if (!navState.loading) {
      startInject(navState.url);
    }
  }, [setTranslateUrl, startInject]);

  const copyCurrentUrl = useCallback(() => {
    const currentUrl = currentUrlRef.current;
    if (!currentUrl) return;

    Clipboard.setString(currentUrl);
    Toast.show({
      type: 'success',
      text1: 'Copied to Clipboard',
      position: 'bottom',
    });
  }, []);

  /***************************
   *        USE EFFECTS
   ***************************/


  // Sayfa açıldığında
  useEffect(() => {
    navigation.setOptions({
      title: route.params?.ad || '-',
      headerLeft: props => (
        <HeaderBackButton
          {...props}
          onPress={() => {
            if (webViewRef.current.canGoBack) {
              webViewRef.current.goBack();
            } else {
              navigation.goBack();
            }
          }}
        />
      ),
    });

    // Geri tuşu dinleyicisi (Android)
    if (Platform.OS === 'android') {
      BackHandler.addEventListener('hardwareBackPress', handleBackPressed);
      return () => {
        BackHandler.removeEventListener('hardwareBackPress', handleBackPressed);
      };
    }
  }, [navigation, route.params?.ad, handleBackPressed]);

  useEffect(() => {
    currentUrlRef.current = url;
  }, [url]);

  useEffect(() => {
    if (!translateActive) {
      lastInjectedUrlRef.current = '';
    }
  }, [translateActive]);

  useEffect(() => {
    return () => {
      if (routeChangeTimerRef.current) {
        clearTimeout(routeChangeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!__DEV__) return;

    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={copyCurrentUrl}>
          <Text style={{color: Colors.primary}}>Linki Kopyala</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, copyCurrentUrl]);

  // Sayfa yüklemesi bitince aktif çeviri scriptini uygula.
  useEffect(() => {
    if (!url || !injectScript || loading || !translateActive) {
      return;
    }

    const timer = setTimeout(() => {
      startInject(url);
    }, 120);

    return () => clearTimeout(timer);
  }, [url, injectScript, loading, translateActive, startInject]);

  useEffect(() => {
    if (__DEV__) {
      navigation.setOptions({
        title: `InLen: ${(injectScript || '').length}`,
      });
    }
  }, [navigation, injectScript]);


  const onShouldStartLoadWithRequest = (request) => {
      const {url} = request;
  
      if (url.includes('whatsapp.com') || url.includes('wa.me') || url.startsWith('whatsapp://')) {
        Linking.openURL(url).catch(err => {
          console.error('WhatsApp linki açılamadı:', err);
        });
        return false;
      }
  
      return true;
    };

  /***************************
   *         RENDER
   ***************************/

  const generatedUserAgent = userAgent();

  return (
    <SafeAreaView style={GlobalStyle.safeArea}>
      <View style={{height: '100%'}}>

       {/*  <WebView 
        originWhitelist={['*']}
        ref={webViewRef}
      cookiesEnabled={true}
      sharedCookiesEnabled={true}
      thirdPartyCookiesEnabled={true}
      domStorageEnabled={true}
      cacheEnabled={true}
      cacheMode={'LOAD_DEFAULT'}
      allowsBackForwardNavigationGestures={true}
      userAgent={generatedUserAgent}
        source={{uri: url}}
        javaScriptEnabled={true}
        onMessage={onMessage}
        onNavigationStateChange={onNavigationStateChange}
        onLoadStart={onLoadStart}
        onLoadEnd={onLoadEnd}


      pagingEnabled={false}
      mixedContentMode={'compatibility'}
      startInLoadingState={true}
      renderToHardwareTextureAndroid={true}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        /> */}
        
       <MasterWebView 
        initialUrl={sourceUrl}
        webViewRef={webViewRef}
        // INJECTED_JAVASCRIPT={INJECTED_JAVASCRIPT}
        onLoadStart={onLoadStart}
        onLoadEnd={onLoadEnd}
        onMessage={onMessage}
        onNavigationStateChange={onNavigationStateChange}
        />   
        
        {/* <WebviewLoading loading={loading} /> */}

        <View>
          <AddToCart addChart={addChart} />
         {/*  <TranslateToggle
            showTranslateButton={showTranslateButton}
            isTranslationOn={isTranslationOn}
            handleTranslate={handleTranslate}
            navigation={navigation}
          /> */}
        </View>
      </View>
    </SafeAreaView>
  );
}
