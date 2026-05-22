import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Check,
  Trash2,
  Plus,
  X,
  ExternalLink,
  BookOpen,
  PlayCircle,
  FileText,
  GraduationCap,
  Headphones,
  Box,
  Calendar as CalIcon,
  Target,
  Minus,
  Bell,
} from 'lucide-react-native';
import { ReminderPicker } from '@/components/ReminderPicker';
import { parseLearningReminderDays } from '@/features/learning/types';
import { format, parseISO } from 'date-fns';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { Chip } from '@/components/Chip';
import { InlineCalendar } from '@/components/InlineCalendar';
import { GoalPicker } from '@/features/goals/GoalPicker';
import { colors, fonts, radii, spacing } from '@/theme';
import { confirm } from '@/lib/confirm';
import { uid } from '@/lib/db';
import * as repo from '@/features/learning/repo';
import { useLearningStore } from '@/features/learning/store';
import {
  RESOURCE_META,
  type LearningStatus,
  type Resource,
  type ResourceKind,
} from '@/features/learning/types';

const STATUSES: { key: LearningStatus; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'paused', label: 'Paused' },
  { key: 'completed', label: 'Completed' },
];

const RESOURCE_ICONS: Record<ResourceKind, any> = {
  book: BookOpen,
  video: PlayCircle,
  article: FileText,
  course: GraduationCap,
  podcast: Headphones,
  other: Box,
};

const RESOURCE_KINDS: ResourceKind[] = ['book', 'video', 'article', 'course', 'podcast', 'other'];

