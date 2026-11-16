export const theme = {
  colors: {
    primary: '#007bff',
    primaryHover: '#0056b3',
    primaryLight: 'rgba(0, 123, 255, 0.1)',
    secondary: '#6c757d',
    secondaryHover: '#5a6268',
    success: '#28a745',
    successHover: '#218838',
    successLight: 'rgba(40, 167, 69, 0.1)',
    danger: '#dc3545',
    dangerHover: '#c82333',
    dangerLight: 'rgba(220, 53, 69, 0.1)',
    warning: '#ffc107',
    warningHover: '#e0a800',
    info: '#17a2b8',
    infoHover: '#138496',
    light: '#f8f9fa',
    dark: '#343a40',
    white: '#ffffff',
    black: '#000000',
    text: '#333333',
    textSecondary: '#666666',
    textLight: '#999999',
    border: '#dddddd',
    borderLight: '#eeeeee',
    background: '#ffffff',
    backgroundSecondary: '#f8f9fa',
    backgroundTertiary: '#e9ecef',
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    base: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },

  typography: {
    fontFamily: {
      base: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif',
      mono: '"SFMono-Regular", "Consolas", "Liberation Mono", "Menlo", monospace',
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.6,
      relaxed: 1.8,
    },
  },

  borderRadius: {
    sm: '4px',
    base: '8px',
    md: '12px',
    lg: '16px',
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.08)',
    base: '0 2px 8px rgba(0, 0, 0, 0.1)',
    md: '0 4px 12px rgba(0, 0, 0, 0.12)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.15)',
    xl: '0 12px 32px rgba(0, 0, 0, 0.18)',
  },

  transitions: {
    fast: '150ms ease-in-out',
    base: '250ms ease-in-out',
    slow: '350ms ease-in-out',
  },

  breakpoints: {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    backdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
}

export type Theme = typeof theme
