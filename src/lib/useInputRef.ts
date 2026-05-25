import { useCallback, useRef, useState } from 'react';

/**
 * useInputRef — production-grade controlled-but-not-really pattern for
 * React Native TextInput on Android.
 *
 * THE PROBLEM with `useState` + controlled TextInput on Android:
 *   Every keystroke → setState → parent re-render → reconcile all children
 *   (chip rows, icon grids, colour swatches in a habit/task editor). Even
 *   with React Compiler, this blocks the JS thread enough for the IME to
 *   lag, especially on backspace where the IME's deletion event races with
 *   the JS thread's response.
 *
 * THE PATTERN:
 *   - `valueRef`  — the current text. Updated synchronously in onChangeText.
 *                   Read on save. Never causes a re-render.
 *   - `snapshot`  — a state value that ONLY changes on `reset()` (e.g. when
 *                   the editor opens for a different item). Used to drive
 *                   StableTextInput's value prop so external resets still
 *                   reflect in the native input via setNativeProps-when-blurred.
 *   - `hasContent` — boolean derived from `valueRef.current.trim() !== ''`.
 *                    Only updates when emptiness FLIPS (so a long word
 *                    backspaced one char at a time causes exactly one
 *                    re-render at the very last delete).
 *
 * Result: typing 50 characters causes ~1 parent re-render (when going from
 * empty to non-empty). Backspacing them causes ~1 re-render (when going
 * back to empty). The JS thread stays idle while the user types, and the
 * IME never waits.
 */
export function useInputRef(initialValue = '') {
  const valueRef = useRef(initialValue);
  const [snapshot, setSnapshot] = useState(initialValue);
  const [hasContent, setHasContent] = useState(!!initialValue.trim());

  const onChangeText = useCallback((text: string) => {
    valueRef.current = text;
    const next = !!text.trim();
    // setState bails out when the value is unchanged, but the explicit
    // ref comparison saves React from even queuing the update.
    setHasContent((prev) => (prev === next ? prev : next));
  }, []);

  const reset = useCallback((val = '') => {
    valueRef.current = val;
    setSnapshot(val);
    setHasContent(!!val.trim());
  }, []);

  return { valueRef, snapshot, hasContent, onChangeText, reset };
}