export default function LearnScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const refreshList = useLearningStore((s) => s.refresh);

  const idRef = useRef<string | null>(params.id ?? null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [progress, setProgress] = useState(0);
  const [resources, setResources] = useState<Resource[]>([]);
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [status, setStatus] = useState<LearningStatus>('active');
  const [goalId, setGoalId] = useState<string | null>(null);
  const [reminderTime, setReminderTime] = useState<string | null>(null);
  const [reminderDays, setReminderDays] = useState<number[]>([]);
  const [showCal, setShowCal] = useState(false);
  const [showResForm, setShowResForm] = useState(false);
  const [resKind, setResKind] = useState<ResourceKind>('book');
  const [resTitle, setResTitle] = useState('');
  const [resUrl, setResUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const lastSavedRef = useRef<string>('');

  const snapshot = () =>
    JSON.stringify([title, category, notes, progress, resources, targetDate, status, goalId, reminderTime, reminderDays]);

  useEffect(() => {
    (async () => {
      if (!params.id) return;
      const t = await repo.get(params.id);
      if (t) {
        setTitle(t.title);
        setCategory(t.category ?? '');
        setNotes(t.notes ?? '');
        setProgress(t.progress);
        setResources(t.resources);
        setTargetDate(t.targetDate);
        setStatus(t.status);
        setGoalId(t.goalId);
        setReminderTime(t.reminderTime);
        setReminderDays(parseLearningReminderDays(t.reminderDays));
        lastSavedRef.current = JSON.stringify([t.title, t.category ?? '', t.notes ?? '', t.progress, t.resources, t.targetDate, t.status, t.goalId, t.reminderTime, parseLearningReminderDays(t.reminderDays)]);
      }
    })();
  }, [params.id]);

  const save = useCallback(async (silent = false): Promise<boolean> => {
    if (!title.trim()) return false;
    if (snapshot() === lastSavedRef.current) return true;
    if (!silent) setSaving(true);
    try {
      const input = {
        title: title.trim(),
        category: category.trim() || null,
        notes: notes.trim() || null,
        progress,
        resources,
        targetDate,
        status,
        goalId,
        reminderTime,
        reminderDays,
      };
      if (idRef.current) {
        await repo.update(idRef.current, input);
      } else {
        const t = await repo.create(input);
        idRef.current = t.id;
      }
      lastSavedRef.current = snapshot();
      await refreshList();
      return true;
    } finally {
      if (!silent) setSaving(false);
    }
  }, [title, category, notes, progress, resources, targetDate, status, goalId, reminderTime, reminderDays, refreshList]);

  useEffect(() => {
    if (!title.trim()) return;
    const t = setTimeout(() => { save(true); }, 1500);
    return () => clearTimeout(t);
  }, [title, category, notes, progress, resources, targetDate, status, goalId, reminderTime, reminderDays, save]);

  const handleBack = async () => { Keyboard.dismiss(); await save(true); router.back(); };
  const handleDone = async () => { Keyboard.dismiss(); await save(); router.back(); };

  const handleDelete = async () => {
    if (!idRef.current) { router.back(); return; }
    const ok = await confirm({ title: 'Delete topic?', confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    await repo.remove(idRef.current);
    await refreshList();
    router.back();
  };

  const addResource = () => {
    if (!resTitle.trim()) return;
    setResources((r) => [...r, { id: uid(), kind: resKind, title: resTitle.trim(), url: resUrl.trim() || null, done: false }]);
    setResTitle('');
    setResUrl('');
    setShowResForm(false);
  };

  const toggleResource = (id: string) => {
    setResources((r) => r.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  };

  const removeResource = (id: string) => {
    setResources((r) => r.filter((x) => x.id !== id));
  };

  const dirty = snapshot() !== lastSavedRef.current;
  const resourcesDone = resources.filter((r) => r.done).length;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} onPress={handleBack} bg={colors.surface} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              {idRef.current ? 'Topic' : 'New topic'}
            </Text>
            <Text variant="small" color={colors.textFaint} style={{ marginTop: 2 }}>
              {saving ? 'Saving...' : !title.trim() ? 'Empty' : dirty ? 'Unsaved' : 'Saved'}
            </Text>
          </View>
          <Pressable
            onPress={handleDone}
            hitSlop={8}
            style={[styles.doneBtn, !title.trim() && { opacity: 0.5 }]}
            disabled={!title.trim()}
          >
            <Check size={16} color={title.trim() ? colors.bg : colors.textFaint} strokeWidth={2.5} />
            <Text variant="smallMedium" color={title.trim() ? colors.bg : colors.textFaint}>Done</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: 80 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What you're learning"
              placeholderTextColor={colors.textFaint}
              style={[{ fontFamily: fonts.serifBold, fontSize: 32, letterSpacing: -0.5 }, styles.titleInput]}
              multiline
            />
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="Category (e.g. Programming, Music)"
              placeholderTextColor={colors.textFaint}
              style={[{ fontFamily: fonts.sans, fontSize: 15 }, styles.inlineInput]}
            />

            {/* Status */}
            <Section label="Status">
              <View style={styles.chipRow}>
                {STATUSES.map((s) => (
                  <Chip
                    key={s.key}
                    label={s.label}
                    selected={status === s.key}
                    size="sm"
                    onPress={() => {
                      setStatus(s.key);
                      if (s.key === 'completed') setProgress(100);
                    }}
                  />
                ))}
              </View>
            </Section>

            {/* Progress */}
            <Section label={`Progress · ${progress}%`}>
              <View style={styles.progressRow}>
                <Pressable
                  onPress={() => setProgress((p) => Math.max(0, p - 10))}
                  style={styles.progressBtn}
                  hitSlop={6}
                >
                  <Minus size={14} color={colors.text} strokeWidth={2} />
                </Pressable>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                <Pressable
                  onPress={() => setProgress((p) => Math.min(100, p + 10))}
                  style={styles.progressBtn}
                  hitSlop={6}
                >
                  <Plus size={14} color={colors.text} strokeWidth={2} />
                </Pressable>
              </View>
              <View style={styles.chipRow}>
                {[0, 25, 50, 75, 100].map((v) => (
                  <Chip key={v} label={`${v}%`} selected={progress === v} size="sm" onPress={() => setProgress(v)} />
                ))}
              </View>
            </Section>

            {/* Target date */}
            <Section label="Target date" icon={CalIcon}>
              <Pressable onPress={() => setShowCal((v) => !v)}>
                <View style={styles.dateRow}>
                  <Text variant="body" color={targetDate ? colors.text : colors.textMuted}>
                    {targetDate ? format(parseISO(targetDate), 'EEEE, MMMM d, yyyy') : 'No date set'}
                  </Text>
                  {targetDate ? (
                    <Pressable onPress={() => setTargetDate(null)} hitSlop={8}>
                      <Text variant="smallMedium" color={colors.textMuted}>Clear</Text>
                    </Pressable>
                  ) : null}
                </View>
              </Pressable>
              {showCal ? (
                <View style={{ marginTop: spacing.sm }}>
                  <InlineCalendar selected={targetDate} onSelect={(d) => { setTargetDate(d); setShowCal(false); }} />
                </View>
              ) : null}
            </Section>

            {/* Resources */}
            <Section label={`Resources · ${resourcesDone}/${resources.length}`}>
              {resources.length === 0 && !showResForm ? (
                <Text variant="body" color={colors.textMuted}>
                  Books, videos, courses — anything that helps you learn.
                </Text>
              ) : null}

              {resources.map((res) => {
                const Icon = RESOURCE_ICONS[res.kind];
                const meta = RESOURCE_META[res.kind];
                return (
                  <View key={res.id} style={styles.resRow}>
                    <Pressable onPress={() => toggleResource(res.id)} hitSlop={6}>
                      <View style={[styles.checkBox, res.done && styles.checkBoxOn]}>
                        {res.done ? <Check size={12} color={colors.bg} strokeWidth={3} /> : null}
                      </View>
                    </Pressable>
                    <View style={[styles.resIcon, { backgroundColor: meta.tint }]}>
                      <Icon size={14} color={colors.text} strokeWidth={1.75} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" numberOfLines={2} style={{
                        textDecorationLine: res.done ? 'line-through' : 'none',
                        color: res.done ? colors.textMuted : colors.text,
                      }}>
                        {res.title}
                      </Text>
                      <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                        {meta.label}
                      </Text>
                    </View>
                    {res.url ? (
                      <Pressable onPress={() => Linking.openURL(res.url!).catch(() => {})} hitSlop={6}>
                        <ExternalLink size={16} color={colors.textMuted} strokeWidth={1.75} />
                      </Pressable>
                    ) : null}
                    <Pressable onPress={() => removeResource(res.id)} hitSlop={6}>
                      <X size={16} color={colors.textFaint} strokeWidth={1.75} />
                    </Pressable>
                  </View>
                );
              })}

              {showResForm ? (
                <View style={styles.resForm}>
                  <View style={styles.chipRow}>
                    {RESOURCE_KINDS.map((k) => (
                      <Chip
                        key={k}
                        label={RESOURCE_META[k].label}
                        selected={resKind === k}
                        tint={RESOURCE_META[k].tint}
                        size="sm"
                        onPress={() => setResKind(k)}
                      />
                    ))}
                  </View>
                  <TextInput
                    value={resTitle}
                    onChangeText={setResTitle}
                    placeholder="Title (e.g. Atomic Habits)"
                    placeholderTextColor={colors.textFaint}
                    style={[{ fontFamily: fonts.sans, fontSize: 15 }, styles.resInput]}
                  />
                  <TextInput
                    value={resUrl}
                    onChangeText={setResUrl}
                    placeholder="Link (optional)"
                    placeholderTextColor={colors.textFaint}
                    autoCapitalize="none"
                    keyboardType="url"
                    style={[{ fontFamily: fonts.sans, fontSize: 15 }, styles.resInput]}
                  />
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Pressable
                      onPress={() => { setShowResForm(false); setResTitle(''); setResUrl(''); }}
                      style={({ pressed }) => [styles.miniBtn, pressed && { opacity: 0.7 }]}
                    >
                      <Text variant="smallMedium" color={colors.textSoft}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={addResource}
                      disabled={!resTitle.trim()}
                      style={({ pressed }) => [
                        styles.miniBtn,
                        { backgroundColor: colors.text },
                        pressed && { opacity: 0.7 },
                        !resTitle.trim() && { opacity: 0.5 },
                      ]}
                    >
                      <Text variant="smallMedium" color={colors.bg}>Add</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable onPress={() => setShowResForm(true)} style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}>
                  <Plus size={16} color={colors.textSoft} strokeWidth={2} />
                  <Text variant="smallMedium" color={colors.textSoft}>Add resource</Text>
                </Pressable>
              )}
            </Section>

            {/* Notes */}
            <Section label="Notes">
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Key insights, takeaways, references."
                placeholderTextColor={colors.textFaint}
                multiline
                style={[{ fontFamily: fonts.sans, fontSize: 15 }, styles.textArea]}
              />
            </Section>

            {/* Reminder */}
            <Section label="Practice reminder" icon={Bell}>
              <ReminderPicker
                time={reminderTime}
                days={reminderDays}
                onTimeChange={setReminderTime}
                onDaysChange={setReminderDays}
                showDays
              />
            </Section>

            {/* Linked goal */}
            <Section label="Linked goal" icon={Target}>
              <GoalPicker value={goalId} onChange={setGoalId} />
            </Section>

            <Pressable onPress={handleDelete} style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}>
              <Trash2 size={16} color="#B97A6B" strokeWidth={1.75} />
              <Text variant="bodyMedium" color="#B97A6B">{idRef.current ? 'Delete topic' : 'Discard'}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

