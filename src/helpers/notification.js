import messaging, {
  getMessaging,
  requestPermission,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  setBackgroundMessageHandler as setBgMsgHandler,
  AuthorizationStatus,
  registerDeviceForRemoteMessages,
} from '@react-native-firebase/messaging';
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
      authStatus = await requestPermission(getMessaging());
      console.log('authStatus', authStatus);

      enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;
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
  let fcmToken;
  try {
    fcmToken = await getToken(getMessaging());
  } catch (e) {
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
  return fcmToken;
};

export const fcmUpdate = async (fcmToken, force) => {
  if (!FIREBASE_ENABLED || !fcmToken) {
    return;
  }
  try {
    const user = await storageGet('user');
    const isGuest =
      (await storageGet('is_guest')) === '1' ||
      user?.kod === 'GUEST' ||
      user?.kod === 'HG1000' ||
      user?.token === 'GUEST';
    if (!user || !user.token || isGuest) {
      return;
    }
  } catch (authCheckErr) {
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

    try {
      const {data} = await ai.post('fcm', fcmData);
      if (data) {
        await storageSet('tokenSend', true);
      }
    } catch (e) {
      // safe fallback on offline server
    }
  }
};

export const notificationListener = async () => {
  try {
    return onNotificationOpenedApp(getMessaging(), remoteMessage => {
      console.log(
        '=================== Notification notificationListener ===================',
      );
      console.log(remoteMessage.notification);

      var type = remoteMessage.data?.type;
      if (type === 'order') {
        console.log('===== before navigate onNotificationOpenedApp ====');
        navigation.navigate('Orders', {
          id: 0,
          grupID: remoteMessage.data.grupID,
          refetch: +new Date(),
        });
      }
    });
  } catch (e) {
    console.log('notificationListener error:', e?.message || e);
  }
};

export const setBackgroundMessageHandler = async (ctx, setCtx) => {
  try {
    onMessage(getMessaging(), async remoteMessage => {
      console.log(
        '=================== Notification setBackgroundMessageHandler ===================',
      );

      console.log(JSON.stringify(remoteMessage));
      console.log('\n\n');
      const {title, body} = remoteMessage.notification || {};

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

            navigation.reset('Orders', {
              id: 0,
              grupID: remoteMessage.data.grupID,
              refetch: +new Date(),
            });
          }
        },
      });
    });

    setBgMsgHandler(getMessaging(), async remoteMessage => {
      console.log(
        '=================== Notification messaging().setBackgroundMessageHandler ===================',
      );
      console.log(remoteMessage);
      console.log('\n\n');
    });
  } catch (e) {
    console.log('setBackgroundMessageHandler helper error:', e?.message || e);
  }
};

export const requestNotificationPermissionV2 = async () => {
  try {
    const authStatus = await requestPermission(getMessaging());
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    await registerDeviceForRemoteMessages(getMessaging());
    const token = await getToken(getMessaging());
    if (FIREBASE_LOG) {
      console.log('token', token);
    }
  } catch (e) {
    console.log('requestNotificationPermissionV2 error:', e?.message || e);
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
