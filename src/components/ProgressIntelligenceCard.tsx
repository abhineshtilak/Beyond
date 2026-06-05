/**
 * ProgressIntelligenceCard
 *
 * Cross-data AI insight card for the home screen.
 * Finds correlations between mood, habits, and goal activity that
 * the user can't see themselves — shown as 3 specific data-driven insights.
 *
 * Cached in SQLite (24h TTL). User can force-refresh.
 * Hidden until user explicitly loads it (to avoid burning API tokens).
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { TrendingUp, RefreshCw, ChevronDown, ChevronUp, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Text } from './Text';
import { radii, spacing, useColors } from '@/theme';
import { aiEnabled } from '@/features/ai/service';
import {
  analyzeLifePatterns,
  getCachedIntelligence,
  type ProgressIntelligence,
} from '@/features/ai/progressAI';

export function ProgressIntelligenceCard() {
  const colors = useColors();
  const router  = useRouter();

  const [open,         setOpen]         = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [hasKey,       setHasKey]       = useState<boolean | null>(null);
  const [intelligence, setIntelligence] = useState<ProgressIntelligence | null>(null);
  const [loaded,       setLoaded]       = useState(false); // first load attempted

  const load = useCallback(async (forceRefresh = false) => {
    if (loading) return;

    const keyPresent = await aiEnabled();
    setHasKey(keyPresent);
    if (!keyPresent) { setLoaded(true); return; }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await getCachedIntelligence();
      if (cached) { setIntelligence(cached); setLoaded(true); return; }
    }

    setLoading(true);
    try {
      const result = await analyzeLifePatterns(forceRefresh);
      setIntelligence(result);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [loading]);

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && !loaded) load();
  };

  const timeAgo = intelligence?.analysedAt
    ? (() => {
        const mins = Math.floor((Date.now() - intelligence.analysedAt) / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
      })()
    : null;

  return (
    <View style={[styles.container, { borderColor: colors.hairline, backgroundColor: colors.surface }]}>
      {/* Header */}
      <Pressable onPress={handleOpen} style={styles.header}>
        <View style={styles.headerLeft}>
          <TrendingUp size={16} color={'#9EB7C9'} strokeWidth={1.75} />
          <Text variant="bodyMedium">Pattern Intelligence</Text>
          {timeAgo ? (
            <Text variant="caption" color={colors.textFaint}>· {timeAgo}</Text>
          ) : null}
        </View>
        {open
          ? <ChevronUp   size={16} color={colors.textMuted} strokeWidth={1.75} />
          : <ChevronDown size={16} color={colors.textMuted} strokeWidth={1.75} />}
      </Pressable>

      {open ? (
        <View style={[styles.body, { borderTopColor: colors.hairline }]}>
          {hasKey === false ? (
            /* No key */
            <View style={styles.noKeyRow}>
              <Text variant="body" color={colors.textSoft} style={{ flex: 1, lineHeight: 22 }}>
                Add an AI key in Settings to see what your data reveals.
              </Text>
              <Pressable
                onPress={() => router.push('/settings' as any)}
                style={[styles.settingsBtn, { backgroundColor: colors.text }]}
              >
                <Text variant="caption" color={colors.bg}>Setup</Text>
              </Pressable>
            </View>

          ) : loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text variant="body" color={colors.textMuted}>Finding patterns in your data…</Text>
            </View>

          ) : !intelligence ? (
            /* First-time generate */
            <Pressable
              onPress={() => load()}
              style={({ pressed }) => [
                styles.generateBtn,
                { backgroundColor: '#9EB7C911', borderColor: '#9EB7C944' },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Sparkles size={15} color={'#9EB7C9'} strokeWidth={1.75} />
              <Text variant="bodyMedium" style={{ color: '#9EB7C9' }}>
                Analyse my patterns
              </Text>
              <Text variant="small" color={colors.textMuted} style={{ textAlign: 'center' }}>
                Mood × habits × goals — finds what you can't see
              </Text>
            </Pressable>

          ) : (
            /* Insights */
            <View style={{ gap: spacing.md }}>
              {/* Top pattern */}
              <View style={[styles.topPattern, { backgroundColor: '#9EB7C911', borderColor: '#9EB7C933' }]}>
                <Text variant="caption" color={'#9EB7C9'} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Key pattern
                </Text>
                <Text variant="body" color={colors.text} style={{ lineHeight: 22, marginTop: 4 }}>
                  {intelligence.topPattern}
                </Text>
              </View>

              {/* Insights list */}
              {intelligence.insights.map((insight, i) => (
                <View key={i} style={styles.insightRow}>
                  <View style={[styles.insightDot, { backgroundColor: '#9EB7C9' }]} />
                  <Text variant="body" color={colors.textSoft} style={{ flex: 1, lineHeight: 22 }}>
                    {insight}
                  </Text>
                </View>
              ))}

              {/* Action suggestion */}
              <View style={[styles.actionBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.hairline }]}>
                <Text variant="caption" color={colors.textMuted} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Suggested action
                </Text>
                <Text variant="body" color={colors.text} style={{ lineHeight: 22, marginTop: 4 }}>
                  {intelligence.actionSuggestion}
                </Text>
              </View>

              {/* Refresh + Chat CTA */}
              <View style={styles.actionsRow}>
                <Pressable
                  onPress={() => load(true)}
                  disabled={loading}
                  style={[styles.refreshBtn, { borderColor: colors.hairline }]}
                >
                  <RefreshCw size={13} color={colors.textMuted} strokeWidth={1.75} />
                  <Text variant="caption" color={colors.textMuted}>Refresh</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/chat' as any)}
                  style={[styles.chatBtn, { backgroundColor: colors.text }]}
                >
                  <Sparkles size={13} color={colors.bg} strokeWidth={1.75} />
                  <Text variant="caption" color={colors.bg}>Ask AI</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  body: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
  },
  noKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingsBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  generateBtn: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  topPattern: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  insightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  actionBox: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
});
