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
import { IconButton } from '@/components/IconButton';
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

// ─── Date option helpers ──────────────────────────────────────────────────────
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
  return format(parseISO(d), 'd MMM, yyyy');
}

function randomPrompt(excludeIdx: number): { text: string; idx: number } {
  let idx = Math.floor(Math.random() * JOURNAL_PROMPTS.length);
  if (JOURNAL_PROMPTS.length > 1 && idx === excludeIdx) {
    idx = (idx + 1) % JOURNAL_PROMPTS.length;
  }
  return { text: JOURNAL_PROMPTS[idx], idx };
}

// ─── Milestone streaks that trigger the celebration ───────────────────────────
const MILESTONES = new Set([1, 2, 3, 5, 7, 10, 14, 21, 30, 60, 90, 100, 150, 200, 365]);

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const refreshList = useJournalStore((s) => s.refresh);

  const editorRef = useRef<RichEditor>(null);
  const idRef = useRef<string | null>(params.id ?? null);
  const lastSavedRef = useRef('');
  const isNewRef = useRef(!params.id); // true if this started as a new entry

  const [html, setHtml] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [createdAt, setCreatedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Date selector
  const [selectedDate, setSelectedDate] = useState<string>(params.date ?? ymd());
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);

  // Prompts
  const [promptIdx, setPromptIdx] = useState(-1); // -1 = no prompt active
  const [promptText, setPromptText] = useState('');

  // Celebration
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationStreak, setCelebrationStreak] = useState(0);

  const dateOptions = buildDateOptions();

  useEffect(() => {
    if (!params.id) return;
    (async () => {
      const e = await repo.get(params.id!);
      if (e) {
        setHtml(e.bodyHtml ?? '');
        setAttachments(e.attachments);
        setCreatedAt(e.createdAt);
        setSelectedDate(e.entryDate);
        lastSavedRef.current = snapshot(e.bodyHtml ?? '', e.attachments);
      }
    })();
  }, [params.id]);

  const snapshot = (h = html, a = attachments) =>
    JSON.stringify([h, a.map((x) => x.uri).join('|')]);

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
      const input = { bodyHtml: html || null, content: plain, attachments, promptKey: null, mood: null };
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

  // Auto-save
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

    // Show celebration only for new entries
    if (isNewRef.current) {
      const s = await repo.streak();
      if (s > 0) {
        setCelebrationStreak(s);
        setShowCelebration(true);
        return; // don't navigate yet — close after celebration
      }
    }
    router.back();
  };

  const handleCelebrationClose = () => {
    setShowCelebration(false);
    router.back();
  };

  // Prompt
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

  // Date selection
  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setDateMenuOpen(false);
    setShowCalendarPicker(false);
  };

  // Media
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

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} onPress={handleBack} bg={colors.surface} />

          {/* Date selector */}
          <Pressable
            onPress={() => { setDateMenuOpen((v) => !v); setShowCalendarPicker(false); }}
            style={styles.datePill}
            hitSlop={6}
          >
            <Text variant="bodyMedium">{dateLabelFor(selectedDate)}</Text>
            <ChevronDown size={14} color={colors.textMuted} strokeWidth={2} />
          </Pressable>

          <Pressable
            onPress={handleDone}
            hitSlop={8}
            style={[styles.doneBtn, { backgroundColor: colors.text }, !hasContent() && { opacity: 0.4 }]}
            disabled={!hasContent()}
          >
            <Check size={15} color={colors.bg} strokeWidth={2.5} />
            <Text variant="smallMedium" color={colors.bg}>Done</Text>
          </Pressable>
        </View>

        {/* ── Date meta ── */}
        <Text variant="caption" color={colors.textMuted} style={{ paddingHorizontal: spacing.xxl, marginBottom: spacing.xs }}>
          {saving ? 'Saving...' : !hasContent() ? 'Start writing' : dirty ? 'Unsaved' : 'Saved'}&nbsp;&nbsp;·&nbsp;&nbsp;
          {format(parseISO(selectedDate), 'EEEE, MMMM d')}
        </Text>

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
                  <InlineCalendar
                    selected={selectedDate}
                    onSelect={handleSelectDate}
                  />
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: 100 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Active prompt chip ── */}
            {promptText ? (
              <View style={[styles.promptChip, { backgroundColor: colors.lavenderSoft, borderColor: colors.lavender + '44' }]}>
                <Lightbulb size={14} color={colors.lavender} strokeWidth={1.75} style={{ marginTop: 1 }} />
                <Text variant="small" color={colors.textSoft} style={{ flex: 1, lineHeight: 18 }}>{promptText}</Text>
                <Pressable onPress={handleNewPrompt} hitSlop={8}>
                  <RefreshCw size={14} color={colors.textMuted} strokeWidth={2} />
                </Pressable>
                <Pressable onPress={dismissPrompt} hitSlop={8}>
                  <XIcon size={14} color={colors.textMuted} strokeWidth={2} />
                </Pressable>
              </View>
            ) : null}

            {/* ── Editor ── */}
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
                    font-size: 17px;
                    line-height: 1.65;
                    padding: 0 !important;
                  `,
                }}
                useContainer={false}
                initialHeight={360}
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
          <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.hairline, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <RichToolbar
              editor={editorRef}
              actions={[actions.setBold, actions.setItalic, actions.setUnderline, actions.insertBulletsList, actions.alignLeft, actions.alignCenter]}
              iconTint={colors.textSoft}
              selectedIconTint={colors.text}
              style={[styles.toolbar, { backgroundColor: colors.surface }]}
            />
            <View style={styles.mediaRow}>
              <Pressable onPress={pickImage} style={({ pressed }) => [styles.mediaBtn, { backgroundColor: colors.bg, borderColor: colors.hairline }, pressed && { opacity: 0.7 }]}>
                <ImageIcon size={18} color={colors.textSoft} strokeWidth={1.75} />
              </Pressable>
              <Pressable onPress={pickVideo} style={({ pressed }) => [styles.mediaBtn, { backgroundColor: colors.bg, borderColor: colors.hairline }, pressed && { opacity: 0.7 }]}>
                <VideoIcon size={18} color={colors.textSoft} strokeWidth={1.75} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <VoiceRecorder onComplete={onVoiceComplete} />
              </View>
              {/* Prompt button */}
              <Pressable
                onPress={handlePrompt}
                style={({ pressed }) => [
                  styles.mediaBtn,
                  { backgroundColor: promptText ? colors.lavenderSoft : colors.bg, borderColor: promptText ? colors.lavender + '66' : colors.hairline },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Lightbulb size={18} color={promptText ? colors.lavender : colors.textSoft} strokeWidth={1.75} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ── Streak celebration modal ── */}
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
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.xxl, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  datePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },

  // Date dropdown
  dateMenu: {
    position: 'absolute',
    top: 100,
    left: spacing.xxl,
    right: spacing.xxl,
    zIndex: 100,
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  dateOption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: 2,
  },

  // Prompt chip
  promptChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },

  // Editor
  body: { paddingHorizontal: spacing.xxl, paddingTop: spacing.sm, gap: spacing.sm },
  editorWrap: { minHeight: 360 },
  attachmentsCol: { gap: spacing.md, marginTop: spacing.sm },
  imageTile: { borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, position: 'relative' },
  videoTile: { borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, height: 220, position: 'relative' },
  videoOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tileRemove: {
    position: 'absolute', top: 8, right: 8,
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },

  // Bottom bar
  bottomBar: { borderTopWidth: 1, paddingHorizontal: spacing.md, paddingTop: 4, gap: 6 },
  toolbar: { borderRadius: 0 },
  mediaRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.sm, paddingTop: 4, paddingBottom: 4,
  },
  mediaBtn: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
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
