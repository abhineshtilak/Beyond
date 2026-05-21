import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  Alert,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Check, ImagePlus, X, Trash2 } from 'lucide-react-native';
import { format } from 'date-fns';
import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { MediaAttachments } from '@/components/MediaAttachments';
import type { Attachment } from '@/components/MediaAttachments';
import { colors, palette, radii, spacing, typeScale } from '@/theme';
import { confirm } from '@/lib/confirm';
import * as repo from '@/features/dreams/repo';
import { useDreamsStore } from '@/features/dreams/store';

export default function DreamScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const hasContent = useCallback(() => {
    return !!(title.trim() || description.trim() || why.trim() || imageUri || attachments.length > 0);
  }, [title, description, why, imageUri, attachments]);

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
        const created = await repo.create(input);
        idRef.current = created.id;
      }
      lastSavedRef.current = {
        title, description, why, imageUri, attCount: attachments.length,
      };
      await refreshList();
      return true;
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

  // Auto-save
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

  const handleDelete = async () => {
    if (!idRef.current) {
      router.back();
      return;
    }
    const ok = await confirm({
      title: 'Let go of this dream?',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await repo.remove(idRef.current);
    await refreshList();
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.root} edges={['top']}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          {/* HERO — image area is its own press target so controls aren't intercepted */}
          <View style={styles.hero}>
            {imageUri ? (
              <>
                <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <Pressable
                  onPress={pickHero}
                  hitSlop={6}
                  style={styles.changeImageChip}
                >
                  <ImagePlus size={14} color={colors.text} strokeWidth={1.75} />
                  <Text variant="caption" color={colors.text}>CHANGE</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={pickHero}
                style={[styles.heroPlaceholder, { backgroundColor: palette.lavenderSoft }]}
              >
                <ImagePlus size={36} color={colors.textMuted} strokeWidth={1.5} />
                <Text variant="bodyMedium" color={colors.textSoft} style={{ marginTop: spacing.sm }}>
                  Tap to add a visual
                </Text>
              </Pressable>
            )}
            <View style={styles.heroTop}>
              <IconButton icon={ChevronLeft} onPress={handleBack} bg="rgba(255,255,255,0.85)" />
              <View style={{ flex: 1 }} />
              {imageUri ? (
                <Pressable onPress={() => setImageUri(null)} hitSlop={6} style={styles.heroRemove}>
                  <X size={16} color={colors.text} strokeWidth={2} />
                </Pressable>
              ) : null}
              <Pressable onPress={handleDone} hitSlop={6} style={[styles.doneBtn, !title.trim() && { opacity: 0.5 }]} disabled={!title.trim()}>
                <Check size={16} color={colors.bg} strokeWidth={2.5} />
                <Text variant="smallMedium" color={colors.bg}>Done</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.body}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              {created ? format(created, 'MMMM d, yyyy') : 'New dream'} · {saving ? 'Saving' : isDirty() ? 'Unsaved' : 'Saved'}
            </Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="The dream"
              placeholderTextColor={colors.textFaint}
              style={[typeScale.display, styles.titleInput]}
              multiline
            />

            <View style={styles.section}>
              <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                Describe it
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="What does this look like? Picture the scene in detail."
                placeholderTextColor={colors.textFaint}
                multiline
                style={[typeScale.body, styles.textArea]}
              />
            </View>

            <View style={styles.section}>
              <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                Why it pulls at you
              </Text>
              <TextInput
                value={why}
                onChangeText={setWhy}
                placeholder="Why does this dream matter? What does it represent?"
                placeholderTextColor={colors.textFaint}
                multiline
                style={[typeScale.body, styles.textArea]}
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
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: { height: 280, position: 'relative' },
  heroPlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  changeImageChip: {
    position: 'absolute',
    bottom: spacing.md, left: spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
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
    backgroundColor: colors.text, borderRadius: radii.pill,
  },
  body: { paddingHorizontal: spacing.xxl, paddingTop: spacing.xl, gap: spacing.lg },
  titleInput: { color: colors.text, padding: 0, minHeight: 50 },
  section: { gap: spacing.sm },
  textArea: {
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.lg,
    padding: spacing.lg,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#E8D0CB',
    backgroundColor: '#F7E9E5',
  },
});
