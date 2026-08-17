import {useCallback, useEffect, useRef} from 'react';
import {Animated} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export default function FadeInBottom({ children, style, duration = 1000}) {
  const defaultOpacity = 0;
  const opacity = useRef(new Animated.Value(defaultOpacity)).current;

  if(duration === undefined) {
    duration = 1000;
  }

  useFocusEffect(
    useCallback(() => {
      // console.log('work');
      opacity.setValue(defaultOpacity);
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration,
        useNativeDriver: true,
      }).start();
    }
  , [duration]));
/*
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: duration,
      useNativeDriver: true,
    }).start();
  }, []);*/

  return (
    <Animated.View style={{ ...style, opacity }}>
      {children}
    </Animated.View>
  );
}