function Section({ label, icon: Icon, children }: { label: string; icon?: any; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {Icon ? <Icon size={14} color={colors.textMuted} strokeWidth={1.75} /> : null}
        <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.xxl, paddingTop: spacing.md, paddingBottom: spacing.md,
  },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.text, borderRadius: radii.pill,
  },
  body: { paddingHorizontal: spacing.xxl, paddingTop: spacing.md, gap: spacing.lg },
  titleInput: { color: colors.text, padding: 0, minHeight: 44 },
  inlineInput: {
    color: colors.text,
    backgroundColor: colors.surface,
    borderColor: colors.hairline, borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  section: { gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  progressBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface, borderColor: colors.hairline, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  progressTrack: { flex: 1, height: 8, backgroundColor: colors.hairline, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.text, borderRadius: 4 },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderColor: colors.hairline, borderWidth: 1,
    borderRadius: 14, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  resRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderColor: colors.hairline, borderWidth: 1,
    borderRadius: radii.md, padding: spacing.md,
  },
  checkBox: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.hairline,
    alignItems: 'center', justifyContent: 'center',
  },
  checkBoxOn: { backgroundColor: colors.text, borderColor: colors.text },
  resIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  resForm: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  resInput: {
    color: colors.text,
    backgroundColor: colors.bg,
    borderColor: colors.hairline, borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: spacing.sm, alignSelf: 'flex-start',
  },
  miniBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderColor: colors.hairline, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  textArea: {
    color: colors.text,
    backgroundColor: colors.surface,
    borderColor: colors.hairline, borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg, minHeight: 100,
    textAlignVertical: 'top',
  },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.lg, marginTop: spacing.md,
    borderRadius: radii.lg, borderWidth: 1,
    borderColor: '#E8D0CB', backgroundColor: '#F7E9E5',
  },
});
