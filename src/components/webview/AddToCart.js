import {Dimensions, Text, TouchableOpacity, View, StyleSheet, ActivityIndicator} from 'react-native';
import React from 'react';

const {width} = Dimensions.get('window');

const styles = StyleSheet.create({
  touchable: {
    position: 'absolute',
    bottom: 40,
    left: width / 2 - 28,
    zIndex: 999,
  },
  button: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'orange',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonLoading: {
    backgroundColor: '#F58423',
    opacity: 0.95,
  },
  text: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: -2,
  },
});

export default function AddToCart({addChart, loading = false}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={addChart}
      disabled={loading}
      style={styles.touchable}>
      <View style={[styles.button, loading && styles.buttonLoading]}>
        {loading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={styles.text}>+</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
