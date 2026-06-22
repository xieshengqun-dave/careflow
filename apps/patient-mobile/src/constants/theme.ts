export const Colors = {
  primary: "#0284c7",
  primaryDark: "#0369a1",
  primaryLight: "#7dd3fc",
  primaryBg: "#e0f2fe",
  bg: "#f0f9ff",

  success: "#16a34a",
  successBg: "#dcfce7",
  successBorder: "#86efac",

  warning: "#d97706",
  warningBg: "#fef3c7",
  warningBorder: "#fcd34d",

  error: "#dc2626",
  errorBg: "#fee2e2",
  errorBorder: "#fca5a5",

  info: "#0ea5e9",
  infoBg: "#e0f2fe",

  text: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
  textInverse: "#ffffff",

  border: "#e2e8f0",
  borderLight: "#f1f5f9",

  white: "#ffffff",
  black: "#000000",

  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate300: "#cbd5e1",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate600: "#475569",
  slate700: "#334155",
  slate800: "#1e293b",
  slate900: "#0f172a",

  statusConfirmed: { bg: "#dcfce7", text: "#16a34a", border: "#86efac" },
  statusPending:   { bg: "#fef9c3", text: "#ca8a04", border: "#fde047" },
  statusCheckedIn: { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" },
  statusCompleted: { bg: "#f1f5f9", text: "#64748b", border: "#cbd5e1" },
  statusCancelled: { bg: "#fee2e2", text: "#dc2626", border: "#fca5a5" },
  statusNoShow:    { bg: "#fff7ed", text: "#ea580c", border: "#fdba74" },

  queueWaiting:       { bg: "#fef9c3", text: "#ca8a04" },
  queueCalled:        { bg: "#dbeafe", text: "#1d4ed8" },
  queueInConsult:     { bg: "#dcfce7", text: "#16a34a" },
};

export const FontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   16,
  lg:   18,
  xl:   20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
  "5xl": 40,
};

export const FontWeight = {
  regular:  "400" as const,
  medium:   "500" as const,
  semibold: "600" as const,
  bold:     "700" as const,
  extrabold:"800" as const,
};

export const Spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
};

export const Radius = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   18,
  "2xl": 24,
  full: 9999,
};

export const Shadow = {
  xs: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sm: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  lg: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 5,
  },
};
