import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Colors } from '../theme';

export function LoadingCard() {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.line, styles.titleLine, { opacity }]} />
      <Animated.View style={[styles.line, styles.subtitleLine, { opacity }]} />
      <Animated.View style={[styles.line, styles.shortLine, { opacity }]} />
    </View>
  );
}

export function LoadingList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 15 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
  },
  line: {
    height: 14,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginBottom: 10,
  },
  titleLine: { width: '60%', height: 18 },
  subtitleLine: { width: '80%' },
  shortLine: { width: '40%' },
});
