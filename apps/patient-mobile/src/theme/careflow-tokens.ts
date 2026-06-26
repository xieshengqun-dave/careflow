/**
 * CareFlow — Design Tokens
 * Smart Queue & Appointment Management for Clinics
 *
 * Drop-in theme for a React Native / Expo app. Import `theme` and reference
 * tokens instead of hard-coding values, e.g. `color: theme.colors.primary`.
 * Spacing values are unitless numbers (RN density-independent pixels).
 */

export const palette = {
  // Brand / primary (royal blue)
  primary50: '#EFF4FF',
  primary100: '#EAF1FE',
  primary600: '#2563EB', // primary actions, links, active icons
  primary700: '#1D4ED8', // filled buttons, pressed
  primary800: '#1E40AF', // hero gradient end

  // Green (queue / success / walk-in)
  green50: '#E6F8EE',
  green100: '#F1F8F4',
  green500: '#22C55E',
  green600: '#16A34A',
  green700: '#15803D',

  // Accent (purple) — paediatrics, secondary categories
  purple50: '#F3EEFE',
  purple600: '#7C3AED',

  // Status
  amber50: '#FEF3E2',
  amber100: '#FFFBEB',
  amber500: '#F59E0B',
  amber700: '#B45309',
  red50: '#FEF2F2',
  red500: '#EF4444',
  red600: '#DC2626',
  star: '#FBBF24',

  // Platform console tokens (admin/web console — not used in patient screens)
  platformNavy: '#141B33',
  platformNavyDeep: '#0E1426',
  platformPanel: '#1A2342',
  indigo600: '#4F46E5',
  indigo500: '#6366F1',
  indigo400: '#818CF8',
  indigo100: '#EEF1FF',
  navTextIdle: '#94A3C2',
  navActiveBg: 'rgba(99,102,241,0.18)',

  // Neutrals / slate
  slate900: '#0F172A', // primary text
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B', // secondary text
  slate400: '#94A3B8', // tertiary / placeholder
  slate200: '#E2E8F0', // strong border
  border: '#EEF2F6',   // hairline border / dividers
  slate100: '#F1F5F9',
  appBg: '#F6F8FB',    // mobile screen background
  surface: '#FFFFFF',
} as const;

export const gradients = {
  brand: ['#2563EB', '#22C55E'] as const,       // logo mark, app icons
  hero: ['#2563EB', '#1E40AF'] as const,         // queue hero card (135deg)
  splash: ['#FFFFFF', '#EAF2FF', '#E4F5EC'] as const,
};

export const colors = {
  primary: palette.primary600,
  primaryStrong: palette.primary700,
  text: palette.slate900,
  textSecondary: palette.slate500,
  textTertiary: palette.slate400,
  background: palette.appBg,
  surface: palette.surface,
  border: palette.border,
  success: palette.green600,
  warning: palette.amber500,
  danger: palette.red500,
  accent: palette.purple600,
} as const;

/** Status badge presets: { fg, bg } pairs used across appointments & queue. */
export const status = {
  open:        { fg: palette.green600,  bg: palette.green50 },
  confirmed:   { fg: palette.primary600, bg: palette.primary50 },
  inQueue:     { fg: palette.green600,  bg: palette.green50 },
  checkedIn:   { fg: palette.primary600, bg: palette.primary50 },
  waiting:     { fg: palette.slate500,  bg: palette.slate100 },
  waitingNext: { fg: palette.amber700,  bg: palette.amber50 },
  withDoctor:  { fg: palette.green600,  bg: palette.green50 },
  upcoming:    { fg: palette.slate500,  bg: palette.slate100 },
  completed:   { fg: palette.green600,  bg: palette.green50 },
  noShow:      { fg: palette.red600,    bg: palette.red50 },
  cancelled:   { fg: palette.red600,    bg: palette.red50 },
  followUp:    { fg: palette.purple600, bg: palette.purple50 },
  onBreak:     { fg: palette.amber500,  bg: palette.amber50 },
  offline:     { fg: palette.slate400,  bg: palette.slate100 },
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 30,
} as const;

export const radius = {
  sm: 8,    // chips, small controls
  md: 12,   // inputs, buttons
  lg: 16,   // cards
  xl: 20,   // hero / sheet cards
  pill: 999,
  full: 9999,
} as const;

export const typography = {
  fontFamily: 'PlusJakartaSans', // load via expo-font (weights 400/500/600/700/800)
  display:  { fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  h1:       { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  h2:       { fontSize: 19, fontWeight: '800' },
  h3:       { fontSize: 16, fontWeight: '800' },
  body:     { fontSize: 14, fontWeight: '500' },
  label:    { fontSize: 13, fontWeight: '600' },
  caption:  { fontSize: 11, fontWeight: '600' },
} as const;

/** RN shadow presets (iOS) — pair with `elevation` on Android. */
export const shadow = {
  card:  { shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  float: { shadowColor: '#1D4ED8', shadowOpacity: 0.4,  shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  modal: { shadowColor: '#0F172A', shadowOpacity: 0.18, shadowRadius: 40, shadowOffset: { width: 0, height: 16 }, elevation: 12 },
} as const;

export const theme = { colors, palette, gradients, status, spacing, radius, typography, shadow };
export default theme;
