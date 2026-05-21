import React, { useEffect, useState, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Target, ChevronDown, X, Check } from 'lucide-react-native';
import { Text } from '@/components/Text';
import { colors, radii, spacing } from '@/theme';
import { listGoals } from './repo';
import { GOAL_CATEGORY_META, GOAL_STATUS_META, type Goal } from './types';

type Props = {
  value: string | null;
  onChange: (goalId: string | null) => void;
};

export function GoalPicker({ value, onChange }: Props) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listGoals(true);
      setGoals(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const toggle = async () => {
    if (!expanded) await fetchGoals();
    setExpanded((v) => !v);
  };

  const pick = (goalId: string | null) => {
    onChange(goalId);
    setExpanded(false);
  };

  const selected = value ? goals.find((g) => g.id === value) ?? null : null;
  const selectedCat = selected?.category ? GOAL_CATEGORY_META[selected.category] : null;

  return (
    <View style={styles.container}>
      <Pressable onPress={toggle} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
        <View style={styles.left}>
          <Target size={16} color={colors.textMuted} strokeWidth={1.75} />
          {selected ? (
            <>
              {selectedCat ? (
                <View style={[styles.dot, { backgroundColor: selectedCat.tint }]} />
              ) : null}
              <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>{selected.title}</Text>
            </>
          ) : (
            <Text variant="body" color={colors.textMuted} style={{ flex: 1 }}>
              No goal linked
            </Text>
          )}
        </View>
        {selected ? (
          <Pressable onPress={() => onChange(null)} hitSlop={8}>
            <X size={16} color={colors.textMuted} strokeWidth={1.75} />
          </Pressable>
        ) : (
          <ChevronDown
            size={16}
            color={colors.textMuted}
            strokeWidth={1.75}
            style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
          />
        )}
      </Pressable>

      {expanded ? (
        <View style={styles.list}>
          {goals.length === 0 && !loading ? (
            <Text variant="small" color={colors.textMuted} style={styles.emptyText}>
              You have no goals yet. Create one in the Goals tab, then come back.
            </Text>
          ) : (
            <>
              <Pressable
                onPress={() => pick(null)}
                style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}
              >
                <View style={[styles.optDot, { backgroundColor: colors.hairline }]} />
                <Text variant="body" color={colors.textMuted} style={{ flex: 1 }}>None</Text>
                {!value ? <Check size={16} color={colors.text} strokeWidth={2} /> : null}
              </Pressable>
              {goals.map((g) => {
                const cat = g.category ? GOAL_CATEGORY_META[g.category] : null;
                const isSelected = value === g.id;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => pick(g.id)}
                    style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}
                  >
                    <View style={[styles.optDot, { backgroundColor: cat?.tint ?? colors.hairline }]} />
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" numberOfLines={1}>{g.title}</Text>
                      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 2 }}>
                        {cat ? (
                          <Text variant="caption" color={colors.textMuted}>{cat.label.toUpperCase()}</Text>
                        ) : null}
                        {g.status !== 'active' ? (
                          <Text variant="caption" color={colors.textMuted}>
                            · {GOAL_STATUS_META[g.status].label.toUpperCase()}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    {isSelected ? <Check size={16} color={colors.text} strokeWidth={2} /> : null}
                  </Pressable>
                );
              })}
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  list: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.xs,
    gap: 2,
  },
  emptyText: { padding: spacing.lg, textAlign: 'center' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  optDot: { width: 10, height: 10, borderRadius: 5 },
});
