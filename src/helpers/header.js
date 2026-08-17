import { Dimensions, Platform } from 'react-native';
import {useHeaderHeight} from '@react-navigation/elements';

export const LANDSCAPE = 'landscape';
export const PORTRAIT = 'portrait';


// This does not include the new bar area in the iPhone X, so I use this when I need a custom headerTitle component
export const getHeaderSafeAreaHeight = () => {
  const orientation = getOrientation();
  if (Platform.OS === 'ios' && orientation === LANDSCAPE && !Platform.isPad) {
    return 32;
  }



  return useHeaderHeight();
}

export const getOrientation = () => {
  const { width, height } = Dimensions.get('window');
  return width > height ? LANDSCAPE : PORTRAIT;
};


export const getInnerHeight = () => {
  const { height } = Dimensions.get('window');
  let headerHeight = useHeaderHeight();

  if(Platform.OS === 'ios' && getOrientation() === PORTRAIT) {
    headerHeight += 10;
  }

  return height - headerHeight;
}
