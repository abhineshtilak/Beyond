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
import { spacing, useColors } from '@/theme';

type Props = {
  doneDates: Set<string>;
  color: string;
  weeks?: number;
};

// Square is larger so it reads well; no border (the empty-state color does the work).
const CELL = 14;
const GAP = 3;
const COL_PITCH = CELL + GAP;            // horizontal distance between week-column starts
const DAY_LABEL_W = 26;                   // gutter for Mon/Wed/Fri labels
const DAY_LABEL_GUTTER = 6;               // breathing room between labels and grid

const DAYS_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function HabitHeatmap({ doneDates, color, weeks = 22 }: Props) {
  const colors = useColors();
  const today = new Date();
  const start = startOfWeek(subDays(today, weeks * 7 - 1), { weekStartsOn: 0 });

  const days = useMemo(
    () => eachDayOfInterval({ start, end: addDays(start, weeks * 7 - 1) }),
    [start, weeks],
  );

  const columns: Date[][] = useMemo(() => {
    const cols: Date[][] = [];
    for (let w = 0; w < weeks; w++) {
      const col: Date[] = [];
      for (let d = 0; d < 7; d++) col.push(days[w * 7 + d]);
      cols.push(col);
    }
    return cols;
  }, [days, weeks]);

  // Month label positions: place a label at the first column where each new month appears,
  // BUT only if there's enough room before the next month label (avoid overlap).
  const monthLabels = useMemo(() => {
    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    columns.forEach((col, ci) => {
      const m = col[0].getMonth();
      if (m !== lastMonth) {
        // Skip if the previous label is too close (< 3 columns away → would overlap)
        const prev = labels[labels.length - 1];
        if (!prev || ci - prev.col >= 3) {
          labels.push({ col: ci, label: format(col[0], 'MMM') });
        }
        lastMonth = m;
      }
    });
    return labels;
  }, [columns]);

  // Width of the grid area (without the day-label gutter)
  const gridWidth = columns.length * CELL + (columns.length - 1) * GAP;

  return (
    <View style={styles.wrap}>
      {/* Month labels — absolute-positioned over a sized track so they can overflow
          a single column's width without clipping. */}
      <View style={{ height: 14, marginLeft: DAY_LABEL_W + DAY_LABEL_GUTTER, width: gridWidth }}>
        {monthLabels.map((m) => (
          <Text
            key={`${m.col}-${m.label}`}
            variant="caption"
            color={colors.textMuted}
            style={[
              styles.monthLabel,
              { left: m.col * COL_PITCH },
            ]}
          >
            {m.label}
          </Text>
        ))}
      </View>

      <View style={styles.gridWrap}>
        {/* Left day labels — only show Mon, Wed, Fri to avoid clutter */}
        <View style={{ width: DAY_LABEL_W, marginRight: DAY_LABEL_GUTTER }}>
          {DAYS_LABEL.map((d, i) => (
            <View key={d} style={{ height: CELL, marginBottom: i < 6 ? GAP : 0, justifyContent: 'center' }}>
              {i === 1 || i === 3 || i === 5 ? (
                <Text variant="caption" color={colors.textFaint}>
                  {d}
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        {/* Cells grid */}
        <View style={styles.grid}>
          {columns.map((col, ci) => (
            <View key={ci} style={styles.col}>
              {col.map((day, di) => {
                const key = format(day, 'yyyy-MM-dd');
                const isDone = doneDates.has(key);
                const isFuture = day > today;
                const isToday = isSameDay(day, today);
                return (
                  <View
                    key={di}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: isDone
                          ? color
                          : isFuture
                            ? 'transparent'
                            : colors.surfaceAlt ?? colors.hairline,
                      },
                      isToday && {
                        borderWidth: 1.5,
                        borderColor: colors.text,
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

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  monthLabel: {
    position: 'absolute',
    top: 0,
    width: 40, // generous, lets "Sep" / "Dec" overflow their column without clipping
  },
  gridWrap: { flexDirection: 'row' },
  grid: { flexDirection: 'row', gap: GAP },
  col: { gap: GAP },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 3,
  },
});
