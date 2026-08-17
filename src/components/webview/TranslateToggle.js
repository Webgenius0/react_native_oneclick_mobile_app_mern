import {Text, TouchableWithoutFeedback, View, StyleSheet} from 'react-native';
import React from 'react';
import {getInnerHeight} from '../../helpers/header';

const BUTTON_NEW_HEIGHT = 55;
const BUTTON_NEW_WIDTH = 90;
const BUTTON_MARGIN = 10;

const styles = StyleSheet.create({
  button: {
    width: BUTTON_NEW_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFF',
    height: BUTTON_NEW_HEIGHT,
    position: 'absolute',
    right: 2,
    zIndex: 999,
  },
  text: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default function TranslateToggle({
  showTranslateButton,
  isTranslationOn,
  handleTranslate,
}) {
  if (!showTranslateButton) {
    return null;
  }

  const bottom = getInnerHeight() - BUTTON_NEW_HEIGHT - (BUTTON_MARGIN * 2);

  return (
    <TouchableWithoutFeedback onPress={handleTranslate}>
      <View
        style={[styles.button, {
          backgroundColor: isTranslationOn ? 'green' : 'grey',
          bottom,
        }]}>
        <Text style={styles.text}>
          Translate {'\n'}
          {isTranslationOn ? 'ON' : 'OFF'}
        </Text>
      </View>
    </TouchableWithoutFeedback>
  );
}
