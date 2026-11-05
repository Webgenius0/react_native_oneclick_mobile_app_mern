/* eslint-disable no-undef */
import React from 'react';
import { View } from 'react-native';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.mock('react-native-device-info', () =>
  require('react-native-device-info/jest/react-native-device-info-mock'),
);

const mockToastComponent = () => <View />;
mockToastComponent.show = jest.fn();
mockToastComponent.hide = jest.fn();
const mockBaseToast = props => <View {...props} />;
const mockErrorToast = props => <View {...props} />;

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: mockToastComponent,
  BaseToast: mockBaseToast,
  ErrorToast: mockErrorToast,
  show: jest.fn(),
  hide: jest.fn(),
}));
jest.mock('react-native-image-slider-banner', () => ({
  ImageSlider: () => null,
}));
jest.mock('react-native-document-picker', () => ({
  pick: jest.fn(),
  types: {},
}));
jest.mock('react-native-receive-sharing-intent', () => ({
  getReceivedFiles: jest.fn(),
  clearReceivedFiles: jest.fn(),
}));
jest.mock('react-native-dropdown-select-list/index', () => ({
  SelectList: () => null,
}));
jest.mock('react-native-dropdown-select-list', () => ({
  SelectList: () => null,
}));
const mockMessagingInstance = {
  requestPermission: jest.fn().mockResolvedValue(1),
  getToken: jest.fn().mockResolvedValue('mock-token'),
  onMessage: jest.fn(),
  onNotificationOpenedApp: jest.fn(),
  getInitialNotification: jest.fn().mockResolvedValue(null),
  registerDeviceForRemoteMessages: jest.fn().mockResolvedValue(true),
  hasPermission: jest.fn().mockResolvedValue(1),
};
const mockMessaging = Object.assign(jest.fn(() => mockMessagingInstance), {
  ...mockMessagingInstance,
  getMessaging: jest.fn(() => mockMessagingInstance),
  requestPermission: jest.fn().mockResolvedValue(1),
  getToken: jest.fn().mockResolvedValue('mock-token'),
  onMessage: jest.fn(),
  onNotificationOpenedApp: jest.fn(),
  getInitialNotification: jest.fn().mockResolvedValue(null),
  setBackgroundMessageHandler: jest.fn(),
  registerDeviceForRemoteMessages: jest.fn().mockResolvedValue(true),
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  },
});
jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: mockMessaging,
  getMessaging: () => mockMessagingInstance,
  requestPermission: jest.fn().mockResolvedValue(1),
  getToken: jest.fn().mockResolvedValue('mock-token'),
  onMessage: jest.fn(),
  onNotificationOpenedApp: jest.fn(),
  getInitialNotification: jest.fn().mockResolvedValue(null),
  setBackgroundMessageHandler: jest.fn(),
  registerDeviceForRemoteMessages: jest.fn().mockResolvedValue(true),
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  },
}));
jest.mock('@react-native-firebase/app', () => ({
  messaging: mockMessaging,
}));
jest.mock('react-native-picker-select', () => () => null);
jest.mock('@react-native-picker/picker', () => ({
  Picker: () => null,
}));
jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn().mockResolvedValue(''),
  hasString: jest.fn().mockResolvedValue(false),
}));
jest.mock('react-native-webview', () => {
  const RN = require('react-native');
  return {
    WebView: props => <RN.View {...props} />,
  };
});
jest.mock('react-native-screens', () => {
  const RN = require('react-native');
  return {
    enableScreens: jest.fn(),
    screensEnabled: jest.fn(() => false),
    Screen: RN.View,
    ScreenContainer: RN.View,
    NativeScreen: RN.View,
    NativeScreenContainer: RN.View,
    ScreenStack: RN.View,
    ScreenStackHeaderConfig: RN.View,
    ScreenStackHeaderSubview: RN.View,
    ScreenStackHeaderLeftView: RN.View,
    ScreenStackHeaderCenterView: RN.View,
    ScreenStackHeaderRightView: RN.View,
    ScreenStackHeaderBackButtonImage: RN.View,
    ScreenStackHeaderSearchBarView: RN.View,
    SearchBar: RN.View,
    Tabs: RN.View,
    isSearchBarAvailableForCurrentPlatform: true,
    isNewBackTitleImplementation: false,
  };
});
jest.mock('react-native-fast-image', () => {
  const RN = require('react-native');
  const FastImage = props => <RN.View {...props} />;
  FastImage.resizeMode = {
    contain: 'contain',
    cover: 'cover',
    stretch: 'stretch',
    center: 'center',
  };
  FastImage.priority = {
    low: 'low',
    normal: 'normal',
    high: 'high',
  };
  FastImage.preload = jest.fn();
  FastImage.clearMemoryCache = jest.fn();
  FastImage.clearDiskCache = jest.fn();
  return {
    __esModule: true,
    default: FastImage,
  };
});

const mockAxiosInstance = {
  get: jest.fn().mockResolvedValue({ data: {} }),
  post: jest.fn().mockResolvedValue({ data: {} }),
  put: jest.fn().mockResolvedValue({ data: {} }),
  delete: jest.fn().mockResolvedValue({ data: {} }),
  create: jest.fn(() => mockAxiosInstance),
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  },
  defaults: {
    headers: { common: {} },
    baseURL: '',
  },
};

jest.mock('axios', () => ({
  __esModule: true,
  default: mockAxiosInstance,
  ...mockAxiosInstance,
}));

if (!global.fetch) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(''),
    json: () => Promise.resolve({}),
  });
}

