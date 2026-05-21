// Shared accent palette (works in both themes; tint surfaces will adjust opacity)
const sharedAccents = {
  sage: '#A8B89F',
  peach: '#E8B4A0',
  lavender: '#B8A8C9',
  sky: '#9EB7C9',
  butter: '#E8D095',
  rose: '#D8A4A4',
};

export const lightPalette = {
  bg: '#FBF8F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F0E6',
  text: '#2A2724',
  textSoft: '#5C564F',
  textMuted: '#9A938A',
  textFaint: '#C9C2B7',
  hairline: '#ECE6DA',

  accent: sharedAccents.sage,
  accentSoft: '#E4EADF',

  cream: '#FBF8F2',
  creamSoft: '#F5F0E6',
  paper: '#FFFFFF',
  ink: '#2A2724',
  inkSoft: '#5C564F',
  inkMuted: '#9A938A',
  inkFaint: '#C9C2B7',

  sage: sharedAccents.sage,
  sageSoft: '#E4EADF',
  peach: sharedAccents.peach,
  peachSoft: '#F7E3D9',
  lavender: sharedAccents.lavender,
  lavenderSoft: '#EBE3F0',
  sky: sharedAccents.sky,
  skySoft: '#DEE8EF',
  butter: sharedAccents.butter,
  butterSoft: '#F4ECD3',
  rose: sharedAccents.rose,
  roseSoft: '#F0DEDE',

  mood: {
    great: sharedAccents.sage,
    good: sharedAccents.sky,
    ok: sharedAccents.butter,
    low: sharedAccents.peach,
    bad: sharedAccents.rose,
  },
  category: {
    health: sharedAccents.sage,
    work: sharedAccents.sky,
    learning: sharedAccents.lavender,
    personal: sharedAccents.peach,
    finance: sharedAccents.butter,
    other: sharedAccents.rose,
  },
} as const;

export const darkPalette: typeof lightPalette = {
  bg: '#1B1814',         // very deep warm
  surface: '#262220',
  surfaceAlt: '#2F2A26',
  text: '#F2EDE4',
  textSoft: '#C5BCAF',
  textMuted: '#8A8278',
  textFaint: '#5A5249',
  hairline: '#3A332D',

  accent: sharedAccents.sage,
  accentSoft: '#2E3A28',

  cream: '#1B1814',
  creamSoft: '#2F2A26',
  paper: '#262220',
  ink: '#F2EDE4',
  inkSoft: '#C5BCAF',
  inkMuted: '#8A8278',
  inkFaint: '#5A5249',

  sage: sharedAccents.sage,
  sageSoft: '#2E3A28',
  peach: sharedAccents.peach,
  peachSoft: '#3F2E26',
  lavender: sharedAccents.lavender,
  lavenderSoft: '#322C3A',
  sky: sharedAccents.sky,
  skySoft: '#26333D',
  butter: sharedAccents.butter,
  butterSoft: '#3A331F',
  rose: sharedAccents.rose,
  roseSoft: '#3A2828',

  mood: {
    great: sharedAccents.sage,
    good: sharedAccents.sky,
    ok: sharedAccents.butter,
    low: sharedAccents.peach,
    bad: sharedAccents.rose,
  },
  category: {
    health: sharedAccents.sage,
    work: sharedAccents.sky,
    learning: sharedAccents.lavender,
    personal: sharedAccents.peach,
    finance: sharedAccents.butter,
    other: sharedAccents.rose,
  },
};

export type Palette = typeof lightPalette;
