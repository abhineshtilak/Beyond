import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Flame, Target, TrendingUp, BookOpen, Lightbulb, Sparkles } from 'lucide-react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { spacing, radii, fonts, useColors } from '@/theme';
import { computeInsights, type InsightsData } from '@/lib/insights';
import { ProgressIntelligenceCard } from '@/components/ProgressIntelligenceCard';

const SCREEN_W = Dimensions.get('window').width;
// screen horizontal padding (xxl*2) + Card default padding (xl*2)
const CHART_PAD = spacing.xxl * 2 + spacing.xl * 2;

// ─── Skeleton placeholder while loading ──────────────────────────────────────
function Skeleton() {
  const colors = useColors();
  return (
    <View style={{ gap: spacing.lg }}>
      {[1, 2, 3].map((k) => (
        <View
          key={k}
          style={{ height: 120, borderRadius: radii.xl, backgroundColor: colors.surfaceAlt }}
        />
      ))}
    </View>
  );
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────
function BarChart({
  data,
  labelKey,
  countKey,
  color,
  height = 80,
}: {
  data: { [k: string]: any }[];
  labelKey: string;
  countKey: string;
  color: string;
  height?: number;
}) {
  const colors = useColors();
  if (data.length === 0) return null;

  const chartW = SCREEN_W - CHART_PAD;
  const barArea = height - 20; // reserve bottom for labels
  const max = Math.max(...data.map((d) => d[countKey] as number), 1);
  const barW = Math.floor((chartW - (data.length - 1) * 4) / data.length);

  return (
    <Svg width={chartW} height={height + 4}>
      {data.map((d, i) => {
        const val = d[countKey] as number;
        const barH = Math.max(val === 0 ? 2 : (val / max) * barArea, 2);
        const x = i * (barW + 4);
        const y = barArea - barH;
        const label = (d[labelKey] as string).slice(0, 3);
        return (
          <G key={i}>
            <Rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={3}
              fill={val > 0 ? color : colors.hairline}
              opacity={val > 0 ? 0.85 : 1}
            />
            <SvgText
              x={x + barW / 2}
              y={height + 2}
              textAnchor="middle"
              fontSize={9}
              fontFamily={fonts.sans}
              fill={colors.textFaint}
            >
              {label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ label, value, tint }: { label: string; value: string | number; tint: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statPill, { backgroundColor: tint }]}>
      <Text style={{ fontFamily: fonts.serifBold, fontSize: 28, color: colors.text }}>
        {value}
      </Text>
      <Text variant="caption" color={colors.textSoft} style={{ textTransform: 'uppercase', marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

// ─── Mood bar ─────────────────────────────────────────────────────────────────
const MOOD_COLORS: Record<string, string> = {
  great: '#A8B89F',
  good: '#9EB7C9',
  ok: '#E8D095',
  low: '#E8B4A0',
  bad: '#D8A4A4',
};
const MOOD_LABELS: Record<string, string> = {
  great: 'Great',
  good: 'Good',
  ok: 'Okay',
  low: 'Low',
  bad: 'Hard',
};

function MoodBars({ data }: { data: { mood: string; count: number }[] }) {
  const colors = useColors();
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return (
    <Text variant="body" color={colors.textMuted}>No mood data in the last 30 days.</Text>
  );

  return (
    <View style={{ gap: spacing.sm }}>
      {data.map((d) => {
        const pct = total > 0 ? d.count / total : 0;
        const barColor = MOOD_COLORS[d.mood] ?? colors.accent;
        return (
          <View key={d.mood} style={styles.moodRow}>
            <Text variant="smallMedium" color={colors.textSoft} style={{ width: 44 }}>
              {MOOD_LABELS[d.mood] ?? d.mood}
            </Text>
            <View style={[styles.moodTrack, { backgroundColor: colors.hairline }]}>
              <View
                style={[
                  styles.moodFill,
                  { width: `${Math.round(pct * 100)}%`, backgroundColor: barColor },
                ]}
              />
            </View>
            <Text variant="caption" color={colors.textMuted} style={{ width: 28, textAlign: 'right' }}>
              {d.count}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Habit leaderboard row ────────────────────────────────────────────────────
function HabitRow({ stat, rank }: { stat: InsightsData['habitStats'][0]; rank: number }) {
  const colors = useColors();
  return (
    <View style={styles.habitRow}>
      <View style={[styles.habitDot, { backgroundColor: stat.color + '40', borderColor: stat.color }]}>
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: 11, color: stat.color }}>
          {rank}
        </Text>
      </View>
      <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>{stat.title}</Text>
      <View style={styles.habitMeta}>
        <Text variant="smallMedium" color={colors.textSoft}>
          {stat.streak > 0 ? `🔥 ${stat.streak}d` : '—'}
        </Text>
        <Text variant="caption" color={colors.textMuted} style={{ width: 42, textAlign: 'right' }}>
          {stat.rate30}% / 30d
        </Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function InsightsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      computeInsights()
        .then(setData)
        .catch((e) => console.warn('insights err', e))
        .finally(() => setLoading(false));
    }, []),
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} onPress={() => router.back()} bg={colors.surface} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              Your data
            </Text>
            <Text variant="h1" style={{ marginTop: 2 }}>Insights</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
          showsVerticalScrollIndicator={false}
        >
          {loading || !data ? (
            <Skeleton />
          ) : (
            <>
              {/* ── Writing summary ────────────────────────────────────────── */}
              <Section title="Writing" icon={BookOpen} color={colors.sky}>
                <View style={styles.pillRow}>
                  <StatPill label="Total entries" value={data.journalTotal} tint={colors.skySoft} />
                  <StatPill label="Current streak" value={data.currentStreak} tint={colors.accentSoft} />
                  <StatPill label="Longest streak" value={data.longestStreak} tint={colors.butterSoft} />
                </View>

                {data.journalTotal > 0 ? (
                  <View style={{ marginTop: spacing.lg }}>
                    <Text variant="caption" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
                      ENTRIES PER WEEK — LAST 12 WEEKS
                    </Text>
                    <BarChart
                      data={data.journalWeeks.map((w, i) => ({ label: `W${i + 1}`, count: w.count }))}
                      labelKey="label"
                      countKey="count"
                      color={colors.sky}
                    />
                  </View>
                ) : (
                  <Text variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
                    Start writing to see your trends here.
                  </Text>
                )}
              </Section>

              {/* ── Best writing day ────────────────────────────────────────── */}
              {data.journalTotal > 0 ? (
                <Section title="Best writing day" icon={TrendingUp} color={colors.sage}>
                  <BarChart
                    data={data.journalBestDay}
                    labelKey="dayName"
                    countKey="count"
                    color={colors.sage}
                    height={72}
                  />
                </Section>
              ) : null}

              {/* ── Mood ───────────────────────────────────────────────────── */}
              <Section title="Mood — last 30 days" icon={Flame} color={colors.peach}>
                <MoodBars data={data.moodLast30} />
              </Section>

              {/* ── Habits ─────────────────────────────────────────────────── */}
              {data.habitStats.length > 0 ? (
                <Section title="Habit leaderboard" icon={Flame} color={colors.accent}>
                  <View style={{ gap: spacing.sm }}>
                    {data.habitStats.slice(0, 8).map((stat, i) => (
                      <HabitRow key={stat.id} stat={stat} rank={i + 1} />
                    ))}
                  </View>
                </Section>
              ) : null}

              {/* ── Goals ──────────────────────────────────────────────────── */}
              <Section title="Goals" icon={Target} color={colors.lavender}>
                {data.goalsTotal === 0 ? (
                  <Text variant="body" color={colors.textMuted}>No goals yet. Set one from the Goals tab.</Text>
                ) : (
                  <View style={styles.pillRow}>
                    <StatPill label="Active" value={data.goalsActive} tint={colors.accentSoft} />
                    <StatPill label="Done" value={data.goalsCompleted} tint={colors.lavenderSoft} />
                    <StatPill label="Total" value={data.goalsTotal} tint={colors.surfaceAlt} />
                  </View>
                )}
              </Section>

              {/* ── Realizations ───────────────────────────────────────────── */}
              <Section title="Realizations captured" icon={Lightbulb} color={colors.butter}>
                <Text style={{ fontFamily: fonts.serif, fontSize: 48, color: colors.text, lineHeight: 56 }}>
                  {data.realizationsTotal}
                </Text>
                <Text variant="body" color={colors.textMuted}>
                  {data.realizationsTotal === 0
                    ? 'Every insight you save is a lesson compounded over time.'
                    : data.realizationsTotal < 10
                    ? 'Every one of these is gold. Keep going.'
                    : data.realizationsTotal < 50
                    ? 'You\'re building a real personal library of wisdom.'
                    : 'This is a remarkable collection. You\'re a thoughtful person.'}
                </Text>
              </Section>

              {/* ── AI Pattern Intelligence ─────────────────────────────────── */}
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Sparkles size={14} color={'#9B87C0'} strokeWidth={2} />
                  <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                    AI Patterns
                  </Text>
                </View>
                <ProgressIntelligenceCard />
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function Section({
  title,
  icon: Icon,
  color,
  children,
}: {
  title: string;
  icon: any;
  color: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Icon size={14} color={color} strokeWidth={2} />
        <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
          {title}
        </Text>
      </View>
      <Card>
        {children}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.xxl,
    gap: spacing.lg,
    paddingTop: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.xs,
  },

  // pills
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statPill: {
    flex: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },

  // mood
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  moodTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  moodFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 4,
  },

  // habit
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  habitDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitMeta: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
