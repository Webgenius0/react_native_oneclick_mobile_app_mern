/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {NavigationContainer} from '@react-navigation/native';
import messaging from '@react-native-firebase/messaging';


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


messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Message handled in the background! index.js =============', remoteMessage);

  // Burada gelen mesajı işleyebilirsiniz (örneğin, local notification gösterimi)
});


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

