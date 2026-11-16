import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {ScrollView, StyleSheet, Dimensions} from 'react-native';
import StoryItem from './StoryItem';
import {EmContext} from '../contexts/EmContext';

const itemWidth = Dimensions.get('window').width / 4 - 10;

const StoryList = ({stories, navigation}) => {
  const scrollViewRef = useRef(null);
  const intervalRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const {ctxDil} = useContext(EmContext);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startInterval = useCallback(() => {
    stopInterval();

    if (!stories || stories.length <= 3) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentIndex(prevIndex => {
        const nextIndex = prevIndex < stories.length - 1 ? prevIndex + 1 : 0;

        scrollViewRef.current?.scrollTo({
          x: nextIndex * itemWidth,
          y: 0,
          animated: true,
        });

        return nextIndex;
      });
    }, 2000);
  }, [stories, stopInterval]);

  useEffect(() => {
    startInterval();

    return stopInterval;
  }, [startInterval, stopInterval]);

  const mapData = useMemo(() => {
    if (!stories) {
      return [];
    }

    return stories.map(item => ({
      id: item.id,
      img:
        item['img_' + ctxDil] ||
        item.img_en ||
        item.image ||
        item.img ||
        item.img_tr,
      ad:
        item['ad_' + ctxDil] ||
        item.ad_en ||
        item.title ||
        item.name ||
        item.ad ||
        item.ad_tr,
      link: item.link,
    }));
  }, [ctxDil, stories]);

  if (!stories || stories.length === 0) return null;

  const updateCurrentIndex = event => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / itemWidth);

    setCurrentIndex(Math.max(0, Math.min(index, stories.length - 1)));
    startInterval();
  };

  const handleScrollBeginDrag = () => {
    stopInterval();
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal={true}
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={updateCurrentIndex}
      scrollEventThrottle={100}
      onScrollBeginDrag={handleScrollBeginDrag}
      onScrollEndDrag={updateCurrentIndex}
      style={styles.scrollView}>
      {mapData.map((s, index) => (
        <StoryItem
          key={(s.id || s.img || s.link || 'story') + '_' + index}
          {...s}
          stopInterval={stopInterval}
          startInterval={startInterval}
          currentIndex={currentIndex}
          navigation={navigation}
          setCurrentIndex={setCurrentIndex}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
    borderTopWidth: 1,
    borderTopColor: '#DDD',
    paddingVertical: 10,
    marginBottom: 10,
  },
});

export default StoryList;
