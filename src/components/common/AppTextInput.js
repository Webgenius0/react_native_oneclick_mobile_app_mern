import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

export default function AppTextInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  helperText,
  error,
  editable = true,
  rightComponent,
  onPress,
  containerStyle,
  style,
  ...rest
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = secureTextEntry;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        activeOpacity={onPress ? 0.7 : 1}
        onPress={onPress}
        disabled={!onPress}>
        <View
          style={[
            styles.inputWrapper,
            isFocused && styles.inputWrapperFocused,
            error && styles.inputWrapperError,
            !editable && styles.inputWrapperDisabled,
            style,
          ]}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            secureTextEntry={isPassword && !showPassword}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            editable={editable && !onPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...rest}
          />

          {isPassword && (
            <TouchableOpacity
              style={styles.eyeButton}
              activeOpacity={0.7}
              onPress={() => setShowPassword(!showPassword)}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                {showPassword ? (
                  <>
                    <Path
                      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                      stroke="#9CA3AF"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Path
                      d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
                      stroke="#9CA3AF"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                ) : (
                  <>
                    <Path
                      d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"
                      stroke="#9CA3AF"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}
              </Svg>
            </TouchableOpacity>
          )}

          {rightComponent && (
            <View style={styles.rightComponentWrap}>{rightComponent}</View>
          )}
        </View>
      </TouchableOpacity>

      {helperText && !error && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
    fontFamily: 'System',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
  },
  inputWrapperFocused: {
    borderColor: '#F58423',
    backgroundColor: '#FFFFFF',
  },
  inputWrapperError: {
    borderColor: '#EF4444',
  },
  inputWrapperDisabled: {
    backgroundColor: '#F3F4F6',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#111827',
    fontFamily: 'System',
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 8,
    marginRight: -4,
  },
  rightComponentWrap: {
    marginLeft: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginLeft: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 2,
  },
});
