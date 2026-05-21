/** Maps hardcoded light pastel hex codes to their dark-theme equivalents.
 *  Used to make legacy metadata (CATEGORY_META, MOOD_META, etc.) theme-aware
 *  without rewriting every meta definition. */

const LIGHT_TO_DARK: Record<string, string> = {
  // Surfaces
  '#FBF8F2': '#1B1814',
  '#FFFFFF': '#262220',
  '#F5F0E6': '#2F2A26',

  // Soft accent tints (light → dark warm variants)
  '#E4EADF': '#2E3A28', // sageSoft
  '#F7E3D9': '#3F2E26', // peachSoft
  '#EBE3F0': '#322C3A', // lavenderSoft
  '#DEE8EF': '#26333D', // skySoft
  '#F4ECD3': '#3A331F', // butterSoft
  '#F0DEDE': '#3A2828', // roseSoft

  // Light alt tints used by some types files
  '#E8EFE2': '#2E3A28',
  '#E0EAF2': '#26333D',
  '#F0E3D8': '#3F2E26',
  '#E8DDEF': '#322C3A',
  '#F1EBD8': '#3A331F',
  '#EFDDDC': '#3A2828',
};

export function resolveTint(hex: string | null | undefined, isDark: boolean): string | undefined {
  if (!hex) return undefined;
  if (!isDark) return hex;
  return LIGHT_TO_DARK[hex.toUpperCase()] ?? hex;
}
