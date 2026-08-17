import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Text,
  Image,
} from 'react-native';
import {getUser} from '../helpers/auth';
import {CommonActions} from '@react-navigation/native';
import {BASE_URL} from '../../config';
import Logo from '../components/Logo';
import messaging from '@react-native-firebase/messaging';
import * as RootNavigation from '../services/RootNavigation';

export default function ({route, navigation}) {
  const [state, setState] = useState({
    logged: null,
    target: 'Login',
  });

  const [animationCompleted, setAnimationCompleted] = useState(false);
  const [tokenChecked, setTokenChecked] = useState(false);
  const {width} = Dimensions.get('window');

  useEffect(() => {
    const checkToken = async () => {
      let user = await getUser();
      let token = user ? user.token : null;
      let ns = {};
      if (user && token) {
        ns = {...state, logged: true, target: 'Home'};
      } else {
        ns = {...state, logged: false, target: 'Login'};
      }

      setState(ns);
      setTokenChecked(true);
    };

    checkToken();
  }, []);

  useEffect(() => {
    if (animationCompleted && tokenChecked) {
      let routes;
      let routeIndex = 0;
      let defaultLoggedPage = 'AuthAfter';
      let defaultParams = {};
      if (__DEV__) {
        // defaultLoggedPage = 'Webview';
        // defaultLoggedPage = 'AuthAfter';
        // defaultLoggedPage = 'Orderss';
        //defaultParams = {screen: 'Orders'};
        // defaultParams = {screen: 'Support'};
      }

      if (state.target === 'Home') {
        routes = [{name: defaultLoggedPage}];
      } else {
        routes = [{name: 'Login'}];
      }

      var tip = null;
      var orderId = null;
      var grupID = null;

      messaging()
        .getInitialNotification()
        .then(remoteMessage => {
          if (remoteMessage) {
            //console.log("==== Notification caused app to open from quit state: ===", remoteMessage);

            tip = remoteMessage.data?.type;
            //console.log('===== tip =====', tip);
            if (tip === 'order') {
              orderId = remoteMessage.data?.id;
              grupID = remoteMessage.data?.grupID;
            }

            console.log(' ===== grupID splash area  =====', grupID);

            routeIndex = routes.length - 1;
          } else {
            //console.log("No initial notification found");
          }
        })
        .catch(error => {
          //console.error("Error getting initial notification: ", error);
        })
        .finally(() => {
          //console.log('===== routes (final) =====', routes);
          //console.log('===== routeIndex (final) =====', routeIndex);

          if (state.logged) {
            if (tip === 'order') {
              // Orders
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    {
                      name: 'AuthAfter',
                      params: {
                        screen: 'Orders',
                        params: {
                          // id: orderId || 0,
                          grupID: grupID,
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
                  routes: routes,
                  params: defaultParams,
                }),
              );
            }
          } else {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: routes,
              }),
            );
          }
        });
    }
  }, [animationCompleted, tokenChecked, navigation, state]);

  const images = {
    img1: require('../assets/img/splash/a1.png'),
    img2: require('../assets/img/splash/a2.png'),
    img3: require('../assets/img/splash/a3.png'),
  };

  const opacity1 = useRef(new Animated.Value(0)).current;
  const opacity2 = useRef(new Animated.Value(0)).current;
  const opacity3 = useRef(new Animated.Value(0)).current;

  let fadeInDuration = 400;
  let displayDuration = 500;
  let fadeOutDuration = 400;

  if (__DEV__) {
    fadeInDuration = 25;
    displayDuration = 25;
    fadeOutDuration = 25;
  }

  useEffect(() => {
    Animated.sequence([
      /*// Image 1 fade in
      Animated.timing(opacity1, {
        toValue: 1,
        duration: fadeInDuration,
        useNativeDriver: true,
      }),
      // Wait
      Animated.delay(displayDuration),
      // Image 1 fade out
      Animated.timing(opacity1, {
        toValue: 0,
        duration: fadeOutDuration,
        useNativeDriver: true,
      }),*/
      // Image 2 fade in
      Animated.timing(opacity2, {
        toValue: 1,
        duration: fadeInDuration,
        useNativeDriver: true,
      }),
      // Wait
      Animated.delay(displayDuration),
      // Image 2 fade out
      Animated.timing(opacity2, {
        toValue: 0,
        duration: fadeOutDuration,
        useNativeDriver: true,
      }),
      // Image 3 fade in
      Animated.timing(opacity3, {
        toValue: 1,
        duration: fadeInDuration,
        useNativeDriver: true,
      }),
      // Wait
      Animated.delay(displayDuration),
      // Image 3 fade out
      Animated.timing(opacity3, {
        toValue: 0,
        duration: fadeOutDuration,
        useNativeDriver: true,
      }),
    ]).start(() => {
      //  console.log('Animation sequence completed');
      setAnimationCompleted(true);
    });
  }, [opacity1, opacity2, opacity3]);

  const BASE_TEXT = __DEV__ ? (
    <Text style={{color: '#000'}}>{BASE_URL}</Text>
  ) : null;

  const logoMaxWidth = width / 1.5 > 300 ? 300 : width / 1.5;
  const whiteLogoWidth = 110;
  const whiteLogoHeight = whiteLogoWidth / 1.66;
  // console.log('whiteLogoHeight', whiteLogoHeight);

  return (
    <View style={styles.container}>
      <View style={{flex: 1, width: '100%', paddingTop: 100}}>
        <View
          style={{
            // height: whiteLogoHeight + 20,
            width: '100%',
            backgroundColor: '#000',
            paddingVertical: 10,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          {/*<Logo maxWidth={logoMaxWidth} animation={0} />*/}
          <Image
            source={require('../assets/img/logoWhite.png')}
            style={{
              width: whiteLogoWidth,
              height: whiteLogoHeight,
              resizeMode: 'contain',
            }}
            resizeMode="contain"
          />
        </View>
      </View>
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'space-between',
          flex: 2,
        }}>
        {/* <Animated.Image
        source={images.img1}
        style={[styles.image, { opacity: opacity1 }]}
      />*/}
        <Animated.Image
          source={images.img2}
          style={[styles.image, {opacity: opacity2}]}
        />
        <Animated.Image
          source={images.img3}
          style={[styles.image, {opacity: opacity3}]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F58423',
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  image: {
    width: 200,
    height: 200,
    position: 'absolute',
  },
});
