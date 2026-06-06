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
  Platform,
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
  Flame,
  Calendar,
  Type,
} from 'lucide-react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
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
function buildDateOptions(selectedDate: string) {
  const today = new Date();
  const todayStr = ymd(today);
  const yesterdayStr = ymd(subDays(today, 1));
  const dayBeforeStr = ymd(subDays(today, 2));
  
  const options = [
    { label: 'Today',      sub: format(today,                'd MMM, yyyy'), date: todayStr },
    { label: 'Yesterday',  sub: format(subDays(today, 1),   'd MMM, yyyy'), date: yesterdayStr },
    { label: 'Day before', sub: format(subDays(today, 2),   'd MMM, yyyy'), date: dayBeforeStr },
  ];
  
  // Add selected date to options if it's not already there
  if (![todayStr, yesterdayStr, dayBeforeStr].includes(selectedDate)) {
    options.push({
      label: dateLabelFor(selectedDate),
      sub: format(parseISO(selectedDate), 'd MMM, yyyy'),
      date: selectedDate,
    });
  }
  
  return options;
}

function dateLabelFor(d: string): string {
  const todayStr = ymd();
  const yest    = ymd(subDays(new Date(), 1));
  const dbb     = ymd(subDays(new Date(), 2));
  if (d === todayStr) return 'Today';
  if (d === yest)     return 'Yesterday';
  if (d === dbb)      return 'Day before';
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

  const [title, setTitle] = useState('');
  const titleRef = useRef('');
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
  const [showFormatBar, setShowFormatBar] = useState(false);
  const [recordingVoice, setRecordingVoice] = useState(false);

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationStreak, setCelebrationStreak] = useState(0);

  const dateOptions = buildDateOptions(selectedDate);

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
        lastSavedRef.current = snapshot(e.title ?? '', e.bodyHtml ?? '', e.attachments, e.entryDate);
      }
    })();
  }, [params.id]);

  const snapshot = (t = titleRef.current, h = html, a = attachments, d = selectedDate) =>
    JSON.stringify([t, h, a.map((x) => x.uri).join('|'), d]);

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
        await repo.update(idRef.current, input, selectedDate);
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
  }, [html, attachments, hasContent, save, selectedDate]);

  // Save immediately when date changes (for existing entries)
  useEffect(() => {
    if (!idRef.current || !hasContent()) return;
    save(true);
  }, [selectedDate, save, hasContent]);

  // Save when closing date picker to ensure date change is persisted
  useEffect(() => {
    if (dateMenuOpen || !hasContent()) return;
    save(true);
  }, [dateMenuOpen, save, hasContent]);

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
    setShowFormatBar(false);
    const p = randomPrompt(promptIdx);
    setPromptText(p.text);
    setPromptIdx(p.idx);
    if (!titleRef.current.trim() || titleRef.current === promptText) {
      handleTitleChange(p.text);
    }
  };

  const dismissPrompt = () => {
    if (titleRef.current === promptText) handleTitleChange('');
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
  const handleRecordingChange = (recording: boolean) => {
    setRecordingVoice(recording);
    if (recording) setShowFormatBar(false);
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
  // Status: saving indicator — no "Start writing" prompt text
  const saveStatus: string = saving ? 'Saving' : !hasContent() ? '' : dirty ? 'Unsaved' : 'Saved';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>

        {/* ── Header ── */}
        <View style={styles.header}>
          {/* Back */}
          <Pressable
            onPress={handleBack}
            hitSlop={10}
            style={[styles.headerIconBtn, { backgroundColor: colors.surface }]}
          >
            <ChevronLeft size={20} color={colors.text} strokeWidth={2} />
          </Pressable>

          {/* Date pill (centred, flex) */}
          <Pressable
            onPress={() => { setDateMenuOpen((v) => !v); setShowCalendarPicker(false); }}
            style={[styles.datePill, { backgroundColor: colors.surface }]}
            hitSlop={6}
          >
            <Text variant="smallMedium" color={colors.textSoft}>
              {dateLabelFor(selectedDate)}
            </Text>
            <ChevronDown size={12} color={colors.textMuted} strokeWidth={2} />
          </Pressable>

          {/* Save status (faint) + Done pill */}
          <View style={styles.headerRight}>
            {saveStatus ? (
              <Text variant="caption" color={colors.textFaint} numberOfLines={1}>
                {saveStatus}
              </Text>
            ) : null}
            <Pressable
              onPress={handleDone}
              hitSlop={8}
              style={[
                styles.doneBtn,
                { backgroundColor: hasContent() ? colors.text : colors.surfaceAlt },
              ]}
            >
              <Check size={15} color={hasContent() ? colors.bg : colors.textMuted} strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>

        {/* ── Date dropdown ── */}
        {dateMenuOpen ? (
          <>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => { setDateMenuOpen(false); setShowCalendarPicker(false); }}
            />
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

        {/*
          behavior='padding' on both platforms:
          — iOS: well-known, adds bottom padding to push content up
          — Android: avoids the 'height' mode which shrinks the root window and
            causes background tab bars (TabBar uses position:absolute) to also
            shift even though they're not visible, leaving them stuck mid-screen
            when the user returns to the tab after dismissing the keyboard.
        */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          {/* ── Scrollable content — text only, no attachments ── */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.canvas}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {/* Date stamp */}
            <Text
              variant="caption"
              color={colors.textFaint}
              style={{ textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.lg }}
            >
              {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
            </Text>

            {/* Title */}
            <TextInput
              value={title}
              onChangeText={handleTitleChange}
              placeholder="Title"
              placeholderTextColor={colors.textFaint}
              style={[styles.titleInput, { color: colors.text, fontFamily: fonts.sansSemi }]}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => editorRef.current?.focusContentEditor()}
              autoCorrect={false}
              importantForAutofill="no"
              multiline
            />

            <View style={[styles.divider, { backgroundColor: colors.hairline }]} />

            {/* Body — text fills all remaining scroll space */}
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
                    font-size: 18px;
                    line-height: 1.75;
                    padding: 0 !important;
                  `,
                }}
                useContainer={false}
                initialHeight={400}
              />
            </View>
          </ScrollView>

          {/* ── Attachment strip — OUTSIDE the scroll so it never squeezes text ── */}
          {attachments.length > 0 ? (
            <View style={[styles.attachStrip, { borderTopColor: colors.hairline }]}>
              {/* Images + videos: horizontal scroll of 80×80 thumbnails */}
              {attachments.some((a) => a.kind !== 'audio') ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.thumbRow}
                >
                  {attachments.map((a, i) =>
                    a.kind !== 'audio' ? (
                      <CompactAttachment
                        key={`${a.uri}-${i}`}
                        item={a}
                        onRemove={() => removeAttachment(i)}
                      />
                    ) : null,
                  )}
                </ScrollView>
              ) : null}

              {/* Audio: full-width PlaybackWaveform rows (interactive, playable) */}
              {attachments.map((a, i) =>
                a.kind === 'audio' ? (
                  <View key={`${a.uri}-${i}`} style={styles.audioRow}>
                    <PlaybackWaveform
                      uri={a.uri}
                      duration={a.duration}
                      onDelete={() => removeAttachment(i)}
                      compact
                    />
                  </View>
                ) : null,
              )}
            </View>
          ) : null}

          {/* ── Format toolbar — slides in above the dock row ── */}
          {showFormatBar && !recordingVoice ? (
            <View style={[styles.formatPanel, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
              <RichToolbar
                editor={editorRef}
                actions={[
                  actions.setBold,
                  actions.setItalic,
                  actions.setUnderline,
                  actions.insertBulletsList,
                  actions.insertOrderedList,
                ]}
                iconTint={colors.textMuted}
                selectedIconTint={colors.text}
                iconSize={18}
                style={[styles.formatToolbar, { backgroundColor: 'transparent' }]}
              />
            </View>
          ) : null}

          {/* ── Dock row — in normal flow, keyboard pushes it up via KAV padding ── */}
          <View style={[styles.dockWrap, { paddingBottom: Math.max(insets.bottom, 8) + 8 }]}>
            <View style={[styles.dockRow, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>

              {/* Left cluster — hidden while recording so VoiceRecorder gets full width */}
              {!recordingVoice ? (
                <>
                  {/* Format toggle */}
                  <DockBtn
                    active={showFormatBar}
                    onPress={() => setShowFormatBar((v) => !v)}
                    activeColor={colors.surfaceAlt}
                    activeBorder={colors.textSoft}
                  >
                    <Type size={16} color={showFormatBar ? colors.text : colors.textSoft} strokeWidth={1.8} />
                  </DockBtn>

                  <View style={[styles.dividerV, { backgroundColor: colors.hairline }]} />

                  {/* Photo */}
                  <DockBtn onPress={pickImage}>
                    <ImageIcon size={17} color={colors.textSoft} strokeWidth={1.75} />
                  </DockBtn>

                  {/* Video */}
                  <DockBtn onPress={pickVideo}>
                    <VideoIcon size={17} color={colors.textSoft} strokeWidth={1.75} />
                  </DockBtn>
                </>
              ) : null}

              {/*
                VoiceRecorder — ALWAYS MOUNTED (single instance).
                Two-instance bug was: recordingVoice ? <Recorder A/> : <Recorder B/>
                React would unmount B, mount A fresh (idle) when recording started,
                requiring a second tap to actually begin. Now one instance stays alive;
                we only change its container width and hide the other buttons.
              */}
              <View style={[styles.voiceSlot, recordingVoice && { flex: 1 }]}>
                <VoiceRecorder
                  compact
                  onRecordingChange={handleRecordingChange}
                  onComplete={onVoiceComplete}
                />
              </View>

              {/* Right cluster — hidden while recording */}
              {!recordingVoice ? (
                <>
                  <View style={[styles.dividerV, { backgroundColor: colors.hairline }]} />

                  {/* Prompt */}
                  <DockBtn
                    active={!!promptText}
                    onPress={handlePrompt}
                    onLongPress={promptText ? dismissPrompt : undefined}
                    activeColor={colors.lavenderSoft}
                    activeBorder={colors.lavender + '66'}
                  >
                    <Lightbulb
                      size={16}
                      color={promptText ? colors.lavender : colors.textSoft}
                      strokeWidth={1.75}
                    />
                  </DockBtn>
                </>
              ) : null}
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
                : "You're building something rare."}
            </Text>
            <Pressable onPress={handleCelebrationClose} style={[styles.celebBtn, { backgroundColor: colors.text }]}>
              <Text variant="bodyMedium" color={colors.bg}>Continue</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// Small reusable dock button
function DockBtn({
  children,
  onPress,
  onLongPress,
  active = false,
  activeColor,
  activeBorder,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  active?: boolean;
  activeColor?: string;
  activeBorder?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.dockBtn,
        active && {
          backgroundColor: activeColor ?? colors.surfaceAlt,
          borderColor: activeBorder ?? colors.textSoft,
        },
        pressed && { opacity: 0.65, transform: [{ translateY: 1 }] },
      ]}
    >
      {children}
    </Pressable>
  );
}

// Compact attachment thumbnail — 80×80 image/video thumb in the attachment strip
function CompactAttachment({ item, onRemove }: { item: Attachment; onRemove: () => void }) {
  const colors = useColors();

  if (item.kind === 'image') {
    return (
      <View style={[styles.thumb, { borderColor: colors.hairline }]}>
        <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <Pressable onPress={onRemove} style={[styles.thumbX, { backgroundColor: colors.bg }]} hitSlop={6}>
          <XIcon size={11} color={colors.text} strokeWidth={2.5} />
        </Pressable>
      </View>
    );
  }

  if (item.kind === 'video') {
    return <VideoAttachment uri={item.uri} duration={item.duration} onRemove={onRemove} />;
  }

  // Audio — rendered separately as PlaybackWaveform in the audioRow, not here
  return null;
}

// Full-screen video player — tap the 80×80 thumbnail to play
function VideoAttachment({ uri, duration, onRemove }: { uri: string; duration?: number; onRemove: () => void }) {
  const colors = useColors();
  const [showPlayer, setShowPlayer] = useState(false);

  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = false;
  });

  // Auto-play when modal opens, pause when it closes
  useEffect(() => {
    if (showPlayer) {
      player.play();
    } else {
      player.pause();
    }
  }, [showPlayer, player]);

  return (
    <>
      {/* 80×80 thumbnail — tap to play, X to remove */}
      <Pressable
        onPress={() => setShowPlayer(true)}
        style={[styles.thumb, { backgroundColor: '#111', borderColor: colors.hairline }]}
      >
        <View style={styles.thumbPlayOverlay}>
          <Play size={20} color="#fff" fill="#fff" />
          {duration ? (
            <Text variant="caption" color="#fff" style={{ fontSize: 9, marginTop: 2 }}>
              {formatSecs(Math.floor(duration))}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={onRemove} style={[styles.thumbX, { backgroundColor: colors.bg }]} hitSlop={6}>
          <XIcon size={11} color={colors.text} strokeWidth={2.5} />
        </Pressable>
      </Pressable>

      {/* Full-screen player modal */}
      <Modal
        visible={showPlayer}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowPlayer(false)}
      >
        <View style={styles.videoOverlay}>
          <VideoView
            player={player}
            style={styles.videoPlayer}
            contentFit="contain"
            nativeControls
          />
          <Pressable
            onPress={() => setShowPlayer(false)}
            style={styles.videoCloseBtn}
          >
            <XIcon size={18} color="#fff" strokeWidth={2.5} />
          </Pressable>
        </View>
      </Modal>
    </>
  );
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
    paddingTop: 6,
    paddingBottom: spacing.sm,
    minHeight: 52,
  },
  headerIconBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  datePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 34,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  doneBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },

  // Date dropdown
  dateMenu: {
    position: 'absolute',
    top: 60,
    left: spacing.lg, right: spacing.lg,
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

  // Canvas — flexGrow:1 makes the content container fill the full ScrollView
  // height even when content is short, so editorWrap's flex:1 can expand the
  // editor to fill all remaining space instead of snapping to minHeight only.
  canvas: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  titleInput: {
    fontSize: 24,
    lineHeight: 31,
    paddingVertical: 0,
    includeFontPadding: false,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    marginBottom: spacing.md,
  },
  // flex:1 expands the editor to fill all remaining canvas height.
  // minHeight ensures it's never smaller than ~5 visible lines.
  editorWrap: { flex: 1, minHeight: 200 },

  // Attachment strip — lives OUTSIDE the ScrollView so it never squeezes text.
  // Text fills all scroll space; media pushes the dock up naturally as you add more.
  attachStrip: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  thumbRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  audioRow: {
    paddingVertical: spacing.xs,
  },

  // 80×80 image / video thumbnails
  thumb: {
    width: 80, height: 80,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  thumbPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  thumbX: {
    position: 'absolute', top: 4, right: 4,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },

  // Dock wrapper — in normal flex flow; KAV behavior='padding' pushes it above keyboard
  dockWrap: {
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  formatPanel: {
    // In-flow panel just above the dock row
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
  },
  formatToolbar: { height: 40, borderRadius: radii.pill },

  // Main dock pill row
  dockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '88%',
    maxWidth: 480,
    height: 52,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 10,
  },
  dockBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  dividerV: {
    width: 1, height: 22,
    marginHorizontal: 2,
  },
  // Single VoiceRecorder slot — compact (mic-button width) normally,
  // expands to fill the full row when recording is active.
  voiceSlot: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Full-screen video player
  videoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  videoCloseBtn: {
    position: 'absolute',
    top: 56,
    right: spacing.xxl,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Celebration
  celebOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
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
