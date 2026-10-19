import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Platform,
} from 'react-native';
import BrandLogo from '../components/common/BrandLogo';
import AppButton from '../components/common/AppButton';
import IllustrationPlaceholder from '../components/common/IllustrationPlaceholder';
import { storageSet } from '../helpers/storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    type: 'stores',
    title: 'Your Top Stores, One Place',
    subtitle:
      'Shop from 1 Click and explore Amazon, SHEIN, YesStyle, iHerb and more from one simple app.',
    buttonText: 'Continue',
  },
  {
    id: '2',
    type: 'cart',
    title: 'Find It. Add It. One Click.',
    subtitle:
      'Discover products from different stores and your favorites to one centralized 1 Click Cart.',
    buttonText: 'Continue',
  },
  {
    id: '3',
    type: 'delivery',
    title: 'From Cart to Doorstep',
    subtitle:
      'Track your order from checkout to delivery with clear updates every step of the way.',
    buttonText: 'Get Started',
  },
];

export default function Onboarding({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleFinish = async () => {
    try {
      await storageSet('has_seen_onboarding', '1');
    } catch (e) {
      console.log('Error saving onboarding state:', e);
    }
    navigation.replace('AuthWelcome');
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      handleFinish();
    }
  };

  const handleScroll = event => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== currentIndex && index >= 0 && index < SLIDES.length) {
      setCurrentIndex(index);
    }
  };

  const renderSlide = ({ item }) => {
    return (
      <View style={styles.slide}>
        {/* Large 3D Illustration Area */}
        <View style={styles.illustrationWrapper}>
          <IllustrationPlaceholder
            type={item.type}
            width={SCREEN_WIDTH * 0.85}
            height={SCREEN_WIDTH * 0.85 * 1.05}
          />
        </View>

        {/* Text Area */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={Platform.OS === 'android'}
      />

      {/* Top Header Row with Status Bar padding */}
      <View style={styles.topHeader}>
        <BrandLogo align="left" size="normal" />

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleFinish}
          style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slides Carousel */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.flatList}
      />

      {/* Bottom Area: Pagination Dots & Action Button */}
      <View style={styles.bottomArea}>
        {/* Dots Indicator */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  isActive ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            );
          })}
        </View>

        {/* Action Button */}
        <AppButton
          title={SLIDES[currentIndex].buttonText}
          onPress={handleNext}
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 14 : 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F58423',
    fontFamily: 'System',
  },
  flatList: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 10,
  },
  illustrationWrapper: {
    flex: 1.35,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  textContainer: {
    flex: 0.65,
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    fontFamily: 'System',
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3.5,
  },
  activeDot: {
    width: 24,
    backgroundColor: '#F58423',
  },
  inactiveDot: {
    width: 6,
    backgroundColor: '#E5E7EB',
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: 14,
  },
});
