import { CommonActions } from '@react-navigation/native';


let _container; // eslint-disable-line

function setContainer(container: Object) {
  _container = container;
}

function reset(routeName, params) {
  _container.dispatch(
    CommonActions.reset({
      index: 0,
      actions: [
        CommonActions.navigate({
          type: 'Navigation/NAVIGATE',
          routeName,
          params,
        }),
      ],
    }),
  );
}

function navigate(routeName, params) {
  _container.dispatch(
    CommonActions.navigate({
      type: 'Navigation/NAVIGATE',
      routeName,
      params,
    }),
  );
}


export default {
  setContainer,
  navigate,
  reset,
};
