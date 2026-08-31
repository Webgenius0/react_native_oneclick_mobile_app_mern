import messaging, {firebase} from '@react-native-firebase/messaging';
import {Alert, Platform} from 'react-native';
import {storageGet, storageSet} from './storage';
import {EmContext} from '../contexts/EmContext';
import {useContext} from 'react';
import DeviceInfo from 'react-native-device-info';
import ai from './ai';
import {i18n} from '../translate/i18n';
import {time} from './common';
import {DEV_LOCAL, FIREBASE_ENABLED, FIREBASE_LOG} from '../../config';
import Toast from 'react-native-toast-message';
import * as navigation from '../services/RootNavigation';
import {CommonActions} from '@react-navigation/native';

export async function requestUserPermission() {
  if (FIREBASE_ENABLED) {
    let authStatus, enabled;
    try {
      authStatus = await messaging().requestPermission();
      console.log('authStatus', authStatus);

      // {"AUTHORIZED": 1, "DENIED": 0, "EPHEMERAL": 3, "NOT_DETERMINED": -1, "PROVISIONAL": 2}
      // console.log('authVars', messaging.AuthorizationStatus);

      enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    } catch (e) {
      console.log('req error ==============> ', e);
    }

    if (enabled) {
      await getFcmToken();
    }
  }
}

export const getFcmToken = async () => {
  if (!FIREBASE_ENABLED) {
    return null;
  }
  // console.log("getFcmToken");
  let fcmToken;
  try {
    fcmToken = await messaging().getToken();
  } catch (e) {
    // console.log("fcmToken", fcmToken);
    // console.log("getFcmToken error ==========>", e);
  }
  if (fcmToken) {
    if (DEV_LOCAL && FIREBASE_LOG) {
      console.log(
        '=============== Your Firebase Token ' +
          Platform.OS +
          ' ================',
      );
      console.log(fcmToken);
    }

    await fcmUpdate(fcmToken, true);
  } else {
    // console.log("Failed", "No token received");
  }
  // console.log("after getFcmToken");
  return fcmToken;
};

export const fcmUpdate = async (fcmToken, force) => {
  if (!FIREBASE_ENABLED) {
    return;
  }
  const dil = i18n.locale;
  const deviceBrand = DeviceInfo.getBrand();
  const deviceModel = DeviceInfo.getModel();
  const tokenSend = await storageGet('tokenSend');
  force = force || false;

  if (!tokenSend || force) {
    const fcmData = {
      fcm_token: fcmToken,
      device: Platform.OS,
      model: deviceBrand + ' ' + deviceModel,
      dil: dil,
    };

    // console.log("fcmData", fcmData);
    /*
    try {

      ai.post("fcm", fcmData).then((response) => {
        console.log("fcmUpdate response", response);
      }).then((response) => {
        console.log("fcmUpdate response 2", response);

      }).catch((error) => {
        console.log("fcmUpdate error 3 ", error);
      });
    }catch (e) {
      console.log("fcmUpdate error 4 ", e);
    }
    */

    const {data} = await ai.post('fcm', fcmData);
    if (data) {
      await storageSet('tokenSend', true);
    }
  }
};

export const notificationListener = async () =>
  messaging().onNotificationOpenedApp(remoteMessage => {
    console.log(
      '=================== Notification notificationListener ===================',
    );
    console.log(remoteMessage.notification);

    var type = remoteMessage.data?.type;
    if (type === 'order') {
      // open fisDetay
      console.log('===== before navigate onNotificationOpenedApp ====');
      navigation.navigate('Orders', {
        // id: remoteMessage.data.id,
        id: 0,
        grupID: remoteMessage.data.grupID,
        refetch: (+new Date()),
      });
    }

    // navigation.navigate(remoteMessage.data.type);
  });

// export {requestUserPermission, getFcmToken};

export const setBackgroundMessageHandler = async (ctx, setCtx) => {
  // console.log("ctx", ctx, "setCtx", setCtx);

  messaging().onMessage(async remoteMessage => {
    console.log(
      '=================== Notification setBackgroundMessageHandler ===================',
    );

    console.log(JSON.stringify(remoteMessage));
    console.log('\n\n');
    const {title, body} = remoteMessage.notification;
    // Alert.alert(title, body);
    //await saveNotification(ctx, setCtx, { title, body, time: +new Date(), from: "fcm" });

    // show toast
    Toast.show({
      type: 'success',
      position: 'top',
      text1: title,
      text2: body,
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 30,
      bottomOffset: 40,
      onPress: () => {
        if (remoteMessage.data?.type === 'order') {
          console.log('order click', remoteMessage.data.id, remoteMessage.data.grupID);

          // if current screen is Orders, then refresh
          if (remoteMessage.data?.type === 'order') {
            navigation.reset('Orders', {
              id: 0, //remoteMessage.data.id,
              grupID: remoteMessage.data.grupID,
              refetch: +new Date(),
            });
          } else {
         /*   navigation.navigate('Orders', {
              id: remoteMessage.data.id,
              refetch: +new Date(),
            });*/
          }

          /*navigation.navigate("OrderDetail", {
            id: remoteMessage.data.id,
            load: true
          });*/
        }
      },
    });
  });

  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log(
      '=================== Notification messaging().setBackgroundMessageHandler ===================',
    );
    console.log(remoteMessage);
    console.log('\n\n');

    const {title, body} = remoteMessage.notification;
    //await saveNotification(ctx, setCtx, { title, body, time: +new Date(), from: "background" });
  });
};

export const requestNotificationPermissionV2 = async () => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    // console.log("Authorization status:", authStatus);
  }

  await messaging().registerDeviceForRemoteMessages();
  const token = await messaging().getToken();
  if (FIREBASE_LOG) {
    console.log('token', token);
  }
};

/*
export const is_unread = (v) => {
  return !v.hasOwnProperty('okundu');
}

export const loadLocalNotifications= async () => {
  console.log('loadLocalNotifications Works');
  let ss = await storageGet("notifications");

  // console.log('loadNotificationCount ss', ss);
  return ss;
}

export const saveNotification = async (ctx, setCtx, ss) => {


  await storageSet("notifications", ss);
  let unreadCount = ss.filter(v => is_unread(v)).length;

  setCtx({ ...ctx, notificationCount: unreadCount });
};

export const lastNotifID = async () => {
  return await storageGet("lastNotifID");
}

export const fetchServerNotifications = async () => {

  let n = [];
  try {
    let lastNotifID = await storageGet("lastNotifID");
    if(lastNotifID == null || isNaN(lastNotifID)){
      lastNotifID = 0;
    }

    console.log('fetchServerNotifications Works', 'lastNotifID', lastNotifID);

    const response = await ai.post("notifications", {id: lastNotifID});
    console.log(response.data);
    if (response.data.error === false) {
      n = response.data.ss;
    }
  } catch (e) {
    console.log(e);
  }

  return n;
}

export const notificationTimeout = (ctx) => {
  console.log('notificationTimeout Works', ctx.nextFetchNotificationTime, time());
  return ctx.nextFetchNotificationTime === null ||
    ctx.nextFetchNotificationTime === "undefined" ||
    ctx.nextFetchNotificationTime < time();
}

*/
