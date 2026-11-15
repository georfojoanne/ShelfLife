export const Typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const },
  title: { fontSize: 23, lineHeight: 29, fontWeight: '800' as const },
  section: { fontSize: 19, lineHeight: 24, fontWeight: '700' as const },
  body: { fontSize: 14, lineHeight: 21, fontWeight: '400' as const },
  bodyStrong: { fontSize: 14, lineHeight: 20, fontWeight: '700' as const },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '400' as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '700' as const },
  eyebrow: { fontSize: 11, lineHeight: 15, fontWeight: '800' as const, letterSpacing: 1.1 },
};

export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const Radii = {
  sm: 10,
  md: 14,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const ControlSizes = {
  minTouchTarget: 44,
  inputHeight: 50,
  buttonHeight: 50,
};

export const Shadows = {
  card: {
    shadowColor: '#203226',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
};
