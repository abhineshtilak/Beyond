import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  format,
  subDays,
  startOfWeek,
  addDays,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns';
import { Text } from '@/components/Text';
import { colors, radii, spacing } from '@/theme';

type Props = {
  doneDates: Set<string>;
  color: string;
  weeks?: number;
};

const DAYS_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function HabitHeatmap({ doneDates, color, weeks = 22 }: Props) {
  const today = new Date();
  const start = startOfWeek(subDays(today, weeks * 7 - 1), { weekStartsOn: 0 });

  const days = useMemo(
    () => eachDayOfInterval({ start, end: addDays(start, weeks * 7 - 1) }),
    [start, weeks],
  );

  const columns: Date[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: Date[] = [];
    for (let d = 0; d < 7; d++) col.push(days[w * 7 + d]);
    columns.push(col);
  }

  // Month labels at the top — show first column of each new month
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  columns.forEach((col, ci) => {
    const m = col[0].getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ col: ci, label: format(col[0], 'MMM') });
      lastMonth = m;
    }
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.monthRow}>
        <View style={{ width: 28 }} />
        {columns.map((_, ci) => {
          const label = monthLabels.find((m) => m.col === ci)?.label;
          return (
            <View key={ci} style={{ width: CELL, marginRight: GAP }}>
              {label ? (
                <Text variant="caption" color={colors.textMuted}>{label}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
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
                const isDone = doneDates.has(key);
                const isFuture = day > today;
                return (
                  <View
                    key={di}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: isDone ? color : colors.hairline,
                        opacity: isFuture ? 0.25 : isDone ? 1 : 0.6,
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
    </View>
  );
}

const CELL = 12;
const GAP = 3;

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  monthRow: { flexDirection: 'row', paddingLeft: 4 },
  gridWrap: { flexDirection: 'row', gap: 4 },
  dayLabels: { gap: GAP, justifyContent: 'space-between' },
  dayLabel: { height: CELL, lineHeight: CELL, width: 24 },
  grid: { flexDirection: 'row', gap: GAP },
  col: { gap: GAP },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 2,
    borderWidth: 1,
  },
});
