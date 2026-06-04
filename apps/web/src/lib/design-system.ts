export const designSystem = {
  theme: {
    light: {
      background: '#F8FAFC',
      surface: '#FFFFFF',
      border: '#E2E8F0',
      primary: '#6D28D9',
      primaryHover: '#7C3AED',
      success: '#22C55E',
      warning: '#F59E0B',
      danger: '#EF4444',
      textPrimary: '#0F172A',
      textSecondary: '#64748B',
    },
    dark: {
      background: '#0B1020',
      surface: '#111827',
      surfaceSecondary: '#1F2937',
      border: '#374151',
      primary: '#8B5CF6',
      primaryHover: '#A78BFA',
      success: '#22C55E',
      warning: '#F59E0B',
      danger: '#EF4444',
      textPrimary: '#F8FAFC',
      textSecondary: '#94A3B8',
    },
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
  elevation: {
    xs: 'var(--shadow-enterprise-xs)',
    sm: 'var(--shadow-enterprise-sm)',
    md: 'var(--shadow-enterprise-md)',
    lg: 'var(--shadow-enterprise-lg)',
  },
  spacing: {
    page: 'var(--app-space-page)',
    section: '1.5rem',
    card: '1.25rem',
    control: '0.625rem 0.875rem',
  },
} as const;

export type DesignSystem = typeof designSystem;
