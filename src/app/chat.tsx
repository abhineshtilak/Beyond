/**
 * AI Reflection Chatbot screen — /chat
 *
 * The user's personal AI that knows their goals, habits, mood, journal,
 * and reflections. Answers questions about their life from real data.
 *
 * Features:
 *  • Conversation history within session
 *  • Builds user context once on open (cached in state)
 *  • Suggested starter questions as scrollable chips
 *  • Graceful "no key" state with settings link
 *  • Keyboard-avoiding layout
 */
import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Send, Sparkles } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { radii, spacing, useColors } from '@/theme';
import { aiEnabled } from '@/features/ai/service';
import {
  chat,
  buildUserContext,
  SUGGESTED_QUESTIONS,
  type ChatMessage,
} from '@/features/ai/chatAI';

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  colors,
}: {
  message: ChatMessage;
  colors: ReturnType<typeof useColors>;
}) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser ? (
        <View style={[styles.avatar, { backgroundColor: '#9B87C022' }]}>
          <Sparkles size={13} color={'#9B87C0'} strokeWidth={1.75} />
        </View>
      ) : null}
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: colors.text }]
            : [styles.bubbleAI,   { backgroundColor: colors.surface, borderColor: colors.hairline }],
        ]}
      >
        <Text
          variant="body"
          color={isUser ? colors.bg : colors.text}
          style={{ lineHeight: 22 }}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.bubbleRow}>
      <View style={[styles.avatar, { backgroundColor: '#9B87C022' }]}>
        <Sparkles size={13} color={'#9B87C0'} strokeWidth={1.75} />
      </View>
      <View style={[styles.bubble, styles.bubbleAI, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
        <ActivityIndicator size="small" color={colors.textMuted} />
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const colors  = useColors();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [hasKey,    setHasKey]    = useState<boolean | null>(null);
  const [context,   setContext]   = useState<string | null>(null);
  const [buildingCtx, setBuildingCtx] = useState(true);

  // Build context once on mount
  useEffect(() => {
    (async () => {
      const keyPresent = await aiEnabled();
      setHasKey(keyPresent);
      if (keyPresent) {
        const ctx = await buildUserContext();
        setContext(ctx);
      }
      setBuildingCtx(false);
    })();
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading || !context) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);
    scrollToBottom();

    const reply = await chat(trimmed, messages, context);
    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: reply ?? "I couldn't generate a response. Please check your API key in Settings.",
    };
    setMessages([...newHistory, assistantMsg]);
    setLoading(false);
    scrollToBottom();
  }, [loading, context, messages, scrollToBottom]);

  const isEmpty = messages.length === 0;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.hairline }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            hitSlop={8}
          >
            <ChevronLeft size={22} color={colors.text} strokeWidth={1.75} />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleRow}>
              <Sparkles size={15} color={'#9B87C0'} strokeWidth={1.75} />
              <Text variant="bodyMedium">Beyond AI</Text>
            </View>
            <Text variant="caption" color={colors.textMuted}>
              Knows your goals, habits, mood & journal
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* ── No API key state ── */}
          {hasKey === false ? (
            <View style={styles.noKeyContainer}>
              <View style={[styles.noKeyCard, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
                <Sparkles size={28} color={'#9B87C0'} strokeWidth={1.5} />
                <Text variant="h2" style={{ textAlign: 'center' }}>Set up AI first</Text>
                <Text variant="body" color={colors.textSoft} style={{ textAlign: 'center', lineHeight: 22 }}>
                  Add your free Groq or Gemini API key in Settings to start chatting with your data.
                </Text>
                <Pressable
                  onPress={() => router.push('/settings' as any)}
                  style={[styles.noKeyBtn, { backgroundColor: colors.text }]}
                >
                  <Text variant="bodyMedium" color={colors.bg}>Go to Settings →</Text>
                </Pressable>
              </View>
            </View>

          ) : buildingCtx ? (
            <View style={styles.noKeyContainer}>
              <ActivityIndicator color={colors.textMuted} />
              <Text variant="body" color={colors.textMuted} style={{ marginTop: spacing.md }}>
                Loading your data…
              </Text>
            </View>

          ) : (
            <>
              {/* ── Messages ── */}
              <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={[
                  styles.messagesContent,
                  { paddingBottom: spacing.xl },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                onContentSizeChange={scrollToBottom}
              >
                {/* Empty state */}
                {isEmpty ? (
                  <View style={styles.emptyState}>
                    <View style={[styles.emptyAvatar, { backgroundColor: '#9B87C011' }]}>
                      <Sparkles size={32} color={'#9B87C0'} strokeWidth={1.5} />
                    </View>
                    <Text variant="h2" style={{ textAlign: 'center' }}>
                      Ask me anything
                    </Text>
                    <Text
                      variant="body"
                      color={colors.textMuted}
                      style={{ textAlign: 'center', lineHeight: 22 }}
                    >
                      I've read your goals, habits, mood, and journal.{'\n'}
                      Ask me what you can't see yourself.
                    </Text>

                    {/* Suggested questions — 2-column compact grid */}
                    <View style={styles.suggestionsGrid}>
                      {SUGGESTED_QUESTIONS.slice(0, 6).map((q, i) => (
                        <Pressable
                          key={i}
                          onPress={() => sendMessage(q)}
                          style={({ pressed }) => [
                            styles.suggestionChip,
                            { backgroundColor: colors.surface, borderColor: colors.hairline },
                            pressed && { opacity: 0.75 },
                          ]}
                        >
                          <Text variant="small" color={colors.textSoft} style={{ lineHeight: 18 }}>
                            {q}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : (
                  messages.map((msg, i) => (
                    <MessageBubble key={i} message={msg} colors={colors} />
                  ))
                )}

                {/* Typing indicator */}
                {loading ? <TypingIndicator colors={colors} /> : null}
              </ScrollView>

              {/* ── Suggestion chips — fixed-height row so they never expand ── */}
              {!isEmpty && !loading ? (
                <View style={styles.chipsContainer}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsRow}
                    keyboardShouldPersistTaps="handled"
                  >
                    {SUGGESTED_QUESTIONS.slice(0, 6).map((q, i) => (
                      <Pressable
                        key={i}
                        onPress={() => sendMessage(q)}
                        style={({ pressed }) => [
                          styles.inlineChip,
                          { backgroundColor: colors.surface, borderColor: colors.hairline },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Text variant="caption" color={colors.textSoft} numberOfLines={1}>
                          {q}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              {/* ── Input bar ── */}
              <View
                style={[
                  styles.inputBar,
                  {
                    backgroundColor: colors.bg,
                    borderTopColor: colors.hairline,
                    paddingBottom: insets.bottom + spacing.sm,
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.hairline,
                      color: colors.text,
                    },
                  ]}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Ask about your goals, habits, patterns…"
                  placeholderTextColor={colors.textFaint}
                  multiline
                  maxLength={400}
                  returnKeyType="send"
                  onSubmitEditing={() => sendMessage(input)}
                  blurOnSubmit={false}
                />
                <Pressable
                  onPress={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  style={({ pressed }) => [
                    styles.sendBtn,
                    {
                      backgroundColor: input.trim() && !loading ? colors.text : colors.hairline,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Send
                    size={16}
                    color={input.trim() && !loading ? colors.bg : colors.textFaint}
                    strokeWidth={1.75}
                  />
                </Pressable>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  backBtn: { padding: spacing.xs },
  headerCenter: { flex: 1, gap: 2 },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  // Messages
  messagesContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginBottom: 6,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '72%',
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.huge,
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  emptyAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  suggestionChip: {
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: '48%',
  },

  // Chips container — fixed height so it never expands into ovals
  chipsContainer: {
    height: 38,
    overflow: 'hidden',
  },
  // Inline chips row (after first message)
  chipsRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 0,
    gap: spacing.sm,
    alignItems: 'center',
    flexDirection: 'row',
  },
  inlineChip: {
    height: 30,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  textInput: {
    flex: 1,
    borderRadius: radii.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 120,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // No key
  noKeyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  noKeyCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.lg,
    maxWidth: 340,
  },
  noKeyBtn: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
  },
});
