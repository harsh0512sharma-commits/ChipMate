export const darkColors = {
  // Deep Slate / Charcoal Gray Backgrounds
  background: '#0E1015',
  card: '#161920',
  cardRaised: '#1E222B',
  cardHover: '#242935',
  cardInset: '#12141A',

  // Subtle Borders
  border: '#262B37',
  borderSubtle: 'rgba(255, 255, 255, 0.07)',
  borderDark: '#191C24',

  // Typography
  text: '#F3F4F6',
  textSecondary: '#949BA8',
  textMuted: '#585F6E',
  textInverse: '#0E1015',

  // Refined Matte Orange / Terracotta Accent
  primary: '#EA580C',
  primaryLight: 'rgba(234, 88, 12, 0.12)',
  primaryMuted: 'rgba(234, 88, 12, 0.22)',
  primaryBorder: 'rgba(234, 88, 12, 0.35)',
  primaryDark: '#C2410C',
  primaryHover: '#F97316',

  // Subtle Functional Accents
  chipGold: '#D97706',
  chipGoldBg: 'rgba(217, 119, 6, 0.12)',
  chipGoldText: '#FBBF24',

  success: '#10B981',
  successLight: 'rgba(16, 185, 129, 0.12)',
  successBorder: 'rgba(16, 185, 129, 0.25)',
  successText: '#34D399',

  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.12)',
  warningBorder: 'rgba(245, 158, 11, 0.25)',
  warningText: '#FBBF24',

  danger: '#EF4444',
  dangerLight: 'rgba(239, 68, 68, 0.12)',
  dangerBorder: 'rgba(239, 68, 68, 0.25)',
  dangerText: '#F87171',

  purple: '#A855F7',
  purpleLight: 'rgba(168, 85, 247, 0.12)',

  chip: '#EA580C',
  chipDark: '#C2410C',
  chipLight: 'rgba(234, 88, 12, 0.12)'
};

export const lightColors = {
  // Minimalist Off-White / Pure White Palette
  background: '#F8FAFC',
  card: '#FFFFFF',
  cardRaised: '#F1F5F9',
  cardHover: '#E2E8F0',
  cardInset: '#F8FAFC',

  // Clean Slate Borders
  border: '#CBD5E1',
  borderSubtle: '#E2E8F0',
  borderDark: '#94A3B8',

  // Typography
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Refined Blue Accent (Inspired by Bink)
  primary: '#2563EB',
  primaryLight: 'rgba(37, 99, 235, 0.08)',
  primaryMuted: 'rgba(37, 99, 235, 0.16)',
  primaryBorder: 'rgba(37, 99, 235, 0.25)',
  primaryDark: '#1D4ED8',
  primaryHover: '#3B82F6',

  // Subtle Functional Accents
  chipGold: '#D97706',
  chipGoldBg: 'rgba(217, 119, 6, 0.08)',
  chipGoldText: '#B45309',

  success: '#16A34A',
  successLight: 'rgba(22, 163, 74, 0.08)',
  successBorder: 'rgba(22, 163, 74, 0.2)',
  successText: '#15803D',

  warning: '#D97706',
  warningLight: 'rgba(217, 119, 6, 0.08)',
  warningBorder: 'rgba(217, 119, 6, 0.2)',
  warningText: '#B45309',

  danger: '#DC2626',
  dangerLight: 'rgba(220, 38, 38, 0.08)',
  dangerBorder: 'rgba(220, 38, 38, 0.2)',
  dangerText: '#B91C1C',

  purple: '#7C3AED',
  purpleLight: 'rgba(124, 58, 237, 0.08)',

  chip: '#2563EB',
  chipDark: '#1D4ED8',
  chipLight: 'rgba(37, 99, 235, 0.08)'
};

export type ThemePalette = typeof darkColors;

