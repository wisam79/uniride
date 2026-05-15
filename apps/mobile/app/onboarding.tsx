import React, { useState, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, FontFamily, Spacing, BorderRadius } from '../src/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../src/hooks/useTranslation';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<any>(null);

  const SLIDES = useMemo(
    () => [
      {
        id: '1',
        title: t('uniride_tagline'),
        description: t('onboarding_1_desc'),
        icon: 'bus-outline',
      },
      {
        id: '2',
        title: t('onboarding_2_title'),
        description: t('onboarding_2_desc'),
        icon: 'map-outline',
      },
      {
        id: '3',
        title: t('onboarding_3_title'),
        description: t('onboarding_3_desc'),
        icon: 'shield-checkmark-outline',
      },
    ],
    [t],
  );

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.replace('/login');
    }
  };

  const handleSkip = () => {
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={[styles.skipContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>{t('skip')}</Text>
        </TouchableOpacity>
      </View>

      <Animated.FlatList
        data={SLIDES}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon as any} size={80} color={Colors.white} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        ref={slidesRef}
        inverted={isRTL} // Handle RTL swipe
      />

      <View style={styles.footer}>
        <View style={[styles.paginator, isRTL && styles.rowReverse]}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                style={[styles.dot, { width: dotWidth, opacity }]}
                key={i.toString()}
              />
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.button, isRTL && styles.rowReverse]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>
            {currentIndex === SLIDES.length - 1 ? t('get_started') : t('next')}
          </Text>
          <Ionicons
            name={isRTL ? 'arrow-forward-outline' : 'arrow-back-outline'}
            size={20}
            color={Colors.white}
            style={{ marginHorizontal: Spacing.sm }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  skipContainer: {
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
  },
  skipText: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: Colors.textMuted,
  },
  slide: {
    width,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 40,
  },
  iconCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    color: Colors.secondary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.lg,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },
  paginator: {
    flexDirection: 'row',
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginHorizontal: 4,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.white,
  },
});
