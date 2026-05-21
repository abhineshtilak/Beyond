import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { format, subDays, startOfWeek, eachDayOfInterval, addDays, isSameDay, parseISO } from 'date-fns';
import { Text } from '@/components/Text';
import { colors, radii, spacing } from '@/theme';
import { MOOD_META } from './types';
import type { DiaryEntry } from './types';

type Props = {
  entries: DiaryEntry[];
  weeks?: number;
};

const DAYS_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MoodHeatmap({ entries, weeks = 14 }: Props) {
  const today = new Date();
  const start = startOfWeek(subDays(today, weeks * 7 - 1), { weekStartsOn: 0 });
  const days = useMemo(
    () => eachDayOfInterval({ start, end: addDays(start, weeks * 7 - 1) }),
    [start, weeks],
  );

  const byDate = useMemo(() => {
    const m = new Map<string, DiaryEntry>();
    for (const e of entries) m.set(e.entryDate, e);
    return m;
  }, [entries]);

  // Pivot into columns (one column per week, 7 rows)
  const columns: Date[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: Date[] = [];
    for (let d = 0; d < 7; d++) col.push(days[w * 7 + d]);
    columns.push(col);
  }

  return (
    <View style={styles.wrap}>
      <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
        Mood · last {weeks} weeks
      </Text>
      <View style={styles.gridWrap}>
        <View style={styles.dayLabels}>
          {DAYS_LABEL.map((d, i) => (
            <Text key={d} variant="caption" color={colors.textFaint} style={styles.dayLabel}>
              {i % 2 === 1 ? d : ''}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {columns.map((col, ci) => (
            <View key={ci} style={styles.col}>
              {col.map((day, di) => {
                const key = format(day, 'yyyy-MM-dd');
                const entry = byDate.get(key);
                const tint = entry?.mood ? MOOD_META[entry.mood].tint : colors.hairline;
                const opacity = entry?.mood ? 1 : 0.55;
                const isFuture = day > today;
                return (
                  <View
                    key={di}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: tint,
                        opacity: isFuture ? 0.25 : opacity,
                        borderColor: isSameDay(day, today) ? colors.text : 'transparent',
                      },
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
      <View style={styles.legend}>
        {(['great', 'good', 'ok', 'low', 'bad'] as const).map((m) => (
          <View key={m} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: MOOD_META[m].tint }]} />
            <Text variant="caption" color={colors.textMuted}>{MOOD_META[m].label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const CELL = 14;
const GAP = 4;

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.lg,
    gap: spacing.md,
  },
  gridWrap: { flexDirection: 'row', gap: spacing.sm },
  dayLabels: { gap: GAP, justifyContent: 'space-between' },
  dayLabel: { height: CELL, lineHeight: CELL, width: 24 },
  grid: { flexDirection: 'row', gap: GAP, flex: 1 },
  col: { gap: GAP },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 3,
    borderWidth: 1,
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
