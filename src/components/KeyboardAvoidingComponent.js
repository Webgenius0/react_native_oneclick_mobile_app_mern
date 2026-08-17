import React from 'react';
import { View, KeyboardAvoidingView, TextInput, StyleSheet, Text, Platform, TouchableWithoutFeedback, Button, Keyboard  } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';

const KeyboardAvoidingComponent = ({ children }) => {
  const headerHeight = useHeaderHeight();
  /*
      behavior={Platform.select({
        ios: "padding", android: 'hieght  '
      })}
  {{...(Platform.OS === 'ios' && { behavior: 'padding' })}}
   */
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
      style={styles.container}
    >
      {children}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent:"flex-end",
    /*flexDirection: 'column',
    justifyContent: 'center',*/
    // backgroundColor: 'red',

  },
});

export default KeyboardAvoidingComponent;
