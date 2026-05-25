import React, { useEffect, useState, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Target, ChevronDown, X, Check } from 'lucide-react-native';
import { Text } from '@/components/Text';
import { radii, spacing, useColors } from '@/theme';
import { listGoals } from './repo';
import { GOAL_CATEGORY_META, GOAL_STATUS_META, type Goal } from './types';

// Single-select mode
type SingleProps = {
  multi?: false;
  value: string | null;
  onChange: (goalId: string | null) => void;
};

// Multi-select mode
type MultiProps = {
  multi: true;
  value: string[];
  onChange: (goalIds: string[]) => void;
};

type Props = SingleProps | MultiProps;

export function GoalPicker(props: Props) {
  const colors = useColors();
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

  const pick = (goalId: string) => {
    if (props.multi) {
      const current = props.value;
      const next = current.includes(goalId)
        ? current.filter((id) => id !== goalId)
        : [...current, goalId];
      props.onChange(next);
    } else {
      const newVal = props.value === goalId ? null : goalId;
      props.onChange(newVal);
      setExpanded(false);
    }
  };

  const clearAll = () => {
    if (props.multi) props.onChange([]);
    else props.onChange(null);
  };

  // Derived display values
  const selectedIds: string[] = props.multi ? props.value : (props.value ? [props.value] : []);
  const hasSelection = selectedIds.length > 0;
  const selectedGoals = goals.filter((g) => selectedIds.includes(g.id));

  const summaryLabel = (): string => {
    if (!hasSelection) return 'No goal linked';
    if (selectedGoals.length === 1) return selectedGoals[0].title;
    return `${selectedGoals.length} goals linked`;
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={toggle} style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.hairline },
        pressed && { opacity: 0.85 },
      ]}>
        <View style={styles.left}>
          <Target size={16} color={colors.textMuted} strokeWidth={1.75} />
          {hasSelection && selectedGoals[0] ? (
            <>
              {selectedGoals[0].category ? (
                <View style={[styles.dot, { backgroundColor: GOAL_CATEGORY_META[selectedGoals[0].category]?.tint }]} />
              ) : null}
              <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>{summaryLabel()}</Text>
            </>
          ) : (
            <Text variant="body" color={colors.textMuted} style={{ flex: 1 }}>
              {props.multi ? 'Link goals (optional)' : 'No goal linked'}
            </Text>
          )}
        </View>
        {hasSelection ? (
          <Pressable onPress={clearAll} hitSlop={8}>
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
        <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
          {goals.length === 0 && !loading ? (
            <Text variant="small" color={colors.textMuted} style={styles.emptyText}>
              You have no goals yet. Create one in the Goals tab, then come back.
            </Text>
          ) : (
            <>
              {!props.multi ? (
                <Pressable
                  onPress={() => { props.onChange(null); setExpanded(false); }}
                  style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}
                >
                  <View style={[styles.optDot, { backgroundColor: colors.hairline }]} />
                  <Text variant="body" color={colors.textMuted} style={{ flex: 1 }}>None</Text>
                  {!props.value ? <Check size={16} color={colors.text} strokeWidth={2} /> : null}
                </Pressable>
              ) : null}
              {goals.map((g) => {
                const cat = g.category ? GOAL_CATEGORY_META[g.category] : null;
                const isSelected = selectedIds.includes(g.id);
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
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  list: {
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
