import React, { useMemo, useState } from 'react';
import { View, Pressable, Image, ScrollView, StyleSheet } from 'react-native';
import { format, parseISO, addMonths, subMonths, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Cake, Sparkle } from 'lucide-react-native';
import { Text } from '@/components/Text';
import { radii, spacing, useColors } from '@/theme';
import { RELATION_META, type Person } from './types';

type Props = {
  people: Person[];
  onPersonTap: (id: string) => void;
};

type Celebration = {
  person: Person;
  kind: 'birthday' | 'anniversary';
  day: number; // 1-31
};

/** Aesthetic month calendar showing whose birthday/anniversary lands when */
export function CelebrationsCalendar({ people, onPersonTap }: Props) {
  const colors = useColors();
  const [view, setView] = useState<Date>(new Date());

  const month = view.getMonth();
  const daysInMonth = getDaysInMonth(view);
  const firstDayOffset = getDay(startOfMonth(view)); // 0=Sun

  /** Map day-of-month → list of celebrations */
  const byDay = useMemo(() => {
    const out = new Map<number, Celebration[]>();
    for (const p of people) {
      if (p.birthday) {
        try {
          const d = parseISO(p.birthday);
          if (d.getMonth() === month) {
            const day = d.getDate();
            if (!out.has(day)) out.set(day, []);
            out.get(day)!.push({ person: p, kind: 'birthday', day });
          }
        } catch {}
      }
      if (p.anniversary) {
        try {
          const d = parseISO(p.anniversary);
          if (d.getMonth() === month) {
            const day = d.getDate();
            if (!out.has(day)) out.set(day, []);
            out.get(day)!.push({ person: p, kind: 'anniversary', day });
          }
        } catch {}
      }
    }
    return out;
  }, [people, month]);

  const upcoming = useMemo(() => {
    const list: Celebration[] = [];
    byDay.forEach((cs) => list.push(...cs));
    return list.sort((a, b) => a.day - b.day);
  }, [byDay]);

  // Build grid cells (6 rows × 7 cols)
  const cells: ({ day: number } | null)[] = [];
  for (let i = 0; i < firstDayOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isCurrentMonth =
    view.getMonth() === today.getMonth() && view.getFullYear() === today.getFullYear();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setView((v) => subMonths(v, 1))} hitSlop={8} style={styles.navBtn}>
          <ChevronLeft size={18} color={colors.text} strokeWidth={2} />
        </Pressable>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
            Celebrations
          </Text>
          <Text variant="bodyMedium" style={{ marginTop: 2 }}>
            {format(view, 'MMMM yyyy')}
          </Text>
        </View>
        <Pressable onPress={() => setView((v) => addMonths(v, 1))} hitSlop={8} style={styles.navBtn}>
          <ChevronRight size={18} color={colors.text} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Week day labels */}
      <View style={styles.weekRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Text key={i} variant="caption" color={colors.textFaint} style={styles.weekLabel}>
            {d}
          </Text>
        ))}
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {cells.map((cell, i) => {
          if (!cell) return <View key={i} style={styles.cell} />;
          const events = byDay.get(cell.day) ?? [];
          const hasEvents = events.length > 0;
          const isToday = isCurrentMonth && cell.day === today.getDate();
          const firstPerson = events[0]?.person;
          const cat = firstPerson?.relation ? RELATION_META[firstPerson.relation] : null;
          return (
            <Pressable
              key={i}
              onPress={() => hasEvents && firstPerson ? onPersonTap(firstPerson.id) : undefined}
              style={[
                styles.cell,
                hasEvents && {
                  backgroundColor: cat?.tint ?? colors.accentSoft,
                },
                isToday && { borderColor: colors.text, borderWidth: 1 },
              ]}
            >
              {hasEvents && firstPerson?.photoUri ? (
                <Image source={{ uri: firstPerson.photoUri }} style={styles.cellPhoto} />
              ) : (
                <Text
                  variant="caption"
                  color={hasEvents ? colors.text : colors.textSoft}
                  style={{ fontWeight: hasEvents ? '600' : '400' }}
                >
                  {cell.day}
                </Text>
              )}
              {hasEvents ? (
                <View style={[styles.dot, { backgroundColor: events[0].kind === 'birthday' ? '#E8B4A0' : '#B8A8C9' }]} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* Upcoming list */}
      {upcoming.length > 0 ? (
        <View style={[styles.upcomingWrap, { borderTopColor: colors.hairline }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {upcoming.map((c, i) => {
              const Icon = c.kind === 'birthday' ? Cake : Sparkle;
              return (
                <Pressable
                  key={i}
                  onPress={() => onPersonTap(c.person.id)}
                  style={[styles.upcomingPill, { backgroundColor: colors.bg, borderColor: colors.hairline }]}
                >
                  <Icon size={12} color={c.kind === 'birthday' ? '#C97B6E' : '#8A7AA5'} strokeWidth={1.75} />
                  <Text variant="caption" color={colors.text}>
                    {format(parseISO(c.kind === 'birthday' ? c.person.birthday! : c.person.anniversary!), 'MMM d')}
                  </Text>
                  <Text variant="caption" color={colors.textMuted}>·</Text>
                  <Text variant="caption" color={colors.textSoft} numberOfLines={1} style={{ maxWidth: 100 }}>
                    {c.person.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const CELL_SIZE = 38;

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  weekRow: { flexDirection: 'row', justifyContent: 'space-around' },
  weekLabel: { width: CELL_SIZE, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  cell: {
    width: '13.6%',
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  cellPhoto: { width: '100%', height: '100%' },
  dot: {
    position: 'absolute',
    bottom: 3, right: 3,
    width: 6, height: 6, borderRadius: 3,
  },
  upcomingWrap: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  upcomingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
});
