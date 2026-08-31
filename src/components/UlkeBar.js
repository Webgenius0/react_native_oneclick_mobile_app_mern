import {TouchableOpacity, View} from 'react-native';
import FastImage from 'react-native-fast-image';

export default function UlkeBar({state, HOME_PASIF, ulkeID, setUlkeID}) {
  const handlePress = item => {
    if (ulkeID === item.id) {
      setUlkeID(0);
    } else {
      setUlkeID(item.id);
    }
  };

  return (
    state.loading === false &&
    !HOME_PASIF &&
    state.ulkes.length > 1 && (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {state.ulkes.map((item, index) => {
          return (
            <View
              key={index}
              style={{
                padding: 10,
                // flex: 1,
                flexDirection: 'row',
              }}>
              <TouchableOpacity onPress={() => handlePress(item)}>
                <FastImage
                  style={{
                    width: item?.width || 75,
                    height: item?.height || 75,
                    resizeMode: 'contain',
                  }}
                  source={{uri: item.img}}
                />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    )
  );
}
