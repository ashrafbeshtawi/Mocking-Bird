'use client';

import {
  ThemeProvider,
  createTheme, // Import createTheme
  PaletteMode,  // Import PaletteMode
} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ReactNode, useState, useMemo, createContext, useContext, useEffect } from 'react';

// --- Imports for the Theme Definition (from former theme.ts) ---
import { blue, orange, grey, common, deepPurple, amber, indigo, teal } from '@mui/material/colors'; // Added indigo, teal


// --- Create and Export Color Mode Context ---
// This context will allow any component within your app to toggle the theme mode
interface ColorModeContextType {
  toggleColorMode: () => void;
  mode: PaletteMode;
}

export const ColorModeContext = createContext<ColorModeContextType | undefined>(undefined);

// Custom hook to use the ColorModeContext
export const useColorMode = () => {
  const context = useContext(ColorModeContext);
  if (context === undefined) {
    throw new Error('useColorMode must be used within a ColorModeProvider');
  }
  return context;
};

// --- Theme Definition (formerly in theme.ts) ---
// Helper function to create the theme based on the selected mode (light or dark)
const getTheme = (mode: PaletteMode) => createTheme({
  palette: {
    mode, // This sets the overall palette mode
    ...(mode === 'light'
      ? { // Light Mode Palette - IMPROVED CONTRAST
          primary: {
            main: indigo[700], // Deeper indigo for better contrast
            light: indigo[400],
            dark: indigo[900],
            contrastText: common.white, // White text on primary is good
          },
          secondary: {
            main: teal[500], // Teal for a fresh contrast, good visibility
            light: teal[300],
            dark: teal[700],
            contrastText: common.white, // White text on secondary is good
          },
          error: {
            main: '#D32F2F', // Standard red for errors, high contrast
          },
          background: {
            default: grey[50], // Very light background
            paper: common.white, // Pure white for cards/surfaces
          },
          text: {
            primary: grey[900], // Very dark text for high contrast on light backgrounds
            secondary: grey[700], // Dark grey for secondary text
            disabled: grey[500],
          },
          divider: grey[300], // Slightly darker divider for better separation
          action: {
            hover: 'rgba(0, 0, 0, 0.04)', // Standard hover, good on light
            selected: 'rgba(0, 0, 0, 0.08)',
          },
        }
      : { // Dark Mode Palette - IMPROVED CONTRAST
          primary: {
            main: deepPurple[500], // A balanced purple for dark mode
            light: deepPurple[300],
            dark: deepPurple[700],
            contrastText: common.white, // White text on primary is good
          },
          secondary: {
            main: amber[400], // Bright amber for good visibility
            light: amber[300],
            dark: amber[600],
            contrastText: grey[900], // Dark text on bright amber for contrast
          },
          error: {
            main: '#EF5350', // Standard red for errors in dark mode, high contrast
          },
          background: {
            default: '#121212', // Standard dark background
            paper: '#1E1E1E', // Slightly lighter dark for cards/surfaces
          },
          text: {
            primary: common.white, // White text for primary on dark backgrounds
            secondary: grey[400], // Lighter grey for secondary text on dark
            disabled: grey[600],
          },
          divider: '#303030', // Clearly visible divider in dark mode
          action: {
            hover: 'rgba(255, 255, 255, 0.08)', // Standard hover, good on dark
            selected: 'rgba(255, 255, 255, 0.16)',
          },
        }),
  },
  typography: {
    fontFamily: [
      'var(--font-geist-sans)', // Keeping your custom fonts
      'var(--font-geist-mono)',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: { fontSize: '3.5rem', fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: '2.8rem', fontWeight: 600, lineHeight: 1.3 },
    h3: { fontSize: '2.2rem', fontWeight: 600, lineHeight: 1.4 },
    h4: { fontSize: '1.8rem', fontWeight: 600, lineHeight: 1.5, marginBottom: '1rem' },
    h5: { fontSize: '1.4rem', fontWeight: 500, lineHeight: 1.6 },
    h6: { fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.05em', lineHeight: 1.6 }, // Specific for Navbar
    body1: { fontSize: '1rem', lineHeight: 1.6 },
    body2: { fontSize: '0.9rem', lineHeight: 1.5 },
    button: { textTransform: 'none' }, // Default button text to not uppercase
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 8, // More rounded buttons
          transition: 'transform 0.2s ease-in-out, background-color 0.3s ease, color 0.3s ease',
          '&:hover': {
            transform: 'translateY(-1px)', // Slight lift on hover
          },
        }),
        contained: ({ theme }) => ({
          boxShadow: theme.shadows[3], // Deeper shadow for contained buttons
          '&:hover': {
            boxShadow: theme.shadows[6], // Even deeper on hover
          },
          // Ensure contrast for text on contained buttons
          color: theme.palette.getContrastText(theme.palette.primary.main),
        }),
        outlined: ({ theme }) => ({
          borderColor: theme.palette.mode === 'light' ? theme.palette.primary.light : theme.palette.primary.dark,
          color: theme.palette.mode === 'light' ? theme.palette.primary.main : theme.palette.primary.light,
          '&:hover': {
            borderColor: theme.palette.primary.main,
            backgroundColor: theme.palette.action.hover,
          },
        }),
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          boxShadow: theme.shadows[1], // Subtle shadow for app bar
          borderBottom: `1px solid ${theme.palette.divider}`, // Defined divider color
          transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 12, // More rounded paper/card elements
          transition: 'background-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease',
          // Default shadow for Paper components (e.g., FeatureCard on homepage)
          boxShadow: theme.shadows[2],
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.secondary, // Default icon buttons use secondary text color
          transition: 'color 0.3s ease, background-color 0.3s ease',
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        }),
      },
    },
    MuiLink: {
        defaultProps: {
            underline: 'none', // No underline by default for Links
        },
        styleOverrides: {
            root: ({ theme }) => ({
                color: theme.palette.primary.main,
                '&:hover': {
                    color: theme.palette.primary.dark,
                },
                transition: 'color 0.3s ease',
            }),
        },
    },
    MuiListItemButton: {
        styleOverrides: {
            root: ({ theme }) => ({
                borderRadius: theme.shape.borderRadius, // Apply default border radius to list items too
                transition: 'background-color 0.3s ease, color 0.3s ease',
            }),
        },
    },
  },
});

// --- MuiThemeProvider Component ---
export default function MuiThemeProvider({ children }: { children: ReactNode }) {
  // State for theme mode, initialized from localStorage for persistence
  const [mode, setMode] = useState<PaletteMode>(() => {
    // Check if window is defined to avoid issues during server-side rendering
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('colorMode') as PaletteMode) || 'light';
    }
    return 'light'; // Default to light mode on server or if no localStorage item
  });

  // Memoize the theme object to avoid unnecessary re-creations on every render
  const theme = useMemo(() => getTheme(mode), [mode]);

  // Effect to save the current mode to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('colorMode', mode);
    }
  }, [mode]);

  // Memoize the context value that will be provided to consumers
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