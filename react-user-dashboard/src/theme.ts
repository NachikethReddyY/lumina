// Lumina Design System - Complete Theme Tokens
export const theme = {
  colors: {
    // Canvas & Surfaces
    canvas: '#141413',
    surfaceCard: '#1a1a1a',
    surfaceDark: '#1e1e1e',
    surfaceDarkElevated: '#252525',

    // Brand - Dual Blue System
    primary: '#3b82f6', // Lumina Blue
    primaryHover: '#60a5fa',
    primaryFocus: '#2563eb',
    primaryActive: '#1d4ed8',
    secondaryBlue: '#0066cc', // System Action Blue

    // Semantic Colors
    success: '#34c759',
    warning: '#ff9500',
    error: '#ff3b30',

    // Text Colors
    ink: '#f7f8f8', // Headlines
    bodyStrong: '#e0e0e0',
    body: '#d0d6e0',
    muted: '#8a8f98',
    mutedSoft: '#6c6c6c',
    onPrimary: '#ffffff',
    onDark: '#f7f8f8',

    // Borders & UI
    hairline: '#2a2a2a',
    hairlineSoft: '#333333',
  },

  typography: {
    fontFamily: {
      display: '"Newsreader", "EB Garamond", serif',
      body: '-apple-system, "Inter", system-ui, sans-serif',
      mono: '"Fira Code", "JetBrains Mono", monospace',
    },

    // Display Styles
    displayXl: {
      fontSize: '64px',
      fontWeight: 400,
      lineHeight: 1.05,
      letterSpacing: '-1.5px',
      fontFamily: '"Newsreader", "EB Garamond", serif',
    },
    displayLg: {
      fontSize: '48px',
      fontWeight: 400,
      lineHeight: 1.1,
      letterSpacing: '-1px',
      fontFamily: '"Newsreader", "EB Garamond", serif',
    },
    displayMd: {
      fontSize: '36px',
      fontWeight: 400,
      lineHeight: 1.15,
      letterSpacing: '-0.5px',
      fontFamily: '"Newsreader", "EB Garamond", serif',
    },

    // Title Styles
    titleLg: {
      fontSize: '22px',
      fontWeight: 500,
      lineHeight: 1.3,
      letterSpacing: '0',
    },
    titleMd: {
      fontSize: '18px',
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: '0',
    },
    titleSm: {
      fontSize: '16px',
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: '0',
    },

    // Body Text
    bodyMd: {
      fontSize: '17px',
      fontWeight: 400,
      lineHeight: 1.47,
      letterSpacing: '-0.374px',
    },
    bodySm: {
      fontSize: '14px',
      fontWeight: 400,
      lineHeight: 1.55,
      letterSpacing: '0',
    },

    // Button & Utility
    button: {
      fontSize: '14px',
      fontWeight: 500,
      lineHeight: 1.0,
      letterSpacing: '0',
    },
    buttonLarge: {
      fontSize: '18px',
      fontWeight: 300,
      lineHeight: 1.0,
      letterSpacing: '0',
    },

    // Caption
    caption: {
      fontSize: '13px',
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: '0',
    },
    captionUppercase: {
      fontSize: '12px',
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: '1.5px',
    },
  },

  spacing: {
    xxs: '4px',
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
    section: '96px',
  },

  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    xxl: '24px',
    pill: '9999px',
    full: '50%',
  },

  shadows: {
    // Single product shadow - ONLY for product imagery
    product: '0 3px 30px rgba(0,0,0,0.22)',
  },
};

export type Theme = typeof theme;
