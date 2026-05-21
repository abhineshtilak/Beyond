import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  ScrollView,
  Keyboard,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Check, Camera, Cake } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { InlineCalendar } from '@/components/InlineCalendar';
import { radii, spacing, typeScale, useColors } from '@/theme';
import { useProfileStore } from '@/features/profile/store';
import { ageFromBirthday } from '@/features/profile/repo';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const profile = useProfileStore((s) => s.profile);
  const refresh = useProfileStore((s) => s.refresh);
  const update = useProfileStore((s) => s.update);

  const [name, setName] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [birthday, setBirthday] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showCal, setShowCal] = useState(false);
  const [saving, setSaving] = useState(false);
  const lastSavedRef = useRef('');

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    setName(profile.name ?? '');
    setPronouns(profile.pronouns ?? '');
    setBirthday(profile.birthday);
    setPhotoUri(profile.photoUri);
    lastSavedRef.current = JSON.stringify([profile.name, profile.pronouns, profile.birthday, profile.photoUri]);
  }, [profile]);

  const snapshot = () => JSON.stringify([name, pronouns, birthday, photoUri]);

  const save = useCallback(async (silent = false) => {
    if (snapshot() === lastSavedRef.current) return;
    if (!silent) setSaving(true);
    try {
      await update({
        name: name.trim() || null,
        pronouns: pronouns.trim() || null,
        birthday,
        photoUri,
      });
      lastSavedRef.current = snapshot();
    } finally {
      if (!silent) setSaving(false);
    }
  }, [name, pronouns, birthday, photoUri, update]);

  useEffect(() => {
    const t = setTimeout(() => save(true), 1500);
    return () => clearTimeout(t);
  }, [name, pronouns, birthday, photoUri, save]);

  const handleBack = async () => {
    Keyboard.dismiss();
    await save(true);
    router.back();
  };

  const handleDone = async () => {
    Keyboard.dismiss();
    await save();
    router.back();
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.[0]) setPhotoUri(res.assets[0].uri);
  };

  const initials = name.trim()
    ? name.trim().split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const age = ageFromBirthday(birthday);
  const dirty = snapshot() !== lastSavedRef.current;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} onPress={handleBack} bg={colors.surface} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              About you
            </Text>
            <Text variant="small" color={colors.textFaint} style={{ marginTop: 2 }}>
              {saving ? 'Saving...' : dirty ? 'Unsaved' : 'Saved'}
            </Text>
          </View>
          <Pressable
            onPress={handleDone}
            hitSlop={8}
            style={[styles.doneBtn, { backgroundColor: colors.text }]}
          >
            <Check size={16} color={colors.bg} strokeWidth={2.5} />
            <Text variant="smallMedium" color={colors.bg}>Done</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: 80 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text variant="display">Your profile</Text>
            <Text variant="body" color={colors.textSoft}>
              Just for you. None of this leaves your phone.
            </Text>

            <Pressable onPress={pickPhoto} style={[styles.photoWrap, { backgroundColor: colors.accentSoft }]}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} />
              ) : (
                <>
                  <Camera size={24} color={colors.textSoft} strokeWidth={1.75} />
                  <Text variant="h2" color={colors.textSoft} style={{ marginTop: 4 }}>{initials}</Text>
                </>
              )}
            </Pressable>

            <View style={styles.section}>
              <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="What should we call you?"
                placeholderTextColor={colors.textFaint}
                style={[typeScale.h2, styles.nameInput, { color: colors.text, borderBottomColor: colors.hairline }]}
              />
            </View>

            <View style={styles.section}>
              <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                Pronouns (optional)
              </Text>
              <TextInput
                value={pronouns}
                onChangeText={setPronouns}
                placeholder="e.g. she/her, he/him, they/them"
                placeholderTextColor={colors.textFaint}
                style={[typeScale.body, styles.inlineInput, {
                  color: colors.text,
                  backgroundColor: colors.surface,
                  borderColor: colors.hairline,
                }]}
              />
            </View>

            <View style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Cake size={14} color={colors.textMuted} strokeWidth={1.75} />
                <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                  Birthday
                </Text>
              </View>
              <Pressable
                onPress={() => setShowCal((v) => !v)}
                style={[styles.dateRow, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
              >
                <Text variant="body" color={birthday ? colors.text : colors.textMuted}>
                  {birthday ? format(parseISO(birthday), 'MMMM d, yyyy') : 'Not set'}
                  {age !== null ? `  ·  age ${age}` : ''}
                </Text>
                {birthday ? (
                  <Pressable onPress={() => setBirthday(null)} hitSlop={8}>
                    <Text variant="smallMedium" color={colors.textMuted}>Clear</Text>
                  </Pressable>
                ) : null}
              </Pressable>
              {showCal ? (
                <View style={{ marginTop: spacing.sm }}>
                  <InlineCalendar
                    selected={birthday}
                    onSelect={(d) => { setBirthday(d); setShowCal(false); }}
                  />
                </View>
              ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.xxl, paddingTop: spacing.md, paddingBottom: spacing.md,
  },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  body: { paddingHorizontal: spacing.xxl, paddingTop: spacing.md, gap: spacing.lg },
  photoWrap: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginTop: spacing.lg,
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  section: { gap: spacing.sm },
  nameInput: {
    padding: 0, paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  inlineInput: {
    borderWidth: 1, borderRadius: radii.lg,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: radii.lg,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
});
