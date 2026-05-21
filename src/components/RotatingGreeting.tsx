import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { greet, prettyDate } from '@/lib/date';
import { Text } from './Text';
import { useColors } from '@/theme';

type Props = {
  name?: string | null;
  intervalMs?: number;
};

export function RotatingGreeting({ name, intervalMs = 3200 }: Props) {
  const colors = useColors();

  const phrases = useMemo(() => {
    const items = [`${greet()}.`];
    if (name?.trim()) items.push(`Hi, ${name.trim()}.`);
    items.push(prettyDate() + '.');
    return items;
  }, [name]);

  const [index, setIndex] = useState(0);
  const opacity = useSharedValue(1);
  const translate = useSharedValue(0);

  useEffect(() => {
    if (phrases.length <= 1) return;
    const t = setInterval(() => {
      // fade + slide out
      opacity.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) });
      translate.value = withTiming(-8, { duration: 380, easing: Easing.out(Easing.cubic) }, () => {
        // Note: setIndex needs to run on JS thread, but Reanimated's callback is on UI.
        // Using setTimeout via runOnJS pattern. Simpler: rely on setInterval below.
      });
      setTimeout(() => {
        setIndex((i) => (i + 1) % phrases.length);
        translate.value = 8;
        opacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
        translate.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) });
      }, 400);
    }, intervalMs);
    return () => clearInterval(t);
  }, [phrases, intervalMs, opacity, translate]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translate.value }],
  }));

  return (
    <View style={styles.wrap}>
      <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
        {prettyDate()}
      </Text>
      <Animated.View style={[animStyle, { marginTop: 4 }]}>
        <Text variant="display">{phrases[index] ?? phrases[0]}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 0 },
});
