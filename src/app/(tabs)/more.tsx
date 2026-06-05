import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import {
  Clock,
  BarChart2,
  NotebookPen,
  Lightbulb,
  GraduationCap,
  Telescope,
  Users,
  Settings,
  ChevronRight,
  Sparkles,
  MessageCircle,
} from 'lucide-react-native';
import { spacing, radii, useColors } from '@/theme';

// ─── Data ─────────────────────────────────────────────────────────────────────

type RowItem = {
  key: string;
  label: string;
  sub: string;
  icon: React.ComponentType<any>;
  route: string;
};

type SectionDef = {
  title: string;
  caption: string;
  // iconBg is resolved at render time from colors so it adapts to dark/light
  iconBgKey: 'accentSoft' | 'lavenderSoft' | 'butterSoft';
  items: RowItem[];
};

const SECTIONS: SectionDef[] = [
  {
    title: 'AI',
    caption: 'Your personal growth intelligence',
    iconBgKey: 'lavenderSoft',
    items: [
      {
        key: 'chat',
        label: 'Beyond AI',
        sub: 'Ask about your goals, habits, mood, and patterns',
        icon: MessageCircle,
        route: '/chat',
      },
    ],
  },
  {
    title: 'Affirmations',
    caption: 'Words that rewire you',
    iconBgKey: 'lavenderSoft',
    items: [
      {
        key: 'affirmations',
        label: 'Affirmations',
        sub: '10 curated collections · save your favourites · daily pick',
        icon: Sparkles,
        route: '/affirmations',
      },
    ],
  },
  {
    title: 'Tools',
    caption: 'Daily-use trackers',
    iconBgKey: 'accentSoft',
    items: [
      {
        key: 'hours',
        label: 'Hour Tracker',
        sub: 'See where your day actually went',
        icon: Clock,
        route: '/hours',
      },
      {
        key: 'insights',
        label: 'Insights',
        sub: 'Trends, streaks and your story in data',
        icon: BarChart2,
        route: '/insights',
      },
    ],
  },
  {
    title: 'Mind',
    caption: 'Reflection and growth',
    iconBgKey: 'lavenderSoft',
    items: [
      {
        key: 'reflections',
        label: 'Reflections',
        sub: 'Your captured thoughts over time',
        icon: NotebookPen,
        route: '/reflections',
      },
      {
        key: 'realizations',
        label: 'Realizations',
        sub: "Lessons, insights and things you've learnt",
        icon: Lightbulb,
        route: '/realizations',
      },
      {
        key: 'learning',
        label: 'Learning',
        sub: 'Skills, topics and progress',
        icon: GraduationCap,
        route: '/learning',
      },
    ],
  },
  {
    title: 'Life',
    caption: 'The bigger picture',
    iconBgKey: 'butterSoft',
    items: [
      {
        key: 'vision',
        label: 'Vision & Plans',
        sub: 'Dreams, ambitions and future experiences',
        icon: Telescope,
        route: '/vision',
      },
      {
        key: 'people',
        label: 'Your People',
        sub: 'Relationships, intentionally kept',
        icon: Users,
        route: '/people',
      },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function MoreScreen() {
  const colors = useColors();
  const router = useRouter();

  // Section icon background resolved from theme (works in dark + light)
  const iconBgMap: Record<SectionDef['iconBgKey'], string> = {
    accentSoft: colors.accentSoft,
    lavenderSoft: colors.lavenderSoft,
    butterSoft: colors.butterSoft,
  };

  return (
    <Screen>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <View style={styles.pageHeader}>
        <Text variant="display">More</Text>
        <Text variant="body" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
          Everything beyond your daily dashboard.
        </Text>
      </View>

      {/* ── Sections ────────────────────────────────────────────────────── */}
      {SECTIONS.map((section) => {
        const iconBg = iconBgMap[section.iconBgKey];
        return (
          <View key={section.title} style={styles.section}>
            {/* Section label */}
            <Text
              variant="caption"
              color={colors.textMuted}
              style={styles.sectionLabel}
            >
              {section.title.toUpperCase()}
            </Text>

            {/* Grouped card */}
            <View
              style={[
                styles.group,
                { backgroundColor: colors.surface, borderColor: colors.hairline },
              ]}
            >
              {section.items.map((item, idx) => {
                const IconCmp = item.icon;
                const isLast = idx === section.items.length - 1;
                return (
                  <React.Fragment key={item.key}>
                    <Pressable
                      onPress={() => router.push(item.route as any)}
                      style={({ pressed }) => [
                        styles.row,
                        pressed && { backgroundColor: colors.surfaceAlt },
                      ]}
                    >
                      {/* Icon */}
                      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
                        <IconCmp size={18} color={colors.text} strokeWidth={1.75} />
                      </View>

                      {/* Labels */}
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium">{item.label}</Text>
                        <Text
                          variant="small"
                          color={colors.textMuted}
                          style={{ marginTop: 2 }}
                          numberOfLines={1}
                        >
                          {item.sub}
                        </Text>
                      </View>

                      {/* Chevron */}
                      <ChevronRight size={16} color={colors.textFaint} strokeWidth={1.75} />
                    </Pressable>

                    {/* Internal hairline — skip after last item */}
                    {!isLast && (
                      <View
                        style={[
                          styles.rowDivider,
                          { backgroundColor: colors.hairline, marginLeft: 56 + spacing.md },
                        ]}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        );
      })}

      {/* ── Settings — standalone compact row ───────────────────────────── */}
      <View style={styles.section}>
        <View
          style={[
            styles.group,
            { backgroundColor: colors.surface, borderColor: colors.hairline },
          ]}
        >
          <Pressable
            onPress={() => router.push('/settings' as any)}
            style={({ pressed }) => [
              styles.row,
              pressed && { backgroundColor: colors.surfaceAlt },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.surfaceAlt }]}>
              <Settings size={18} color={colors.textSoft} strokeWidth={1.75} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">Settings</Text>
              <Text variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>
                Theme, profile, privacy and about
              </Text>
            </View>
            <ChevronRight size={16} color={colors.textFaint} strokeWidth={1.75} />
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pageHeader: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  section: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: spacing.xs,
  },
  group: {
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 62,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
  },
});
