import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Pressable,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  Alert,
} from 'react-native';
import { StableTextInput } from '@/components/StableTextInput';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Check, ImagePlus, X } from 'lucide-react-native';
import { format } from 'date-fns';
import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { MediaAttachments } from '@/components/MediaAttachments';
import type { Attachment } from '@/components/MediaAttachments';
import { fonts, radii, spacing, useColors } from '@/theme';
import * as repo from '@/features/dreams/repo';
import { useDreamsStore } from '@/features/dreams/store';

export default function DreamScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const params = useLocalSearchParams<{ id?: string }>();
  const refreshList = useDreamsStore((s) => s.refresh);

  const idRef = useRef<string | null>(params.id ?? null);
  const lastSavedRef = useRef<{ title: string; description: string; why: string; imageUri: string | null; attCount: number }>({
    title: '', description: '', why: '', imageUri: null, attCount: 0,
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [why, setWhy] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [created, setCreated] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!params.id) return;
      const d = await repo.get(params.id);
      if (d) {
        setTitle(d.title);
        setDescription(d.description ?? '');
        setWhy(d.why ?? '');
        setImageUri(d.imageUri);
        setAttachments(d.attachments);
        setCreated(d.createdAt);
        lastSavedRef.current = {
          title: d.title, description: d.description ?? '', why: d.why ?? '',
          imageUri: d.imageUri, attCount: d.attachments.length,
        };
      }
    })();
  }, [params.id]);

  const isDirty = useCallback(() => {
    const l = lastSavedRef.current;
    return title !== l.title || description !== l.description || why !== l.why
      || imageUri !== l.imageUri || attachments.length !== l.attCount;
  }, [title, description, why, imageUri, attachments]);

  const save = useCallback(async (silent = false): Promise<boolean> => {
    if (!title.trim()) return false;
    if (!isDirty()) return true;
    if (!silent) setSaving(true);
    try {
      const input = {
        title: title.trim(),
        description: description.trim() || null,
        why: why.trim() || null,
        imageUri,
        attachments,
      };
      if (idRef.current) {
        await repo.update(idRef.current, input);
      } else {
        const c = await repo.create(input);
        idRef.current = c.id;
      }
      lastSavedRef.current = {
        title, description, why, imageUri, attCount: attachments.length,
      };
      await refreshList();
      return true;
    } catch (e) {
      console.warn('dream save failed', e);
      return false;
    } finally {
      if (!silent) setSaving(false);
    }
  }, [isDirty, title, description, why, imageUri, attachments, refreshList]);

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

  useEffect(() => {
    if (!title.trim()) return;
    const t = setTimeout(() => { save(true); }, 1500);
    return () => clearTimeout(t);
  }, [title, description, why, imageUri, attachments, save]);

  const pickHero = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access for hero image.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      aspect: [16, 10],
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.[0]) setImageUri(res.assets[0].uri);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        {/* TOP ACTION BAR — separate from hero */}
        <View style={[styles.topBar, { backgroundColor: colors.bg }]}>
          <IconButton icon={ChevronLeft} onPress={handleBack} bg={colors.surface} />
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={handleDone}
            hitSlop={8}
            style={({ pressed }) => [
              styles.doneBtn,
              { backgroundColor: colors.text },
              !title.trim() && { opacity: 0.4 },
              pressed && { opacity: 0.85 },
            ]}
            disabled={!title.trim()}
          >
            <Check size={16} color={colors.bg} strokeWidth={2.5} />
            <Text variant="smallMedium" color={colors.bg}>Done</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
        >
          {/* HERO */}
          {imageUri ? (
            <View style={styles.hero}>
              <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              <Pressable
                onPress={() => setImageUri(null)}
                style={styles.heroRemove}
                hitSlop={6}
              >
                <X size={14} color={colors.text} strokeWidth={2} />
              </Pressable>
              <Pressable
                onPress={pickHero}
                style={styles.changeImageChip}
                hitSlop={6}
              >
                <ImagePlus size={12} color={colors.text} strokeWidth={1.75} />
                <Text variant="caption" color={colors.text}>CHANGE</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={pickHero}
              style={[styles.heroPlaceholder, { backgroundColor: colors.lavenderSoft }]}
            >
              <ImagePlus size={32} color={colors.textMuted} strokeWidth={1.5} />
              <Text variant="bodyMedium" color={colors.textSoft} style={{ marginTop: spacing.sm }}>
                Tap to add a visual
              </Text>
            </Pressable>
          )}

          <View style={styles.body}>
              <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                {created ? format(created, 'MMMM d, yyyy') : 'New dream'} · {saving ? 'Saving' : isDirty() ? 'Unsaved' : 'Saved'}
              </Text>

              <StableTextInput
                value={title}
                onChangeText={setTitle}
                placeholder="The dream"
                placeholderTextColor={colors.textFaint}
                style={[{ fontFamily: fonts.serifBold, fontSize: 32, letterSpacing: -0.5 }, styles.titleInput, { color: colors.text }]}
                multiline
              />

              <View style={styles.section}>
                <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                  Describe it
                </Text>
                <StableTextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What does this look like? Picture the scene in detail."
                  placeholderTextColor={colors.textFaint}
                  multiline
                  style={[{ fontFamily: fonts.sans, fontSize: 15 }, styles.textArea, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.hairline }]}
                />
              </View>

              <View style={styles.section}>
                <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                  Why it pulls at you
                </Text>
                <StableTextInput
                  value={why}
                  onChangeText={setWhy}
                  placeholder="Why does this dream matter? What does it represent?"
                  placeholderTextColor={colors.textFaint}
                  multiline
                  style={[{ fontFamily: fonts.sans, fontSize: 15 }, styles.textArea, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.hairline }]}
                />
              </View>

              <View style={styles.section}>
                <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                  Voices, photos, videos
                </Text>
                <MediaAttachments attachments={attachments} onChange={setAttachments} />
              </View>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    zIndex: 10,
  },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  hero: { height: 240, position: 'relative' },
  heroPlaceholder: {
    height: 200, alignItems: 'center', justifyContent: 'center',
    marginHorizontal: spacing.xxl,
    borderRadius: radii.xl,
    marginBottom: spacing.lg,
  },
  changeImageChip: {
    position: 'absolute',
    bottom: spacing.md, left: spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  heroRemove: {
    position: 'absolute',
    top: spacing.md, right: spacing.lg,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  body: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, gap: spacing.lg },
  titleInput: { padding: 0, minHeight: 50 },
  section: { gap: spacing.sm },
  textArea: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
