/**
 * AI service — supports Groq (recommended) and Google Gemini.
 *
 * Auto-detects provider from key format:
 *   Groq keys   start with  gsk_     → uses Llama 3.3 via Groq
 *   Gemini keys start with  AQ. / AI → uses Gemini 2.0 Flash Lite
 *
 * ─── GROQ (recommended — free, no credit card, works in India) ───────────────
 *   Sign up:   https://console.groq.com
 *   Free tier: 14,400 requests/day · 30 RPM · no billing
 *   Get key:   console.groq.com → API Keys → Create Free Key
 *   Key looks like: gsk_xxxxxxxxxxxxxxxxxxxxxx
 *
 * ─── GEMINI (free but regional quota varies) ─────────────────────────────────
 *   Sign up:   https://aistudio.google.com/apikey
 *   Free tier: 1,500 requests/day (may have limit:0 in some regions)
 */
import { getDB } from '@/lib/db';

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile'; // best free model on Groq

const GEMINI_MODEL = 'gemini-2.0-flash-lite';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ── Key storage ───────────────────────────────────────────────────────────────

export async function getAIKey(): Promise<string | null> {
  try {
    const db  = await getDB();
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = 'gemini_api_key'`,
    );
    return row?.value?.trim() || null;
  } catch {
    return null;
  }
}

export async function setAIKey(key: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO settings (key, value) VALUES ('gemini_api_key', ?)`,
    [key.trim()],
  );
}

export async function clearAIKey(): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM settings WHERE key = 'gemini_api_key'`);
}

export function aiEnabled(): Promise<boolean> {
  return getAIKey().then((k) => !!k);
}

// ── Provider detection ────────────────────────────────────────────────────────

function detectProvider(key: string): 'groq' | 'gemini' {
  return key.startsWith('gsk_') ? 'groq' : 'gemini';
}

// ── Error type ────────────────────────────────────────────────────────────────

export type AIError = {
  type: 'no_key' | 'api_error' | 'parse_error' | 'network_error';
  message: string;
};

// ── Core call — routes to Groq or Gemini automatically ───────────────────────

export async function askAI<T>(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<{ data: T } | { error: AIError }> {
  const apiKey = await getAIKey();
  if (!apiKey) {
    return {
      error: {
        type: 'no_key',
        message: 'Add your AI key in Settings → AI. Groq is free and recommended.',
      },
    };
  }

  const provider = detectProvider(apiKey);
  return provider === 'groq'
    ? callGroq<T>(prompt, apiKey, opts)
    : callGemini<T>(prompt, apiKey, opts);
}

// Keep the old name as an alias so existing callers don't break
export const askGemini = askAI;

// ── Groq (OpenAI-compatible) ──────────────────────────────────────────────────

async function callGroq<T>(
  prompt: string,
  apiKey: string,
  opts: { temperature?: number; maxTokens?: number },
): Promise<{ data: T } | { error: AIError }> {
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Always respond with valid JSON only — no markdown, no explanation.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: opts.temperature ?? 0.35,
        max_tokens: opts.maxTokens ?? 800,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg: string = body?.error?.message ?? `Groq HTTP ${res.status}`;
      return { error: { type: 'api_error', message: msg } };
    }

    const data   = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    if (!text) return { error: { type: 'parse_error', message: 'Empty response from Groq.' } };

    return parseJSON<T>(text);
  } catch (e: any) {
    return { error: { type: 'network_error', message: e?.message ?? 'Network error.' } };
  }
}

// ── Gemini ────────────────────────────────────────────────────────────────────

async function callGemini<T>(
  prompt: string,
  apiKey: string,
  opts: { temperature?: number; maxTokens?: number },
): Promise<{ data: T } | { error: AIError }> {
  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.35,
          maxOutputTokens: opts.maxTokens ?? 800,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg: string = body?.error?.message ?? `Gemini HTTP ${res.status}`;
      return { error: { type: 'api_error', message: msg } };
    }

    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { error: { type: 'parse_error', message: 'Empty response from Gemini.' } };

    return parseJSON<T>(text);
  } catch (e: any) {
    return { error: { type: 'network_error', message: e?.message ?? 'Network error.' } };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseJSON<T>(text: string): { data: T } | { error: AIError } {
  try {
    return { data: JSON.parse(text) as T };
  } catch {
    // Try to extract from a markdown code block
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match?.[1]) {
      try { return { data: JSON.parse(match[1]) as T }; } catch { /* fall through */ }
    }
    return { error: { type: 'parse_error', message: 'Could not parse AI response.' } };
  }
}

// ── Key validation (quick test call) ─────────────────────────────────────────

export async function testAIKey(key: string): Promise<{ ok: boolean; error?: string }> {
  const provider = detectProvider(key);

  if (provider === 'groq') {
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: 'user', content: 'Say "ok"' }],
          max_tokens: 5,
        }),
      });
      if (res.ok) return { ok: true };
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body?.error?.message ?? `HTTP ${res.status}` };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Network error.' };
    }
  }

  // Gemini
  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say ok.' }] }],
        generationConfig: { maxOutputTokens: 5 },
      }),
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body?.error?.message ?? `HTTP ${res.status}` };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Network error.' };
  }
}
