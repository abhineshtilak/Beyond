export const palette = {
  cream: '#FBF8F2',
  creamSoft: '#F5F0E6',
  paper: '#FFFFFF',
  ink: '#2A2724',
  inkSoft: '#5C564F',
  inkMuted: '#9A938A',
  inkFaint: '#C9C2B7',
  hairline: '#ECE6DA',

  sage: '#A8B89F',
  sageSoft: '#E4EADF',
  peach: '#E8B4A0',
  peachSoft: '#F7E3D9',
  lavender: '#B8A8C9',
  lavenderSoft: '#EBE3F0',
  sky: '#9EB7C9',
  skySoft: '#DEE8EF',
  butter: '#E8D095',
  butterSoft: '#F4ECD3',
  rose: '#D8A4A4',
  roseSoft: '#F0DEDE',
} as const;

export const colors = {
  bg: palette.cream,
  surface: palette.paper,
  surfaceAlt: palette.creamSoft,
  text: palette.ink,
  textSoft: palette.inkSoft,
  textMuted: palette.inkMuted,
  textFaint: palette.inkFaint,
  hairline: palette.hairline,

  accent: palette.sage,
  accentSoft: palette.sageSoft,

  mood: {
    great: palette.sage,
    good: palette.sky,
    ok: palette.butter,
    low: palette.peach,
    bad: palette.rose,
  },

  category: {
    health: palette.sage,
    work: palette.sky,
    learning: palette.lavender,
    personal: palette.peach,
    finance: palette.butter,
    other: palette.rose,
  },
} as const;

export type CategoryKey = keyof typeof colors.category;
export type MoodKey = keyof typeof colors.mood;
