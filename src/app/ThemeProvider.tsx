'use client';

import {
  ThemeProvider,
  createTheme,
  PaletteMode,
} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ReactNode, useState, useMemo, createContext, useContext, useEffect } from 'react';

// --- Color Mode Context ---
interface ColorModeContextType {
  toggleColorMode: () => void;
  mode: PaletteMode;
}

export const ColorModeContext = createContext<ColorModeContextType | undefined>(undefined);

export const useColorMode = () => {
  const context = useContext(ColorModeContext);
  if (context === undefined) {
    throw new Error('useColorMode must be used within a ColorModeProvider');
  }
  return context;
};

// --- Mockingbird Design Tokens ---
const tokens = {
  light: {
    bg: '#f4f0e8',
    bgSubtle: '#ebe6db',
    surface: '#fbf9f4',
    surfaceAlt: '#f7f3ea',
    text: '#1f1a12',
    textMuted: '#6b6252',
    textSubtle: '#9b917e',
    border: '#e0d9c8',
    borderStrong: '#c8bfa9',
    divider: '#eae4d4',
    accent: '#2d5f3f',
    accentSoft: '#dde8d9',
    accentText: '#1c3f28',
    warning: '#b8761e',
    warningSoft: '#f4e5c6',
    danger: '#a63d2a',
    dangerSoft: '#f1dcd3',
    success: '#2d5f3f',
    successSoft: '#dde8d9',
    info: '#3e5a7a',
    infoSoft: '#dce5ef',
    pFb: '#3b5998',
    pIg: '#c13584',
    pX: '#1f1a12',
    pTg: '#2b8bcc',
    shadowSm: '0 1px 2px rgba(45,35,20,0.06)',
    shadowMd: '0 2px 4px rgba(45,35,20,0.04), 0 8px 24px rgba(45,35,20,0.06)',
    shadowLg: '0 4px 8px rgba(45,35,20,0.04), 0 16px 48px rgba(45,35,20,0.1)',
  },
  dark: {
    bg: '#1a1712',
    bgSubtle: '#221e18',
    surface: '#252019',
    surfaceAlt: '#2d281f',
    text: '#f4f0e8',
    textMuted: '#9b917e',
    textSubtle: '#6b6252',
    border: '#3a3428',
    borderStrong: '#514a3b',
    divider: '#312b22',
    accent: '#7fb089',
    accentSoft: '#2a3d2e',
    accentText: '#c7dec9',
    warning: '#d4953f',
    warningSoft: '#3a2f1a',
    danger: '#d46b56',
    dangerSoft: '#3a201a',
    success: '#7fb089',
    successSoft: '#2a3d2e',
    info: '#7fa0c0',
    infoSoft: '#1f2a3a',
    pFb: '#6c8cc4',
    pIg: '#d669a6',
    pX: '#f4f0e8',
    pTg: '#5bb0e2',
    shadowSm: '0 1px 2px rgba(0,0,0,0.3)',
    shadowMd: '0 2px 4px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.3)',
    shadowLg: '0 4px 8px rgba(0,0,0,0.2), 0 16px 48px rgba(0,0,0,0.4)',
  },
};

export { tokens as mbTokens };

