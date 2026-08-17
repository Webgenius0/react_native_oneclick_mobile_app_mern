import {
  Image,
  View,
  StyleSheet,
  Text,
  Dimensions,
  Animated,
} from 'react-native';
import { useRef } from 'react';

export default function ({ maxWidth, maxHeight, animation, source, paddingBottom, marginBottom }) {
  const screenWidth = Dimensions.get('window').width;
  const imgRatio = 973 / 731;
  let width, height;
  let logoLog = false;

  if (!source) {
    source = require('../assets/img/logo.png');
  }

  if (paddingBottom) {
    paddingBottom = 10;
  }

  if(!marginBottom){
    marginBottom = 0;
  }

  if (!maxWidth && !maxHeight) {
    width = screenWidth;
    height = screenWidth / imgRatio;
    if (logoLog) {
      console.log('l1');
    }
  } else if (!maxWidth) {
    width = maxHeight * imgRatio;
    height = maxHeight;
    if (logoLog) {
      console.log('l2');
    }
  } else if (!maxHeight) {
    height = maxWidth / imgRatio;
    width = maxWidth;
    if (logoLog) {
      console.log('l3');
    }
  } else {
    width = maxWidth;
    height = maxHeight;
    if (logoLog) {
      console.log('l4');
    }
  }



  const defaultOpacity = typeof animation !== 'undefined' && (animation !== false || animation !== 0) ? 1 : 0;
  // console.log({ animation, defaultOpacity });
  const opacity = useRef(new Animated.Value(defaultOpacity)).current;

  Animated.timing(opacity, {
    toValue: 1,
    duration: 1000,
    useNativeDriver: true,
  }).start();


  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      // backgroundColor:'red',
      paddingBottom: paddingBottom,
      marginBottom: marginBottom,
      //  flex: 1,
    },
  });

  return (
    <View style={styles.container}>
      <Animated.Image
        source={source}
        resizeMode="contain"
        style={{
          width: width,
          height: height,
          opacity: opacity,
        }}
      />
      {/*<Image source={require('../assets/img/logo.png')}
             resizeMode="contain"
             style={{
                width: width,
                height: height
             }}
      />*/}
      {/*<Text>{width}x{height}</Text>*/}
    </View>
  );
}

