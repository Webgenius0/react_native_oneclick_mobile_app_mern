import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import { storageDelete, storageGet, storageSet } from './storage';
import { useUserStore } from '../store/useUserStore';
import * as RootNavigation from '../services/RootNavigation';

export const getToken = async () => {
  let token = null;
  try {
    let user = await getUser();
    token = user?.token;
  } catch (error) {
    console.log('Something went wrong - getToken', error);
    return null;
  }
  return token || null;
};

export const getUser = async () => {
  let user = null;
  try {
    user = await storageGet('user');
  } catch (error) {
    console.log('Something went wrong getUser', error);
  }

  return user;
};

export const setUser = async user => {
  try {
    await storageSet('user', user);
  } catch (error) {
    console.log('Something went wrong setUser', error);
  }
};

export const logoutUser = async (navigation, setCtx) => {
  try {
    await AsyncStorage.multiRemove([
      'user',
      'is_guest',
      'user-storage',
      'tokenSend',
      'has_seen_onboarding',
      'auth_token',
    ]);
    await storageDelete('user');
    await storageDelete('is_guest');
    await storageDelete('tokenSend');
  } catch (e) {
    console.log('Error clearing storage in logoutUser:', e);
  }

  try {
    useUserStore.getState().clearUser?.();
  } catch (e) {}

  if (setCtx) {
    try {
      setCtx(prev => ({
        ...prev,
        user: null,
        token: null,
      }));
    } catch (e) {}
  }

  // Redirect to Login page using RootNavigation
  try {
    if (RootNavigation.navigationRef.isReady()) {
      RootNavigation.navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        }),
      );
      return;
    }
  } catch (e) {
    console.log('RootNavigation reset to Login failed:', e);
  }

  // Fallback via navigation prop
  try {
    if (navigation) {
      const rootNav = navigation.getParent ? navigation.getParent() || navigation : navigation;
      rootNav.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        }),
      );
      return;
    }
  } catch (e) {
    console.log('navigation dispatch to Login failed:', e);
  }

  try {
    if (navigation?.navigate) {
      navigation.navigate('Login');
    }
  } catch (e) {}
};
