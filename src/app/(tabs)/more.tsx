import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import {
  BookOpen,
  Compass,
  Users,
  Sparkle,
  GraduationCap,
  Clock,
  Settings,
  NotebookPen,
  BarChart2,
} from 'lucide-react-native';
import { spacing, useColors, useTheme, resolveTint } from '@/theme';

type Item = { key: string; label: string; desc: string; icon: any; tint: string; route?: string };

// Light-palette soft-tint hex values — resolveTint() maps them per theme.
const ITEMS: Item[] = [
  { key: 'insights',    label: 'Insights',          desc: 'Trends, streaks, and your story in data', icon: BarChart2,     tint: '#DCE5EA', route: '/insights' },
  { key: 'reflections', label: 'Past reflections',  desc: 'Read your daily journal',                  icon: NotebookPen,   tint: '#EFE7DC', route: '/reflections' },
  { key: 'realizations',label: 'Realizations',      desc: 'Lessons, insights, quotes',                icon: BookOpen,      tint: '#E3E8DE', route: '/realizations' },
  { key: 'dreams',      label: 'Ambitions & Dreams',desc: 'Your bigger vision',                       icon: Sparkle,       tint: '#E7E0EC', route: '/dreams' },
  { key: 'future',      label: 'Future Plans',      desc: 'Trips, ideas, someday',                    icon: Compass,       tint: '#DCE5EA', route: '/future' },
  { key: 'people',      label: 'Your People',       desc: 'Relationships, intentionally',             icon: Users,         tint: '#F1DDD4', route: '/people' },
  { key: 'learning',    label: 'Learning',          desc: 'Skills, topics, progress',                 icon: GraduationCap, tint: '#EEE4C8', route: '/learning' },
  { key: 'hours',       label: 'Hour Tracker',      desc: 'Where your day went',                      icon: Clock,         tint: '#EBDADA', route: '/hours' },
  { key: 'settings',    label: 'Settings',          desc: 'Theme, profile, privacy, about',           icon: Settings,      tint: '#EFE7DC', route: '/settings' },
];

export default function MoreScreen() {
  const colors = useColors();
  const { resolved } = useTheme();
  const router = useRouter();
  return (
    <Screen>
      <View style={{ paddingTop: spacing.xl, gap: spacing.lg }}>
        <Text variant="display">More</Text>
        <Text variant="body" color={colors.textSoft}>
          The deeper layers of your life.
        </Text>

        <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
          {ITEMS.map((item) => {
            const IconCmp = item.icon;
            const tintBg = resolveTint(item.tint, resolved) ?? colors.surfaceAlt;
            return (
              <Card
                key={item.key}
                onPress={() => { if (item.route) router.push(item.route as any); }}
                padding="lg"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: tintBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon icon={IconCmp} size={22} color={colors.text} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium">{item.label}</Text>
                    <Text variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>
                      {item.desc}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}
