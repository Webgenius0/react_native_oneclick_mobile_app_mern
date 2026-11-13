import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import { storageDelete, storageGet, storageSet } from './storage';
import { useUserStore } from '../store/useUserStore';
import * as RootNavigation from '../services/RootNavigation';
import ai from './ai';
import { getFcmToken } from './notification';
import { i18n } from '../translate/i18n';

export const isGuestUser = async (userParam = null) => {
  try {
    const isGuestStorage = (await storageGet('is_guest')) === '1';
    if (isGuestStorage) {
      return true;
    }

    const user = userParam || (await getUser());
    if (!user || !user.token) {
      return true;
    }

    return (
      user.kod === 'GUEST' ||
      user.kod === 'HG1000' ||
      user.token === 'GUEST' ||
      String(user.token).trim() === ''
    );
  } catch (e) {
    return true;
  }
};

export const loginGuestUser = async () => {
  try {
    const activeDil = (await storageGet('language')) || i18n?.locale || 'en';
    const res = await ai.post('login', {
      email: 'HG1000',
      kod: 'HG1000',
      password: '123',
      sifre: '123',
      dil: activeDil,
    });

    if (res?.data && res.data.error === false && res.data.s) {
      const guestUser = res.data.s;
      await setUser(guestUser);
      await storageSet('is_guest', '1');
      await storageSet('has_seen_onboarding', '1');
      return guestUser;
    }
  } catch (err) {
    console.log('loginGuestUser error:', err?.message || err);
  }
  return null;
};

export const getToken = async () => {
  let token = null;
  try {
    let user = await getUser();
    token = user?.token;
    if (!token) {
      token = (await storageGet('auth_token')) || (await AsyncStorage.getItem('auth_token'));
    }
    if (!token) {
      const zustandUser = useUserStore.getState().user;
      token = zustandUser?.token;
    }
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
    if (!user) {
      await storageDelete('user');
      await storageDelete('auth_token');
      await AsyncStorage.multiRemove(['user', 'auth_token']);
      useUserStore.getState().clearUser?.();
      return;
    }

    const existing = (await storageGet('user')) || {};
    const existingToken =
      user?.token ||
      existing?.token ||
      (await storageGet('auth_token')) ||
      (await AsyncStorage.getItem('auth_token'));

    const merged = { ...existing, ...user };
    if (existingToken && existingToken !== 'GUEST') {
      merged.token = existingToken;
      await storageSet('auth_token', existingToken);
      await AsyncStorage.setItem('auth_token', existingToken);
    }
    await storageSet('user', merged);
    useUserStore.getState().setUser?.(merged);
  } catch (error) {
    console.log('Something went wrong setUser', error);
  }
};

export const logoutUser = async (navigation, setCtx) => {
  // 1. Notify backend (non-blocking) per API guide
  try {
    const fcmToken = await getFcmToken().catch(() => null);
    await ai.post('logout', {
      device_token: fcmToken || '',
      fcm_token: fcmToken || '',
    }).catch(err => {
      console.log('Logout API note:', err?.response?.data?.msg || err?.message || err);
    });
  } catch (apiErr) {}

  // 2. Clear storage (original implementation)
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
    await storageDelete('auth_token');
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

  // 3. Reset navigation to Login (original implementation)
  const resetAction = CommonActions.reset({
    index: 0,
    routes: [{ name: 'Login' }],
  });

  // Reset root navigation directly (clearing entire back history)
  try {
    if (RootNavigation.navigationRef && RootNavigation.navigationRef.isReady()) {
      RootNavigation.navigationRef.dispatch(resetAction);
      return;
    }
  } catch (e) {
    console.log('logout reset root error:', e);
  }

  // Reset parent navigation if inside a nested stack/tab
  try {
    const parentNav = navigation?.getParent ? navigation.getParent() : null;
    if (parentNav?.dispatch) {
      parentNav.dispatch(resetAction);
      return;
    }
  } catch (e) {}

  // Reset provided navigation
  try {
    if (navigation?.dispatch) {
      navigation.dispatch(resetAction);
      return;
    }
  } catch (e) {}

  // Fallback to RootNavigation helper
  try {
    RootNavigation.reset('Login');
  } catch (e) {}
};
