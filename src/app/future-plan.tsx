import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  Platform,
  ScrollView,
  Keyboard,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Check, ImagePlus, X, Calendar as CalIcon } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { InlineCalendar } from '@/components/InlineCalendar';
import { radii, spacing, typeScale, useColors, palette } from '@/theme';
import * as repo from '@/features/future/repo';
import { useFutureStore } from '@/features/future/store';

export default function FuturePlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const params = useLocalSearchParams<{ id?: string }>();
  const refreshList = useFutureStore((s) => s.refresh);

  const idRef = useRef<string | null>(params.id ?? null);
  const lastSavedRef = useRef('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [plannedDate, setPlannedDate] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [showCal, setShowCal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!params.id) return;
      const p = await repo.get(params.id);
      if (p) {
        setTitle(p.title);
        setDescription(p.description ?? '');
        setPlannedDate(p.plannedDate);
        setImageUri(p.imageUri);
        lastSavedRef.current = JSON.stringify([p.title, p.description, p.plannedDate, p.imageUri]);
      }
    })();
  }, [params.id]);

  const snapshot = () => JSON.stringify([title, description, plannedDate, imageUri]);

  const save = useCallback(async (silent = false): Promise<boolean> => {
    if (!title.trim()) return false;
    if (snapshot() === lastSavedRef.current) return true;
    if (!silent) setSaving(true);
    try {
      const input = {
        title: title.trim(),
        description: description.trim() || null,
        plannedDate,
        imageUri,
      };
      if (idRef.current) {
        await repo.update(idRef.current, input);
      } else {
        const created = await repo.create(input);
        idRef.current = created.id;
      }
      lastSavedRef.current = snapshot();
      await refreshList();
      return true;
    } finally {
      if (!silent) setSaving(false);
    }
  }, [title, description, plannedDate, imageUri, refreshList]);

  useEffect(() => {
    if (!title.trim()) return;
    const t = setTimeout(() => save(true), 1500);
    return () => clearTimeout(t);
  }, [title, description, plannedDate, imageUri, save]);

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

  const pickHero = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      aspect: [16, 10],
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.[0]) setImageUri(res.assets[0].uri);
  };

  const dirty = snapshot() !== lastSavedRef.current;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          {/* HERO */}
          <Pressable onPress={pickHero} style={styles.hero}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            ) : (
              <View style={[styles.heroPlaceholder, { backgroundColor: palette.skySoft }]}>
                <ImagePlus size={32} color={colors.textMuted} strokeWidth={1.5} />
                <Text variant="body" color={colors.textSoft} style={{ marginTop: spacing.sm }}>
                  Add a visual
                </Text>
              </View>
            )}
            <View style={styles.heroTop}>
              <IconButton icon={ChevronLeft} onPress={handleBack} bg="rgba(255,255,255,0.85)" />
              <View style={{ flex: 1 }} />
              {imageUri ? (
                <Pressable onPress={() => setImageUri(null)} hitSlop={6} style={styles.heroRemove}>
                  <X size={16} color={colors.text} strokeWidth={2} />
                </Pressable>
              ) : null}
              <Pressable
                onPress={handleDone}
                hitSlop={6}
                style={[styles.doneBtn, { backgroundColor: colors.text }, !title.trim() && { opacity: 0.5 }]}
                disabled={!title.trim()}
              >
                <Check size={16} color={colors.bg} strokeWidth={2.5} />
                <Text variant="smallMedium" color={colors.bg}>Done</Text>
              </Pressable>
            </View>
          </Pressable>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.body}>
              <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                {idRef.current ? 'Plan' : 'Someday'} · {saving ? 'Saving' : dirty ? 'Unsaved' : 'Saved'}
              </Text>

              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="What's the plan?"
                placeholderTextColor={colors.textFaint}
                style={[typeScale.display, styles.titleInput, { color: colors.text }]}
                multiline
              />

              <View style={styles.section}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <CalIcon size={14} color={colors.textMuted} strokeWidth={1.75} />
                  <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                    Planned for
                  </Text>
                </View>
                <Pressable onPress={() => setShowCal((v) => !v)}>
                  <View style={[styles.dateRow, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
                    <Text variant="body" color={plannedDate ? colors.text : colors.textMuted}>
                      {plannedDate ? format(parseISO(plannedDate), 'EEEE, MMMM d, yyyy') : 'No date set'}
                    </Text>
                    {plannedDate ? (
                      <Pressable onPress={() => setPlannedDate(null)} hitSlop={8}>
                        <Text variant="smallMedium" color={colors.textMuted}>Clear</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </Pressable>
                {showCal ? (
                  <View style={{ marginTop: spacing.sm }}>
                    <InlineCalendar selected={plannedDate} onSelect={(d) => { setPlannedDate(d); setShowCal(false); }} />
                  </View>
                ) : null}
              </View>

              <View style={styles.section}>
                <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                  Notes
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Anything you want to remember about this."
                  placeholderTextColor={colors.textFaint}
                  multiline
                  style={[typeScale.body, styles.textArea, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.hairline }]}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { height: 260, position: 'relative' },
  heroPlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  heroTop: {
    position: 'absolute',
    top: spacing.md, left: spacing.lg, right: spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  heroRemove: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  body: { paddingHorizontal: spacing.xxl, paddingTop: spacing.xl, gap: spacing.lg },
  titleInput: { padding: 0, minHeight: 44 },
  section: { gap: spacing.sm },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: radii.lg,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  textArea: {
    borderWidth: 1, borderRadius: radii.lg,
    padding: spacing.lg, minHeight: 100,
    textAlignVertical: 'top',
  },
});
