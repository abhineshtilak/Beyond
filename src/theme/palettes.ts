// ─── Palette type ─────────────────────────────────────────────────────────────
export type Palette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSoft: string;
  textMuted: string;
  textFaint: string;
  hairline: string;

  accent: string;
  accentSoft: string;

  // compat aliases used across legacy components
  cream: string;
  creamSoft: string;
  paper: string;
  ink: string;
  inkSoft: string;
  inkMuted: string;
  inkFaint: string;

  sage: string;      sageSoft: string;
  peach: string;     peachSoft: string;
  lavender: string;  lavenderSoft: string;
  sky: string;       skySoft: string;
  butter: string;    butterSoft: string;
  rose: string;      roseSoft: string;

  mood: {
    great: string;
    good: string;
    ok: string;
    low: string;
    bad: string;
  };
  category: {
    health: string;
    work: string;
    learning: string;
    personal: string;
    finance: string;
    other: string;
  };
};

// ─── Shared accent hues (same across all themes) ──────────────────────────────
const sage      = '#A8B89F';
const peach     = '#E8B4A0';
const lavender  = '#B8A8C9';
const sky       = '#9EB7C9';
const butter    = '#E8D095';
const rose      = '#D8A4A4';

const mood = {
  great: sage,
  good: sky,
  ok: butter,
  low: peach,
  bad: rose,
};
const category = {
  health: sage,
  work: sky,
  learning: lavender,
  personal: peach,
  finance: butter,
  other: rose,
};

// ─── Light ────────────────────────────────────────────────────────────────────
export const lightPalette: Palette = {
  bg: '#F6F1E8',
  surface: '#FFFDFC',
  surfaceAlt: '#EFE7DC',

  text: '#2B2623',
  textSoft: '#5B544E',
  textMuted: '#938A80',
  textFaint: '#C7BEB2',

  hairline: '#E6DDD0',

  accent: sage,
  accentSoft: '#E3E8DE',

  cream: '#F6F1E8',
  creamSoft: '#EFE7DC',
  paper: '#FFFDFC',

  ink: '#2B2623',
  inkSoft: '#5B544E',
  inkMuted: '#938A80',
  inkFaint: '#C7BEB2',

  sage,      sageSoft: '#E3E8DE',
  peach,     peachSoft: '#F1DDD4',
  lavender,  lavenderSoft: '#E7E0EC',
  sky,       skySoft: '#DCE5EA',
  butter,    butterSoft: '#EEE4C8',
  rose,      roseSoft: '#EBDADA',

  mood,
  category,
};

// ─── Mid — warm walnut (between light and dark) ───────────────────────────────
export const midPalette: Palette = {
  bg: '#332D2A',
  surface: '#403936',
  surfaceAlt: '#3A3431',

  text: '#F1E8DE',
  textSoft: '#C7BCAF',
  textMuted: '#92867C',
  textFaint: '#665D56',

  hairline: '#514943',

  accent: peach,
  accentSoft: '#4B3832',

  cream: '#332D2A',
  creamSoft: '#3A3431',
  paper: '#403936',

  ink: '#F1E8DE',
  inkSoft: '#C7BCAF',
  inkMuted: '#92867C',
  inkFaint: '#665D56',

  sage,      sageSoft: '#364039',
  peach,     peachSoft: '#4B3832',
  lavender,  lavenderSoft: '#413947',
  sky,       skySoft: '#33414A',
  butter,    butterSoft: '#4A4030',
  rose,      roseSoft: '#4A3436',

  mood,
  category,
};

// ─── Dark ─────────────────────────────────────────────────────────────────────
export const darkPalette: Palette = {
  bg: '#141210',
  surface: '#211D1A',
  surfaceAlt: '#2A2522',

  text: '#F3ECE3',
  textSoft: '#C9BEB2',
  textMuted: '#8E847A',
  textFaint: '#5F5650',

  hairline: '#37312D',

  accent: lavender,
  accentSoft: '#312B36',

  cream: '#141210',
  creamSoft: '#2A2522',
  paper: '#211D1A',

  ink: '#F3ECE3',
  inkSoft: '#C9BEB2',
  inkMuted: '#8E847A',
  inkFaint: '#5F5650',

  sage,      sageSoft: '#2E3830',
  peach,     peachSoft: '#3B2C26',
  lavender,  lavenderSoft: '#312B36',
  sky,       skySoft: '#26343E',
  butter,    butterSoft: '#38311F',
  rose,      roseSoft: '#382728',

  mood,
  category,
};
