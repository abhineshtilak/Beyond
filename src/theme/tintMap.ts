/**
 * Maps light-palette hex tints → mid/dark equivalents so components that
 * receive a hardcoded light-mode color (from metadata objects, goal categories,
 * mood chips, etc.) still look correct when the theme changes.
 *
 * Keys are light-palette soft-tint hex values (upper-cased at runtime).
 */

// ─── Light → Dark ────────────────────────────────────────────────────────────
const LIGHT_TO_DARK: Record<string, string> = {
  // Backgrounds
  '#F6F1E8': '#141210',   // bg
  '#FFFDFC': '#211D1A',   // surface
  '#EFE7DC': '#2A2522',   // surfaceAlt
  // Legacy bg values
  '#FBF8F2': '#141210',
  '#FFFFFF': '#211D1A',
  '#F5F0E6': '#2A2522',

  // Soft tints (new palette)
  '#E3E8DE': '#2E3830',   // sageSoft
  '#F1DDD4': '#3B2C26',   // peachSoft
  '#E7E0EC': '#312B36',   // lavenderSoft
  '#DCE5EA': '#26343E',   // skySoft
  '#EEE4C8': '#38311F',   // butterSoft
  '#EBDADA': '#382728',   // roseSoft

  // Legacy soft tints (old palette, kept for backwards compat)
  '#E4EADF': '#2E3830',
  '#F7E3D9': '#3B2C26',
  '#EBE3F0': '#312B36',
  '#DEE8EF': '#26343E',
  '#F4ECD3': '#38311F',
  '#F0DEDE': '#382728',

  // Alt soft tints found in some meta objects
  '#E8EFE2': '#2E3830',
  '#E0EAF2': '#26343E',
  '#F0E3D8': '#3B2C26',
  '#E8DDEF': '#312B36',
  '#F1EBD8': '#38311F',
  '#EFDDDC': '#382728',
};

// ─── Light → Mid ─────────────────────────────────────────────────────────────
const LIGHT_TO_MID: Record<string, string> = {
  // Backgrounds
  '#F6F1E8': '#332D2A',   // bg
  '#FFFDFC': '#403936',   // surface
  '#EFE7DC': '#3A3431',   // surfaceAlt
  // Legacy bg values
  '#FBF8F2': '#332D2A',
  '#FFFFFF': '#403936',
  '#F5F0E6': '#3A3431',

  // Soft tints (new palette)
  '#E3E8DE': '#364039',   // sageSoft
  '#F1DDD4': '#4B3832',   // peachSoft
  '#E7E0EC': '#413947',   // lavenderSoft
  '#DCE5EA': '#33414A',   // skySoft
  '#EEE4C8': '#4A4030',   // butterSoft
  '#EBDADA': '#4A3436',   // roseSoft

  // Legacy soft tints
  '#E4EADF': '#364039',
  '#F7E3D9': '#4B3832',
  '#EBE3F0': '#413947',
  '#DEE8EF': '#33414A',
  '#F4ECD3': '#4A4030',
  '#F0DEDE': '#4A3436',

  // Alt soft tints
  '#E8EFE2': '#364039',
  '#E0EAF2': '#33414A',
  '#F0E3D8': '#4B3832',
  '#E8DDEF': '#413947',
  '#F1EBD8': '#4A4030',
  '#EFDDDC': '#4A3436',
};

// ─── Public API ───────────────────────────────────────────────────────────────
export function resolveTint(
  hex: string | null | undefined,
  theme: 'light' | 'dark' | 'mid',
): string | undefined {
  if (!hex) return undefined;
  if (theme === 'light') return hex;
  const key = hex.toUpperCase();
  return theme === 'dark'
    ? (LIGHT_TO_DARK[key] ?? hex)
    : (LIGHT_TO_MID[key] ?? hex);
}
