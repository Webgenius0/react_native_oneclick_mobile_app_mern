import React from 'react';
import { TouchableOpacity, View, StyleSheet, ScrollView } from 'react-native';
import FastImage from 'react-native-fast-image';

export default function UlkeBar({ state, HOME_PASIF, ulkeID, setUlkeID }) {
  const handlePress = item => {
    if (ulkeID === item.id) {
      setUlkeID(0);
    } else {
      setUlkeID(item.id);
    }
  };

  if (state.loading || HOME_PASIF || !state.ulkes || state.ulkes.length <= 1) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {state.ulkes.map((item, index) => {
          const isSelected = ulkeID === item.id;
          return (
            <TouchableOpacity
              key={item.id ? `ulke-${item.id}` : `ulke-${index}`}
              activeOpacity={0.8}
              onPress={() => handlePress(item)}
              style={[
                styles.itemCard,
                isSelected && styles.itemCardActive,
              ]}>
              <FastImage
                style={{
                  width: item?.width ? Math.min(item.width, 60) : 50,
                  height: item?.height ? Math.min(item.height, 40) : 34,
                }}
                resizeMode={FastImage.resizeMode.contain}
                source={{ uri: item.img }}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    paddingHorizontal: 16,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  itemCard: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  itemCardActive: {
    borderColor: '#F67922',
    backgroundColor: '#FFF8F3',
  },
});
