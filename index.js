import 'react-native-gesture-handler';
import {AppRegistry, LogBox} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {getMessaging, setBackgroundMessageHandler} from '@react-native-firebase/messaging';

LogBox.ignoreLogs([
  'This method is deprecated (as well as all React Native Firebase namespaced API)',
  'Package react-native-ionicons contains invalid configuration',
]);

// Global error safety net to intercept unhandled JS/network exceptions and avoid app crashes
if (global.ErrorUtils) {
  const defaultErrorHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    const errorStr = String(error?.message || error || '');
    const isNetworkOrApiError =
      errorStr.includes('Network') ||
      errorStr.includes('timeout') ||
      errorStr.includes('Server Error') ||
      errorStr.includes('Axios') ||
      errorStr.includes('fetch') ||
      errorStr.includes('ECONNABORTED') ||
      errorStr.includes('AbortError');

    if (isNetworkOrApiError) {
      console.warn('[GlobalHandler] Safely caught network/API error:', errorStr);
      return;
    }

    if (defaultErrorHandler) {
      defaultErrorHandler(error, isFatal);
    }
  });
}

function HeadlessCheck({isHeadless}) {
  if (isHeadless) {
    // App has been launched in the background by iOS, ignore
    console.log('isHeadless');
    return null;
  }
  return <App />;
}

function firebaseBackgroundMessage(message) {
  console.log('firebaseBackgroundMessage', message);
  return Promise.resolve();
}

AppRegistry.registerHeadlessTask('RNFirebaseBackgroundMessage', () => firebaseBackgroundMessage);

AppRegistry.registerComponent(appName, () => HeadlessCheck);

try {
  setBackgroundMessageHandler(getMessaging(), async (remoteMessage) => {
    console.log('Message handled in the background! index.js =============', remoteMessage);
  });
} catch (e) {
  console.log('setBackgroundMessageHandler error:', e?.message || e);
}


/*

messaging().onNotificationOpenedApp(remoteMessage => {
  console.log('=================== Notification notificationListener on index.js ===================');
  console.log(remoteMessage.notification);

  const navigation = NavigationContainer.navigationRef;
  if(!navigation) {
    console.log('========== navigation not found ==========');
    return;
  }



  if (navigation && remoteMessage?.data?.type === 'order') {
    navigation.navigate('Orders', {
      id: remoteMessage.data.id,
      refetch: +new Date(),
    });
  }
});
*/

