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
} from 'lucide-react-native';
import { colors, spacing, palette } from '@/theme';

type Item = { key: string; label: string; desc: string; icon: any; tint: string; route?: string };

const ITEMS: Item[] = [
  { key: 'reflections', label: 'Past reflections', desc: 'Read your daily journal', icon: NotebookPen, tint: palette.creamSoft, route: '/reflections' },
  { key: 'realizations', label: 'Realizations', desc: 'Lessons, insights, quotes', icon: BookOpen, tint: palette.sageSoft, route: '/realizations' },
  { key: 'dreams', label: 'Ambitions & Dreams', desc: 'Your bigger vision', icon: Sparkle, tint: palette.lavenderSoft, route: '/dreams' },
  { key: 'future', label: 'Future Plans', desc: 'Trips, ideas, someday', icon: Compass, tint: palette.skySoft, route: '/future' },
  { key: 'people', label: 'Your People', desc: 'Relationships, intentionally', icon: Users, tint: palette.peachSoft, route: '/people' },
  { key: 'learning', label: 'Learning', desc: 'Skills, topics, progress', icon: GraduationCap, tint: palette.butterSoft, route: '/learning' },
  { key: 'hours', label: 'Hour Tracker', desc: 'Where your day went', icon: Clock, tint: palette.roseSoft, route: '/hours' },
  { key: 'settings', label: 'Settings', desc: 'Theme, profile, privacy, about', icon: Settings, tint: palette.creamSoft, route: '/settings' },
];

export default function MoreScreen() {
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
            return (
              <Card key={item.key} onPress={() => { if (item.route) router.push(item.route as any); }} padding="lg">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: item.tint,
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
