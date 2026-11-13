import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import { storageDelete, storageGet, storageSet } from './storage';
import { useUserStore } from '../store/useUserStore';
import { useCartStore } from '../store/useCartStore';
import { useOrderStore } from '../store/useOrderStore';
import * as RootNavigation from '../services/RootNavigation';
import ai from './ai';
import { getFcmToken } from './notification';
import { i18n } from '../translate/i18n';
import { DATA_URL, BASE_URL } from '../../config';

let isLoggingOut = false;

export const resolveAvatarUrl = user => {
  if (!user || typeof user !== 'object') {
    return null;
  }
  const raw =
    user.avatar_url ||
    user.avatar ||
    user.photo ||
    user.image ||
    user.profile_photo_url ||
    user.resim;

  if (!raw || typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
    return null;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.replace(/^http:\/\//i, 'https://');
  }
  const origin = (BASE_URL || 'https://1click.thesyndicates.team').replace(/\/api\/?$/, '');
  if (trimmed.startsWith('/')) {
    return `${origin}${trimmed}`;
  }
  if (trimmed.startsWith('avatar-')) {
    return `${origin}/data/uploads/avatar/${trimmed}`;
  }
  const dataPrefix = DATA_URL || `${origin}/data/`;
  return `${dataPrefix.replace(/\/+$/, '')}/${trimmed.replace(/^\/+/, '')}`;
};

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
  isLoggingOut = false;
  try {
    if (!user) {
      await storageDelete('user');
      await storageDelete('auth_token');
      await AsyncStorage.multiRemove(['user', 'auth_token']);
      useUserStore.getState().clearUser?.();
      return;
    }

    const existing = (await storageGet('user')) || {};
    // Only merge properties if it is confirmed to be the SAME user account
    const isSameUser = Boolean(
      existing &&
        ((user.id && existing.id && String(user.id) === String(existing.id)) ||
          (user.kod &&
            existing.kod &&
            String(user.kod).trim().toLowerCase() === String(existing.kod).trim().toLowerCase())),
    );

    const activeUser = isSameUser ? { ...existing, ...user } : { ...user };

    const tokenToSave =
      user?.token ||
      (isSameUser ? existing?.token : null) ||
      (await storageGet('auth_token')) ||
      (await AsyncStorage.getItem('auth_token'));

    if (tokenToSave && tokenToSave !== 'GUEST') {
      activeUser.token = tokenToSave;
      await storageSet('auth_token', tokenToSave);
      await AsyncStorage.setItem('auth_token', tokenToSave);
    }

    await storageSet('user', activeUser);
    useUserStore.getState().setUser?.(activeUser);
  } catch (error) {
    console.log('Something went wrong setUser', error);
  }
};

export const logoutUser = async (navigation, setCtx) => {
  if (isLoggingOut) {
    return;
  }
  isLoggingOut = true;

  try {
    // 1. Immediately reset navigation to Login (0ms UI latency, no waiting)
    const resetAction = CommonActions.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });

    let navigated = false;
    try {
      if (RootNavigation.navigationRef && RootNavigation.navigationRef.isReady()) {
        RootNavigation.navigationRef.dispatch(resetAction);
        navigated = true;
      }
    } catch (e) {
      console.log('logout reset root error:', e);
    }

    if (!navigated) {
      try {
        const parentNav = navigation?.getParent ? navigation.getParent() : null;
        if (parentNav?.dispatch) {
          parentNav.dispatch(resetAction);
          navigated = true;
        }
      } catch (e) {}
    }

    if (!navigated) {
      try {
        if (navigation?.dispatch) {
          navigation.dispatch(resetAction);
          navigated = true;
        }
      } catch (e) {}
    }

    if (!navigated) {
      try {
        RootNavigation.reset('Login');
      } catch (e) {}
    }

    // 2. Clear all in-memory Zustand stores immediately (<0.1ms)
    try {
      useUserStore.getState().clearUser?.();
    } catch (e) {}
    try {
      useCartStore.getState().clearCart?.();
    } catch (e) {}
    try {
      useOrderStore.getState().clearOrders?.();
    } catch (e) {}

    // 3. Clear global Context immediately
    if (setCtx) {
      try {
        setCtx(prev => ({
          ...prev,
          user: null,
          token: null,
        }));
      } catch (e) {}
    }

    // 4. Notify backend API of logout
    try {
      const fcmToken = await getFcmToken().catch(() => '');
      await ai.post('logout', {
        device_token: fcmToken || '',
        fcm_token: fcmToken || '',
      }).catch(err => {
        console.log('Logout API note:', err?.response?.data?.msg || err?.message || err);
      });
    } catch (e) {}

    // 5. Clear all user storage keys in a single batch native call (comprehensive wipe)
    await AsyncStorage.multiRemove([
      'user',
      'is_guest',
      'user-storage',
      'tokenSend',
      'auth_token',
      'cached_orders_master',
      'cached_orders_list',
      'cart-storage',
      'cached_home_data',
    ]);
  } catch (err) {
    console.log('logoutUser error:', err);
  } finally {
    isLoggingOut = false;
  }
};
