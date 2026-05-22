import { requireOptionalNativeModule } from 'expo-modules-core';

export type AuthMode = 'none' | 'pin' | 'biometric' | 'both';
export type BiometricType = 'face' | 'fingerprint' | 'none';

const KEY_MODE = 'beyond_auth_mode';
const KEY_PIN = 'beyond_pin';

// ─── Lazy native module loaders ───────────────────────────────────────────────
// Same pattern as backup.ts: check native module exists BEFORE require()-ing the
// JS wrapper, because the wrapper's top-level code calls requireNativeModule()
// which throws — and in RN 0.83 New Arch the throw escapes our try/catch.

let SecureStoreMod: any = undefined;       // undefined = not checked, null = checked & unavailable
let LocalAuthMod: any = undefined;

function getSecureStore(): any | null {
  if (SecureStoreMod !== undefined) return SecureStoreMod;
  const native = requireOptionalNativeModule('ExpoSecureStore');
  if (!native) {
    SecureStoreMod = null;
    return null;
  }
  try {
    SecureStoreMod = require('expo-secure-store');
  } catch {
    SecureStoreMod = null;
  }
  return SecureStoreMod;
}

function getLocalAuth(): any | null {
  if (LocalAuthMod !== undefined) return LocalAuthMod;
  const native = requireOptionalNativeModule('ExpoLocalAuthentication');
  if (!native) {
    LocalAuthMod = null;
    return null;
  }
  try {
    LocalAuthMod = require('expo-local-authentication');
  } catch {
    LocalAuthMod = null;
  }
  return LocalAuthMod;
}

export function isAuthAvailable(): boolean {
  return getSecureStore() !== null;
}

// ─── Mode storage ─────────────────────────────────────────────────────────────

export async function getAuthMode(): Promise<AuthMode> {
  const ss = getSecureStore();
  if (!ss) return 'none';
  try {
    const v = await ss.getItemAsync(KEY_MODE);
    if (v === 'pin' || v === 'biometric' || v === 'both') return v;
  } catch {}
  return 'none';
}

export async function saveAuthMode(mode: AuthMode): Promise<void> {
  const ss = getSecureStore();
  if (!ss) return;
  await ss.setItemAsync(KEY_MODE, mode);
}

// ─── PIN storage ──────────────────────────────────────────────────────────────

export async function savePin(pin: string): Promise<void> {
  const ss = getSecureStore();
  if (!ss) return;
  await ss.setItemAsync(KEY_PIN, pin);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const ss = getSecureStore();
  if (!ss) return false;
  try {
    const stored = await ss.getItemAsync(KEY_PIN);
    return stored !== null && stored === pin;
  } catch {
    return false;
  }
}

export async function clearPin(): Promise<void> {
  const ss = getSecureStore();
  if (!ss) return;
  try {
    await ss.deleteItemAsync(KEY_PIN);
  } catch {}
}

// ─── Biometric ────────────────────────────────────────────────────────────────

export async function isBiometricAvailable(): Promise<boolean> {
  const la = getLocalAuth();
  if (!la) return false;
  try {
    const has = await la.hasHardwareAsync();
    if (!has) return false;
    return la.isEnrolledAsync();
  } catch {
    return false;
  }
}

export async function getBiometricType(): Promise<BiometricType> {
  const la = getLocalAuth();
  if (!la) return 'none';
  try {
    const types = await la.supportedAuthenticationTypesAsync();
    if (types.includes(la.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
    if (types.includes(la.AuthenticationType.FINGERPRINT)) return 'fingerprint';
  } catch {}
  return 'none';
}

export async function authenticateWithBiometric(): Promise<boolean> {
  const la = getLocalAuth();
  if (!la) return false;
  try {
    const result = await la.authenticateAsync({
      promptMessage: 'Unlock Beyond',
      cancelLabel: 'Cancel',
      disableDeviceFallback: true,
    });
    return result.success;
  } catch {
    return false;
  }
}

// ─── Disable auth entirely ────────────────────────────────────────────────────

export async function disableAuth(): Promise<void> {
  await saveAuthMode('none');
  await clearPin();
}
