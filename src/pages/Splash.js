import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Text,
  StatusBar,
  Image,
} from 'react-native';
import { getUser } from '../helpers/auth';
import { CommonActions } from '@react-navigation/native';
import { FIREBASE_ENABLED } from '../../config';
import { getInitialNotification, getMessaging } from '@react-native-firebase/messaging';
import { storageGet } from '../helpers/storage';

export default function Splash({ navigation }) {
  const [authChecked, setAuthChecked] = useState(false);
  const [destination, setDestination] = useState('Onboarding');
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start progress bar animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 1800,
      useNativeDriver: false,
    }).start(() => {
      setAuthChecked(true);
    });

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
      }
    };

    checkState();
  }, [progressAnim]);

  useEffect(() => {
    if (authChecked) {
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
  }, [authChecked, destination, navigation]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#F58423" />

      {/* Center Brand Logo from Figma */}
      <View style={styles.centerContent}>
        <Image
          source={require('../assets/img/onboarding/splash_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Bottom Bags Background & Progress */}
      <View style={styles.bottomContent}>
        <Image
          source={require('../assets/img/onboarding/splash_bg_bags.png')}
          style={styles.bgBags}
          resizeMode="contain"
        />

        <View style={styles.progressBarTrack}>
          <Animated.View
            style={[styles.progressBarFill, { width: progressWidth }]}
          />
        </View>
        <Text style={styles.versionText}>Version 1.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F58423',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  logo: {
    width: 170,
    height: 70,
  },
  bottomContent: {
    alignItems: 'center',
    width: '100%',
    paddingBottom: 40,
    position: 'relative',
  },
  bgBags: {
    position: 'absolute',
    bottom: -20,
    width: '100%',
    height: 220,
    opacity: 0.65,
  },
  progressBarTrack: {
    width: 140,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    overflow: 'hidden',
    marginBottom: 12,
    zIndex: 2,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  versionText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'System',
    letterSpacing: 0.5,
    zIndex: 2,
  },
});
