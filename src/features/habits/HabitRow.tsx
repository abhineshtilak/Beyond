import React, { useRef } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Trash2, Flame, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/Text';
import { radii, spacing, useColors } from '@/theme';
import { HABIT_ICONS } from './icons';
import type { HabitWithStats } from './types';

type Props = {
  habit: HabitWithStats;
  onToggle: () => void;
  onPress: () => void;
  onDelete: () => void;
};

export function HabitRow({ habit, onToggle, onPress, onDelete }: Props) {
  const colors = useColors();
  const swipeRef = useRef<Swipeable>(null);
  const IconCmp = HABIT_ICONS[habit.icon];
  const checkScale = useSharedValue(habit.doneToday ? 1 : 0);

  React.useEffect(() => {
    checkScale.value = withSpring(habit.doneToday ? 1 : 0, { damping: 14, stiffness: 220 });
  }, [habit.doneToday]);

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkScale.value,
    transform: [{ scale: checkScale.value }],
  }));

  const handle = () => {
    Haptics.impactAsync(
      habit.doneToday ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
    ).catch(() => {});
    onToggle();
  };

  const renderRightActions = () => (
    <RectButton
      style={styles.deleteAction}
      onPress={() => {
        swipeRef.current?.close();
        onDelete();
      }}
    >
      <Trash2 size={20} color="#fff" strokeWidth={2} />
    </RectButton>
  );

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false} friction={2}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: colors.surface, borderColor: colors.hairline },
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: habit.color + '33' }]}>
          <IconCmp size={22} color={habit.color} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium" numberOfLines={1}>{habit.title}</Text>
          <View style={styles.metaRow}>
            {habit.streak > 0 ? (
              <View style={styles.metaItem}>
                <Flame size={12} color={colors.textSoft} strokeWidth={2} />
                <Text variant="caption" color={colors.textSoft}>
                  {habit.streak} DAY{habit.streak === 1 ? '' : 'S'}
                </Text>
              </View>
            ) : (
              <Text variant="caption" color={colors.textMuted}>NEW HABIT</Text>
            )}
            <Text variant="caption" color={colors.textMuted}>
              · {habit.successRate}% / {habit.targetDays}d
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.hairline }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, habit.successRate)}%`, backgroundColor: habit.color },
              ]}
            />
          </View>
        </View>
        <Pressable onPress={handle} hitSlop={12}>
          <View
            style={[
              styles.checkCircle,
              { borderColor: colors.hairline },
              habit.doneToday && { backgroundColor: habit.color, borderColor: habit.color },
            ]}
          >
            <Animated.View style={checkStyle}>
              <Check size={18} color="#fff" strokeWidth={3} />
            </Animated.View>
          </View>
        </Pressable>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAction: {
    backgroundColor: '#C97B6E',
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
    marginLeft: spacing.sm,
    borderRadius: radii.lg,
  },
});
