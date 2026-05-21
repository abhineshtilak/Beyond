import React, { useState } from 'react';
import { View, ScrollView, Pressable, Image, StyleSheet, Alert } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  User,
  Sun,
  Moon,
  Monitor,
  Bell,
  Lock,
  Info,
  Heart,
  Download,
  Upload,
} from 'lucide-react-native';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { Icon } from '@/components/Icon';
import { Chip } from '@/components/Chip';
import { radii, spacing, useColors, useTheme } from '@/theme';
import { isExpoGo } from '@/lib/notifications';
import { useProfileStore } from '@/features/profile/store';
import { ageFromBirthday } from '@/features/profile/repo';
import { exportToFile, importFromFile, isBackupAvailable } from '@/lib/backup';
import { confirm } from '@/lib/confirm';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { mode, setMode } = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const refresh = useProfileStore((s) => s.refresh);

  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  useFocusEffect(React.useCallback(() => { refresh(); }, [refresh]));

  const handleExport = async () => {
    if (busy) return;
    setBusy('export');
    try {
      const res = await exportToFile();
      if (!res.ok && res.reason && res.reason !== 'cancelled') {
        Alert.alert('Could not export', res.reason);
      }
    } finally {
      setBusy(null);
    }
  };

  const handleImport = async () => {
    if (busy) return;
    const ok = await confirm({
      title: 'Restore from backup?',
      message: 'This will REPLACE your current data with the backup. Cannot be undone.',
      confirmLabel: 'Restore',
      destructive: true,
    });
    if (!ok) return;
    setBusy('import');
    try {
      const res = await importFromFile();
      if (res.ok && res.summary) {
        Alert.alert(
          'Restored',
          `${res.summary.rowCount} entries and ${res.summary.fileCount} files restored. Reopen the app for everything to refresh.`,
        );
      } else if (res.reason && res.reason !== 'cancelled') {
        Alert.alert('Could not restore', res.reason);
      }
    } finally {
      setBusy(null);
    }
  };

  const age = ageFromBirthday(profile.birthday);
  const initials = profile.name?.trim()
    ? profile.name.trim().split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} onPress={() => router.back()} bg={colors.surface} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              Preferences
            </Text>
            <Text variant="h1" style={{ marginTop: 2 }}>Settings</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingBottom: 80 + insets.bottom, gap: spacing.lg }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile card */}
          <Pressable
            onPress={() => router.push('/profile')}
            style={({ pressed }) => [
              styles.profileCard,
              { backgroundColor: colors.surface, borderColor: colors.hairline },
              pressed && { opacity: 0.92 },
            ]}
          >
            <View style={[styles.profileAvatar, { backgroundColor: colors.accentSoft }]}>
              {profile.photoUri ? (
                <Image source={{ uri: profile.photoUri }} style={styles.profileAvatarImg} />
              ) : (
                <Text variant="h3" color={colors.textSoft}>{initials}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h3">{profile.name?.trim() || 'Set up your profile'}</Text>
              <Text variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>
                {[profile.pronouns, age !== null ? `${age} years` : null].filter(Boolean).join(' · ') || 'Name, photo, birthday'}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.75} />
          </Pressable>

          {/* Appearance */}
          <Section title="Appearance">
            <View style={{ gap: spacing.sm }}>
              <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                Theme
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <ThemeChip
                  label="Light"
                  icon={Sun}
                  selected={mode === 'light'}
                  onPress={() => setMode('light')}
                />
                <ThemeChip
                  label="Dark"
                  icon={Moon}
                  selected={mode === 'dark'}
                  onPress={() => setMode('dark')}
                />
                <ThemeChip
                  label="System"
                  icon={Monitor}
                  selected={mode === 'system'}
                  onPress={() => setMode('system')}
                />
              </View>
              <Text variant="small" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
                Dark theme is soft and warm — easy on tired eyes.
              </Text>
            </View>
          </Section>

          {/* Notifications */}
          <Section title="Notifications">
            <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
              <Bell size={18} color={colors.textSoft} strokeWidth={1.75} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium">
                  {isExpoGo ? 'Limited in Expo Go' : 'Notifications ready'}
                </Text>
                <Text variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>
                  {isExpoGo
                    ? 'Reminders are saved but won\'t fire here. Use a development build to test alarms.'
                    : 'Your habit, task, and learning reminders will ring on time.'}
                </Text>
              </View>
            </View>
          </Section>

          {/* Backup */}
          <Section title="Backup">
            {!isBackupAvailable() ? (
              <View style={[styles.row, { backgroundColor: colors.surfaceAlt, borderColor: colors.hairline }]}>
                <Download size={18} color={colors.textMuted} strokeWidth={1.75} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium">Backup needs a rebuilt dev client</Text>
                  <Text variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>
                    Run `eas build --profile development --platform android`, install the new APK, then come back here. Your data is safe meanwhile.
                  </Text>
                </View>
              </View>
            ) : null}
            <Pressable
              onPress={handleExport}
              disabled={!!busy}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: colors.surface, borderColor: colors.hairline },
                (pressed || busy === 'export') && { opacity: 0.7 },
              ]}
            >
              <Download size={18} color={colors.textSoft} strokeWidth={1.75} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium">
                  {busy === 'export' ? 'Preparing backup...' : 'Export backup'}
                </Text>
                <Text variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>
                  Save your entries, voice notes, and photos as a file. Share it to Google Drive, iCloud, or anywhere.
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={handleImport}
              disabled={!!busy}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: colors.surface, borderColor: colors.hairline },
                (pressed || busy === 'import') && { opacity: 0.7 },
              ]}
            >
              <Upload size={18} color={colors.textSoft} strokeWidth={1.75} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium">
                  {busy === 'import' ? 'Restoring...' : 'Restore from backup'}
                </Text>
                <Text variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>
                  Pick a Beyond backup file from your device. Replaces current data.
                </Text>
              </View>
            </Pressable>
          </Section>

          {/* About / Privacy */}
          <Section title="About">
            <NavRow
              icon={Lock}
              label="Privacy"
              description="What we save, where it lives"
              onPress={() => router.push('/privacy')}
            />
            <NavRow
              icon={Info}
              label="About this app"
              description="Version, what it's for"
              onPress={() => router.push('/about')}
            />
            <NavRow
              icon={Heart}
              label="The philosophy"
              description="Why this app exists"
              onPress={() => router.push('/philosophy')}
            />
          </Section>

          <View style={{ alignItems: 'center', paddingVertical: spacing.xxl, gap: 4 }}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              Developed by
            </Text>
            <Text variant="bodyMedium">Abhinesh · 2026</Text>
            <Text variant="caption" color={colors.textFaint} style={{ marginTop: 4 }}>
              v1.0.0
            </Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase', marginLeft: spacing.xs }}>
        {title}
      </Text>
      <View style={{ gap: spacing.sm }}>{children}</View>
    </View>
  );
}

function NavRow({ icon, label, description, onPress }: { icon: any; label: string; description?: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.hairline },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Icon icon={icon} size={18} color={colors.textSoft} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">{label}</Text>
        {description ? (
          <Text variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>
            {description}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={16} color={colors.textMuted} strokeWidth={1.75} />
    </Pressable>
  );
}

function ThemeChip({ label, icon: IconCmp, selected, onPress }: { label: string; icon: any; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: spacing.md,
          borderRadius: radii.lg,
          borderWidth: 1,
          backgroundColor: selected ? colors.text : colors.surface,
          borderColor: selected ? colors.text : colors.hairline,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <IconCmp size={16} color={selected ? colors.bg : colors.text} strokeWidth={1.75} />
      <Text variant="smallMedium" color={selected ? colors.bg : colors.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.xxl, paddingTop: spacing.md, paddingBottom: spacing.md,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  profileAvatar: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  profileAvatarImg: { width: '100%', height: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
});
