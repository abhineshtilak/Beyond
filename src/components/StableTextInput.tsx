import React, { forwardRef, useEffect, useRef } from 'react';
import { TextInput, TextInputProps } from 'react-native';

/**
 * StableTextInput — drop-in replacement for TextInput that prevents
 * Android New Architecture (Fabric) from disrupting the IME on every render.
 *
 * WHY: React Native's controlled TextInput (value + onChangeText) calls
 * setTextAndSelection() on the native view after every reconciliation. On
 * Android with the New Architecture this interrupts IME composition, causing:
 *   - suggestion bar to refresh on every keystroke
 *   - duplicate characters ('j' → 'jjj')
 *   - garbled text when cancelling composition ('jjj' backspace → 'lasdfl')
 *
 * HOW: We break the controlled loop by passing only `defaultValue` (read once
 * on mount). The parent's state still updates correctly via onChangeText.
 *
 * IMPORTANT: We NEVER call setNativeProps while the input is focused. Even an
 * echo-guarded sync can interrupt the IME mid-composition on Fabric. External
 * value resets (e.g. opening a different item in the same editor) only apply
 * when the user is not actively typing. For full external-driven resets, the
 * parent should change the React `key` to force a remount.
 *
 * RESULT: Typing feels identical to any native Android input (WhatsApp, Notes).
 */
export const StableTextInput = forwardRef<TextInput, TextInputProps>(
  function StableTextInput({ value, onChangeText, onFocus, onBlur, ...rest }, forwardedRef) {
    const internalRef = useRef<TextInput>(null);
    const nativeRef = (forwardedRef ?? internalRef) as React.RefObject<TextInput>;

    // Track the last value we sent to the parent so we can distinguish
    // "user typed this" from "parent reset this externally".
    const lastTypedRef = useRef(value ?? '');
    const focusedRef = useRef(false);

    useEffect(() => {
      if (value === undefined) return;
      // NEVER touch the native input while the user is typing. Any
      // setNativeProps mid-edit can yank the IME out of composition,
      // causing the "abhineshabh" / backspace-hang behaviour.
      // We also DO NOT update lastTypedRef here — the native input
      // remains the source of truth for what the user actually typed.
      if (focusedRef.current) return;
      if (value !== lastTypedRef.current) {
        lastTypedRef.current = value;
        nativeRef.current?.setNativeProps({ text: value });
      }
    }, [value, nativeRef]);

    return (
      <TextInput
        ref={nativeRef}
        // Use defaultValue (not value) so React never reconciles the text
        // content after mount — IME composition is never interrupted.
        defaultValue={value}
        onFocus={(e) => {
          focusedRef.current = true;
          onFocus?.(e);
        }}
        onBlur={(e) => {
          focusedRef.current = false;
          onBlur?.(e);
        }}
        onChangeText={(text) => {
          lastTypedRef.current = text;
          onChangeText?.(text);
        }}
        {...rest}
      />
    );
  },
);
