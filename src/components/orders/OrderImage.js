import React from 'react';
import {StyleSheet} from 'react-native';
import {isImage} from '../../helpers/file';
import Colors from '../../assets/Colors';
import FastImage from 'react-native-fast-image';
import NoImage from '../../assets/svg/no-image.svg';

export default function OrderImage({item, width, height}) {

  width = width || 100;
  height = height || 100;


  if (!item.img || !isImage(item.img)) {
    return <NoImage width={width} height={height} fill={Colors.primary} />;
  }

  const styles = StyleSheet.create({
    img: {
      width: width,
      height: height,
    },
  });

  return (
    <FastImage
      style={styles.img}
      source={{
        uri: item.img,
        priority: FastImage.priority.normal,
      }}
      resizeMode={FastImage.resizeMode.contain}
    />
  );
}
