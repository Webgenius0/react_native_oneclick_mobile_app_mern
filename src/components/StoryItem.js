import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  PixelRatio,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import {tr} from '../translate/i18n';
import LinkIcon from '../assets/svg/link.svg';
import CloseIcon from '../assets/svg/close.svg';

const imageSize = Dimensions.get('window').width / 4 - 30;
const modalImageMaxWidth = Dimensions.get('window').width - 40;
const modalImageMaxHeight = Dimensions.get('window').height - 180;

const StoryItem = ({img, ad, link, navigation}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalImageSize, setModalImageSize] = useState({
    width: modalImageMaxWidth,
    height: modalImageMaxWidth,
  });

  useEffect(() => {
    if (!img) return;

    Image.getSize(
      img,
      (width, height) => {
        const ratio = width / height;
        let displayWidth = modalImageMaxWidth;
        let displayHeight = displayWidth / ratio;

        if (displayHeight > modalImageMaxHeight) {
          displayHeight = modalImageMaxHeight;
          displayWidth = displayHeight * ratio;
        }

        setModalImageSize({
          width: PixelRatio.roundToNearestPixel(displayWidth),
          height: PixelRatio.roundToNearestPixel(displayHeight),
        });
      },
      () => {
        setModalImageSize({
          width: modalImageMaxWidth,
          height: modalImageMaxWidth,
        });
      },
    );
  }, [img]);

  const handlePress = () => {
    setModalVisible(true);
  };

  const handleClose = () => {
    setModalVisible(false);
  };

  const handleLinkPress = () => {
    setModalVisible(false);
    navigation.navigate('Webview', {ad: ad, url: link});
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handlePress} style={styles.imageContainer}>
        <FastImage source={{uri: img}} style={styles.image} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent={true}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalBackdrop}
            onPress={handleClose}
          />

          <TouchableOpacity style={styles.kapat} onPress={handleClose}>
            <CloseIcon width={32} height={32} fill={'#FFF'} />
          </TouchableOpacity>

          <View style={styles.modalImageArea} pointerEvents="box-none">
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.modalImageButton, modalImageSize]}
              onPress={handleLinkPress}>
              <Image
                source={{uri: img}}
                resizeMode="contain"
                resizeMethod="scale"
                fadeDuration={0}
                style={styles.image}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.linkButton} onPress={handleLinkPress}>
            <LinkIcon
              width={24}
              height={24}
              fill={'#FFF'}
              style={{marginEnd: 10}}
            />
            <Text style={styles.linkButtonText}>{tr('Open')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  imageContainer: {
    width: imageSize,
    height: imageSize,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#C8067E',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalImageArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 80,
    zIndex: 1,
  },
  modalImageButton: {
    maxWidth: '100%',
    maxHeight: '100%',
  },
  kapat: {
    position: 'absolute',
    top: 100,
    right: 20,
    height: 32,
    width: 32,
    zIndex: 2,
  },
  linkButton: {
    backgroundColor: '#0088cc',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    position: 'absolute',
    bottom: 20,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    zIndex: 2,
  },
  linkButtonText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

export default StoryItem;
