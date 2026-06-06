import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { format, parseISO } from 'date-fns';
import { Trash2 } from 'lucide-react-native';
import { Sheet, SheetRef } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { confirm } from '@/lib/confirm';
import { spacing } from '@/theme';
import { SleepPicker } from './SleepPicker';
import * as repo from './repo';
import type { SleepEntry, SleepEntryInput } from './types';

export type SleepSheetRef = {
  present: (
    wakeDate: string,
    onSaved: () => void,
    entry?: SleepEntry,
  ) => void;
  dismiss: () => void;
};

const DEFAULT_SLEEP: SleepEntryInput = {
  sleepHour: 22,
  sleepMinute: 30,
  wakeHour: 7,
  wakeMinute: 0,
};

export const SleepSheet = forwardRef<SleepSheetRef>(function SleepSheet(_, ref) {
  const sheetRef = useRef<SheetRef>(null);
  const wakeDateRef = useRef('');
  const onSavedRef = useRef<() => void>(() => {});
  const [editing, setEditing] = useState<SleepEntry | null>(null);
  const [pickerKey, setPickerKey] = useState(0);
  const [saving, setSaving] = useState(false);

  useImperativeHandle(ref, () => ({
    present: (wakeDate, onSaved, entry) => {
      wakeDateRef.current = wakeDate;
      onSavedRef.current = onSaved;
      setEditing(entry ?? null);
      setPickerKey((current) => current + 1);
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const initialValue: SleepEntryInput = editing
    ? {
      sleepHour: editing.sleepHour,
      sleepMinute: editing.sleepMinute,
      wakeHour: editing.wakeHour,
      wakeMinute: editing.wakeMinute,
    }
    : DEFAULT_SLEEP;

  const handleSave = async (input: SleepEntryInput) => {
    setSaving(true);
    try {
      if (editing) {
        await repo.updateSleepEntry(editing.id, input);
      } else {
        await repo.createSleepEntry(wakeDateRef.current, input);
      }
      onSavedRef.current();
      sheetRef.current?.dismiss();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    const accepted = await confirm({
      title: 'Delete sleep entry',
      message: 'This removes only this sleep record.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!accepted) return;

    setSaving(true);
    try {
      await repo.deleteSleepEntry(editing.id);
      onSavedRef.current();
      sheetRef.current?.dismiss();
    } finally {
      setSaving(false);
    }
  };

  const wakeDateLabel = wakeDateRef.current
    ? format(parseISO(wakeDateRef.current), 'MMMM d')
    : '';

  return (
    <Sheet
      ref={sheetRef}
      title={editing ? 'Edit sleep' : 'Log sleep'}
      subtitle={`Counted on ${wakeDateLabel}, the wake-up date`}
      snapPoints={['88%']}
    >
      <View style={styles.container}>
        <SleepPicker
          key={pickerKey}
          initialValue={initialValue}
          onConfirm={handleSave}
          saving={saving}
          submitLabel={editing ? 'Save changes' : 'Save sleep'}
        />

        {editing ? (
          <Pressable
            onPress={handleDelete}
            disabled={saving}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && { opacity: 0.65 },
            ]}
          >
            <Trash2 size={16} color="#B97A6B" strokeWidth={1.75} />
            <Text variant="bodyMedium" color="#B97A6B">
              Delete sleep entry
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Sheet>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
});
