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
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronLeft,
  Check,
  Camera,
  Heart,
  Bell,
  Calendar as CalIcon,
  Cake,
  Sparkle,
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { Chip } from '@/components/Chip';
import { InlineCalendar } from '@/components/InlineCalendar';
import { fonts, radii, spacing, useColors } from '@/theme';
import { confirm } from '@/lib/confirm';
import { ymd } from '@/lib/date';
import * as repo from '@/features/people/repo';
import { usePeopleStore } from '@/features/people/store';
import { RELATION_META, RELATIONS, type Relation } from '@/features/people/types';

const FREQ_PRESETS = [
  { label: 'Weekly', days: 7 },
  { label: 'Biweekly', days: 14 },
  { label: 'Monthly', days: 30 },
  { label: 'Quarterly', days: 90 },
];

export default function PersonScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const params = useLocalSearchParams<{ id?: string }>();
  const refreshList = usePeopleStore((s) => s.refresh);

  const idRef = useRef<string | null>(params.id ?? null);

  const [name, setName] = useState('');
  const [relation, setRelation] = useState<Relation | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [theirGoals, setTheirGoals] = useState('');
  const [theirStruggles, setTheirStruggles] = useState('');
  const [mySupport, setMySupport] = useState('');
  const [contributions, setContributions] = useState('');
  const [futurePlans, setFuturePlans] = useState('');
  const [lastContactDate, setLastContactDate] = useState<string | null>(null);
  const [contactReminderDays, setContactReminderDays] = useState<number | null>(null);
  const [birthday, setBirthday] = useState<string | null>(null);
  const [anniversary, setAnniversary] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showBirthdayCal, setShowBirthdayCal] = useState(false);
  const [showAnniversaryCal, setShowAnniversaryCal] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const lastSavedRef = useRef<string>('');

  const snapshot = () =>
    [name, relation, photoUri, notes, theirGoals, theirStruggles, mySupport, contributions, futurePlans, lastContactDate, contactReminderDays, birthday, anniversary].join('§');

  useEffect(() => {
    (async () => {
      if (!params.id) return;
      const p = await repo.get(params.id);
      if (p) {
        setName(p.name);
        setRelation(p.relation);
        setPhotoUri(p.photoUri);
        setNotes(p.notes ?? '');
        setTheirGoals(p.theirGoals ?? '');
        setTheirStruggles(p.theirStruggles ?? '');
        setMySupport(p.mySupport ?? '');
        setContributions(p.contributions ?? '');
        setFuturePlans(p.futurePlans ?? '');
        setLastContactDate(p.lastContactDate);
        setContactReminderDays(p.contactReminderDays);
        setBirthday(p.birthday);
        setAnniversary(p.anniversary);
        lastSavedRef.current = [p.name, p.relation, p.photoUri, p.notes, p.theirGoals, p.theirStruggles, p.mySupport, p.contributions, p.futurePlans, p.lastContactDate, p.contactReminderDays, p.birthday, p.anniversary].join('§');
      }
    })();
  }, [params.id]);

  const save = useCallback(async (silent = false): Promise<boolean> => {
    if (!name.trim()) return false;
    if (snapshot() === lastSavedRef.current) return true;
    if (!silent) setSaving(true);
    try {
      const input = {
        name: name.trim(),
        relation,
        photoUri,
        notes: notes.trim() || null,
        theirGoals: theirGoals.trim() || null,
        theirStruggles: theirStruggles.trim() || null,
        mySupport: mySupport.trim() || null,
        contributions: contributions.trim() || null,
        futurePlans: futurePlans.trim() || null,
        lastContactDate,
        contactReminderDays,
        birthday,
        anniversary,
      };
      if (idRef.current) {
        await repo.update(idRef.current, input);
      } else {
        const created = await repo.create(input);
        idRef.current = created.id;
      }
      lastSavedRef.current = snapshot();
      setSavedAt(Date.now());
      await refreshList();
      return true;
    } finally {
      if (!silent) setSaving(false);
    }
  }, [name, relation, photoUri, notes, theirGoals, theirStruggles, mySupport, contributions, futurePlans, lastContactDate, contactReminderDays, birthday, anniversary, refreshList]);

  // Auto-save
  useEffect(() => {
    if (!name.trim()) return;
    const t = setTimeout(() => { save(true); }, 1500);
    return () => clearTimeout(t);
  }, [name, relation, photoUri, notes, theirGoals, theirStruggles, mySupport, contributions, futurePlans, lastContactDate, contactReminderDays, birthday, anniversary, save]);

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

  const markContactedToday = () => {
    setLastContactDate(ymd());
  };

  const handleDelete = async () => {
    if (!idRef.current) {
      router.back();
      return;
    }
    const ok = await confirm({
      title: 'Remove this person?',
      message: "This won't affect them. Just removes their entry here.",
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    await repo.remove(idRef.current);
    await refreshList();
    router.back();
  };

  const initials = name.trim()
    ? name.trim().split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const relMeta = relation ? RELATION_META[relation] : null;
  const dirty = snapshot() !== lastSavedRef.current;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} onPress={handleBack} bg={colors.surface} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
              {idRef.current ? 'Profile' : 'New person'}
            </Text>
            <Text variant="small" color={colors.textFaint} style={{ marginTop: 2 }}>
              {saving ? 'Saving...' : !name.trim() ? 'Empty' : dirty ? 'Unsaved' : 'Saved'}
            </Text>
          </View>
          <Pressable
            onPress={handleDone}
            hitSlop={8}
            style={[styles.doneBtn, { backgroundColor: colors.text }, !name.trim() && { opacity: 0.5 }]}
            disabled={!name.trim()}
          >
            <Check size={16} color={name.trim() ? colors.bg : colors.textFaint} strokeWidth={2.5} />
            <Text variant="smallMedium" color={name.trim() ? colors.bg : colors.textFaint}>Done</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: 80 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Photo + name */}
            <View style={styles.headerCard}>
              <Pressable onPress={pickPhoto} style={[styles.photoWrap, { backgroundColor: relMeta?.tint ?? colors.surfaceAlt }]}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photo} />
                ) : (
                  <>
                    <Camera size={20} color={colors.textSoft} strokeWidth={1.75} />
                    <Text variant="h3" color={colors.textSoft} style={{ marginTop: 4 }}>{initials}</Text>
                  </>
                )}
              </Pressable>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Their name"
                placeholderTextColor={colors.textFaint}
                style={[{ fontFamily: fonts.serifBold, fontSize: 26, letterSpacing: -0.3 }, styles.nameInput, { color: colors.text }]}
              />
            </View>

            {/* Relation */}
            <Section label="Relation">
              <View style={styles.chipRow}>
                {RELATIONS.map((r) => (
                  <Chip
                    key={r}
                    label={RELATION_META[r].label}
                    tint={RELATION_META[r].tint}
                    selected={relation === r}
                    size="sm"
                    onPress={() => setRelation(relation === r ? null : r)}
                  />
                ))}
              </View>
            </Section>

            {/* Birthday */}
            <Section label="Birthday" icon={Cake}>
              <Pressable
                onPress={() => { setShowBirthdayCal((v) => !v); setShowAnniversaryCal(false); }}
                style={[styles.lastContactRow, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
              >
                <Text variant="body" color={birthday ? colors.text : colors.textMuted}>
                  {birthday ? format(parseISO(birthday), 'MMMM d, yyyy') : 'Not set'}
                </Text>
                {birthday ? (
                  <Pressable onPress={() => setBirthday(null)} hitSlop={8}>
                    <Text variant="smallMedium" color={colors.textMuted}>Clear</Text>
                  </Pressable>
                ) : null}
              </Pressable>
              {showBirthdayCal ? (
                <View style={{ marginTop: spacing.sm }}>
                  <InlineCalendar
                    selected={birthday}
                    onSelect={(d) => { setBirthday(d); setShowBirthdayCal(false); }}
                  />
                </View>
              ) : null}
            </Section>

            {/* Anniversary */}
            <Section label="Anniversary" icon={Sparkle}>
              <Pressable
                onPress={() => { setShowAnniversaryCal((v) => !v); setShowBirthdayCal(false); }}
                style={[styles.lastContactRow, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
              >
                <Text variant="body" color={anniversary ? colors.text : colors.textMuted}>
                  {anniversary ? format(parseISO(anniversary), 'MMMM d, yyyy') : 'Not set'}
                </Text>
                {anniversary ? (
                  <Pressable onPress={() => setAnniversary(null)} hitSlop={8}>
                    <Text variant="smallMedium" color={colors.textMuted}>Clear</Text>
                  </Pressable>
                ) : null}
              </Pressable>
              {showAnniversaryCal ? (
                <View style={{ marginTop: spacing.sm }}>
                  <InlineCalendar
                    selected={anniversary}
                    onSelect={(d) => { setAnniversary(d); setShowAnniversaryCal(false); }}
                  />
                </View>
              ) : null}
            </Section>

            {/* Stay-in-touch reminder */}
            <Section label="Stay in touch" icon={Bell}>
              <View style={styles.chipRow}>
                <Chip
                  label="Off"
                  selected={!contactReminderDays}
                  size="sm"
                  onPress={() => setContactReminderDays(null)}
                />
                {FREQ_PRESETS.map((f) => (
                  <Chip
                    key={f.label}
                    label={f.label}
                    selected={contactReminderDays === f.days}
                    size="sm"
                    onPress={() => setContactReminderDays(f.days)}
                  />
                ))}
              </View>
              {contactReminderDays ? (
                <View style={styles.lastContactRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <CalIcon size={14} color={colors.textMuted} strokeWidth={1.75} />
                    <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                      Last contact: {lastContactDate ? format(parseISO(lastContactDate), 'MMM d, yyyy') : 'Never'}
                    </Text>
                  </View>
                  <Pressable onPress={markContactedToday} hitSlop={6}>
                    <Text variant="smallMedium" color={colors.text}>I REACHED OUT TODAY</Text>
                  </Pressable>
                </View>
              ) : null}
            </Section>

            <LongInput label="What they're working toward" value={theirGoals} onChangeText={setTheirGoals} placeholder="Their goals, ambitions, dreams." />
            <LongInput label="What they're going through" value={theirStruggles} onChangeText={setTheirStruggles} placeholder="Challenges, fears, weights they carry." />
            <LongInput label="How I support them" value={mySupport} onChangeText={setMySupport} placeholder="What does showing up for them look like?" />
            <LongInput label="What I've done for them" value={contributions} onChangeText={setContributions} placeholder="Concrete things you've done. Remember these." />
            <LongInput label="How I plan to be there" value={futurePlans} onChangeText={setFuturePlans} placeholder="Future ways to support, celebrate, show up." />
            <LongInput label="Other notes" value={notes} onChangeText={setNotes} placeholder="Birthdays, preferences, anything else." />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

function Section({ label, icon: Icon, children }: { label: string; icon?: any; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={styles.section}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {Icon ? <Icon size={14} color={c.textMuted} strokeWidth={1.75} /> : null}
        <Text variant="caption" color={c.textMuted} style={{ textTransform: 'uppercase' }}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

function LongInput({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (v: string) => void; placeholder: string }) {
  const c = useColors();
  return (
    <View style={styles.section}>
      <Text variant="caption" color={c.textMuted} style={{ textTransform: 'uppercase' }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textFaint}
        multiline
        style={[
          { fontFamily: fonts.sans, fontSize: 15 },
          styles.textArea,
          { color: c.text, backgroundColor: c.surface, borderColor: c.hairline },
        ]}
      />
    </View>
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
  headerCard: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  photoWrap: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  nameInput: { padding: 0, textAlign: 'center', minHeight: 36 },
  section: { gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  lastContactRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg, minHeight: 70,
    textAlignVertical: 'top',
  },
});
