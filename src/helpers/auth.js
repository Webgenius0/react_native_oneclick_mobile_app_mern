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

  const resetAction = CommonActions.reset({
    index: 0,
    routes: [{ name: 'Login' }],
  });

  // 1. Reset root navigation directly (clearing entire back history)
  try {
    if (RootNavigation.navigationRef && RootNavigation.navigationRef.isReady()) {
      RootNavigation.navigationRef.dispatch(resetAction);
      return;
    }
  } catch (e) {
    console.log('logout reset root error:', e);
  }

  // 2. Reset parent navigation if inside a nested stack/tab
  try {
    const parentNav = navigation?.getParent ? navigation.getParent() : null;
    if (parentNav?.dispatch) {
      parentNav.dispatch(resetAction);
      return;
    }
  } catch (e) {}

  // 3. Reset provided navigation
  try {
    if (navigation?.dispatch) {
      navigation.dispatch(resetAction);
      return;
    }
  } catch (e) {}

  // 4. Fallback to RootNavigation helper
  try {
    RootNavigation.reset('Login');
  } catch (e) {}
};
