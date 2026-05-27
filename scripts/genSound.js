/**
 * Generates assets/sounds/complete.wav
 *
 * A soft C-major bell arpeggio (C5 → E5 → G5 → C6) with warm bell harmonics,
 * fast attack, and exponential decay on each note.  The notes overlap slightly
 * so the chord rings as a single gentle chime rather than three separate pings.
 *
 * Run once from the project root:
 *   node scripts/genSound.js
 */

const fs   = require('fs');
const path = require('path');

// ─── WAV writer ────────────────────────────────────────────────────────────────
function buildWav(floatSamples, sampleRate) {
  const n          = floatSamples.length;
  const dataBytes  = n * 2;                   // 16-bit PCM
  const buf        = Buffer.alloc(44 + dataBytes);

  buf.write('RIFF',             0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE',             8);
  buf.write('fmt ',            12);
  buf.writeUInt32LE(16,        16);           // sub-chunk size
  buf.writeUInt16LE(1,         20);           // PCM
  buf.writeUInt16LE(1,         22);           // mono
  buf.writeUInt32LE(sampleRate,24);
  buf.writeUInt32LE(sampleRate * 2, 28);      // byte-rate
  buf.writeUInt16LE(2,         32);           // block align
  buf.writeUInt16LE(16,        34);           // bits/sample
  buf.write('data',            36);
  buf.writeUInt32LE(dataBytes, 40);

  for (let i = 0; i < n; i++) {
    const clamped = Math.max(-1, Math.min(1, floatSamples[i]));
    buf.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  return buf;
}

// ─── Synthesis ─────────────────────────────────────────────────────────────────
const SR       = 44100;
const DURATION = 1.6;           // total file length in seconds
const N        = Math.floor(SR * DURATION);
const mix      = new Float64Array(N);

/**
 * Add a bell-like tone to the mix buffer.
 * @param {number} freq        Fundamental frequency in Hz
 * @param {number} startSec    When the note begins (seconds)
 * @param {number} decayRate   Envelope decay constant (higher = shorter ring)
 * @param {number} gain        Peak amplitude (0–1)
 */
function addBellNote(freq, startSec, decayRate, gain) {
  const start = Math.floor(startSec * SR);
  for (let i = start; i < N; i++) {
    const t = (i - start) / SR;

    // Fast attack (3 ms), then exponential ring-out — classic bell shape
    const attackSec = 0.003;
    const env = t < attackSec
      ? t / attackSec
      : Math.exp(-(t - attackSec) * decayRate);

    if (env < 0.0001) break;   // early-exit once inaudible

    // Bell spectrum: fundamental + partials decaying at different rates
    const p1 = Math.sin(2 * Math.PI * freq       * t);          // fundamental
    const p2 = Math.sin(2 * Math.PI * freq * 2.0 * t)           // 2nd partial
               * Math.exp(-(t - attackSec) * decayRate * 1.8);
    const p3 = Math.sin(2 * Math.PI * freq * 3.0 * t)           // 3rd partial
               * Math.exp(-(t - attackSec) * decayRate * 3.2);
    const p4 = Math.sin(2 * Math.PI * freq * 4.2 * t)           // inharmonic shimmer
               * Math.exp(-(t - attackSec) * decayRate * 5.0);

    mix[i] += env * gain * (p1 + 0.35 * p2 + 0.12 * p3 + 0.06 * p4);
  }
}

// C-major ascending arpeggio — gentle stagger (80 ms apart)
//                 freq      start   decay  gain
addBellNote(  523.25,  0.00,  4.5,  0.70 );   // C5
addBellNote(  659.25,  0.08,  4.5,  0.65 );   // E5
addBellNote(  783.99,  0.16,  4.0,  0.60 );   // G5
addBellNote( 1046.50,  0.26,  5.5,  0.40 );   // C6  (soft octave sparkle)

// ─── Normalise + soft limiter ──────────────────────────────────────────────────
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(mix[i]));
const HEADROOM = 0.72;
if (peak > 0) {
  const scale = HEADROOM / peak;
  for (let i = 0; i < N; i++) mix[i] *= scale;
}

// Soft-clip (tanh) to remove any remaining peaks cleanly
for (let i = 0; i < N; i++) {
  mix[i] = Math.tanh(mix[i] * 1.2) / 1.2;
}

// ─── Write file ────────────────────────────────────────────────────────────────
const outPath = path.join(__dirname, '..', 'assets', 'sounds', 'complete.wav');
fs.writeFileSync(outPath, buildWav(mix, SR));
console.log(`✓  Written ${outPath}  (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
