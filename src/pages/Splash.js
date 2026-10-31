import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { getUser } from '../helpers/auth';
import { CommonActions } from '@react-navigation/native';
import { FIREBASE_ENABLED } from '../../config';
import { getInitialNotification, getMessaging } from '@react-native-firebase/messaging';
import { storageGet } from '../helpers/storage';
import { SPLASH_HTML } from './splashHtml';

export default function Splash({ navigation }) {
  const [authChecked, setAuthChecked] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const [destination, setDestination] = useState('Onboarding');

  useEffect(() => {
    // Safety timer: animation completes in ~2.75s, fallback guarantee at 3.1s
    const timer = setTimeout(() => {
      setAnimationDone(true);
    }, 3100);

    const checkState = async () => {
      try {
        const user = await getUser();
        const isGuestStorage = (await storageGet('is_guest')) === '1';
        const isGuest =
          isGuestStorage ||
          user?.kod === 'GUEST' ||
          user?.kod === 'HG1000' ||
          user?.token === 'GUEST';
        const isLoggedIn = Boolean((user && user.token && !isGuest) || (isGuest && user));

        if (isLoggedIn) {
          setDestination('Home');
        } else {
          setDestination('Onboarding');
        }
      } catch (err) {
        console.log('Splash check error:', err);
        setDestination('Onboarding');
      } finally {
        setAuthChecked(true);
      }
    };

    checkState();

    return () => clearTimeout(timer);
  }, []);

  const handleMessage = useCallback((event) => {
    try {
      const data = event.nativeEvent?.data;
      if (data === 'READY') {
        setAnimationDone(true);
      }
    } catch (e) {}
  }, []);

  // Navigate when BOTH the splash animation has finished and auth state is determined
  useEffect(() => {
    if (authChecked && animationDone) {
      let targetRoute = 'Onboarding';
      if (destination === 'Home') {
        targetRoute = 'AuthAfter';
      } else if (destination === 'AuthWelcome') {
        targetRoute = 'AuthWelcome';
      }

      var tip = null;
      var grupID = null;

      const navigateToTarget = (curTip, curGrupId) => {
        if (destination === 'Home') {
          if (curTip === 'order') {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [
                  {
                    name: 'AuthAfter',
                    params: {
                      screen: 'Orders',
                      params: {
                        grupID: curGrupId,
                        refetch: +new Date(),
                      },
                    },
                  },
                ],
              }),
            );
          } else {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'AuthAfter' }],
              }),
            );
          }
        } else {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: targetRoute }],
            }),
          );
        }
      };

      if (FIREBASE_ENABLED) {
        getInitialNotification(getMessaging())
          .then(remoteMessage => {
            if (remoteMessage) {
              tip = remoteMessage.data?.type;
              grupID = remoteMessage.data?.grupID;
            }
          })
          .catch(error => {
            console.log('Error getting initial notification: ', error);
          })
          .finally(() => {
            navigateToTarget(tip, grupID);
          });
      } else {
        navigateToTarget(tip, grupID);
      }
    }
  }, [authChecked, animationDone, destination, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FFA54F" translucent={true} />
      <WebView
        originWhitelist={['*']}
        source={{ html: SPLASH_HTML }}
        style={styles.webView}
        containerStyle={styles.webViewContainer}
        androidLayerType="hardware"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F58423',
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#F58423',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
