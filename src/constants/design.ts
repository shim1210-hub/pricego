export const COLORS = {
  // Background
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',

  // Primary
  primary: '#1769FF',
  primaryDark: '#0F172A',
  primaryLight: '#EBF2FF',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',

  // Interactive
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // Status
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  offline: '#FFA500',
  offlineLight: '#FFF7E6',

  // Utility
  disabled: '#CBD5E1',
  disabledBg: '#F8FAFC',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const TYPOGRAPHY = {
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 18,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  captionSmall: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  amountLocal: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  amountKRW: {
    fontSize: 52,
    fontWeight: '800' as const,
    lineHeight: 60,
  },
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

export const SIZES = {
  buttonHeight: 52,
  buttonHeightSmall: 40,
  iconButtonSize: 44,
  micButtonSize: 170,
  tabBarHeight: 72,
  headerHeight: 52,
} as const;
