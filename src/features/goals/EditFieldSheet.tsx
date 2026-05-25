import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { Sheet, SheetRef } from '@/components/Sheet';
import { SheetInput as Input } from '@/components/SheetInput';
import { Button } from '@/components/Button';

export type EditFieldSheetRef = {
  present: (opts: {
    title: string;
    subtitle?: string;
    label?: string;
    placeholder?: string;
    initialValue?: string | null;
    onSave: (value: string | null) => Promise<void> | void;
  }) => void;
  dismiss: () => void;
};

export const EditFieldSheet = forwardRef<EditFieldSheetRef>(function EditFieldSheet(_, ref) {
  const sheetRef = useRef<SheetRef>(null);
  const [config, setConfig] = useState<Parameters<EditFieldSheetRef['present']>[0] | null>(null);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const present = useCallback((opts: Parameters<EditFieldSheetRef['present']>[0]) => {
    setConfig(opts);
    setValue(opts.initialValue ?? '');
    sheetRef.current?.present();
  }, []);

  useImperativeHandle(ref, () => ({
    present,
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await config.onSave(value.trim() || null);
      sheetRef.current?.dismiss();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      ref={sheetRef}
      title={config?.title ?? ''}
      subtitle={config?.subtitle}
      snapPoints={['90%']}
      footer={<Button label="Save" onPress={handleSave} loading={saving} />}
    >
      <Input
        label={config?.label}
        placeholder={config?.placeholder}
        value={value}
        onChangeText={setValue}
        multiline
        autoFocus
      />
    </Sheet>
  );
});
