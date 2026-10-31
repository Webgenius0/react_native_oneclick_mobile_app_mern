import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import WebView from 'react-native-webview';
import {
  BackHandler,
  Linking,
  Platform,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import { tr } from '../translate/i18n';
import GlobalStyle from '../assets/GlobalStyle';
import Colors from '../assets/Colors';
import CartIcon from '../assets/svg/cart.svg';
import { useCartStore } from '../store/useCartStore';
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

  const cartItems = useCartStore(state => state.items) || [];
  const cartCount = useMemo(() => {
    return (cartItems || []).reduce((sum, item) => sum + (item.count || 1), 0);
  }, [cartItems]);

  useEffect(() => {
    // alert(page_url);
  }, [page_url]);

  const [canGoBack, setCanGoBack] = useState(false);
  const webView = useRef(null);
  const [image, setImage] = useState('');
  const HandleBackPressed = () => {
    if (webView.current?.canGoBack) {
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
            if (webView.current?.canGoBack) {
              webView.current.goBack();
            } else {
              navigation.goBack();
            }
          }}
        />
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Cart')}
          style={styles.headerCartTouch}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <View style={styles.headerCartButton}>
            <CartIcon width={20} height={20} fill={Colors.primary || '#F67922'} />
          </View>
          {cartCount > 0 && (
            <View style={styles.headerCartBadge}>
              <Text style={styles.headerCartBadgeText}>
                {cartCount > 99 ? '99+' : cartCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
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

const styles = StyleSheet.create({
  headerCartTouch: {
    paddingTop: 5,
    paddingRight: 6,
    paddingBottom: 2,
    paddingLeft: 2,
    marginRight: 6,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCartButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFE4D0',
    borderWidth: 1.5,
    borderColor: '#F67922',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F67922',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  headerCartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 5,
  },
  headerCartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    lineHeight: 12,
  },
});
