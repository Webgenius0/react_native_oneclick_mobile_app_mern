/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useContext, useEffect, useState} from 'react';
import {Node} from 'react';
import {
  Alert,
  BackHandler,
  Linking,
  Platform,
  SafeAreaView,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import ReceiveSharingIntent from 'react-native-receive-sharing-intent';
import {EmContext} from './src/contexts/EmContext';
import AppNavigator from './AppNavigator';
import {
  notificationListener,
  requestUserPermission,
  setBackgroundMessageHandler,
} from './src/helpers/notification';
import {appVersionCheck, IS_DEV, time} from './src/helpers/common';
import Toast from 'react-native-toast-message';
import {fetchAllNotifications} from './src/helpers/notificationV2';
import {loadTheme} from './src/helpers/theme';
import {tr} from './src/translate/i18n';
import {DEV_REDIRECT_STORE, FIREBASE_ENABLED, MOBIL_SCRIPT} from './config';
import WaafiPay from './src/pages/WaafiPay';
import {useScriptServiceStore} from './src/store/useScriptServiceStore';

// @ts-ignore
const App = () => {
  // @ts-ignore
  let intervalId = null;


  const [ctx, setCtx] = useState({
    token: null,
    user: null,
    theme: 'light',
    bgColor: '#fff',
    color: '#333',
    isDark: false,
    isLight: true,
    localNotifications: [],
    serverNotifications: [],
    notifications: [],
    notificationCount: 0,
    nextFetchNotifications: 0,

    // cart: __DEV__ ? [] : [],
  });

  const {setInjectScript} = useScriptServiceStore();

  const [ctxDil, setCtxDil] = useState('tr'); // i18n.locale
  const [methods, setMethods] = useState({});
  const [direction, setDirection] = useState('ltr');

  const appendMethods = newMethods => {
    setMethods({
      ...methods,
      ...newMethods,
    });
  };

  const contextData = {
    // isDark: useColorScheme() === "dark",
    ctxDil,
    setCtxDil,
    methods,
    appendMethods,
    direction,
    setDirection,
    ctx,
    setCtx,
  };

  const checkVersion = async () => {
    var s = await appVersionCheck();

    // console.log("=========== App Version Check ===========");
    // console.log(s);

    if (!s.valid && s.redirect && (!__DEV__ || DEV_REDIRECT_STORE)) {
      var url = Platform.select({ios: s.ios, android: s.android});

      Alert.alert(
        tr('Güncelleme Gerekli'),
        tr('Yeni bir versiyon mevcut Lütfen uygulamayı güncelleyiniz'),
        [
          {
            text: tr('Güncelle'),
            onPress: () => {
              BackHandler.exitApp();
              /// console.log("-I-: Doing the Update App functions");
              Linking.openURL(url);
            },
          },
        ],
        {cancelable: false},
      );

      return false;
    }
  };

  const notifInerval = true;

  useEffect(() => {
    if (FIREBASE_ENABLED) {
      requestUserPermission();
      notificationListener();
      setBackgroundMessageHandler(ctx, setCtx);
    }
    checkVersion();

    // Translate script'i uygulama açılışında fetch et
    (async () => {
      try {
        console.log('====== fetchInjectScript ====== ', MOBIL_SCRIPT);
        const response = await fetch(MOBIL_SCRIPT, {cache: 'no-cache'});
        const script = await response.text();
        setInjectScript(script);
      } catch (error) {
        console.error('fetchInjectScript error', error);
      }
    })();

    loadTheme(ctx, setCtx);
    fetchAllNotifications(ctx, setCtx);

    // Handle shared links
    ReceiveSharingIntent.getReceivedFiles(files => {
      if (files && files.length > 0) {
        const sharedText = files[0].text;
        if (sharedText && (sharedText.includes('trendyol.com') || sharedText.includes('hepsiburada.com') || sharedText.includes('amazon.com.tr'))) {
          // Navigate to WebView with shared link
          // This will be handled by AppNavigator
          console.log('Shared link received:', sharedText);
        }
      }
    }, 
    (error) => {
      console.log('Error receiving shared content:', error);
    });

    if (notifInerval && FIREBASE_ENABLED) {
      let timeout = IS_DEV ? 1000 * 60 * 3 : 1000 * 60 * 3;
      intervalId = setInterval(async () => {
        await fetchAllNotifications(ctx, setCtx);
      }, timeout);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, []);

  return (
    <EmContext.Provider value={contextData}>
      {/*__DEV__ ? <WaafiPay /> : <AppNavigator />*/}
      <AppNavigator />
      <Toast />
    </EmContext.Provider>
  );
};

export default App;
