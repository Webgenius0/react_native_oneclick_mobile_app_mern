import React, { useContext, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { EmContext } from '../../contexts/EmContext';

export default function OrdersLoading({ loading }) {
  const { ctx } = useContext(EmContext);
  const isDark = ctx?.isDark;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    let animation;
    if (loading) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.35,
            duration: 750,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [loading, pulseAnim]);

  if (!loading) {
    return null;
  }

  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const borderColor = isDark ? '#374151' : '#F1F5F9';
  const skeletonColor = isDark ? '#374151' : '#E2E8F0';

  return (
    <View style={styles.container}>
      {[1, 2, 3].map(key => (
        <View
          key={key}
          style={[
            styles.card,
            { backgroundColor: cardBg, borderColor: borderColor },
          ]}>
          {/* Card Top: Order ID & Status Badge Skeletons */}
          <View style={styles.topRow}>
            <Animated.View
              style={[
                styles.skeletonBar,
                {
                  width: 130,
                  height: 16,
                  borderRadius: 6,
                  backgroundColor: skeletonColor,
                  opacity: pulseAnim,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonBar,
                {
                  width: 76,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: skeletonColor,
                  opacity: pulseAnim,
                },
              ]}
            />
          </View>

          {/* Date skeleton */}
          <Animated.View
            style={[
              styles.skeletonBar,
              {
                width: 90,
                height: 11,
                borderRadius: 4,
                backgroundColor: skeletonColor,
                opacity: pulseAnim,
                marginTop: 6,
                marginBottom: 14,
              },
            ]}
          />

          {/* Middle: Product Thumbnails */}
          <View style={styles.thumbnailsRow}>
            {[1, 2, 3].map(thumbKey => (
              <Animated.View
                key={thumbKey}
                style={[
                  styles.thumbnailSkeleton,
                  {
                    backgroundColor: skeletonColor,
                    opacity: pulseAnim,
                  },
                ]}
              />
            ))}
          </View>

          {/* Divider */}
          <View
            style={[styles.divider, { backgroundColor: borderColor }]}
          />

          {/* Bottom Row: Price & Button Skeletons */}
          <View style={styles.bottomRow}>
            <View>
              <Animated.View
                style={[
                  styles.skeletonBar,
                  {
                    width: 44,
                    height: 11,
                    borderRadius: 4,
                    backgroundColor: skeletonColor,
                    opacity: pulseAnim,
                    marginBottom: 5,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.skeletonBar,
                  {
                    width: 70,
                    height: 18,
                    borderRadius: 6,
                    backgroundColor: skeletonColor,
                    opacity: pulseAnim,
                  },
                ]}
              />
            </View>

            <View style={styles.buttonsWrap}>
              <Animated.View
                style={[
                  styles.skeletonBtn,
                  {
                    width: 100,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: skeletonColor,
                    opacity: pulseAnim,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skeletonBar: {},
  thumbnailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  thumbnailSkeleton: {
    width: 52,
    height: 52,
    borderRadius: 10,
    marginRight: 10,
  },
  divider: {
    height: 1,
    marginBottom: 14,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonBtn: {},
});