const getTheme = (mode: PaletteMode) => {
  const t = tokens[mode];
  return createTheme({
    palette: {
      mode,
      primary: {
        main: t.accent,
        light: t.accentSoft,
        dark: t.accentText,
        contrastText: mode === 'light' ? '#fbf9f4' : '#1a1712',
      },
      secondary: {
        main: t.info,
        light: t.infoSoft,
        dark: t.info,
        contrastText: mode === 'light' ? '#fbf9f4' : '#1a1712',
      },
      error: {
        main: t.danger,
        light: t.dangerSoft,
      },
      warning: {
        main: t.warning,
        light: t.warningSoft,
      },
      success: {
        main: t.success,
        light: t.successSoft,
      },
      info: {
        main: t.info,
        light: t.infoSoft,
      },
      background: {
        default: t.bg,
        paper: t.surface,
      },
      text: {
        primary: t.text,
        secondary: t.textMuted,
        disabled: t.textSubtle,
      },
      divider: t.divider,
      action: {
        hover: mode === 'light' ? 'rgba(45,35,20,0.04)' : 'rgba(255,255,255,0.04)',
        selected: mode === 'light' ? 'rgba(45,35,20,0.08)' : 'rgba(255,255,255,0.08)',
      },
    },
    typography: {
      fontFamily: [
        'var(--font-geist-sans)',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'sans-serif',
      ].join(','),
      h1: {
        fontFamily: 'var(--font-fraunces), Georgia, serif',
        fontSize: '2.8rem',
        fontWeight: 400,
        lineHeight: 1,
        letterSpacing: '-0.03em',
      },
      h2: {
        fontFamily: 'var(--font-fraunces), Georgia, serif',
        fontSize: '2.2rem',
        fontWeight: 400,
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
      },
      h3: {
        fontFamily: 'var(--font-fraunces), Georgia, serif',
        fontSize: '1.75rem',
        fontWeight: 400,
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
      },
      h4: {
        fontFamily: 'var(--font-fraunces), Georgia, serif',
        fontSize: '1.4rem',
        fontWeight: 400,
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
      },
      h5: {
        fontFamily: 'var(--font-fraunces), Georgia, serif',
        fontSize: '1.2rem',
        fontWeight: 400,
        lineHeight: 1.4,
        letterSpacing: '-0.01em',
      },
      h6: {
        fontFamily: 'var(--font-fraunces), Georgia, serif',
        fontSize: '1.05rem',
        fontWeight: 500,
        lineHeight: 1.4,
      },
      body1: { fontSize: '0.875rem', lineHeight: 1.6 },
      body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
      caption: { fontSize: '0.75rem', lineHeight: 1.4 },
      overline: {
        fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
        fontSize: '0.625rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        fontWeight: 500,
        lineHeight: 1.4,
      },
      button: { textTransform: 'none' as const, fontWeight: 500, letterSpacing: '-0.01em' },
    },
    shape: {
      borderRadius: 12,
    },
    shadows: [
      'none',
      t.shadowSm,
      t.shadowMd,
      t.shadowMd,
      t.shadowLg,
      t.shadowLg,
      t.shadowLg,
      ...Array(18).fill(t.shadowLg),
    ] as unknown as ReturnType<typeof createTheme>['shadows'],
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            padding: '8px 18px',
            fontSize: '0.8125rem',
            transition: 'all .15s ease',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
          contained: {
            '&:hover': {
              boxShadow: 'none',
            },
          },
          outlined: {
            borderColor: t.borderStrong,
            color: t.text,
            '&:hover': {
              borderColor: t.text,
              backgroundColor: 'transparent',
            },
          },
          text: {
            color: t.textMuted,
            '&:hover': {
              backgroundColor: t.surfaceAlt,
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: t.surface,
            borderBottom: `1px solid ${t.border}`,
            boxShadow: 'none',
            color: t.text,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: 'none',
            border: `1px solid ${t.border}`,
            backgroundColor: t.surface,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: 'none',
            border: `1px solid ${t.border}`,
            backgroundColor: t.surface,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 500,
            fontSize: '0.75rem',
            border: `1px solid ${t.border}`,
            backgroundColor: t.surfaceAlt,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: t.textMuted,
            '&:hover': {
              backgroundColor: t.surfaceAlt,
            },
          },
        },
      },
      MuiLink: {
        defaultProps: {
          underline: 'none' as const,
        },
        styleOverrides: {
          root: {
            color: t.accent,
            '&:hover': {
              color: t.accentText,
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              '& fieldset': {
                borderColor: t.border,
              },
              '&:hover fieldset': {
                borderColor: t.borderStrong,
              },
              '&.Mui-focused fieldset': {
                borderColor: t.accent,
              },
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            border: `1px solid ${t.border}`,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: t.divider,
          },
          head: {
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: '0.625rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            fontWeight: 500,
            color: t.textMuted,
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: t.divider,
          },
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'light' ? 'rgba(35, 30, 22, 0.5)' : 'rgba(0,0,0,0.6)',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none' as const,
            fontWeight: 500,
            fontSize: '0.8125rem',
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            backgroundColor: t.surfaceAlt,
          },
          bar: {
            borderRadius: 4,
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: t.bg,
            color: t.text,
          },
        },
      },
    },
  });
};

// --- MuiThemeProvider Component ---
export default function MuiThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('colorMode') as PaletteMode) || 'light';
    }
    return 'light';
  });

  const theme = useMemo(() => getTheme(mode), [mode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('colorMode', mode);
    }
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
      mode,
    }),
    [mode]
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
