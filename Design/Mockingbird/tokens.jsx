// Design tokens for Mockingbird — warm, approachable, forest-green accent

const MB_THEMES = {
  light: {
    name: 'light',
    // Backgrounds — soft cream/oat, never pure white
    bg:        '#f4f0e8',
    bgSubtle:  '#ebe6db',
    surface:   '#fbf9f4',
    surfaceAlt:'#f7f3ea',
    overlay:   'rgba(35, 30, 22, 0.5)',

    // Text — warm dark, not black
    text:      '#1f1a12',
    textMuted: '#6b6252',
    textSubtle:'#9b917e',
    textInverse: '#fbf9f4',

    // Borders — warm, low contrast
    border:    '#e0d9c8',
    borderStrong: '#c8bfa9',
    divider:   '#eae4d4',

    // Accents
    accent:    '#2d5f3f',   // forest green
    accentSoft:'#dde8d9',
    accentText:'#1c3f28',
    accentInk: '#fbf9f4',

    // Semantic
    warning:   '#b8761e',
    warningSoft:'#f4e5c6',
    danger:    '#a63d2a',
    dangerSoft:'#f1dcd3',
    success:   '#2d5f3f',
    successSoft:'#dde8d9',
    info:      '#3e5a7a',
    infoSoft:  '#dce5ef',

    // Platform brand dots (muted — reads as data, not logos)
    pFb:   '#3b5998',
    pIg:   '#c13584',
    pX:    '#1f1a12',
    pTg:   '#2b8bcc',

    // Shadows
    shadowSm:  '0 1px 2px rgba(45,35,20,0.06)',
    shadowMd:  '0 2px 4px rgba(45,35,20,0.04), 0 8px 24px rgba(45,35,20,0.06)',
    shadowLg:  '0 4px 8px rgba(45,35,20,0.04), 0 16px 48px rgba(45,35,20,0.1)',
  },
  dark: {
    name: 'dark',
    bg:        '#1a1712',
    bgSubtle:  '#221e18',
    surface:   '#252019',
    surfaceAlt:'#2d281f',
    overlay:   'rgba(0,0,0,0.6)',

    text:      '#f4f0e8',
    textMuted: '#9b917e',
    textSubtle:'#6b6252',
    textInverse: '#1f1a12',

    border:    '#3a3428',
    borderStrong: '#514a3b',
    divider:   '#312b22',

    accent:    '#7fb089',
    accentSoft:'#2a3d2e',
    accentText:'#c7dec9',
    accentInk: '#1a1712',

    warning:   '#d4953f',
    warningSoft:'#3a2f1a',
    danger:    '#d46b56',
    dangerSoft:'#3a201a',
    success:   '#7fb089',
    successSoft:'#2a3d2e',
    info:      '#7fa0c0',
    infoSoft:  '#1f2a3a',

    pFb:   '#6c8cc4',
    pIg:   '#d669a6',
    pX:    '#f4f0e8',
    pTg:   '#5bb0e2',

    shadowSm:  '0 1px 2px rgba(0,0,0,0.3)',
    shadowMd:  '0 2px 4px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.3)',
    shadowLg:  '0 4px 8px rgba(0,0,0,0.2), 0 16px 48px rgba(0,0,0,0.4)',
  },
};

// Accent color variants
const MB_ACCENTS = {
  forest: { light: { accent: '#2d5f3f', accentSoft: '#dde8d9', accentText: '#1c3f28', accentInk:'#fbf9f4' },
            dark:  { accent: '#7fb089', accentSoft: '#2a3d2e', accentText: '#c7dec9', accentInk:'#1a1712' } },
  clay:   { light: { accent: '#b8552e', accentSoft: '#f2dccf', accentText: '#7a3820', accentInk:'#fbf9f4' },
            dark:  { accent: '#d68968', accentSoft: '#3d2419', accentText: '#f0c7b0', accentInk:'#1a1712' } },
  ink:    { light: { accent: '#1f1a12', accentSoft: '#e0d9c8', accentText: '#1f1a12', accentInk:'#f4f0e8' },
            dark:  { accent: '#f4f0e8', accentSoft: '#3a3428', accentText: '#f4f0e8', accentInk:'#1a1712' } },
  dusk:   { light: { accent: '#4a4e8c', accentSoft: '#dedff0', accentText: '#2a2e58', accentInk:'#fbf9f4' },
            dark:  { accent: '#8a8fc0', accentSoft: '#2d2e4a', accentText: '#c5c8e0', accentInk:'#1a1712' } },
};

const MB_FONTS = {
  display: '"Fraunces", Georgia, serif',
  serif:   '"Instrument Serif", Georgia, serif',
  sans:    '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono:    '"Geist Mono", ui-monospace, "SF Mono", monospace',
};

function mbTheme(mode = 'light', accentKey = 'forest') {
  const base = MB_THEMES[mode];
  const accent = MB_ACCENTS[accentKey][mode];
  return { ...base, ...accent, fonts: MB_FONTS };
}

Object.assign(window, { MB_THEMES, MB_ACCENTS, MB_FONTS, mbTheme });
