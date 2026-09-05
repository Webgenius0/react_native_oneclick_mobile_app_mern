import React, { useState, useEffect } from 'react';
import { Image, TouchableOpacity } from 'react-native';
import FastImage from 'react-native-fast-image';
import DocumentPicker from 'react-native-document-picker';
import NoImage from '../../assets/svg/no-image.svg';

export default function CartItemImage({ item, onChange }) {
  const [uploadFile, setUploadFile] = useState({ uri: item?.image || '' });
  const [useFallbackImage, setUseFallbackImage] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setUploadFile({ uri: item?.image || '' });
    setUseFallbackImage(false);
    setHasError(false);
  }, [item?.image]);

  const selectFile = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.images],
        allowMultiSelection: false,
      });

      if (res && res[0]) {
        const file = res[0];
        setUploadFile(file);
        setUseFallbackImage(false);
        setHasError(false);

        const imgData = {
          uri: file.uri,
          type: file.type,
          name: file.name,
        };

        if (typeof onChange === 'function') {
          onChange(item.url, 'imgData', imgData);
          onChange(item.url, 'image', file.uri);
        }
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.log('DocumentPicker Error:', err);
      }
    }
  };

  const imageUrl = uploadFile?.uri || item?.image || '';
  const hasValidUri =
    typeof imageUrl === 'string' &&
    imageUrl.length > 5 &&
    (imageUrl.startsWith('http://') ||
      imageUrl.startsWith('https://') ||
      imageUrl.startsWith('file://') ||
      imageUrl.startsWith('content://'));

  if (!hasValidUri || hasError) {
    return (
      <TouchableOpacity onPress={selectFile} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <NoImage width={50} height={50} style={{ marginRight: 10 }} fill={'#333'} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={selectFile} style={{ flexDirection: 'row', alignItems: 'center' }}>
      {!useFallbackImage ? (
        <FastImage
          source={{
            uri: imageUrl,
            priority: FastImage.priority.normal,
          }}
          style={{ width: 50, height: 50, borderRadius: 6, marginRight: 10 }}
          resizeMode={FastImage.resizeMode.cover}
          onError={() => setUseFallbackImage(true)}
        />
      ) : (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 50, height: 50, borderRadius: 6, marginRight: 10 }}
          resizeMode="cover"
          onError={() => setHasError(true)}
        />
      )}
    </TouchableOpacity>
  );
}
