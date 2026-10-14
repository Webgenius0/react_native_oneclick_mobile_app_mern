import React, { useEffect, useState } from 'react';
import { Alert, BackHandler, Linking, Platform } from 'react-native';
import ReceiveSharingIntent from 'react-native-receive-sharing-intent';
import { EmContext } from './src/contexts/EmContext';
import AppNavigator from './AppNavigator';
import { notificationListener, requestUserPermission, setBackgroundMessageHandler } from './src/helpers/notification';
import { appVersionCheck, IS_DEV } from './src/helpers/common';
import Toast from 'react-native-toast-message';
import { fetchAllNotifications } from './src/helpers/notificationV2';
import { loadTheme } from './src/helpers/theme';
import { i18n, tr } from './src/translate/i18n';
import { storageGet } from './src/helpers/storage';
import { DEV_REDIRECT_STORE, FIREBASE_ENABLED, MOBIL_SCRIPT } from './config';
import { useScriptServiceStore } from './src/store/useScriptServiceStore';
import { useSheinPriceStore } from './src/store/useSheinPriceStore';

// @ts-ignore
const App = () => {
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

  const { setInjectScript } = useScriptServiceStore();
  const [ctxDil, setCtxDil] = useState('en'); // i18n.locale default is 'en'
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
    try {
      var s = await appVersionCheck();

      if (s && !s.valid && s.redirect && (!__DEV__ || DEV_REDIRECT_STORE)) {
        var url = Platform.select({ ios: s.ios, android: s.android });

        Alert.alert(
          tr('Güncelleme Gerekli'),
          tr('Yeni bir versiyon mevcut Lütfen uygulamayı güncelleyiniz'),
          [
            {
              text: tr('Güncelle'),
              onPress: () => {
                BackHandler.exitApp();
                Linking.openURL(url);
              },
            },
          ],
          { cancelable: false },
        );

        return false;
      }
    } catch (e) {
      console.log('checkVersion error:', e?.message);
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
        // console.log('====== fetchInjectScript ====== ', MOBIL_SCRIPT);
        const response = await fetch(MOBIL_SCRIPT, { cache: 'no-cache' });
        if (response && response.ok) {
          const script = await response.text();
          setInjectScript(script);
        }
      } catch (error) {
        console.warn('fetchInjectScript network error:', error?.message || error);
      }
    })();

    loadTheme(ctx, setCtx);
    fetchAllNotifications(ctx, setCtx);
    useSheinPriceStore.getState().fetchSheinPrice();

    (async () => {
      try {
        const savedLang = await storageGet('language');
        if (savedLang) {
          i18n.locale = savedLang;
          setCtxDil(savedLang);
        } else {
          i18n.locale = 'en';
          setCtxDil('en');
        }
      } catch (langErr) {
        console.log('App init language error:', langErr);
      }
    })();

    // Handle shared links
    try {
      ReceiveSharingIntent.getReceivedFiles(
        files => {
          if (files && files.length > 0) {
            const sharedText = files[0].text;
            if (sharedText && (sharedText.includes('trendyol.') || sharedText.includes('trendyol.com') || sharedText.includes('hepsiburada.com') || sharedText.includes('amazon.'))) {
              console.log('Shared link received:', sharedText);
              ReceiveSharingIntent.clearReceivedFiles();
            }
          }
        },
        error => {
          // Normal on cold launch when no shared content is present
        },
      );
    } catch (e) {
      // Ignored
    }

    if (notifInerval && FIREBASE_ENABLED) {
      let intervalId = null;
      let timeout = IS_DEV ? 1000 * 60 * 3 : 1000 * 60 * 3;
      intervalId = setInterval(async () => {
        await fetchAllNotifications(ctx, setCtx);
      }, timeout);

      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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