import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Flame, Star, BookOpen, X } from 'lucide-react-native';
import { Sheet, SheetRef } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { radii, spacing, useColors } from '@/theme';
import * as repo from './repo';

export type StreakSaverSheetRef = {
  present: (habitId: string, habitTitle: string, currentStreak: number, credits: number, onResolved: () => void) => void;
  dismiss: () => void;
};

export const StreakSaverSheet = forwardRef<StreakSaverSheetRef>(function StreakSaverSheet(_, ref) {
  const sheetRef = useRef<SheetRef>(null);
  const router = useRouter();
  const colors = useColors();

  const habitIdRef = useRef('');
  const habitTitleRef = useRef('');
  const creditsRef = useRef(0);
  const currentStreakRef = useRef(0);
  const onResolvedRef = useRef<() => void>(() => {});

  const [saving, setSaving] = useState(false);
  const [credits, setCredits] = useState(0);
  const [streak, setStreak] = useState(0);
  const [title, setTitle] = useState('');

  const present = useCallback(
    (habitId: string, habitTitle: string, currentStreak: number, creds: number, onResolved: () => void) => {
      habitIdRef.current = habitId;
      habitTitleRef.current = habitTitle;
      creditsRef.current = creds;
      currentStreakRef.current = currentStreak;
      onResolvedRef.current = onResolved;
      setCredits(creds);
      setStreak(currentStreak);
      setTitle(habitTitle);
      sheetRef.current?.present();
    },
    [],
  );

  useImperativeHandle(ref, () => ({
    present,
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleUseCredit = async () => {
    setSaving(true);
    try {
      const ok = await repo.useStreakCredit(habitIdRef.current);
      if (ok) {
        setCredits((c) => c - 1);
        onResolvedRef.current();
        sheetRef.current?.dismiss();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleWriteRealization = () => {
    sheetRef.current?.dismiss();
    router.push('/realization');
  };

  const handleSkip = () => {
    sheetRef.current?.dismiss();
  };

  return (
    <Sheet
      ref={sheetRef}
      title="Streak at risk 🔥"
      subtitle={`${title} — ${streak} day streak`}
      snapPoints={['60%']}
    >
      <Text variant="body" color={colors.textSoft} style={{ marginBottom: spacing.lg }}>
        You missed yesterday. Pick how you'd like to save your streak — or let it reset with a fresh start.
      </Text>

      {/* Option 1: Use credit */}
      <Pressable
        onPress={handleUseCredit}
        disabled={credits <= 0 || saving}
        style={({ pressed }) => [
          styles.optionCard,
          { backgroundColor: credits > 0 ? colors.surface : colors.surfaceAlt, borderColor: colors.hairline },
          pressed && credits > 0 && { opacity: 0.8 },
          credits <= 0 && { opacity: 0.5 },
        ]}
      >
        <View style={[styles.optionIcon, { backgroundColor: '#E8D09550' }]}>
          <Star size={22} color="#C4A03A" strokeWidth={1.75} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium">Use a Streak Saver</Text>
          <Text variant="small" color={colors.textMuted}>
            {credits > 0
              ? `You have ${credits} credit${credits !== 1 ? 's' : ''}. Yesterday gets filled automatically.`
              : 'No credits left. Earn them by reaching milestones or writing realizations.'}
          </Text>
        </View>
        {credits > 0 ? (
          <View style={[styles.badge, { backgroundColor: '#E8D095' }]}>
            <Text variant="caption" color="#8A6820">{credits}</Text>
          </View>
        ) : null}
      </Pressable>

      {/* Option 2: Write a realization */}
      <Pressable
        onPress={handleWriteRealization}
        style={({ pressed }) => [
          styles.optionCard,
          { backgroundColor: colors.surface, borderColor: colors.hairline },
          pressed && { opacity: 0.8 },
        ]}
      >
        <View style={[styles.optionIcon, { backgroundColor: '#B8A8C920' }]}>
          <BookOpen size={22} color="#8878A9" strokeWidth={1.75} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium">Write a Realization</Text>
          <Text variant="small" color={colors.textMuted}>
            Reflect on what happened. Saving your realization restores the streak.
          </Text>
        </View>
      </Pressable>

      {/* Option 3: Skip / let it reset */}
      <Pressable
        onPress={handleSkip}
        style={({ pressed }) => [
          styles.optionCard,
          { backgroundColor: colors.surface, borderColor: colors.hairline },
          pressed && { opacity: 0.8 },
        ]}
      >
        <View style={[styles.optionIcon, { backgroundColor: colors.surfaceAlt }]}>
          <X size={22} color={colors.textMuted} strokeWidth={1.75} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium">Reset my streak</Text>
          <Text variant="small" color={colors.textMuted}>
            Fresh start. Streaks are a tool, not a master. You've got this.
          </Text>
        </View>
      </Pressable>

      {/* Credit hint */}
      <View style={[styles.hint, { backgroundColor: colors.surfaceAlt }]}>
        <Flame size={14} color={colors.textMuted} strokeWidth={1.75} />
        <Text variant="caption" color={colors.textMuted} style={{ flex: 1 }}>
          Earn Streak Savers by reaching 7, 30, and 100-day milestones, or by writing realizations.
        </Text>
      </View>
    </Sheet>
  );
});

const styles = StyleSheet.create({
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    marginTop: spacing.sm,
  },
});
