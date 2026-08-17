import {Text, View, ActivityIndicator, Animated} from 'react-native';
import {tr} from '../../translate/i18n';
import React, { useEffect, useRef, useState } from 'react';

export default function WebviewLoading({loading}) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading) {
      setVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        progressAnim.setValue(0);
        setVisible(false);
      });
    }
  }, [loading]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        opacity: fadeAnim,
      }}>
      {/* Progress Bar */}
      <View
        style={{
          height: 3,
          backgroundColor: '#f0f0f0',
          overflow: 'hidden',
        }}>
        <Animated.View
          style={{
            height: '100%',
            backgroundColor: '#007AFF',
            width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          }}
        />
      </View>
      
      {/* Loading Text with Spinner */}
      <View
        style={{
          position: 'absolute',
          top: 50,
          left: 20,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 20,
        }}>
        <ActivityIndicator size="small" color="white" />
        <Text style={{ color: 'white', marginLeft: 8, fontSize: 12 }}>
          {tr('Yükleniyor')}...
        </Text>
      </View>
    </Animated.View>
  );
}
