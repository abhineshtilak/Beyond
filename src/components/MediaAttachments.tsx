import React, { useState, useEffect } from 'react';
import { View, Pressable, Image, StyleSheet, Alert, ScrollView } from 'react-native';
import { Image as ImageIcon, Mic, Video as VideoIcon, X, Play, Pause, Square } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  useAudioRecorder,
  useAudioPlayer,
  RecordingPresets,
  setAudioModeAsync,
  AudioModule,
} from 'expo-audio';
import { Text } from './Text';
import { colors, radii, spacing } from '@/theme';

export type AttachmentKind = 'image' | 'audio' | 'video';
export type Attachment = {
  kind: AttachmentKind;
  uri: string;
  duration?: number;
};

type Props = {
  attachments: Attachment[];
  onChange: (next: Attachment[]) => void;
};

export function MediaAttachments({ attachments, onChange }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const granted = await AudioModule.requestRecordingPermissionsAsync();
        if (granted.granted) {
          await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!recording) return;
    setRecordSecs(0);
    const t = setInterval(() => setRecordSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!res.canceled && res.assets?.[0]) {
      onChange([...attachments, { kind: 'image', uri: res.assets[0].uri }]);
    }
  };

  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow video access.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 0.8 });
    if (!res.canceled && res.assets?.[0]) {
      onChange([...attachments, { kind: 'video', uri: res.assets[0].uri, duration: res.assets[0].duration ?? undefined }]);
    }
  };

  const startRecord = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow microphone access.');
        return;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
    } catch (e) {
      console.warn('record failed', e);
    }
  };

  const stopRecord = async () => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      setRecording(false);
      if (uri) {
        onChange([...attachments, { kind: 'audio', uri, duration: recordSecs }]);
      }
    } catch (e) {
      setRecording(false);
    }
  };

  const remove = (idx: number) => {
    onChange(attachments.filter((_, i) => i !== idx));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.actions}>
        <Pressable onPress={pickImage} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}>
          <ImageIcon size={18} color={colors.text} strokeWidth={1.75} />
          <Text variant="smallMedium">Photo</Text>
        </Pressable>
        <Pressable onPress={pickVideo} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}>
          <VideoIcon size={18} color={colors.text} strokeWidth={1.75} />
          <Text variant="smallMedium">Video</Text>
        </Pressable>
        {recording ? (
          <Pressable onPress={stopRecord} style={({ pressed }) => [styles.actionBtn, styles.recording, pressed && { opacity: 0.7 }]}>
            <Square size={14} color={colors.bg} strokeWidth={2} fill={colors.bg} />
            <Text variant="smallMedium" color={colors.bg}>{formatSecs(recordSecs)}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={startRecord} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}>
            <Mic size={18} color={colors.text} strokeWidth={1.75} />
            <Text variant="smallMedium">Voice</Text>
          </Pressable>
        )}
      </View>

      {attachments.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {attachments.map((a, i) => (
            <AttachmentTile key={i} item={a} onRemove={() => remove(i)} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function AttachmentTile({ item, onRemove }: { item: Attachment; onRemove: () => void }) {
  if (item.kind === 'image') {
    return (
      <View style={styles.tile}>
        <Image source={{ uri: item.uri }} style={styles.tileMedia} />
        <RemoveBtn onPress={onRemove} />
      </View>
    );
  }
  if (item.kind === 'video') {
    return (
      <View style={[styles.tile, { backgroundColor: '#111' }]}>
        <View style={styles.videoOverlay}>
          <Play size={32} color="#fff" fill="#fff" />
          {item.duration ? <Text variant="caption" color="#fff" style={{ marginTop: 4 }}>{formatSecs(Math.floor(item.duration))}</Text> : null}
        </View>
        <RemoveBtn onPress={onRemove} />
      </View>
    );
  }
  return <AudioTile item={item} onRemove={onRemove} />;
}

function AudioTile({ item, onRemove }: { item: Attachment; onRemove: () => void }) {
  const player = useAudioPlayer(item.uri);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (s: any) => {
      setPlaying(!!s?.playing);
    });
    return () => sub?.remove?.();
  }, [player]);

  const toggle = () => {
    if (playing) {
      player.pause();
    } else {
      try { player.seekTo(0); } catch {}
      player.play();
    }
  };

  return (
    <View style={[styles.tile, styles.audioTile]}>
      <Pressable onPress={toggle} hitSlop={8}>
        <View style={styles.playBtn}>
          {playing ? <Pause size={20} color={colors.bg} fill={colors.bg} /> : <Play size={20} color={colors.bg} fill={colors.bg} />}
        </View>
      </Pressable>
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <Mic size={16} color={colors.textSoft} strokeWidth={1.75} />
        {item.duration ? (
          <Text variant="caption" color={colors.textSoft} style={{ marginTop: 4 }}>{formatSecs(item.duration)}</Text>
        ) : null}
      </View>
      <RemoveBtn onPress={onRemove} />
    </View>
  );
}

function RemoveBtn({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.removeBtn} hitSlop={8}>
      <X size={12} color={colors.text} strokeWidth={2.5} />
    </Pressable>
  );
}

function formatSecs(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const TILE_SIZE = 96;

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  recording: { backgroundColor: '#C97B6E', borderColor: '#C97B6E' },
  row: { gap: spacing.sm, paddingVertical: 2 },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: radii.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  tileMedia: { width: '100%', height: '100%' },
  audioTile: { alignItems: 'center', justifyContent: 'center' },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
