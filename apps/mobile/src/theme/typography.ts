/**
 * UniRide Design System — Typography
 * Font: IBM Plex Sans Arabic
 */

export const FontFamily = {
  regular: 'IBMPlexSansArabic_400Regular',
  medium: 'IBMPlexSansArabic_500Medium',
  bold: 'IBMPlexSansArabic_700Bold',
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 36,
} as const;

export const LineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.8,
} as const;

export const Typography = {
  display: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.display,
    lineHeight: FontSize.display * LineHeight.tight,
  },
  h1: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xxxl,
    lineHeight: FontSize.xxxl * LineHeight.tight,
  },
  h2: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xxl,
    lineHeight: FontSize.xxl * LineHeight.tight,
  },
  h3: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    lineHeight: FontSize.xl * LineHeight.normal,
  },
  bodyLarge: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.lg,
    lineHeight: FontSize.lg * LineHeight.normal,
  },
  bodyMedium: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    lineHeight: FontSize.md * LineHeight.normal,
  },
  bodySmall: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: FontSize.sm * LineHeight.normal,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    lineHeight: FontSize.md * LineHeight.normal,
  },
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    lineHeight: FontSize.xs * LineHeight.normal,
  },
  button: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    lineHeight: FontSize.md * LineHeight.tight,
  },
  price: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    lineHeight: FontSize.lg * LineHeight.tight,
  },
} as const;
