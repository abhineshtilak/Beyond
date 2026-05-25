import React from 'react';
import { View, ScrollView, StyleSheet, Pressable, Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Heart, Mail, Star, Bug, Lightbulb } from 'lucide-react-native';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { radii, spacing, useColors } from '@/theme';

const VERSION = '1.0.0';
const EMAIL = 'abhinesh.kr.tilak@gmail.com';

const openMail = (subject: string, body?: string) => {
  const params = [`subject=${encodeURIComponent(subject)}`];
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  Linking.openURL(`mailto:${EMAIL}?${params.join('&')}`).catch(() => {});
};

export default function AboutScreen() {
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
              About
            </Text>
            <Text variant="h1" style={{ marginTop: 2 }}>Beyond</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.xxl, paddingBottom: 80 + insets.bottom, gap: spacing.lg }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.heroCard, { backgroundColor: colors.accentSoft }]}>
            <Text variant="display" align="center">Beyond</Text>
            <Text variant="body" color={colors.textSoft} align="center" style={{ marginTop: spacing.sm, lineHeight: 24 }}>
              A quiet, local-first space for goals, habits, journals, dreams — and the slow work of becoming yourself.
            </Text>
            <Text variant="caption" color={colors.textMuted} align="center" style={{ marginTop: spacing.lg, textTransform: 'uppercase' }}>
              Version {VERSION}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              Built for
            </Text>
            <Text variant="h3" style={{ marginTop: 6 }}>One person. You.</Text>
            <Text variant="body" color={colors.textSoft} style={{ marginTop: 6, lineHeight: 23 }}>
              Not for users at scale. Not for engagement metrics. For the one person opening it in a quiet moment and writing what's true.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              Built on
            </Text>
            <Text variant="body" color={colors.textSoft} style={{ marginTop: 6, lineHeight: 23 }}>
              Expo, React Native, SQLite. Open standards, your data stays on your device. No servers, no accounts, no telemetry.
            </Text>
          </View>

          <Pressable
            onPress={() => router.push('/philosophy')}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.hairline },
              pressed && { opacity: 0.92 },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Heart size={14} color={colors.textMuted} strokeWidth={1.75} />
              <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                The philosophy behind it
              </Text>
            </View>
            <Text variant="h3" style={{ marginTop: 6 }}>Read the manifesto →</Text>
            <Text variant="small" color={colors.textSoft} style={{ marginTop: 4 }}>
              Why this exists, and the books that shaped it.
            </Text>
          </Pressable>

          {/* Contact / feedback */}
          <View style={{ gap: spacing.sm }}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase', marginLeft: spacing.xs }}>
              Get in touch
            </Text>

            <ContactRow
              icon={Mail}
              label="Contact us"
              description={EMAIL}
              onPress={() => openMail('Beyond App — Hello')}
            />
            <ContactRow
              icon={Star}
              label="Leave a review"
              description="Enjoying the app? A kind word helps a lot."
              onPress={() => openMail('Beyond App — Review', 'Hi Abhinesh,\n\nI wanted to share some feedback about Beyond:\n\n')}
            />
            <ContactRow
              icon={Bug}
              label="Report a bug"
              description="Something broken? Tell me exactly what happened."
              onPress={() => openMail('Beyond App — Bug Report', 'Hi Abhinesh,\n\nI found a bug:\n\nWhat I did:\n\nWhat happened:\n\nWhat I expected:\n\nDevice / OS:\n')}
            />
            <ContactRow
              icon={Lightbulb}
              label="Request a feature"
              description="Got an idea? I genuinely read every message."
              onPress={() => openMail('Beyond App — Feature Request', 'Hi Abhinesh,\n\nI have an idea for Beyond:\n\n')}
            />
          </View>

          <View style={[styles.signature, { borderTopColor: colors.hairline }]}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              Developed by
            </Text>
            <Text variant="h2" style={{ marginTop: 6 }}>Abhinesh</Text>
            <Text variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
              2026
            </Text>
            <Text variant="small" color={colors.textSoft} style={{ marginTop: spacing.md, lineHeight: 22 }}>
              Made with care, slowly, over the kind of evenings that turn into mornings.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function ContactRow({
  icon: IconCmp,
  label,
  description,
  onPress,
}: {
  icon: any;
  label: string;
  description: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.contactRow,
        { backgroundColor: colors.surface, borderColor: colors.hairline },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={[styles.contactIcon, { backgroundColor: colors.accentSoft }]}>
        <IconCmp size={16} color={colors.textSoft} strokeWidth={1.75} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">{label}</Text>
        <Text variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>
          {description}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.xxl, paddingTop: spacing.md, paddingBottom: spacing.md,
  },
  heroCard: {
    padding: spacing.xxl,
    borderRadius: radii.xxl,
    alignItems: 'center',
  },
  card: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  signature: {
    paddingTop: spacing.xxl,
    marginTop: spacing.md,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});