import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  Image,
  Alert,
} from 'react-native';
import { StableTextInput } from '@/components/StableTextInput';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronLeft,
  Check,
  Image as ImageIcon,
  Video as VideoIcon,
  X as XIcon,
  Play,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { Chip } from '@/components/Chip';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { PlaybackWaveform } from '@/components/Waveform';
import type { Attachment } from '@/components/MediaAttachments';
import { fonts, radii, spacing, useColors } from '@/theme';
import * as repo from '@/features/realizations/repo';
import { useRealizationsStore } from '@/features/realizations/store';
import {
  REALIZATION_META,
  REALIZATION_KINDS,
  htmlToPlainText,
  type RealizationKind,
} from '@/features/realizations/types';

export default function RealizationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const params = useLocalSearchParams<{ id?: string; kind?: string }>();
  const refreshList = useRealizationsStore((s) => s.refresh);

  const editorRef = useRef<RichEditor>(null);
  const idRef = useRef<string | null>(params.id ?? null);
  const lastSavedRef = useRef('');

  const [title, setTitle] = useState('');
  const [html, setHtml] = useState('');
  const [kind, setKind] = useState<RealizationKind>(
    (params.kind as RealizationKind) || 'realization',
  );
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [created, setCreated] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!params.id) return;
      const item = await repo.get(params.id);
      if (item) {
        setTitle(item.title ?? '');
        setHtml(item.bodyHtml ?? '');
        setKind(item.kind);
        setAttachments(item.attachments);
        setCreated(item.createdAt);
        lastSavedRef.current = snapshot(item.title ?? '', item.bodyHtml ?? '', item.kind, item.attachments);
      }
    })();
  }, [params.id]);

  const snapshot = (t = title, h = html, k = kind, a = attachments) =>
    JSON.stringify([t, h, k, a.map((x) => x.uri).join('|')]);

  const hasContent = useCallback(() => {
    const text = htmlToPlainText(html).trim();
    return !!(title.trim() || text || attachments.length > 0);
  }, [title, html, attachments]);

  const save = useCallback(async (silent = false): Promise<boolean> => {
    if (!hasContent()) return false;
    if (snapshot() === lastSavedRef.current) return true;
    if (!silent) setSaving(true);
    try {
      const plain = htmlToPlainText(html);
      const input = {
        title: title.trim() || null,
        content: plain,
        bodyHtml: html || null,
        attachments,
        kind,
      };
      if (idRef.current) {
        await repo.update(idRef.current, input);
      } else {
        const c = await repo.create(input);
        idRef.current = c.id;
      }
      lastSavedRef.current = snapshot();
      await refreshList();
      return true;
    } finally {
      if (!silent) setSaving(false);
    }
  }, [hasContent, title, html, kind, attachments, refreshList]);

  useEffect(() => {
    if (!hasContent()) return;
    const t = setTimeout(() => save(true), 1500);
    return () => clearTimeout(t);
  }, [title, html, kind, attachments, hasContent, save]);

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

  const onVoiceComplete = (uri: string, duration: number) => {
    setAttachments((a) => [...a, { kind: 'audio', uri, duration }]);
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!res.canceled && res.assets?.[0]) {
      setAttachments((a) => [...a, { kind: 'image', uri: res.assets[0].uri }]);
    }
  };

  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow video access.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 0.8 });
    if (!res.canceled && res.assets?.[0]) {
      setAttachments((a) => [...a, { kind: 'video', uri: res.assets[0].uri, duration: res.assets[0].duration ?? undefined }]);
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments((a) => a.filter((_, i) => i !== idx));
  };

  const meta = REALIZATION_META[kind];
  const dirty = snapshot() !== lastSavedRef.current;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} onPress={handleBack} bg={colors.surface} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              {created ? format(created, 'EEEE, MMMM d') : 'New entry'} · {meta.label.toLowerCase()}
            </Text>
            <Text variant="small" color={colors.textFaint} style={{ marginTop: 2 }}>
              {saving ? 'Saving...' : !hasContent() ? 'Empty' : dirty ? 'Unsaved' : 'Saved'}
            </Text>
          </View>
          <Pressable
            onPress={handleDone}
            hitSlop={8}
            style={[styles.doneBtn, { backgroundColor: colors.text }, !hasContent() && { opacity: 0.5 }]}
            disabled={!hasContent()}
          >
            <Check size={16} color={colors.bg} strokeWidth={2.5} />
            <Text variant="smallMedium" color={colors.bg}>Done</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
        >
          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: 100 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}
          >
            <View style={styles.kindRow}>
              {REALIZATION_KINDS.map((k) => (
                <Chip
                  key={k}
                  label={REALIZATION_META[k].label}
                  selected={kind === k}
                  tint={REALIZATION_META[k].tint}
                  size="sm"
                  onPress={() => setKind(k)}
                />
              ))}
            </View>

            <StableTextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Title"
              placeholderTextColor={colors.textFaint}
              style={[{ fontFamily: fonts.serifBold, fontSize: 26, letterSpacing: -0.3 }, styles.title, { color: colors.text }]}
              multiline
            />

            <View style={styles.editorWrap}>
              <RichEditor
                ref={editorRef}
                initialContentHTML={html}
                onChange={setHtml}
                placeholder={meta.description}
                style={{ flex: 1 }}
                editorStyle={{
                  backgroundColor: colors.bg,
                  color: colors.text,
                  placeholderColor: colors.textFaint,
                  contentCSSText: `
                    font-family: ${fonts.sans};
                    font-size: 16px;
                    line-height: 1.55;
                    padding: 0 !important;
                  `,
                }}
                useContainer={false}
                initialHeight={240}
              />
            </View>

            {attachments.length > 0 ? (
              <View style={styles.attachmentsCol}>
                {attachments.map((a, i) => (
                  <AttachmentTile key={`${a.uri}-${i}`} item={a} onRemove={() => removeAttachment(i)} />
                ))}
              </View>
            ) : null}
          </ScrollView>

          {/* Bottom dock: format toolbar + media icons */}
          <View
            style={[
              styles.bottomBar,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.hairline,
                paddingBottom: Math.max(insets.bottom, spacing.md),
              },
            ]}
          >
            <RichToolbar
              editor={editorRef}
              actions={[
                actions.setBold,
                actions.setItalic,
                actions.setUnderline,
                actions.heading2,
                actions.insertBulletsList,
                actions.alignLeft,
                actions.alignCenter,
                actions.alignRight,
              ]}
              iconTint={colors.textSoft}
              selectedIconTint={colors.text}
              style={[styles.toolbar, { backgroundColor: colors.surface }]}
            />
            <View style={styles.mediaRow}>
              <Pressable
                onPress={pickImage}
                style={({ pressed }) => [
                  styles.mediaBtn,
                  { backgroundColor: colors.bg, borderColor: colors.hairline },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <ImageIcon size={18} color={colors.text} strokeWidth={1.75} />
              </Pressable>
              <Pressable
                onPress={pickVideo}
                style={({ pressed }) => [
                  styles.mediaBtn,
                  { backgroundColor: colors.bg, borderColor: colors.hairline },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <VideoIcon size={18} color={colors.text} strokeWidth={1.75} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <VoiceRecorder onComplete={onVoiceComplete} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

function AttachmentTile({ item, onRemove }: { item: Attachment; onRemove: () => void }) {
  const colors = useColors();
  if (item.kind === 'image') {
    return (
      <View style={[styles.imageTile, { borderColor: colors.hairline }]}>
        <Image source={{ uri: item.uri }} style={{ width: '100%', height: 200 }} resizeMode="cover" />
        <Pressable onPress={onRemove} style={[styles.tileRemove, { backgroundColor: colors.bg }]} hitSlop={6}>
          <XIcon size={14} color={colors.text} strokeWidth={2} />
        </Pressable>
      </View>
    );
  }
  if (item.kind === 'video') {
    return (
      <View style={[styles.videoTile, { backgroundColor: '#111', borderColor: colors.hairline }]}>
        <View style={styles.videoOverlay}>
          <Play size={32} color="#fff" fill="#fff" />
        </View>
        <Pressable onPress={onRemove} style={[styles.tileRemove, { backgroundColor: colors.bg }]} hitSlop={6}>
          <XIcon size={14} color={colors.text} strokeWidth={2} />
        </Pressable>
      </View>
    );
  }
  return <PlaybackWaveform uri={item.uri} duration={item.duration} onDelete={onRemove} />;
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
  body: { paddingHorizontal: spacing.xxl, paddingTop: spacing.sm, gap: spacing.lg },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  title: { padding: 0, minHeight: 40 },
  editorWrap: { minHeight: 240 },
  attachmentsCol: { gap: spacing.md, marginTop: spacing.sm },
  imageTile: {
    borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, position: 'relative',
  },
  videoTile: {
    borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, height: 200, position: 'relative',
  },
  videoOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tileRemove: {
    position: 'absolute', top: 8, right: 8,
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  bottomBar: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingTop: 4,
    gap: 6,
  },
  toolbar: { borderRadius: 0 },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: 4,
    paddingBottom: 4,
  },
  mediaBtn: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
});
