import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Lock, Smartphone, Database, EyeOff, Cloud } from 'lucide-react-native';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { radii, spacing, useColors } from '@/theme';

const PRINCIPLES = [
  {
    icon: Smartphone,
    title: 'Local-first',
    body: "Everything you write — goals, habits, reflections, dreams, hours — lives only on this device, inside the app's private storage. We don't run a server. There's nothing to upload.",
  },
  {
    icon: Database,
    title: 'No accounts, no telemetry',
    body: 'You never sign in. No identity is collected. No usage analytics, no crash reports, no tracking, no advertising IDs. The app makes zero network requests for your data.',
  },
  {
    icon: EyeOff,
    title: 'No third parties',
    body: 'Your name, photo, voice recordings, images, and notes are not shared with anyone. Not Anthropic, not Expo, not Google. They sit in this app and only this app can read them.',
  },
  {
    icon: Cloud,
    title: 'No cloud sync (today)',
    body: 'If you uninstall the app or wipe its storage, your data is gone. If cloud sync is ever added, it will be opt-in, end-to-end encrypted, and clearly labelled. Until then: consider exporting backups when something matters to you.',
  },
  {
    icon: Lock,
    title: 'Permissions',
    body: 'When the app asks for photo, microphone, or notification access — it is so a feature works (attaching an image to a dream, recording a voice note on a realization, ringing a habit reminder). Permissions are never used in the background.',
  },
];

export default function PrivacyScreen() {
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
              Privacy policy
            </Text>
            <Text variant="h1" style={{ marginTop: 2 }}>Yours, only yours</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingBottom: 80 + insets.bottom, gap: spacing.lg }}
          showsVerticalScrollIndicator={false}
        >
          <Text variant="body" color={colors.textSoft}>
            This app holds some of the most personal things in your life — your dreams, what you struggle with, who you love. The privacy of all of it is the entire foundation of how the app is built.
          </Text>

          {PRINCIPLES.map((p) => {
            const I = p.icon;
            return (
              <View key={p.title} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
                <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
                  <I size={18} color={colors.text} strokeWidth={1.75} />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text variant="bodyMedium">{p.title}</Text>
                  <Text variant="body" color={colors.textSoft} style={{ lineHeight: 22 }}>
                    {p.body}
                  </Text>
                </View>
              </View>
            );
          })}

          <View style={[styles.footnote, { backgroundColor: colors.surfaceAlt }]}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              Bottom line
            </Text>
            <Text variant="body" color={colors.textSoft} style={{ marginTop: 6, lineHeight: 22 }}>
              Write freely. This is your quiet room.
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
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  footnote: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginTop: spacing.sm,
  },
});
