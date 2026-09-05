import {Dimensions, Text, TouchableWithoutFeedback, View, StyleSheet} from 'react-native';
import React from 'react';

const {width} = Dimensions.get('window');

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'orange',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#FFF',
    position: 'absolute',
    bottom: 40,
    left: width / 2 - 28,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  text: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: -2,
  },
});

export default function AddToCart({addChart}) {
  return (
    <TouchableWithoutFeedback onPress={addChart}>
      <View style={styles.button}>
        <Text style={styles.text}>+</Text>
      </View>
    </TouchableWithoutFeedback>
  );
}