// Default exported colors maps to dynamic CSS variables on Web and darkColors on Native
export const colors: ThemePalette = {
  background: 'var(--cm-background, #0E1015)' as any,
  card: 'var(--cm-card, #161920)' as any,
  cardRaised: 'var(--cm-card-raised, #1E222B)' as any,
  cardHover: 'var(--cm-card-hover, #242935)' as any,
  cardInset: 'var(--cm-card-inset, #12141A)' as any,

  border: 'var(--cm-border, #262B37)' as any,
  borderSubtle: 'var(--cm-border-subtle, rgba(255, 255, 255, 0.07))' as any,
  borderDark: 'var(--cm-border-dark, #191C24)' as any,

  text: 'var(--cm-text, #F3F4F6)' as any,
  textSecondary: 'var(--cm-text-secondary, #949BA8)' as any,
  textMuted: 'var(--cm-text-muted, #585F6E)' as any,
  textInverse: 'var(--cm-text-inverse, #0E1015)' as any,

  primary: 'var(--cm-primary, #EA580C)' as any,
  primaryLight: 'var(--cm-primary-light, rgba(234, 88, 12, 0.12))' as any,
  primaryMuted: 'var(--cm-primary-muted, rgba(234, 88, 12, 0.22))' as any,
  primaryBorder: 'var(--cm-primary-border, rgba(234, 88, 12, 0.35))' as any,
  primaryDark: 'var(--cm-primary-dark, #C2410C)' as any,
  primaryHover: 'var(--cm-primary-hover, #F97316)' as any,

  chipGold: 'var(--cm-chip-gold, #D97706)' as any,
  chipGoldBg: 'var(--cm-chip-gold-bg, rgba(217, 119, 6, 0.12))' as any,
  chipGoldText: 'var(--cm-chip-gold-text, #FBBF24)' as any,

  success: 'var(--cm-success, #10B981)' as any,
  successLight: 'var(--cm-success-light, rgba(16, 185, 129, 0.12))' as any,
  successBorder: 'var(--cm-success-border, rgba(16, 185, 129, 0.25))' as any,
  successText: 'var(--cm-success-text, #34D399)' as any,

  warning: 'var(--cm-warning, #F59E0B)' as any,
  warningLight: 'var(--cm-warning-light, rgba(245, 158, 11, 0.12))' as any,
  warningBorder: 'var(--cm-warning-border, rgba(245, 158, 11, 0.25))' as any,
  warningText: 'var(--cm-warning-text, #FBBF24)' as any,

  danger: 'var(--cm-danger, #EF4444)' as any,
  dangerLight: 'var(--cm-danger-light, rgba(239, 68, 68, 0.12))' as any,
  dangerBorder: 'var(--cm-danger-border, rgba(239, 68, 68, 0.25))' as any,
  dangerText: 'var(--cm-danger-text, #F87171)' as any,

  purple: 'var(--cm-purple, #A855F7)' as any,
  purpleLight: 'var(--cm-purple-light, rgba(168, 85, 247, 0.12))' as any,

  chip: 'var(--cm-chip, #EA580C)' as any,
  chipDark: 'var(--cm-chip-dark, #C2410C)' as any,
  chipLight: 'var(--cm-chip-light, rgba(234, 88, 12, 0.12))' as any
};

export function applyThemeToDom(theme: 'dark' | 'light') {
  if (typeof document === 'undefined') return;
  const palette = theme === 'light' ? lightColors : darkColors;
  const root = document.documentElement;

  root.style.setProperty('--cm-background', palette.background);
  root.style.setProperty('--cm-card', palette.card);
  root.style.setProperty('--cm-card-raised', palette.cardRaised);
  root.style.setProperty('--cm-card-hover', palette.cardHover);
  root.style.setProperty('--cm-card-inset', palette.cardInset);
  root.style.setProperty('--cm-border', palette.border);
  root.style.setProperty('--cm-border-subtle', palette.borderSubtle);
  root.style.setProperty('--cm-border-dark', palette.borderDark);
  root.style.setProperty('--cm-text', palette.text);
  root.style.setProperty('--cm-text-secondary', palette.textSecondary);
  root.style.setProperty('--cm-text-muted', palette.textMuted);
  root.style.setProperty('--cm-text-inverse', palette.textInverse);
  root.style.setProperty('--cm-primary', palette.primary);
  root.style.setProperty('--cm-primary-light', palette.primaryLight);
  root.style.setProperty('--cm-primary-muted', palette.primaryMuted);
  root.style.setProperty('--cm-primary-border', palette.primaryBorder);
  root.style.setProperty('--cm-primary-dark', palette.primaryDark);
  root.style.setProperty('--cm-primary-hover', palette.primaryHover);
  root.style.setProperty('--cm-chip-gold', palette.chipGold);
  root.style.setProperty('--cm-chip-gold-bg', palette.chipGoldBg);
  root.style.setProperty('--cm-chip-gold-text', palette.chipGoldText);
  root.style.setProperty('--cm-success', palette.success);
  root.style.setProperty('--cm-success-light', palette.successLight);
  root.style.setProperty('--cm-success-border', palette.successBorder);
  root.style.setProperty('--cm-success-text', palette.successText);
  root.style.setProperty('--cm-warning', palette.warning);
  root.style.setProperty('--cm-warning-light', palette.warningLight);
  root.style.setProperty('--cm-warning-border', palette.warningBorder);
  root.style.setProperty('--cm-warning-text', palette.warningText);
  root.style.setProperty('--cm-danger', palette.danger);
  root.style.setProperty('--cm-danger-light', palette.dangerLight);
  root.style.setProperty('--cm-danger-border', palette.dangerBorder);
  root.style.setProperty('--cm-danger-text', palette.dangerText);
  root.style.setProperty('--cm-purple', palette.purple);
  root.style.setProperty('--cm-purple-light', palette.purpleLight);
  root.style.setProperty('--cm-chip', palette.chip);
  root.style.setProperty('--cm-chip-dark', palette.chipDark);
  root.style.setProperty('--cm-chip-light', palette.chipLight);

  if (document.body) {
    document.body.style.backgroundColor = palette.background;
    document.body.style.color = palette.text;
  }
}

// Immediate initial sync on web to prevent any theme flash
if (typeof localStorage !== 'undefined') {
  try {
    const saved = localStorage.getItem('@chipmate_theme_mode');
    if (saved === 'light' || saved === 'dark') {
      applyThemeToDom(saved);
    } else {
      applyThemeToDom('dark');
    }
  } catch (_) {
    applyThemeToDom('dark');
  }
}
