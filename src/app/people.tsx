import React, { useCallback, useState } from 'react';
import { View, FlatList, Pressable, Image, StyleSheet } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, Users, Heart, X as CloseIcon } from 'lucide-react-native';
import * as Haptics from '@/lib/haptics';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { SelectionDeleteBtn } from '@/components/SelectionDeleteBtn';
import { radii, spacing, useColors, useTheme, resolveTint } from '@/theme';
import { confirm } from '@/lib/confirm';
import { usePeopleStore } from '@/features/people/store';
import { RELATION_META, type Person } from '@/features/people/types';
import * as repo from '@/features/people/repo';
import { CelebrationsCalendar } from '@/features/people/CelebrationsCalendar';

export default function PeopleScreen() {
  const router = useRouter();
  const colors = useColors();
  const items = usePeopleStore((s) => s.items);
  const refresh = usePeopleStore((s) => s.refresh);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectionMode = selected.size > 0;

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const enterSelection = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSelected(new Set([id]));
  };
  const toggleSel = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const exitSelection = () => setSelected(new Set());

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    const ok = await confirm({
      title: `Remove ${selected.size} from your circle?`,
      message: "This won't affect them. Just removes their entry here.",
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    for (const id of selected) await repo.remove(id);
    await refresh();
    exitSelection();
  };

  const openPerson = (id?: string) =>
    router.push(id ? { pathname: '/person', params: { id } } : '/person');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen scroll={false} padded={false}>
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
              {selectionMode ? (
                <View style={styles.header}>
                  <IconButton icon={CloseIcon} onPress={exitSelection} bg={colors.surface} />
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                      Selection
                    </Text>
                    <Text variant="h2" style={{ marginTop: 2 }}>{selected.size} selected</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.header}>
                  <IconButton icon={ChevronLeft} onPress={() => router.back()} bg={colors.surface} />
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
                      Your circle
                    </Text>
                    <Text variant="h1" style={{ marginTop: 2 }}>Your people</Text>
                  </View>
                </View>
              )}
              <Text variant="body" color={colors.textSoft}>
                {selectionMode
                  ? 'Tap to add or remove from selection.'
                  : 'Relationships are tended, not stored. Long-press a card to begin selection.'}
              </Text>
              {!selectionMode && items.length > 0 ? (
                <View style={{ marginTop: spacing.sm }}>
                  <CelebrationsCalendar
                    people={items}
                    onPersonTap={(id) => openPerson(id)}
                  />
                </View>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <PersonRow
              person={item}
              selectionMode={selectionMode}
              selected={selected.has(item.id)}
              onPress={() => (selectionMode ? toggleSel(item.id) : openPerson(item.id))}
              onLongPress={() => enterSelection(item.id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={
            <EmptyState
              icon={Users}
              title="Your people"
              message="Add someone who matters to you. A parent, a friend, a mentor. Track what they're going through and how you can support them."
            />
          }
        />

        {selectionMode ? (
          <SelectionDeleteBtn onPress={bulkDelete} />
        ) : (
          <Fab onPress={() => openPerson()} />
        )}
      </Screen>
    </>
  );
}

function PersonRow({
  person,
  selectionMode,
  selected,
  onPress,
  onLongPress,
}: {
  person: Person;
  selectionMode: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const colors = useColors();
  const { resolved } = useTheme();
  const cat = person.relation ? RELATION_META[person.relation] : null;
  const catTint = resolveTint(cat?.tint, resolved);
  const dueIn = repo.reminderDueIn(person);
  const daysSince = repo.daysSinceContact(person);

  let reminderLabel: { text: string; color: string } | null = null;
  if (dueIn !== null) {
    if (dueIn < 0) reminderLabel = { text: `OVERDUE BY ${Math.abs(dueIn)}D`, color: '#B97A6B' };
    else if (dueIn === 0) reminderLabel = { text: 'REACH OUT TODAY', color: colors.text };
    else if (dueIn <= 2) reminderLabel = { text: `REACH OUT IN ${dueIn}D`, color: colors.textSoft };
  }

  const initials = person.name
    .split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected ? colors.accentSoft : colors.surface,
          borderColor: selected ? colors.text : colors.hairline,
        },
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={[styles.avatarWrap, { backgroundColor: catTint ?? colors.surfaceAlt }]}>
        {person.photoUri ? (
          <Image source={{ uri: person.photoUri }} style={styles.avatar} />
        ) : (
          <Text variant="h3" color={colors.textSoft}>{initials}</Text>
        )}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="bodyMedium" numberOfLines={1}>{person.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
          {cat ? (
            <Text variant="caption" color={colors.textMuted}>{cat.label.toUpperCase()}</Text>
          ) : null}
          {daysSince !== null ? (
            <Text variant="caption" color={colors.textMuted}>
              · LAST: {daysSince === 0 ? 'TODAY' : `${daysSince}D AGO`}
            </Text>
          ) : null}
        </View>
        {reminderLabel ? (
          <View style={[styles.reminderChip, { borderColor: reminderLabel.color + '40' }]}>
            <Heart size={10} color={reminderLabel.color} strokeWidth={2} />
            <Text variant="caption" color={reminderLabel.color}>{reminderLabel.text}</Text>
          </View>
        ) : null}
      </View>
      {selectionMode ? (
        <View
          style={[
            styles.selDot,
            {
              backgroundColor: selected ? colors.text : 'transparent',
              borderColor: selected ? colors.text : colors.hairline,
            },
          ]}
        >
          {selected ? <Text variant="caption" color={colors.bg}>✓</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: 180 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
    borderWidth: 1, borderRadius: radii.lg,
    padding: spacing.lg,
  },
  avatarWrap: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },
  reminderChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  selDot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  selBar: {
    position: 'absolute',
    left: spacing.lg, right: spacing.lg, bottom: 110,
    padding: spacing.md,
    borderRadius: radii.xxl,
    borderWidth: 1,
  },
  barBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderRadius: radii.pill,
  },
});
