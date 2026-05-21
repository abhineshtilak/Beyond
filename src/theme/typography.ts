export const fonts = {
  serif: 'Fraunces_500Medium',
  serifBold: 'Fraunces_600SemiBold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemi: 'Inter_600SemiBold',
} as const;

export const typeScale = {
  display: { fontFamily: fonts.serifBold, fontSize: 32, lineHeight: 40, letterSpacing: -0.5 },
  h1: { fontFamily: fonts.serifBold, fontSize: 26, lineHeight: 34, letterSpacing: -0.3 },
  h2: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 30, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.sansSemi, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19 },
  smallMedium: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 19 },
  caption: { fontFamily: fonts.sansMedium, fontSize: 11, lineHeight: 14, letterSpacing: 0.4 },
} as const;

export type TypeVariant = keyof typeof typeScale;
