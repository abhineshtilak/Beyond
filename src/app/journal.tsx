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
  Modal,
  TextInput,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronLeft,
  Check,
  Image as ImageIcon,
  Video as VideoIcon,
  Play,
  X as XIcon,
  ChevronDown,
  Lightbulb,
  RefreshCw,
  Flame,
  Calendar,
} from 'lucide-react-native';
import { format, subDays, parseISO } from 'date-fns';
import { Text } from '@/components/Text';
import { InlineCalendar } from '@/components/InlineCalendar';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { PlaybackWaveform } from '@/components/Waveform';
import { radii, spacing, fonts, useColors } from '@/theme';
import * as repo from '@/features/journal/repo';
import { useJournalStore } from '@/features/journal/store';
import { htmlToPlainText } from '@/features/realizations/types';
import { JOURNAL_PROMPTS } from '@/features/journal/prompts';
import { ymd } from '@/lib/date';
import type { Attachment } from '@/components/MediaAttachments';

// ─── Date helpers ─────────────────────────────────────────────────────────────
function buildDateOptions() {
  const today = new Date();
  return [
    { label: 'Today', sub: format(today, 'd MMM, yyyy'), date: ymd(today) },
    { label: 'Yesterday', sub: format(subDays(today, 1), 'd MMM, yyyy'), date: ymd(subDays(today, 1)) },
    { label: 'Day before', sub: format(subDays(today, 2), 'd MMM, yyyy'), date: ymd(subDays(today, 2)) },
  ];
}

function dateLabelFor(d: string): string {
  const todayStr = ymd();
  const yest = ymd(subDays(new Date(), 1));
  const dbb = ymd(subDays(new Date(), 2));
  if (d === todayStr) return 'Today';
  if (d === yest) return 'Yesterday';
  if (d === dbb) return 'Day before';
  return format(parseISO(d), 'd MMM yyyy');
}

