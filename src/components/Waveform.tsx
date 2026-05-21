import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Play, Pause, Mic, Trash2 } from 'lucide-react-native';
import { useAudioPlayer } from 'expo-audio';
import { Text } from './Text';
import { useColors } from '@/theme';

const BAR_COUNT_LIVE = 30;
const BAR_COUNT_PLAYBACK = 36;

/** Live recording waveform — animated bars that pulse while recording */
export function LiveWaveform({ recording, durationSecs }: { recording: boolean; durationSecs: number }) {
  const colors = useColors();
  const bars = useMemo(
    () => Array.from({ length: BAR_COUNT_LIVE }, (_, i) => i),
    [],
  );

  return (
    <View style={styles.liveWrap}>
      <View style={[styles.recDot, { backgroundColor: recording ? '#C97B6E' : colors.textFaint }]} />
      <Text variant="smallMedium" color={colors.textSoft}>
        {formatSecs(durationSecs)}
      </Text>
      <View style={styles.barsRow}>
        {bars.map((i) => (
          <LiveBar key={i} index={i} active={recording} />
        ))}
      </View>
    </View>
  );
}

function LiveBar({ index, active }: { index: number; active: boolean }) {
  const colors = useColors();
  const h = useSharedValue(0.2);

  useEffect(() => {
    if (!active) {
      h.value = withTiming(0.2, { duration: 220 });
      return;
    }
    let cancelled = false;
    const animate = () => {
      if (cancelled) return;
      // Cosine-modulated random — gives a more natural feel
      const phase = (Date.now() / 220 + index * 0.4) % (Math.PI * 2);
      const wave = (Math.cos(phase) + 1) / 2;          // 0..1
      const random = 0.3 + Math.random() * 0.7;        // 0.3..1
      const target = Math.max(0.15, Math.min(1, wave * random));
      h.value = withTiming(target, { duration: 180, easing: Easing.out(Easing.cubic) });
      setTimeout(animate, 160 + Math.random() * 80);
    };
    animate();
    return () => { cancelled = true; };
  }, [active, index, h]);

  const style = useAnimatedStyle(() => ({
    height: `${Math.max(8, h.value * 100)}%`,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        { backgroundColor: active ? '#C97B6E' : colors.inkFaint },
        style,
      ]}
    />
  );
}

/** Playback waveform — deterministic bars from URI; fills as audio plays */
export function PlaybackWaveform({
  uri,
  duration,
  tint,
  compact = false,
  onDelete,
}: {
  uri: string;
  duration?: number;
  tint?: string;
  compact?: boolean;
  onDelete?: () => void;
}) {
  const colors = useColors();
  const player = useAudioPlayer(uri);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [total, setTotal] = useState(duration ?? 0);

  const bars = useMemo(() => generateBars(uri, BAR_COUNT_PLAYBACK), [uri]);

  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (s: any) => {
      setPlaying(!!s?.playing);
      if (typeof s?.currentTime === 'number') setPosition(s.currentTime);
      if (typeof s?.duration === 'number' && s.duration > 0) setTotal(s.duration);
      if (s?.didJustFinish) {
        setPlaying(false);
        setPosition(0);
        try { player.seekTo(0); } catch {}
      }
    });
    return () => { sub?.remove?.(); };
  }, [player]);

  const toggle = () => {
    if (playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const progress = total > 0 ? Math.min(1, position / total) : 0;
  const filledCount = Math.floor(progress * bars.length);
  const accent = tint ?? colors.text;

  return (
    <View style={[styles.playbackWrap, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <Pressable onPress={toggle} hitSlop={8} style={[styles.playBtn, { backgroundColor: accent }]}>
        {playing ? (
          <Pause size={14} color={colors.bg} fill={colors.bg} />
        ) : (
          <Play size={14} color={colors.bg} fill={colors.bg} />
        )}
      </Pressable>
      <View style={styles.playbackBars}>
        {bars.map((h, i) => (
          <View
            key={i}
            style={[
              styles.playBar,
              {
                height: `${Math.max(15, h * 100)}%`,
                backgroundColor: i <= filledCount ? accent : colors.inkFaint,
              },
            ]}
          />
        ))}
      </View>
      <Text variant="caption" color={colors.textMuted} style={{ minWidth: 36, textAlign: 'right' }}>
        {formatSecs(playing || position > 0 ? Math.floor(position) : Math.floor(total || duration || 0))}
      </Text>
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={6}>
          <Trash2 size={14} color={colors.textMuted} strokeWidth={1.75} />
        </Pressable>
      ) : null}
    </View>
  );
}

function formatSecs(s: number): string {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/** Deterministic pseudo-random bars based on URI hash — feels natural without sampling audio */
function generateBars(uri: string, count: number): number[] {
  let hash = 0;
  for (let i = 0; i < uri.length; i++) {
    hash = (hash * 31 + uri.charCodeAt(i)) | 0;
  }
  const out: number[] = [];
  let seed = Math.abs(hash) || 1;
  for (let i = 0; i < count; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const r = seed / 233280;
    // shape: low at ends, fuller in middle
    const positional = Math.sin((i / count) * Math.PI) * 0.6 + 0.4;
    out.push(Math.max(0.15, Math.min(1, r * positional)));
  }
  return out;
}

const styles = StyleSheet.create({
  liveWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
  },
  recDot: { width: 8, height: 8, borderRadius: 4 },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 28,
  },
  bar: { width: 3, borderRadius: 2 },
  playbackWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playbackBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 28,
  },
  playBar: { width: 2.5, borderRadius: 1.5 },
});
