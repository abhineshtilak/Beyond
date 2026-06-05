/**
 * GoalContextMap — collapsible mission brief
 *
 * A vertical journey strip showing everything that defines the goal.
 * Uses lucide icons (theme-aware, no WhatsApp emoji). Minimizable since
 * it's a one-time setup — you don't need to re-read it constantly.
 *
 * Journey order:
 *   Target   → what exactly is the goal
 *   AlignLeft → explain it in full
 *   MapPin   → where you are now
 *   Zap      → inner obstacles
 *   Globe    → outer obstacles
 *   Heart    → why it matters
 *   Eye      → how reaching it will feel
 *   ListChecks → action plan
 *
 * Skills moved to SkillsSection beside Milestones.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, TextInput } from 'react-native';
import {
  Target, AlignLeft, MapPin, Zap, Globe,
  Heart, Eye, ListChecks, ChevronDown, ChevronUp, Check, Plus,
} from 'lucide-react-native';
import { Text } from '@/components/Text';
import { StableTextInput } from '@/components/StableTextInput';
import { fonts, radii, spacing, useColors } from '@/theme';
import type { Goal, GoalInput } from './types';

// ─── Config ───────────────────────────────────────────────────────────────────

type FieldKey = keyof Pick<Goal,
  'description' | 'specification' | 'currentPosition' |
  'innerObstacles' | 'outerObstacles' | 'why' | 'feeling' | 'procedure'
>;

type FieldDef = {
  key: FieldKey;
  Icon: React.ComponentType<any>;
  hint: string;
  serif?: boolean;
};

const FIELDS: FieldDef[] = [
  { key: 'description',     Icon: AlignLeft,    hint: 'Explain the goal' },
  { key: 'specification',   Icon: Target,       hint: 'Make it specific — numbers, dates, exact outcome' },
  { key: 'currentPosition', Icon: MapPin,       hint: 'Where you are now' },
  { key: 'why',             Icon: Heart,        hint: 'Why this matters', serif: true },
  { key: 'feeling',         Icon: Eye,          hint: 'How it will feel when you reach it' },
  { key: 'procedure',       Icon: ListChecks,   hint: 'Action plan — what you do daily / weekly' },
];

const PAIRED_KEYS: FieldKey[] = ['innerObstacles', 'outerObstacles'];

type Props = {
  goal: Goal;
  onUpdate: (patch: Partial<GoalInput>) => Promise<void>;
};

// ─── Single row ───────────────────────────────────────────────────────────────

function FieldRow({
  fieldDef,
  value,
  isLast,
  onSave,
}: {
  fieldDef: FieldDef;
  value: string | null | undefined;
  isLast: boolean;
  onSave: (v: string | null) => Promise<void>;
}) {
  const colors    = useColors();
  const [editing, setEditing] = useState(false);
  const draftRef  = useRef(value ?? '');
  const savingRef = useRef(false);
  const inputRef  = useRef<TextInput>(null);

  useEffect(() => {
    if (!editing) draftRef.current = value ?? '';
  }, [value, editing]);

  useEffect(() => {
    if (!editing) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [editing]);

  const finish = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setEditing(false);
    try {
      const v = draftRef.current.trim();
      if (v !== (value ?? '').trim()) await onSave(v || null);
    } finally { savingRef.current = false; }
  };

  const filled  = !!(value?.trim());
  const { Icon } = fieldDef;
  const iconColor = editing ? colors.accent : filled ? colors.textSoft : colors.textFaint;

  return (
    <View style={styles.row}>
      {/* Left: icon + spine */}
      <View style={styles.iconCol}>
        <Icon size={15} color={iconColor} strokeWidth={1.6} />
        {!isLast && <View style={[styles.spine, { backgroundColor: colors.hairline }]} />}
      </View>

      {/* Right: content */}
      {editing ? (
        <View style={[styles.fieldContent, { paddingBottom: spacing.lg }]}>
          <View style={styles.editBar}>
            <View style={[styles.activeDot, { backgroundColor: colors.accent }]} />
            <Pressable
              onPress={finish}
              hitSlop={10}
              style={[styles.doneBtn, { backgroundColor: colors.text }]}
            >
              <Check size={10} color={colors.bg} strokeWidth={2.5} />
              <Text variant="caption" color={colors.bg}>Done</Text>
            </Pressable>
          </View>
          <StableTextInput
            ref={inputRef}
            defaultValue={draftRef.current}
            onChangeText={(t) => { draftRef.current = t; }}
            onBlur={finish}
            multiline
            placeholder={fieldDef.hint}
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.accent}
            autoCorrect={false}
            importantForAutofill="no"
            style={{
              fontFamily: fieldDef.serif ? fonts.serif : fonts.sans,
              fontSize: fieldDef.serif ? 17 : 15,
              lineHeight: fieldDef.serif ? 26 : 22,
              color: colors.text,
              minHeight: 56,
              textAlignVertical: 'top',
              padding: 0,
              paddingBottom: spacing.xs,
            }}
          />
        </View>
      ) : (
        <Pressable
          onPress={() => { draftRef.current = value ?? ''; setEditing(true); }}
          style={({ pressed }) => [
            styles.fieldContent,
            { paddingBottom: spacing.lg },
            pressed && { opacity: 0.65 },
          ]}
        >
          {filled ? (
            <Text
              variant="body"
              color={colors.text}
              style={{
                fontFamily: fieldDef.serif ? fonts.serif : fonts.sans,
                fontSize: fieldDef.serif ? 17 : 15,
                lineHeight: fieldDef.serif ? 26 : 22,
              }}
            >
              {value}
            </Text>
          ) : (
            <View style={styles.emptyRow}>
              <Text variant="body" color={colors.textFaint} style={{ flex: 1 }}>
                {fieldDef.hint}
              </Text>
              <Plus size={13} color={colors.textFaint} strokeWidth={1.75} />
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
}

// ─── Obstacles row (inner + outer side by side) ───────────────────────────────

function ObstaclesRow({
  innerValue, outerValue, onSaveInner, onSaveOuter, isLast,
}: {
  innerValue: string | null | undefined;
  outerValue: string | null | undefined;
  onSaveInner: (v: string | null) => Promise<void>;
  onSaveOuter: (v: string | null) => Promise<void>;
  isLast: boolean;
}) {
  const colors  = useColors();
  const [editing, setEditing] = useState<'inner' | 'outer' | null>(null);
  const innerRef  = useRef(innerValue ?? '');
  const outerRef  = useRef(outerValue ?? '');
  const savingRef = useRef(false);
  const inputRef  = useRef<TextInput>(null);

  useEffect(() => {
    if (!editing) { innerRef.current = innerValue ?? ''; outerRef.current = outerValue ?? ''; }
  }, [innerValue, outerValue, editing]);

  useEffect(() => {
    if (!editing) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [editing]);

  const finish = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    const which = editing;
    setEditing(null);
    try {
      if (which === 'inner') {
        const v = innerRef.current.trim();
        if (v !== (innerValue ?? '').trim()) await onSaveInner(v || null);
      } else if (which === 'outer') {
        const v = outerRef.current.trim();
        if (v !== (outerValue ?? '').trim()) await onSaveOuter(v || null);
      }
    } finally { savingRef.current = false; }
  };

  function Cell({
    which, label, val, Icon: CellIcon,
  }: {
    which: 'inner' | 'outer';
    label: string;
    val: string | null | undefined;
    Icon: React.ComponentType<any>;
  }) {
    const filled    = !!(val?.trim());
    const isEditing = editing === which;
    return (
      <Pressable
        onPress={() => {
          if (which === 'inner') innerRef.current = innerValue ?? '';
          else outerRef.current = outerValue ?? '';
          setEditing(which);
        }}
        style={({ pressed }) => [
          styles.obstacleCell,
          {
            borderColor: isEditing ? colors.accent : colors.hairline,
            backgroundColor: colors.surfaceAlt,
          },
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={styles.cellHead}>
          <CellIcon size={13} color={isEditing ? colors.accent : colors.textMuted} strokeWidth={1.6} />
          <Text variant="caption" color={colors.textMuted}>{label}</Text>
          {isEditing ? (
            <Pressable onPress={finish} hitSlop={8} style={[styles.doneBtnSm, { backgroundColor: colors.text }]}>
              <Check size={9} color={colors.bg} strokeWidth={2.5} />
            </Pressable>
          ) : null}
        </View>
        {isEditing ? (
          <StableTextInput
            ref={which === editing ? inputRef : undefined}
            defaultValue={which === 'inner' ? innerRef.current : outerRef.current}
            onChangeText={(t) => { if (which === 'inner') innerRef.current = t; else outerRef.current = t; }}
            onBlur={finish}
            multiline
            placeholder={label}
            placeholderTextColor={colors.textFaint}
            autoCorrect={false}
            style={{
              fontFamily: fonts.sans, fontSize: 13, lineHeight: 19,
              color: colors.text, minHeight: 44,
              textAlignVertical: 'top', padding: 0, marginTop: spacing.xs,
            }}
          />
        ) : (
          <Text
            variant="small"
            color={filled ? colors.textSoft : colors.textFaint}
            style={{ marginTop: 4, lineHeight: 18 }}
            numberOfLines={3}
          >
            {filled ? val : '—'}
          </Text>
        )}
      </Pressable>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.iconCol}>
        <Zap size={15} color={colors.textFaint} strokeWidth={1.6} />
        {!isLast && <View style={[styles.spine, { backgroundColor: colors.hairline }]} />}
      </View>
      <View style={[styles.fieldContent, { paddingBottom: spacing.lg }]}>
        <View style={styles.obstaclesRow}>
          <Cell which="inner" label="Inner"  val={innerValue} Icon={Zap} />
          <Cell which="outer" label="Outer"  val={outerValue} Icon={Globe} />
        </View>
      </View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function GoalContextMap({ goal, onUpdate }: Props) {
  const colors = useColors();

  // Default: collapsed if most fields are filled, expanded if mostly empty
  const filledCount = [
    goal.description, goal.specification, goal.currentPosition,
    goal.innerObstacles, goal.outerObstacles, goal.why, goal.feeling, goal.procedure,
  ].filter(Boolean).length;
  const [expanded, setExpanded] = useState(filledCount < 4);

  const save = (key: FieldKey) => async (v: string | null) =>
    onUpdate({ [key]: v } as Partial<GoalInput>);

  const mainFields   = FIELDS.filter((f) => !PAIRED_KEYS.includes(f.key));
  const beforeObs    = mainFields.filter((_, i) => i < 2); // description, specification
  const afterObs     = mainFields.filter((_, i) => i >= 2); // why, feeling, procedure
  const lastFieldKey = afterObs[afterObs.length - 1].key;

  // Compact summary when collapsed
  const summaryParts = [
    goal.description ? goal.description.slice(0, 60) : null,
    goal.currentPosition ? `Now: ${goal.currentPosition.slice(0, 40)}` : null,
    goal.why ? `Why: ${goal.why.slice(0, 40)}` : null,
  ].filter(Boolean);

  return (
    <View>
      {/* ── Toggle header ── */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.toggleRow, pressed && { opacity: 0.7 }]}
      >
        <Text variant="caption" color={colors.textMuted} style={styles.toggleLabel}>
          CONTEXT
        </Text>
        <View style={styles.toggleRight}>
          {!expanded && summaryParts.length > 0 ? (
            <Text variant="caption" color={colors.textFaint} numberOfLines={1} style={{ flex: 1, textAlign: 'right', marginRight: spacing.sm }}>
              {summaryParts[0]}
            </Text>
          ) : null}
          {expanded
            ? <ChevronUp   size={14} color={colors.textFaint} strokeWidth={1.75} />
            : <ChevronDown size={14} color={colors.textFaint} strokeWidth={1.75} />}
        </View>
      </Pressable>

      {/* ── Map body ── */}
      {expanded ? (
        <View style={{ paddingTop: spacing.sm }}>
          {/* Describe + Specify — come before obstacles */}
          {beforeObs.map((f) => (
            <FieldRow
              key={f.key}
              fieldDef={f}
              value={goal[f.key] as string | null}
              isLast={false}
              onSave={save(f.key)}
            />
          ))}

          {/* Current position */}
          <FieldRow
            fieldDef={{ key: 'currentPosition', Icon: MapPin, hint: 'Where you are now' }}
            value={goal.currentPosition}
            isLast={false}
            onSave={save('currentPosition')}
          />

          {/* Inner + Outer obstacles side by side */}
          <ObstaclesRow
            innerValue={goal.innerObstacles}
            outerValue={goal.outerObstacles}
            onSaveInner={save('innerObstacles')}
            onSaveOuter={save('outerObstacles')}
            isLast={false}
          />

          {/* Why, Feeling, Action plan */}
          {afterObs.map((f) => (
            <FieldRow
              key={f.key}
              fieldDef={f}
              value={goal[f.key] as string | null}
              isLast={f.key === lastFieldKey}
              onSave={save(f.key)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ICON_COL = 28;
const SPINE_W  = 1.5;

const styles = StyleSheet.create({
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  toggleLabel: { letterSpacing: 0.8 },
  toggleRight: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' },

  // Row
  row: { flexDirection: 'row', gap: spacing.md },
  iconCol: { width: ICON_COL, alignItems: 'center', paddingTop: 3 },
  spine: { flex: 1, width: SPINE_W, marginTop: 4, minHeight: 16 },
  fieldContent: { flex: 1, paddingTop: 2 },

  // Empty
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  // Edit bar
  editBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.sm,
  },
  activeDot: { width: 5, height: 5, borderRadius: 3 },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.pill,
  },
  doneBtnSm: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },

  // Obstacles
  obstaclesRow: { flexDirection: 'row', gap: spacing.sm },
  obstacleCell: {
    flex: 1, borderRadius: radii.md, borderWidth: 1,
    padding: spacing.sm, minHeight: 68,
  },
  cellHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
