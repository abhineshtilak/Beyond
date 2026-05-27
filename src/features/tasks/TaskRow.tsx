import React, { useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Trash2, CalendarClock, Check } from 'lucide-react-native';
import * as Haptics from '@/lib/haptics';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { Checkbox } from '@/components/Checkbox';
import { Text } from '@/components/Text';
import { radii, spacing, useColors, useTheme, resolveTint } from '@/theme';
import { CATEGORY_META, PRIORITY_META } from './types';
import type { Task } from './types';

type Props = {
  task: Task;
  onToggle: () => void;
  onPress: () => void;
  onDelete: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onLongPress?: () => void;
  onSelect?: () => void;
};

export function TaskRow({
  task,
  onToggle,
  onPress,
  onDelete,
  selectionMode = false,
  selected = false,
  onLongPress,
  onSelect,
}: Props) {
  const colors = useColors();
  const { resolved } = useTheme();
  const swipeRef = useRef<Swipeable>(null);
  const done = task.status === 'completed';

  const dueInfo = (() => {
    if (!task.dueDate) return null;
    const d = parseISO(task.dueDate);
    if (isToday(d))    return { text: 'Today',    tint: colors.text };
    if (isTomorrow(d)) return { text: 'Tomorrow', tint: colors.textSoft };
    if (isPast(d))     return { text: format(d, 'MMM d') + ' · overdue', tint: '#B97A6B' };
    return { text: format(d, 'MMM d'), tint: colors.textMuted };
  })();

  const catTint = resolveTint(
    task.category ? CATEGORY_META[task.category].tint : null,
    resolved,
  );
  const prioTint = resolveTint(
    task.priority > 1 ? PRIORITY_META[task.priority].tint : null,
    resolved,
  );

  const titleStyle = useAnimatedStyle(() => ({
    opacity: withTiming(done ? 0.5 : 1, { duration: 200 }),
  }));

  const handleLongPress = () => {
    if (selectionMode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onLongPress?.();
  };

  const rowInner = (
    <Pressable
      onPress={selectionMode ? onSelect : onPress}
      onLongPress={handleLongPress}
      delayLongPress={300}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected ? colors.accentSoft : colors.surface,
          borderColor: selected ? colors.text : colors.hairline,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      {selectionMode ? (
        <View
          style={[
            styles.selBox,
            { borderColor: colors.hairline },
            selected && { backgroundColor: colors.text, borderColor: colors.text },
          ]}
        >
          {selected ? <Check size={16} color={colors.bg} strokeWidth={3} /> : null}
        </View>
      ) : (
        <Checkbox checked={done} onToggle={onToggle} />
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Animated.View style={titleStyle}>
          <Text
            variant="bodyMedium"
            style={{
              textDecorationLine: done ? 'line-through' : 'none',
              color: done ? colors.textMuted : colors.text,
            }}
            numberOfLines={2}
          >
            {task.title}
          </Text>
        </Animated.View>
        {(dueInfo || task.category) && (
          <View style={styles.meta}>
            {dueInfo ? (
              <View style={styles.metaItem}>
                <CalendarClock size={12} color={dueInfo.tint} strokeWidth={2} />
                <Text variant="caption" color={dueInfo.tint}>{dueInfo.text.toUpperCase()}</Text>
              </View>
            ) : null}
            {task.category && catTint ? (
              <View style={[styles.categoryDot, { backgroundColor: catTint }]} />
            ) : null}
            {task.category ? (
              <Text variant="caption" color={colors.textMuted}>
                {CATEGORY_META[task.category].label.toUpperCase()}
              </Text>
            ) : null}
          </View>
        )}
      </View>
      {prioTint ? <View style={[styles.priorityBar, { backgroundColor: prioTint }]} /> : null}
    </Pressable>
  );

  if (selectionMode) return rowInner;

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
      {rowInner}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  selBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  categoryDot: { width: 6, height: 6, borderRadius: 3 },
  priorityBar: {
    position: 'absolute',
    left: 0,
    top: spacing.md,
    bottom: spacing.md,
    width: 3,
    borderRadius: 2,
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
