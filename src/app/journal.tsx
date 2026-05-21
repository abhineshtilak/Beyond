import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronLeft,
  Check,
  Sparkles,
  Image as ImageIcon,
  Video as VideoIcon,
  Play,
  X as XIcon,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { Sheet, SheetRef } from '@/components/Sheet';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { PlaybackWaveform } from '@/components/Waveform';
import { Chip } from '@/components/Chip';
import { radii, spacing, fonts, useColors } from '@/theme';
import * as repo from '@/features/journal/repo';
import { useJournalStore } from '@/features/journal/store';
import { PROMPTS, findPrompt, MOOD_OPTIONS, type Mood } from '@/features/journal/types';
import { htmlToPlainText } from '@/features/realizations/types';
import type { Attachment } from '@/components/MediaAttachments';

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const params = useLocalSearchParams<{ id?: string; prompt?: string }>();
  const refreshList = useJournalStore((s) => s.refresh);

  const editorRef = useRef<RichEditor>(null);
  const promptSheetRef = useRef<SheetRef>(null);
  const moodSheetRef = useRef<SheetRef>(null);
  const idRef = useRef<string | null>(params.id ?? null);
  const lastSavedRef = useRef('');

  const [html, setHtml] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [promptKey, setPromptKey] = useState<string | null>(params.prompt ?? null);
  const [mood, setMood] = useState<Mood | null>(null);
  const [createdAt, setCreatedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Load if editing
  useEffect(() => {
    (async () => {
      if (!params.id) return;
      const e = await repo.get(params.id);
      if (e) {
        setHtml(e.bodyHtml ?? '');
        setAttachments(e.attachments);
        setPromptKey(e.promptKey);
        setMood(e.mood);
        setCreatedAt(e.createdAt);
        lastSavedRef.current = snapshot(e.bodyHtml ?? '', e.attachments, e.promptKey, e.mood);
      }
    })();
  }, [params.id]);

  const snapshot = (h = html, a = attachments, p = promptKey, m = mood) =>
    JSON.stringify([h, a.map((x) => x.uri).join('|'), p, m]);

  const hasContent = useCallback(() => {
    const plain = htmlToPlainText(html).trim();
    return !!(plain || attachments.length > 0);
  }, [html, attachments]);

  const save = useCallback(async (silent = false): Promise<boolean> => {
    if (!hasContent()) return false;
    if (snapshot() === lastSavedRef.current) return true;
    if (!silent) setSaving(true);
    try {
      const plain = htmlToPlainText(html);
      const input = {
        bodyHtml: html || null,
        content: plain,
        attachments,
        promptKey,
        mood,
      };
      if (idRef.current) {
        await repo.update(idRef.current, input);
      } else {
        const created = await repo.create(input);
        idRef.current = created.id;
        setCreatedAt(created.createdAt);
      }
      lastSavedRef.current = snapshot();
      await refreshList();
      return true;
    } finally {
      if (!silent) setSaving(false);
    }
  }, [html, attachments, promptKey, mood, hasContent, refreshList]);

  // Auto-save
  useEffect(() => {
    if (!hasContent()) return;
    const t = setTimeout(() => save(true), 1500);
    return () => clearTimeout(t);
  }, [html, attachments, promptKey, mood, hasContent, save]);

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

  const removeAttachment = (idx: number) => {
    setAttachments((a) => a.filter((_, i) => i !== idx));
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

  const selectedPrompt = findPrompt(promptKey);
  const dirty = snapshot() !== lastSavedRef.current;
  const placeholder = selectedPrompt?.question || 'What\'s on your mind?';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} onPress={handleBack} bg={colors.surface} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              {createdAt ? format(createdAt, 'EEE, MMM d · h:mm a') : 'New entry'}
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: 100 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Prompt + mood pills */}
            <View style={styles.metaRow}>
              <Pressable
                onPress={() => promptSheetRef.current?.present()}
                style={({ pressed }) => [
                  styles.metaChip,
                  {
                    backgroundColor: selectedPrompt ? colors.accentSoft : colors.surface,
                    borderColor: colors.hairline,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Sparkles size={13} color={colors.textSoft} strokeWidth={1.75} />
                <Text variant="caption" color={colors.text}>
                  {selectedPrompt ? selectedPrompt.label.toUpperCase() : 'PICK A PROMPT'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => moodSheetRef.current?.present()}
                style={({ pressed }) => [
                  styles.metaChip,
                  {
                    backgroundColor: mood ? (MOOD_OPTIONS.find((m) => m.key === mood)?.tint ?? colors.surface) + '55' : colors.surface,
                    borderColor: colors.hairline,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                {mood ? (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: MOOD_OPTIONS.find((m) => m.key === mood)?.tint,
                    }}
                  />
                ) : null}
                <Text variant="caption" color={colors.text}>
                  {mood ? MOOD_OPTIONS.find((m) => m.key === mood)?.label.toUpperCase() : 'MOOD'}
                </Text>
              </Pressable>
            </View>

            {/* Prompt question (if any) */}
            {selectedPrompt?.question ? (
              <Text variant="h2" color={colors.textSoft} style={{ lineHeight: 30 }}>
                {selectedPrompt.question}
              </Text>
            ) : null}

            {/* Blank canvas */}
            <View style={styles.editorWrap}>
              <RichEditor
                ref={editorRef}
                initialContentHTML={html}
                onChange={setHtml}
                placeholder={placeholder}
                style={styles.editor}
                editorStyle={{
                  backgroundColor: colors.bg,
                  color: colors.text,
                  placeholderColor: colors.textFaint,
                  contentCSSText: `
                    font-family: ${fonts.sans};
                    font-size: 17px;
                    line-height: 1.6;
                    padding: 0 !important;
                  `,
                }}
                useContainer={false}
                initialHeight={300}
              />
            </View>

            {/* Attachments */}
            {attachments.length > 0 ? (
              <View style={styles.attachmentsCol}>
                {attachments.map((a, i) => (
                  <AttachmentTile
                    key={`${a.uri}-${i}`}
                    item={a}
                    onRemove={() => removeAttachment(i)}
                  />
                ))}
              </View>
            ) : null}
          </ScrollView>

          {/* Bottom action bar */}
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
              <Pressable onPress={pickImage} style={({ pressed }) => [styles.mediaBtn, { backgroundColor: colors.bg, borderColor: colors.hairline }, pressed && { opacity: 0.7 }]}>
                <ImageIcon size={18} color={colors.text} strokeWidth={1.75} />
              </Pressable>
              <Pressable onPress={pickVideo} style={({ pressed }) => [styles.mediaBtn, { backgroundColor: colors.bg, borderColor: colors.hairline }, pressed && { opacity: 0.7 }]}>
                <VideoIcon size={18} color={colors.text} strokeWidth={1.75} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <VoiceRecorder onComplete={onVoiceComplete} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Prompt picker */}
        <Sheet
          ref={promptSheetRef}
          title="Pick a prompt"
          subtitle="Or write without one — both are valid."
          snapPoints={['80%']}
        >
          <Pressable
            onPress={() => { setPromptKey(null); promptSheetRef.current?.dismiss(); }}
            style={({ pressed }) => [
              styles.promptRow,
              { backgroundColor: colors.surface, borderColor: !promptKey ? colors.text : colors.hairline },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text variant="bodyMedium">No prompt</Text>
            <Text variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>Pure blank canvas.</Text>
          </Pressable>
          {PROMPTS.map((p) => (
            <Pressable
              key={p.key}
              onPress={() => { setPromptKey(p.key); promptSheetRef.current?.dismiss(); }}
              style={({ pressed }) => [
                styles.promptRow,
                { backgroundColor: colors.surface, borderColor: promptKey === p.key ? colors.text : colors.hairline },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text variant="bodyMedium">{p.label}</Text>
              {p.question ? (
                <Text variant="small" color={colors.textSoft} style={{ marginTop: 4 }}>
                  {p.question}
                </Text>
              ) : null}
              <Text variant="caption" color={colors.textMuted} style={{ marginTop: 4 }}>
                {p.description}
              </Text>
            </Pressable>
          ))}
        </Sheet>

        {/* Mood picker */}
        <Sheet ref={moodSheetRef} title="How are you?" snapPoints={['50%']}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            <Chip label="Clear" selected={!mood} size="sm" onPress={() => { setMood(null); moodSheetRef.current?.dismiss(); }} />
            {MOOD_OPTIONS.map((m) => (
              <Chip
                key={m.key}
                label={m.label}
                tint={m.tint}
                selected={mood === m.key}
                size="sm"
                onPress={() => { setMood(m.key); moodSheetRef.current?.dismiss(); }}
              />
            ))}
          </View>
        </Sheet>
      </SafeAreaView>
    </>
  );
}

function AttachmentTile({ item, onRemove }: { item: Attachment; onRemove: () => void }) {
  const colors = useColors();
  if (item.kind === 'image') {
    return (
      <View style={[styles.imageTile, { borderColor: colors.hairline }]}>
        <Image source={{ uri: item.uri }} style={{ width: '100%', height: 220 }} resizeMode="cover" />
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
          {item.duration ? (
            <Text variant="caption" color="#fff" style={{ marginTop: 4 }}>
              {formatSecs(Math.floor(item.duration))}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={onRemove} style={[styles.tileRemove, { backgroundColor: colors.bg }]} hitSlop={6}>
          <XIcon size={14} color={colors.text} strokeWidth={2} />
        </Pressable>
      </View>
    );
  }
  return (
    <PlaybackWaveform uri={item.uri} duration={item.duration} onDelete={onRemove} />
  );
}

function formatSecs(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
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
  metaRow: { flexDirection: 'row', gap: spacing.sm },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  editorWrap: { minHeight: 300 },
  editor: { flex: 1 },
  attachmentsCol: { gap: spacing.md, marginTop: spacing.sm },
  imageTile: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  videoTile: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    height: 220,
    position: 'relative',
  },
  videoOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tileRemove: {
    position: 'absolute',
    top: 8, right: 8,
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
  promptRow: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
});
