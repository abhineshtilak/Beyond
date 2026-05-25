import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Pressable, Image, StyleSheet, Alert } from 'react-native';
import { Plus, Quote, Image as ImageIcon, NotebookPen, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/Text';
import { Sheet, SheetRef } from '@/components/Sheet';
import { SheetInput as Input } from '@/components/SheetInput';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { useColors, radii, spacing } from '@/theme';
import * as repo from './repo';
import type { Inspiration, InspirationKind } from './types';

type Props = { goalId: string };

const KINDS: { key: InspirationKind; label: string; icon: any }[] = [
  { key: 'note', label: 'Note', icon: NotebookPen },
  { key: 'quote', label: 'Quote', icon: Quote },
  { key: 'image', label: 'Image', icon: ImageIcon },
];

export function InspirationSection({ goalId }: Props) {
  const colors = useColors();
  const [items, setItems] = useState<Inspiration[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [kind, setKind] = useState<InspirationKind>('note');
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const sheetRef = useRef<SheetRef>(null);

  const reload = useCallback(async () => {
    const list = await repo.listInspirations(goalId);
    setItems(list);
  }, [goalId]);

  useEffect(() => { reload(); }, [reload]);

  const openSheet = () => {
    setKind('note');
    setContent('');
    setImageUri(null);
    sheetRef.current?.present();
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access in settings to add images.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!res.canceled && res.assets?.[0]) {
      setImageUri(res.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (kind === 'image' && !imageUri) return;
    if ((kind === 'note' || kind === 'quote') && !content.trim()) return;
    setSaving(true);
    try {
      await repo.addInspiration(goalId, kind, content.trim() || null, imageUri);
      sheetRef.current?.dismiss();
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Remove inspiration', 'Delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await repo.deleteInspiration(id);
          await reload();
        },
      },
    ]);
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <View style={styles.head}>
        <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase' }}>
          Inspiration
        </Text>
      </View>
      {items.length === 0 ? (
        <Text variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
          Save quotes, images, or notes that pull you forward when motivation dips.
        </Text>
      ) : (
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          {items.map((it) => (
            <View key={it.id} style={[styles.item, { backgroundColor: colors.bg }]}>
              {it.kind === 'image' && it.imageUri ? (
                <Image source={{ uri: it.imageUri }} style={styles.image} />
              ) : null}
              {it.content ? (
                <View style={styles.contentBox}>
                  {it.kind === 'quote' ? <Quote size={14} color={colors.textMuted} strokeWidth={1.75} /> : null}
                  <Text
                    variant={it.kind === 'quote' ? 'h3' : 'body'}
                    style={{ flex: 1, fontStyle: it.kind === 'quote' ? 'italic' : 'normal' }}
                  >
                    {it.content}
                  </Text>
                </View>
              ) : null}
              <Pressable onPress={() => handleDelete(it.id)} hitSlop={8} style={styles.removeBtn}>
                <X size={14} color={colors.textFaint} strokeWidth={1.75} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Pressable onPress={openSheet} style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}>
        <Plus size={16} color={colors.textSoft} strokeWidth={2} />
        <Text variant="smallMedium" color={colors.textSoft}>Add inspiration</Text>
      </Pressable>

      <Sheet
        ref={sheetRef}
        title="Inspiration"
        subtitle="Something to anchor you."
        snapPoints={['80%']}
        footer={
          <Button
            label="Save"
            onPress={handleSave}
            loading={saving}
            disabled={kind === 'image' ? !imageUri : !content.trim()}
          />
        }
      >
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {KINDS.map((k) => (
            <Chip key={k.key} label={k.label} selected={kind === k.key} onPress={() => setKind(k.key)} />
          ))}
        </View>

        {kind === 'image' ? (
          <Pressable
            onPress={pickImage}
            style={[styles.imagePicker, { borderColor: colors.hairline, backgroundColor: colors.surface }]}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={{ width: '100%', height: 200, borderRadius: radii.md }} />
            ) : (
              <>
                <ImageIcon size={28} color={colors.textMuted} strokeWidth={1.6} />
                <Text variant="bodyMedium" color={colors.textSoft}>Choose image</Text>
              </>
            )}
          </Pressable>
        ) : null}

        <Input
          label={kind === 'quote' ? 'Quote' : 'Note'}
          placeholder={kind === 'quote' ? '"The cave you fear..."' : 'A thought to remember.'}
          value={content}
          onChangeText={setContent}
          multiline
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  head: {},
  item: {
    borderRadius: radii.md,
    overflow: 'hidden',
    position: 'relative',
  },
  contentBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  image: { width: '100%', height: 200 },
  removeBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.85)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  imagePicker: {
    height: 200,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
