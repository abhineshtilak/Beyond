import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Pressable, StyleSheet, Alert, TextInput } from 'react-native';
import { BookOpen, X, ChevronDown, ChevronUp, Plus } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { Text } from '@/components/Text';
import { Sheet, SheetRef } from '@/components/Sheet';
import { Button } from '@/components/Button';
import { useColors, radii, spacing, fonts } from '@/theme';
import * as repo from './repo';
import type { GoalLog } from './types';

type Props = { goalId: string };

const ENERGY_META: Record<number, { label: string; color: string; emoji: string }> = {
  1: { label: 'Struggling', color: '#C9664F', emoji: '😓' },
  2: { label: 'Okay', color: '#C4904A', emoji: '😐' },
  3: { label: 'Good', color: '#7A9E7E', emoji: '💪' },
  4: { label: 'On fire', color: '#5B8FA8', emoji: '⚡' },
};

export function GoalLogsSection({ goalId }: Props) {
  const colors = useColors();
  const [logs, setLogs] = useState<GoalLog[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [energy, setEnergy] = useState(3);
  const [hasContent, setHasContent] = useState(false);
  const contentRef = useRef('');
  const [inputKey, setInputKey] = useState(0);
  const sheetRef = useRef<SheetRef>(null);

  const reload = useCallback(async () => {
    const list = await repo.listGoalLogs(goalId);
    setLogs(list);
  }, [goalId]);

  useEffect(() => { reload(); }, [reload]);

  const openSheet = () => {
    contentRef.current = '';
    setHasContent(false);
    setEnergy(3);
    setInputKey((k) => k + 1);
    sheetRef.current?.present();
  };

  const onContentChange = useCallback((t: string) => {
    contentRef.current = t;
    const next = !!t.trim();
    setHasContent((prev) => (prev === next ? prev : next));
  }, []);

  const handleSave = async () => {
    if (!contentRef.current.trim()) return;
    setSaving(true);
    try {
      await repo.addGoalLog(goalId, contentRef.current, energy);
      sheetRef.current?.dismiss();
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete log', 'Remove this entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await repo.deleteGoalLog(id); await reload(); } },
    ]);
  };

  const visible = expanded ? logs : logs.slice(0, 3);

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <View style={styles.head}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <BookOpen size={14} color={colors.textMuted} strokeWidth={1.75} />
          <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
            Progress Log
          </Text>
          {logs.length > 0 && (
            <Text variant="caption" color={colors.textFaint}>· {logs.length}</Text>
          )}
        </View>
        <Pressable
          onPress={openSheet}
          style={({ pressed }) => [styles.addLogBtn, { backgroundColor: colors.surfaceAlt }, pressed && { opacity: 0.7 }]}
        >
          <Plus size={12} color={colors.textSoft} strokeWidth={2.5} />
          <Text variant="caption" color={colors.textSoft}>Log update</Text>
        </Pressable>
      </View>

      {logs.length === 0 ? (
        <Text variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
          Track what's actually happening. One honest sentence a day beats a perfect plan never written.
        </Text>
      ) : (
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          {visible.map((log) => {
            const meta = ENERGY_META[log.energy] ?? ENERGY_META[3];
            return (
              <View key={log.id} style={[styles.logEntry, { backgroundColor: colors.bg, borderColor: colors.hairline }]}>
                <View style={styles.logLeft}>
                  <View style={[styles.energyDot, { backgroundColor: meta.color + '33', borderColor: meta.color + '66' }]}>
                    <Text style={{ fontSize: 10 }}>{meta.emoji}</Text>
                  </View>
                  <View style={styles.logLine} />
                </View>
                <View style={styles.logRight}>
                  <Text variant="caption" color={colors.textFaint} style={{ marginBottom: 3 }}>
                    {format(parseISO(log.logDate), 'MMM d')} · {meta.label}
                  </Text>
                  <Text variant="body" color={colors.text} style={{ lineHeight: 22 }}>
                    {log.content}
                  </Text>
                  <Pressable onPress={() => handleDelete(log.id)} hitSlop={8} style={styles.deleteBtn}>
                    <X size={12} color={colors.textFaint} strokeWidth={2} />
                  </Pressable>
                </View>
              </View>
            );
          })}
          {logs.length > 3 && (
            <Pressable
              onPress={() => setExpanded((v) => !v)}
              style={({ pressed }) => [styles.expandBtn, pressed && { opacity: 0.7 }]}
            >
              {expanded
                ? <ChevronUp size={14} color={colors.textMuted} strokeWidth={2} />
                : <ChevronDown size={14} color={colors.textMuted} strokeWidth={2} />}
              <Text variant="caption" color={colors.textMuted}>
                {expanded ? 'Show less' : `${logs.length - 3} more entries`}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      <Sheet
        ref={sheetRef}
        title="Log update"
        subtitle="What's actually happening with this goal today?"
        snapPoints={['100%']}
        footer={<Button label="Save log" onPress={handleSave} loading={saving} disabled={!hasContent} />}
      >
        {/* Energy level */}
        <View>
          <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase', marginBottom: spacing.sm }}>
            How's it going?
          </Text>
          <View style={styles.energyRow}>
            {([1, 2, 3, 4] as const).map((e) => {
              const meta = ENERGY_META[e];
              const selected = energy === e;
              return (
                <Pressable
                  key={e}
                  onPress={() => setEnergy(e)}
                  style={[
                    styles.energyBtn,
                    {
                      backgroundColor: selected ? meta.color + '22' : colors.surfaceAlt,
                      borderColor: selected ? meta.color : colors.hairline,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 18 }}>{meta.emoji}</Text>
                  <Text variant="caption" color={selected ? meta.color : colors.textMuted}>{meta.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Text input */}
        <View>
          <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase', marginBottom: spacing.sm }}>
            What happened?
          </Text>
          <TextInput
            key={inputKey}
            defaultValue=""
            onChangeText={onContentChange}
            placeholder="What did you do? What got in the way? What did you learn?"
            placeholderTextColor={colors.textFaint}
            multiline
            autoCorrect={false}
            importantForAutofill="no"
            style={{
              fontFamily: fonts.sans,
              fontSize: 16,
              color: colors.text,
              borderColor: colors.hairline,
              backgroundColor: colors.bg,
              borderWidth: 1,
              borderRadius: radii.lg,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: spacing.md,
              minHeight: 200,
              textAlignVertical: 'top',
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addLogBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radii.pill,
  },
  logEntry: {
    flexDirection: 'row',
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  logLeft: {
    width: 32,
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  energyDot: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  logLine: {
    flex: 1, width: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginTop: 4,
  },
  logRight: {
    flex: 1,
    padding: spacing.md,
    paddingLeft: spacing.sm,
    position: 'relative',
  },
  deleteBtn: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
  },
  expandBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: spacing.xs, alignSelf: 'center',
  },
  energyRow: { flexDirection: 'row', gap: spacing.sm },
  energyBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md,
    borderRadius: radii.md, borderWidth: 1, gap: 4,
  },
});
