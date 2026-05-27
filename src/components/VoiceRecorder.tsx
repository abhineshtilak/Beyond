import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Alert } from 'react-native';
import {
  useAudioRecorder,
  RecordingPresets,
  setAudioModeAsync,
  AudioModule,
} from 'expo-audio';
import { Mic, Square, X } from 'lucide-react-native';
import * as Haptics from '@/lib/haptics';
import { Text } from './Text';
import { LiveWaveform } from './Waveform';
import { useColors, radii, spacing } from '@/theme';

type Props = {
  onComplete: (uri: string, durationSecs: number) => void;
  compact?: boolean;
  onRecordingChange?: (recording: boolean) => void;
};

export function VoiceRecorder({ onComplete, compact = false, onRecordingChange }: Props) {
  const colors = useColors();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const g = await AudioModule.requestRecordingPermissionsAsync();
        if (g.granted) {
          await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!recording) return;
    setSecs(0);
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const start = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Microphone access', 'Allow microphone in settings to record voice notes.');
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
      onRecordingChange?.(true);
    } catch (e) {
      console.warn('record start failed', e);
    }
  };

  const stop = async () => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      const duration = secs;
      setRecording(false);
      onRecordingChange?.(false);
      if (uri) onComplete(uri, duration);
    } catch {
      setRecording(false);
      onRecordingChange?.(false);
    }
  };

  const cancel = async () => {
    try { await recorder.stop(); } catch {}
    setRecording(false);
    onRecordingChange?.(false);
  };

  if (!recording) {
    return (
      <Pressable
        onPress={start}
        style={({ pressed }) => [
          styles.recBtn,
          compact && styles.recBtnCompact,
          { backgroundColor: colors.surface, borderColor: colors.hairline },
          pressed && { opacity: 0.8 },
        ]}
        hitSlop={6}
      >
        <Mic size={compact ? 16 : 18} color={colors.text} strokeWidth={1.75} />
      </Pressable>
    );
  }

  return (
    <View style={[styles.recordingBar, compact && styles.recordingBarCompact, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <Pressable onPress={cancel} hitSlop={8} style={[styles.cancelBtn, compact && styles.smallRoundBtn]}>
        <X size={compact ? 14 : 16} color={colors.textMuted} strokeWidth={2} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <LiveWaveform recording={recording} durationSecs={secs} />
      </View>
      <Pressable onPress={stop} hitSlop={8} style={[styles.stopBtn, compact && styles.smallRoundBtn, { backgroundColor: '#C97B6E' }]}>
        <Square size={compact ? 12 : 14} color={colors.bg} fill={colors.bg} strokeWidth={0} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  recBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recBtnCompact: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
    flex: 1,
  },
  recordingBarCompact: {
    minHeight: 34,
    paddingVertical: 2,
  },
  cancelBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallRoundBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});
