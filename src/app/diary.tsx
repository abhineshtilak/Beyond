import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Check } from 'lucide-react-native';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { Input } from '@/components/Input';
import { IconButton } from '@/components/IconButton';
import { MoodPicker } from '@/features/diary/MoodPicker';
import { useDiaryStore } from '@/features/diary/store';
import * as diaryRepo from '@/features/diary/repo';
import type { DiaryEntry, Mood } from '@/features/diary/types';
import { colors, radii, spacing, shadows } from '@/theme';
import { ymd } from '@/lib/date';

const PROMPTS: { key: keyof Pick<DiaryEntry, 'good' | 'bad' | 'learned' | 'progress' | 'happy'>; label: string; placeholder: string }[] = [
  { key: 'good', label: 'A good thing I did today', placeholder: 'Something you’re proud of, however small.' },
  { key: 'bad', label: 'Something to avoid next time', placeholder: 'Honest, not harsh.' },
  { key: 'learned', label: 'What I learned today', placeholder: 'A skill, a person, an idea.' },
  { key: 'progress', label: 'Progress I made', placeholder: 'Even an inch counts.' },
  { key: 'happy', label: 'What made me happy', placeholder: 'A moment worth keeping.' },
];

function dateLabel(d: string) {
  const parsed = parseISO(d);
  if (isToday(parsed)) return 'Today';
  if (isYesterday(parsed)) return 'Yesterday';
  return format(parsed, 'EEEE, MMMM d');
}

export default function DiaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date?: string }>();
  const targetDate = params.date || ymd();
  const isTodayEntry = targetDate === ymd();

  const todayEntry = useDiaryStore((s) => s.today);
  const loadToday = useDiaryStore((s) => s.loadToday);
  const patchToday = useDiaryStore((s) => s.patch);

  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [summary, setSummary] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [mood, setMood] = useState<Mood | null>(null);
  const [saving, setSaving] = useState(false);

  const hydrate = useCallback((e: DiaryEntry | null) => {
    setEntry(e);
    setSummary(e?.summary ?? '');
    setMood(e?.mood ?? null);
    setValues({
      good: e?.good ?? '',
      bad: e?.bad ?? '',
      learned: e?.learned ?? '',
      progress: e?.progress ?? '',
      happy: e?.happy ?? '',
    });
  }, []);

  useEffect(() => {
    (async () => {
      if (isTodayEntry) {
        await loadToday();
      }
      const e = await diaryRepo.getEntry(targetDate);
      hydrate(e);
    })();
  }, [targetDate, isTodayEntry, loadToday, hydrate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const patch = {
        summary: summary.trim() || null,
        good: values.good?.trim() || null,
        bad: values.bad?.trim() || null,
        learned: values.learned?.trim() || null,
        progress: values.progress?.trim() || null,
        happy: values.happy?.trim() || null,
        mood,
      };
      if (isTodayEntry) {
        await patchToday(patch);
      } else {
        await diaryRepo.upsertEntry(targetDate, patch);
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} onPress={() => router.back()} bg={colors.surface} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              Reflection · {dateLabel(targetDate)}
            </Text>
            <Text variant="h1" style={{ marginTop: 2 }}>How was your day?</Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            <View style={styles.section}>
              <Text variant="caption" color={colors.textMuted} style={styles.label}>Mood</Text>
              <MoodPicker value={mood} onChange={setMood} />
            </View>

            <Input
              label="How was your day?"
              placeholder="Tell yourself..."
              value={summary}
              onChangeText={setSummary}
              multiline
            />

            {PROMPTS.map((p) => (
              <Input
                key={p.key}
                label={p.label}
                placeholder={p.placeholder}
                value={values[p.key]}
                onChangeText={(v) => setValues((s) => ({ ...s, [p.key]: v }))}
                multiline
              />
            ))}
          </ScrollView>

          <View style={[styles.saveBar, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && { opacity: 0.85 },
                saving && { opacity: 0.6 },
              ]}
            >
              <Check size={18} color={colors.bg} strokeWidth={2.5} />
              <Text variant="bodyMedium" color={colors.bg}>
                {saving ? 'Saving...' : 'Save reflection'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  scroll: {
    paddingHorizontal: spacing.xxl,
    gap: spacing.lg,
  },
  section: { gap: spacing.sm },
  label: { textTransform: 'uppercase' },
  saveBar: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    backgroundColor: colors.bg,
  },
  saveBtn: {
    backgroundColor: colors.text,
    paddingVertical: spacing.lg,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.soft,
  },
});
