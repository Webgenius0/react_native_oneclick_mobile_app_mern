import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

export default function OtpInput({ length = 6, value = '', onChangeCode }) {
  const inputRefs = useRef([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const digits = value.split('');

  const handleChangeText = (text, index) => {
    // Handle paste of whole code
    if (text.length > 1) {
      const cleaned = text.replace(/[^0-9]/g, '').slice(0, length);
      if (onChangeCode) {
        onChangeCode(cleaned);
      }
      const nextFocus = Math.min(cleaned.length, length - 1);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = text;
    const combined = newDigits.join('').slice(0, length);
    if (onChangeCode) {
      onChangeCode(combined);
    }

    if (text && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, index) => {
        const isFocused = focusedIndex === index;
        const hasValue = digits[index] !== undefined && digits[index] !== '';

        return (
          <View
            key={index}
            style={[
              styles.box,
              isFocused && styles.boxFocused,
              hasValue && styles.boxFilled,
            ]}>
            <TextInput
              ref={el => (inputRefs.current[index] = el)}
              style={styles.input}
              keyboardType="number-pad"
              maxLength={1}
              value={digits[index] || ''}
              onChangeText={text => handleChangeText(text, index)}
              onKeyPress={e => handleKeyPress(e, index)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(-1)}
              selectTextOnFocus
              textAlign="center"
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 4,
    marginVertical: 18,
  },
  box: {
    width: 46,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxFocused: {
    borderColor: '#F58423',
    backgroundColor: '#FFFFFF',
    shadowColor: '#F58423',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  boxFilled: {
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  input: {
    width: '100%',
    height: '100%',
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    padding: 0,
  },
});
