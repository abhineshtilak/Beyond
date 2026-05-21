import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Sheet, SheetRef } from '@/components/Sheet';
import { SheetInput as Input } from '@/components/SheetInput';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { Chip } from '@/components/Chip';
import { colors, radii, spacing } from '@/theme';
import { confirm } from '@/lib/confirm';
import { useRealizationsStore } from './store';
import { REALIZATION_META, REALIZATION_KINDS, type Realization, type RealizationKind } from './types';

export type RealizationEditorRef = {
  present: (item?: Realization, defaultKind?: RealizationKind) => void;
  dismiss: () => void;
};

export const RealizationEditor = forwardRef<RealizationEditorRef>(function RealizationEditor(_, ref) {
  const sheetRef = useRef<SheetRef>(null);
  const create = useRealizationsStore((s) => s.create);
  const update = useRealizationsStore((s) => s.update);
  const remove = useRealizationsStore((s) => s.remove);

  const [editing, setEditing] = useState<Realization | null>(null);
  const [content, setContent] = useState('');
  const [kind, setKind] = useState<RealizationKind>('realization');
  const [saving, setSaving] = useState(false);

  const reset = useCallback((item?: Realization, defaultKind?: RealizationKind) => {
    setEditing(item ?? null);
    setContent(item?.content ?? '');
    setKind(item?.kind ?? defaultKind ?? 'realization');
  }, []);

  useImperativeHandle(ref, () => ({
    present: (item, defaultKind) => {
      reset(item, defaultKind);
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const input = { content: content.trim(), kind };
      if (editing) await update(editing.id, input);
      else await create(input);
      sheetRef.current?.dismiss();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    const ok = await confirm({ title: 'Delete entry', confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    await remove(editing.id);
    sheetRef.current?.dismiss();
  };

  const meta = REALIZATION_META[kind];

  return (
    <Sheet
      ref={sheetRef}
      title={editing ? 'Edit entry' : 'Capture a thought'}
      subtitle={meta.description}
      snapPoints={['85%']}
      footer={<Button label={editing ? 'Save' : 'Add'} onPress={handleSave} loading={saving} disabled={!content.trim()} />}
    >
      <View style={styles.section}>
        <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>Kind</Text>
        <View style={styles.chipRow}>
          {REALIZATION_KINDS.map((k) => (
            <Chip
              key={k}
              label={REALIZATION_META[k].label}
              selected={kind === k}
              tint={REALIZATION_META[k].tint}
              onPress={() => setKind(k)}
              size="sm"
            />
          ))}
        </View>
      </View>

      <Input
        label={kind === 'quote' ? 'Quote' : 'Thought'}
        placeholder={kind === 'quote' ? '"The cave you fear to enter..."' : 'What did you notice?'}
        value={content}
        onChangeText={setContent}
        multiline
        autoFocus
      />

      {editing ? (
        <Pressable onPress={handleDelete} style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}>
          <Trash2 size={16} color="#B97A6B" strokeWidth={1.75} />
          <Text variant="bodyMedium" color="#B97A6B">Delete</Text>
        </Pressable>
      ) : null}
    </Sheet>
  );
});

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#E8D0CB',
    backgroundColor: '#F7E9E5',
  },
});
