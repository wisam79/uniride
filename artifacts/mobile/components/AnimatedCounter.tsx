import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, TextStyle, Text } from 'react-native';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  style?: TextStyle;
  color?: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 800,
  suffix = '',
  prefix = '',
  decimals = 0,
  style,
  color,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const listenerId = animatedValue.addListener(({ value }) => {
      setDisplayValue(value);
    });

    Animated.timing(animatedValue, {
      toValue: value,
      duration: duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false, // Animated.Value listener doesn't work with native driver for non-transform props usually, and we need to read the value
    }).start();

    return () => {
      animatedValue.removeListener(listenerId);
    };
  }, [value, duration]);

  const formatNumber = (num: number) => {
    return num.toLocaleString('ar-IQ', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <Text style={[{ color }, style]}>
      {prefix}
      {formatNumber(displayValue)}
      {suffix}
    </Text>
  );
};

export default AnimatedCounter;
