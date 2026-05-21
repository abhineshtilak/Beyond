import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Quote as QuoteIcon } from 'lucide-react-native';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { radii, spacing, useColors } from '@/theme';

const PRINCIPLES = [
  {
    pretitle: 'Principle one',
    title: 'Write things down.',
    body:
      "What is not written is forgotten. What is forgotten cannot be revisited, refined, or measured. The single most underrated act of self-development is putting a thought on paper. Goals, fears, lessons, gratitudes — all of it. The page becomes the second brain.",
    quoteAuthor: 'Zig Ziglar',
    quote: '"A goal properly set is halfway reached."',
  },
  {
    pretitle: 'Principle two',
    title: 'Clarity creates direction.',
    body:
      "A vague goal produces a vague life. \"Get fit\" is a wish. \"Run a half-marathon by October 31st\" is a goal. Specificity is what turns desire into a direction. The mind needs targets it can actually aim at.",
    quoteAuthor: 'Tony Robbins',
    quote: '"Setting goals is the first step in turning the invisible into the visible."',
  },
  {
    pretitle: 'Principle three',
    title: 'Identity precedes habit.',
    body:
      "We don't become what we want — we become what we repeatedly do. And we repeatedly do what we believe ourselves to be. Change the story you tell yourself about yourself, and behaviour follows. A reader writes. A runner runs. A patient person practices patience.",
    quoteAuthor: 'James Allen',
    quote: '"As a man thinketh in his heart, so is he."',
  },
  {
    pretitle: 'Principle four',
    title: 'Reflect daily, gently.',
    body:
      "The unexamined day repeats. A short evening reflection — what was good, what to avoid, what you learned — compounds into wisdom over months. Not as judgment. As noticing. The same way a gardener notices their garden.",
    quoteAuthor: 'Stephen Covey',
    quote: '"Sharpen the saw."',
  },
  {
    pretitle: 'Principle five',
    title: 'Show up for your people.',
    body:
      "We tend to manage work seriously and relationships randomly. Reverse it. The people in your life are not background — they are the foreground. Track who they are, what they\'re going through, and how you can be present for them.",
    quoteAuthor: 'Anonymous',
    quote: '"Most people work all their lives at jobs they hate, with people they love."',
  },
  {
    pretitle: 'Principle six',
    title: 'Privacy makes honesty possible.',
    body:
      "If you suspect anyone might read this, you'll never write the real thing. This app collects nothing, sends nothing, syncs nothing. Your words stay on your device. That privacy is what makes honest reflection possible.",
    quoteAuthor: '',
    quote: '',
  },
];

export default function PhilosophyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} onPress={() => router.back()} bg={colors.surface} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              Why this exists
            </Text>
            <Text variant="h1" style={{ marginTop: 2 }}>The philosophy</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingBottom: 80 + insets.bottom, gap: spacing.xl }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.openingCard, { backgroundColor: colors.accentSoft }]}>
            <Text variant="h2" style={{ lineHeight: 30 }}>
              This is not a productivity app.
            </Text>
            <Text variant="body" color={colors.textSoft} style={{ marginTop: spacing.md, lineHeight: 24 }}>
              It's a second brain for who you want to become. A quiet room to think, to write, to plan — and to look at honestly. The principles below shaped every screen.
            </Text>
          </View>

          {PRINCIPLES.map((p, i) => (
            <View key={i} style={[styles.principleCard, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
              <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                {p.pretitle}
              </Text>
              <Text variant="h2" style={{ marginTop: 6, lineHeight: 30 }}>{p.title}</Text>
              <Text variant="body" color={colors.textSoft} style={{ marginTop: spacing.sm, lineHeight: 24 }}>
                {p.body}
              </Text>
              {p.quote ? (
                <View style={[styles.quoteBlock, { borderLeftColor: colors.hairline }]}>
                  <QuoteIcon size={14} color={colors.textMuted} strokeWidth={1.75} />
                  <View style={{ flex: 1 }}>
                    <Text variant="h3" color={colors.textSoft} style={{ fontStyle: 'italic', lineHeight: 26 }}>
                      {p.quote}
                    </Text>
                    {p.quoteAuthor ? (
                      <Text variant="caption" color={colors.textMuted} style={{ marginTop: 6, textTransform: 'uppercase' }}>
                        — {p.quoteAuthor}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </View>
          ))}

          <View style={[styles.closing, { borderTopColor: colors.hairline }]}>
            <Text variant="h2" align="center" style={{ lineHeight: 30 }}>
              Build your life on purpose.
            </Text>
            <Text variant="body" color={colors.textSoft} align="center" style={{ marginTop: spacing.md, lineHeight: 23 }}>
              The rest takes care of itself.
            </Text>
            <Text variant="caption" color={colors.textMuted} align="center" style={{ marginTop: spacing.xxl, textTransform: 'uppercase' }}>
              Developed by Abhinesh · 2026
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.xxl, paddingTop: spacing.md, paddingBottom: spacing.md,
  },
  openingCard: {
    padding: spacing.xl,
    borderRadius: radii.xxl,
  },
  principleCard: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  quoteBlock: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingLeft: spacing.lg,
    borderLeftWidth: 2,
  },
  closing: {
    paddingTop: spacing.xxxl,
    marginTop: spacing.md,
    borderTopWidth: 1,
  },
});
