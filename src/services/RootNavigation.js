import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

export function reset(name, params) {
  if (navigationRef.isReady()) {
    const route = params !== undefined ? { name, params } : { name };
    try {
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [route],
        }),
      );
    } catch (e) {
      try {
        navigationRef.navigate(name, params);
      } catch (err) {}
    }
  }
}

export function resetRoot(state) {
  if (navigationRef.isReady()) {
    try {
      if (typeof navigationRef.resetRoot === 'function') {
        navigationRef.resetRoot(state);
        return;
      }
    } catch (e) {}

    try {
      navigationRef.dispatch(CommonActions.reset(state));
    } catch (e) {}
  }
}

export function resetStack(state) {
  resetRoot(state);
}


