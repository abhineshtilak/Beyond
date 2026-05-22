import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Clock, BookOpen, Lightbulb, Moon, NotebookPen } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { spacing, radii, fonts, useColors } from '@/theme';
import type { OnThisDayEntry } from '@/lib/onThisDay';

type Props = {
  entries: OnThisDayEntry[];
};

const KIND_META: Record<
  OnThisDayEntry['kind'],
  { label: string; icon: any; route: string | null }
> = {
  diary: { label: 'Reflection', icon: NotebookPen, route: '/reflections' },
  realization: { label: 'Realization', icon: Lightbulb, route: '/realizations' },
  journal: { label: 'Journal', icon: BookOpen, route: null }, // open journal tab
  dream: { label: 'Dream', icon: Moon, route: '/dreams' },
};

const YEARS_LABEL: Record<number, string> = {
  1: '1 year ago',
  2: '2 years ago',
  3: '3 years ago',
  5: '5 years ago',
};

export function OnThisDayCard({ entries }: Props) {
  const colors = useColors();
  const router = useRouter();

  if (entries.length === 0) return null;

  // Group by yearsAgo, keep order
  const groups: { yearsAgo: number; items: OnThisDayEntry[] }[] = [];
  for (const entry of entries) {
    const g = groups.find((x) => x.yearsAgo === entry.yearsAgo);
    if (g) {
      if (g.items.length < 3) g.items.push(entry); // cap per-year
    } else {
      groups.push({ yearsAgo: entry.yearsAgo, items: [entry] });
    }
  }

  return (
    <Card tint={colors.lavenderSoft} flat>
      <View style={styles.head}>
        <Clock size={14} color={colors.lavender} strokeWidth={2} />
        <Text variant="caption" color={colors.lavender} style={{ textTransform: 'uppercase', fontFamily: fonts.sansMedium }}>
          On this day
        </Text>
      </View>

      <View style={styles.groups}>
        {groups.map((g, gi) => (
          <View key={g.yearsAgo} style={[styles.group, gi > 0 && { borderTopWidth: 1, borderTopColor: colors.lavender + '30', paddingTop: spacing.md }]}>
            <Text variant="caption" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
              {YEARS_LABEL[g.yearsAgo] ?? `${g.yearsAgo} years ago`}
            </Text>
            {g.items.map((item) => {
              const meta = KIND_META[item.kind];
              const KindIcon = meta.icon;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    if (meta.route) router.push(meta.route as any);
                  }}
                  style={({ pressed }) => [
                    styles.item,
                    { backgroundColor: colors.lavender + '15' },
                    pressed && meta.route && { opacity: 0.75 },
                  ]}
                >
                  <KindIcon size={14} color={colors.lavender} strokeWidth={2} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" color={colors.lavender} style={{ marginBottom: 2 }}>
                      {meta.label.toUpperCase()}
                    </Text>
                    <Text variant="body" color={colors.textSoft} numberOfLines={3}>
                      {item.snippet || '—'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  groups: {
    gap: spacing.md,
  },
  group: {
    gap: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
});