function randomPrompt(excludeIdx: number): { text: string; idx: number } {
  let idx = Math.floor(Math.random() * JOURNAL_PROMPTS.length);
  if (JOURNAL_PROMPTS.length > 1 && idx === excludeIdx) {
    idx = (idx + 1) % JOURNAL_PROMPTS.length;
  }
  return { text: JOURNAL_PROMPTS[idx], idx };
}

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const refreshList = useJournalStore((s) => s.refresh);

  const editorRef = useRef<RichEditor>(null);
  const idRef = useRef<string | null>(params.id ?? null);
  const lastSavedRef = useRef('');
  const isNewRef = useRef(!params.id);

  // Title — plain state; the title field is isolated so keystroke re-renders are harmless
  const [title, setTitle] = useState('');
  const titleRef = useRef(''); // shadow ref so save() can read it without a state dep
  const handleTitleChange = (t: string) => {
    titleRef.current = t;
    setTitle(t);
  };

  const [html, setHtml] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [createdAt, setCreatedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>(params.date ?? ymd());
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);

  const [promptIdx, setPromptIdx] = useState(-1);
  const [promptText, setPromptText] = useState('');

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationStreak, setCelebrationStreak] = useState(0);

  const dateOptions = buildDateOptions();

  useEffect(() => {
    if (!params.id) return;
    (async () => {
      const e = await repo.get(params.id!);
      if (e) {
        setTitle(e.title ?? '');
        titleRef.current = e.title ?? '';
        setHtml(e.bodyHtml ?? '');
        setAttachments(e.attachments);
        setCreatedAt(e.createdAt);
        setSelectedDate(e.entryDate);
        lastSavedRef.current = snapshot(e.title ?? '', e.bodyHtml ?? '', e.attachments);
      }
    })();
  }, [params.id]);

  const snapshot = (t = titleRef.current, h = html, a = attachments) =>
    JSON.stringify([t, h, a.map((x) => x.uri).join('|')]);

  const hasContent = useCallback(() => {
    const plain = htmlToPlainText(html).trim();
    return !!(titleRef.current.trim() || plain || attachments.length > 0);
  }, [html, attachments]);

  const save = useCallback(async (silent = false): Promise<boolean> => {
    if (!hasContent()) return false;
    if (snapshot() === lastSavedRef.current) return true;
    if (!silent) setSaving(true);
    try {
      const plain = htmlToPlainText(html);
      const input = {
        title: titleRef.current.trim() || null,
        bodyHtml: html || null,
        content: plain,
        attachments,
        promptKey: null,
        mood: null,
      };
      if (idRef.current) {
        await repo.update(idRef.current, input);
      } else {
        const created = await repo.create(input, selectedDate);
        idRef.current = created.id;
        setCreatedAt(created.createdAt);
      }
      lastSavedRef.current = snapshot();
      await refreshList();
      return true;
    } finally {
      if (!silent) setSaving(false);
    }
  }, [html, attachments, hasContent, refreshList, selectedDate]);

  // Auto-save on content change
  useEffect(() => {
    if (!hasContent()) return;
    const t = setTimeout(() => save(true), 1500);
    return () => clearTimeout(t);
  }, [html, attachments, hasContent, save]);

  const handleBack = async () => {
    Keyboard.dismiss();
    await save(true);
    router.back();
  };

  const handleDone = async () => {
    Keyboard.dismiss();
    const ok = await save();
    if (!ok) { router.back(); return; }
    if (isNewRef.current) {
      const s = await repo.streak();
      if (s > 0) {
        setCelebrationStreak(s);
        setShowCelebration(true);
        return;
      }
    }
    router.back();
  };

  const handleCelebrationClose = () => {
    setShowCelebration(false);
    router.back();
  };

  const handlePrompt = () => {
    const p = randomPrompt(promptIdx);
    setPromptText(p.text);
    setPromptIdx(p.idx);
  };

  const handleNewPrompt = () => {
    const p = randomPrompt(promptIdx);
    setPromptText(p.text);
    setPromptIdx(p.idx);
  };

  const dismissPrompt = () => {
    setPromptText('');
    setPromptIdx(-1);
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setDateMenuOpen(false);
    setShowCalendarPicker(false);
  };

  const onVoiceComplete = (uri: string, duration: number) => {
    setAttachments((a) => [...a, { kind: 'audio', uri, duration }]);
  };
  const removeAttachment = (idx: number) => {
    setAttachments((a) => a.filter((_, i) => i !== idx));
  };
  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!res.canceled && res.assets?.[0]) {
      setAttachments((a) => [...a, { kind: 'image', uri: res.assets[0].uri }]);
    }
  };
  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow video access.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 0.8 });
    if (!res.canceled && res.assets?.[0]) {
      setAttachments((a) => [...a, { kind: 'video', uri: res.assets[0].uri, duration: res.assets[0].duration ?? undefined }]);
    }
  };

  const dirty = snapshot() !== lastSavedRef.current;
  const statusText = saving ? 'Saving…' : !hasContent() ? 'Start writing' : dirty ? 'Unsaved' : 'Saved';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} hitSlop={8} style={[styles.headerBtn, { backgroundColor: colors.surface }]}>
            <ChevronLeft size={20} color={colors.text} strokeWidth={2} />
          </Pressable>

          {/* Date pill */}
          <Pressable
            onPress={() => { setDateMenuOpen((v) => !v); setShowCalendarPicker(false); }}
            style={[styles.datePill, { backgroundColor: colors.surface }]}
            hitSlop={6}
          >
            <Text variant="smallMedium" color={colors.textSoft}>{dateLabelFor(selectedDate)}</Text>
            <ChevronDown size={12} color={colors.textMuted} strokeWidth={2} />
          </Pressable>

          {/* Status + Done */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text variant="caption" color={colors.textFaint}>{statusText}</Text>
            <Pressable
              onPress={handleDone}
              hitSlop={8}
              style={[styles.doneBtn, { backgroundColor: colors.text }, !hasContent() && { opacity: 0.35 }]}
              disabled={!hasContent()}
            >
              <Check size={14} color={colors.bg} strokeWidth={2.5} />
              <Text variant="smallMedium" color={colors.bg}>Done</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Date dropdown ── */}
        {dateMenuOpen ? (
          <>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => { setDateMenuOpen(false); setShowCalendarPicker(false); }} />
            <View style={[styles.dateMenu, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
              {dateOptions.map((opt) => (
                <Pressable
                  key={opt.date}
                  onPress={() => handleSelectDate(opt.date)}
                  style={({ pressed }) => [
                    styles.dateOption,
                    { borderBottomColor: colors.hairline },
                    selectedDate === opt.date && { backgroundColor: colors.accentSoft },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text variant="bodyMedium">{opt.label}</Text>
                  <Text variant="small" color={colors.textMuted}>{opt.sub}</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setShowCalendarPicker((v) => !v)}
                style={({ pressed }) => [styles.dateOption, pressed && { opacity: 0.7 }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Calendar size={14} color={colors.textSoft} strokeWidth={1.75} />
                  <Text variant="bodyMedium">Pick any date</Text>
                </View>
              </Pressable>
              {showCalendarPicker ? (
                <View style={{ padding: spacing.md }}>
                  <InlineCalendar selected={selectedDate} onSelect={handleSelectDate} />
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView
            contentContainerStyle={[styles.canvas, { paddingBottom: 48 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets={true}
          >
            {/* ── Page date stamp ── */}
            <Text
              variant="caption"
              color={colors.textFaint}
              style={{ textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.lg }}
            >
              {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
            </Text>

            {/* ── Prompt epigraph ── */}
            {promptText ? (
              <View style={[styles.promptCard, { backgroundColor: colors.lavenderSoft, borderColor: colors.lavender + '33' }]}>
                <View style={{ flex: 1 }}>
                  <Lightbulb size={13} color={colors.lavender} strokeWidth={1.75} style={{ marginBottom: 4 }} />
                  <Text
                    variant="body"
                    color={colors.textSoft}
                    style={{ fontStyle: 'italic', lineHeight: 22 }}
                  >
                    {promptText}
                  </Text>
                </View>
                <View style={styles.promptActions}>
                  <Pressable onPress={handleNewPrompt} hitSlop={10}>
                    <RefreshCw size={13} color={colors.textMuted} strokeWidth={2} />
                  </Pressable>
                  <Pressable onPress={dismissPrompt} hitSlop={10}>
                    <XIcon size={13} color={colors.textMuted} strokeWidth={2} />
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* ── Title ── */}
            <TextInput
              value={title}
              onChangeText={handleTitleChange}
              placeholder="Title"
              placeholderTextColor={colors.textFaint}
              style={[styles.titleInput, { color: colors.text, fontFamily: fonts.serif }]}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => editorRef.current?.focusContentEditor()}
              autoCorrect={false}
              importantForAutofill="no"
              multiline={false}
            />

            {/* ── Divider ── */}
            <View style={[styles.divider, { backgroundColor: colors.hairline }]} />

            {/* ── Body editor ── */}
            <View style={styles.editorWrap}>
              <RichEditor
                ref={editorRef}
                initialContentHTML={html}
                onChange={setHtml}
                placeholder="What's on your mind?"
                style={{ flex: 1 }}
                editorStyle={{
                  backgroundColor: colors.bg,
                  color: colors.text,
                  placeholderColor: colors.textFaint,
                  contentCSSText: `
                    font-family: ${fonts.sans};
                    font-size: 16px;
                    line-height: 1.7;
                    padding: 0 !important;
                  `,
                }}
                useContainer={false}
                initialHeight={300}
              />
            </View>

            {/* ── Attachments ── */}
            {attachments.length > 0 ? (
              <View style={styles.attachmentsCol}>
                {attachments.map((a, i) => (
                  <AttachmentTile key={`${a.uri}-${i}`} item={a} onRemove={() => removeAttachment(i)} />
                ))}
              </View>
            ) : null}
          </ScrollView>

          {/* ── Bottom dock ── */}
          <View style={[styles.dock, { backgroundColor: colors.surface, borderTopColor: colors.hairline, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            {/* Formatting toolbar */}
            <RichToolbar
              editor={editorRef}
              actions={[actions.setBold, actions.setItalic, actions.setUnderline, actions.insertBulletsList, actions.insertOrderedList]}
              iconTint={colors.textMuted}
              selectedIconTint={colors.text}
              style={[styles.toolbar, { backgroundColor: 'transparent' }]}
            />
            {/* Thin separator */}
            <View style={[styles.dockDivider, { backgroundColor: colors.hairline }]} />
            {/* Media + prompt row */}
            <View style={styles.mediaRow}>
              <Pressable onPress={pickImage} style={({ pressed }) => [styles.mediaBtn, { borderColor: colors.hairline }, pressed && { opacity: 0.6 }]}>
                <ImageIcon size={17} color={colors.textSoft} strokeWidth={1.75} />
              </Pressable>
              <Pressable onPress={pickVideo} style={({ pressed }) => [styles.mediaBtn, { borderColor: colors.hairline }, pressed && { opacity: 0.6 }]}>
                <VideoIcon size={17} color={colors.textSoft} strokeWidth={1.75} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <VoiceRecorder onComplete={onVoiceComplete} />
              </View>
              <Pressable
                onPress={handlePrompt}
                style={({ pressed }) => [
                  styles.mediaBtn,
                  {
                    borderColor: promptText ? colors.lavender + '66' : colors.hairline,
                    backgroundColor: promptText ? colors.lavenderSoft : 'transparent',
                  },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Lightbulb size={17} color={promptText ? colors.lavender : colors.textSoft} strokeWidth={1.75} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ── Streak celebration ── */}
      <Modal
        visible={showCelebration}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleCelebrationClose}
      >
        <Pressable style={styles.celebOverlay} onPress={handleCelebrationClose}>
          <Pressable style={[styles.celebCard, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.celebIconWrap, { backgroundColor: colors.butterSoft }]}>
              <Flame size={36} color={colors.butter} strokeWidth={1.5} />
            </View>
            <Text style={{ fontFamily: fonts.serif, fontSize: 72, color: colors.text, lineHeight: 80 }}>
              {celebrationStreak}
            </Text>
            <Text variant="h3" color={colors.textSoft} style={{ textAlign: 'center' }}>
              {celebrationStreak === 1 ? 'day streak' : 'days in a row'}
            </Text>
            <Text variant="body" color={colors.textMuted} style={{ textAlign: 'center', marginTop: spacing.sm, maxWidth: 240 }}>
              {celebrationStreak === 1
                ? 'First entry. The hardest one. Keep going.'
                : celebrationStreak < 7
                ? 'You showed up again. That matters.'
                : celebrationStreak < 30
                ? 'This is becoming a real habit.'
                : 'You\'re building something rare.'}
            </Text>
            <Pressable
              onPress={handleCelebrationClose}
              style={[styles.celebBtn, { backgroundColor: colors.text }]}
            >
              <Text variant="bodyMedium" color={colors.bg}>Continue</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
            <Text variant="caption" color="#fff" style={{ marginTop: 4 }}>{formatSecs(Math.floor(item.duration))}</Text>
          ) : null}
        </View>
        <Pressable onPress={onRemove} style={[styles.tileRemove, { backgroundColor: colors.bg }]} hitSlop={6}>
          <XIcon size={14} color={colors.text} strokeWidth={2} />
        </Pressable>
      </View>
    );
  }
  return <PlaybackWaveform uri={item.uri} duration={item.duration} onDelete={onRemove} />;
}

function formatSecs(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },

  // Date dropdown
  dateMenu: {
    position: 'absolute',
    top: 88,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 100,
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
  },
  dateOption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: 2,
  },

  // Writing canvas
  canvas: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
  },

  // Prompt epigraph
  promptCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  promptActions: {
    gap: spacing.md,
    paddingTop: 2,
  },

  // Title
  titleInput: {
    fontSize: 28,
    lineHeight: 36,
    paddingVertical: 0,
    includeFontPadding: false,
    marginBottom: spacing.lg,
  },

  // Divider between title and body
  divider: {
    height: 1,
    marginBottom: spacing.lg,
  },

  // Editor
  editorWrap: { minHeight: 280 },
  attachmentsCol: { gap: spacing.md, marginTop: spacing.lg },
  imageTile: { borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, position: 'relative' },
  videoTile: { borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, height: 220, position: 'relative' },
  videoOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tileRemove: {
    position: 'absolute', top: 8, right: 8,
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },

  // Dock
  dock: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingTop: 2,
  },
  toolbar: {
    borderRadius: 0,
    height: 40,
  },
  dockDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.sm,
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  mediaBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Celebration
  celebOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  celebCard: {
    width: '100%',
    borderRadius: radii.xxl,
    padding: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  celebIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  celebBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
  },
});
