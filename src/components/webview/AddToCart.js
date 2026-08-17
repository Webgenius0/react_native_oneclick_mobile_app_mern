import {Dimensions, Text, TouchableWithoutFeedback, View, StyleSheet} from 'react-native';
import React from 'react';

const {width} = Dimensions.get('window');

const styles = StyleSheet.create({
  button: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'orange',
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#FFF',
    height: 80,
    position: 'absolute',
    bottom: 50,
    left: width / 2 - 40,
    zIndex: 999,
  },
  text: {
    color: '#FFF',
    fontSize: 30,
    fontWeight: 'bold',
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
