// Primitives: logo, icons, nav chrome, platform chips, form bits
// All take a `t` (theme) prop — no global state.

// ─────────────────────────── LOGO ───────────────────────────
// Original mark: a simple abstracted bird silhouette inscribed in a soft
// rounded square. Not a bird illustration — a geometric glyph that reads
// as "bird" from the crossed wing-line. Two-tone against accent.
function MBLogoMark({ size = 36, t }) {
  const s = size;
  return (
    <div style={{
      width: s, height: s, borderRadius: s * 0.24,
      background: t.accent, display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width={s * 0.58} height={s * 0.58} viewBox="0 0 24 24" fill="none">
        {/* stylized bird: circle head + swooped wing */}
        <circle cx="7" cy="8" r="2.4" fill={t.accentInk}/>
        <path d="M6.5 10.8 C 7.5 14, 10 17, 17 17 L 20 14 L 16 13 L 17 10 L 13 11.5 Z"
              fill={t.accentInk}/>
        <path d="M8.8 7.2 L 11 5.5" stroke={t.accentInk} strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

function MBWordmark({ t, size = 20 }) {
  return (
    <div style={{
      fontFamily: t.fonts.display,
      fontSize: size, fontWeight: 500,
      letterSpacing: -0.4, color: t.text,
      fontFeatureSettings: '"ss01"',
    }}>
      Mocking<span style={{ fontStyle: 'italic', fontWeight: 400 }}>bird</span>
    </div>
  );
}

function MBLogo({ t, size = 36, showWord = true }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <MBLogoMark size={size} t={t}/>
      {showWord && <MBWordmark t={t} size={size * 0.56}/>}
    </div>
  );
}

// ─────────────────────────── ICONS ───────────────────────────
// Single-stroke, 24px grid, 1.5 weight. Consistent across product.
const MBIcon = ({ d, size = 18, stroke = 'currentColor', fill = 'none', sw = 1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
       style={{ flexShrink: 0 }}>
    {typeof d === 'string' ? <path d={d}/> : d}
  </svg>
);

const IconDash = (p) => <MBIcon {...p} d={<>
  <rect x="3" y="3" width="7" height="7" rx="1"/>
  <rect x="14" y="3" width="7" height="7" rx="1"/>
  <rect x="3" y="14" width="7" height="7" rx="1"/>
  <rect x="14" y="14" width="7" height="7" rx="1"/>
</>}/>;
const IconCompose = (p) => <MBIcon {...p} d={<>
  <path d="M4 20h16"/>
  <path d="M15 4l5 5-9 9H6v-5l9-9z"/>
</>}/>;
const IconHistory = (p) => <MBIcon {...p} d={<>
  <path d="M3 12a9 9 0 1 0 3-6.7"/>
  <path d="M3 4v5h5"/>
  <path d="M12 8v4l3 2"/>
</>}/>;
const IconChart = (p) => <MBIcon {...p} d={<>
  <path d="M3 3v18h18"/>
  <path d="M7 15l4-6 3 3 5-7"/>
</>}/>;
const IconSparkle = (p) => <MBIcon {...p} d={<>
  <path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>
  <path d="M12 7 l 2 3 l 3 2 l -3 2 l -2 3 l -2 -3 l -3 -2 l 3 -2 z" fill="currentColor" stroke="none"/>
</>}/>;
const IconInfo = (p) => <MBIcon {...p} d={<>
  <circle cx="12" cy="12" r="9"/>
  <path d="M12 8v.01M11 12h1v4h1"/>
</>}/>;
const IconArrowRight = (p) => <MBIcon {...p} d={<>
  <path d="M5 12h14M13 6l6 6-6 6"/>
</>}/>;
const IconArrowUpRight = (p) => <MBIcon {...p} d={<>
  <path d="M7 17L17 7M8 7h9v9"/>
</>}/>;
const IconCheck = (p) => <MBIcon {...p} d="M4 12l5 5L20 6"/>;
const IconPlus = (p) => <MBIcon {...p} d="M12 5v14M5 12h14"/>;
const IconSearch = (p) => <MBIcon {...p} d={<>
  <circle cx="11" cy="11" r="7"/>
  <path d="M20 20l-4-4"/>
</>}/>;
const IconImage = (p) => <MBIcon {...p} d={<>
  <rect x="3" y="3" width="18" height="18" rx="2"/>
  <circle cx="9" cy="9" r="1.5"/>
  <path d="M3 17l5-5 5 5 3-3 5 5"/>
</>}/>;
const IconSmile = (p) => <MBIcon {...p} d={<>
  <circle cx="12" cy="12" r="9"/>
  <path d="M8 14c1 1.5 2.5 2.5 4 2.5s3-1 4-2.5"/>
  <path d="M9 9v.01M15 9v.01"/>
</>}/>;
const IconCalendar = (p) => <MBIcon {...p} d={<>
  <rect x="3" y="5" width="18" height="16" rx="2"/>
  <path d="M3 10h18M8 3v4M16 3v4"/>
</>}/>;
const IconClock = (p) => <MBIcon {...p} d={<>
  <circle cx="12" cy="12" r="9"/>
  <path d="M12 7v5l3 2"/>
</>}/>;
const IconTrend = (p) => <MBIcon {...p} d={<>
  <path d="M3 17l6-6 4 4 8-8"/>
  <path d="M14 7h7v7"/>
</>}/>;
const IconEye = (p) => <MBIcon {...p} d={<>
  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/>
  <circle cx="12" cy="12" r="3"/>
</>}/>;
const IconHeart = (p) => <MBIcon {...p} d="M20.8 6.6a5.5 5.5 0 0 0-9.3-2.2L12 5l-.5-.6A5.5 5.5 0 1 0 3.2 11.6l8.8 9.4 8.8-9.4a5.5 5.5 0 0 0 0-5z"/>;
const IconChat = (p) => <MBIcon {...p} d={<>
  <path d="M4 5h16v11H9l-5 4V5z"/>
</>}/>;
const IconRepost = (p) => <MBIcon {...p} d={<>
  <path d="M7 4l-3 3 3 3"/>
  <path d="M4 7h12a4 4 0 0 1 4 4v1"/>
  <path d="M17 20l3-3-3-3"/>
  <path d="M20 17H8a4 4 0 0 1-4-4v-1"/>
</>}/>;
const IconUpload = (p) => <MBIcon {...p} d={<>
  <path d="M12 15V3M7 8l5-5 5 5"/>
  <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>
</>}/>;
const IconAI = (p) => <MBIcon {...p} d={<>
  <path d="M12 2 L 14 8 L 20 10 L 14 12 L 12 18 L 10 12 L 4 10 L 10 8 Z"/>
  <path d="M19 3v3M20.5 4.5h-3"/>
</>}/>;
const IconLogout = (p) => <MBIcon {...p} d={<>
  <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"/>
  <path d="M15 8l4 4-4 4M19 12H9"/>
</>}/>;
const IconBell = (p) => <MBIcon {...p} d={<>
  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
  <path d="M10 21a2 2 0 0 0 4 0"/>
</>}/>;
const IconDots = (p) => <MBIcon {...p} d={<>
  <circle cx="5" cy="12" r="1" fill="currentColor"/>
  <circle cx="12" cy="12" r="1" fill="currentColor"/>
  <circle cx="19" cy="12" r="1" fill="currentColor"/>
</>}/>;
const IconX = (p) => <MBIcon {...p} d="M6 6l12 12M6 18L18 6"/>;

// Platform glyphs — monochrome, take currentColor. Inscribed shapes, not
// brand logos, so they read as "platforms" without cloning trademarks.
const GlyphFB = (p) => <MBIcon {...p} sw={0} fill="currentColor" stroke="none" d={<>
  <path d="M12 2 C 6.5 2, 2 6.5, 2 12 C 2 17, 5.6 21, 10.4 21.9 L 10.4 14.9 L 7.9 14.9 L 7.9 12 L 10.4 12 L 10.4 9.8 C 10.4 7.3, 11.9 6, 14.2 6 C 15.3 6, 16.5 6.2, 16.5 6.2 L 16.5 8.6 L 15.3 8.6 C 14.1 8.6, 13.7 9.3, 13.7 10.1 L 13.7 12 L 16.4 12 L 16 14.9 L 13.7 14.9 L 13.7 21.9 C 18.4 21, 22 17, 22 12 C 22 6.5, 17.5 2, 12 2 Z"/>
</>}/>;
const GlyphIG = (p) => <MBIcon {...p} d={<>
  <rect x="3" y="3" width="18" height="18" rx="5"/>
  <circle cx="12" cy="12" r="4"/>
  <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
</>}/>;
const GlyphX = (p) => <MBIcon {...p} sw={0} fill="currentColor" stroke="none" d={<>
  <path d="M17.5 3h3l-6.6 7.5L22 21h-6.2l-4.9-6.4L5.3 21H2.3l7.1-8L2 3h6.3l4.4 5.8L17.5 3zm-1 16h1.7L7.6 4.9H5.8L16.5 19z"/>
</>}/>;
const GlyphTG = (p) => <MBIcon {...p} sw={0} fill="currentColor" stroke="none" d={<>
  <path d="M12 2 C 6.5 2, 2 6.5, 2 12 C 2 17.5, 6.5 22, 12 22 C 17.5 22, 22 17.5, 22 12 C 22 6.5, 17.5 2, 12 2 Z M 16.7 8 L 15 16.2 C 14.9 16.7, 14.6 16.8, 14.2 16.6 L 11.6 14.7 L 10.3 15.9 C 10.2 16.1, 10.1 16.2, 9.8 16.2 L 10 13.5 L 14.9 9.1 C 15.1 8.9, 14.8 8.8, 14.5 9 L 8.5 12.9 L 5.9 12 C 5.3 11.8, 5.3 11.4, 6 11.2 L 16 7.4 C 16.5 7.2, 16.9 7.5, 16.7 8 Z"/>
</>}/>;

const PLATFORMS = [
  { key: 'fb', name: 'Facebook',  short: 'FB', Glyph: GlyphFB, color: 'pFb', limit: 63206 },
  { key: 'ig', name: 'Instagram', short: 'IG', Glyph: GlyphIG, color: 'pIg', limit: 2200  },
  { key: 'x',  name: 'X',         short: 'X',  Glyph: GlyphX,  color: 'pX',  limit: 280   },
  { key: 'tg', name: 'Telegram',  short: 'TG', Glyph: GlyphTG, color: 'pTg', limit: 4096  },
];

// ─────────────────────────── UI bits ───────────────────────────
function MBButton({ children, t, variant = 'primary', size = 'md', icon, iconRight, onClick, style = {}, full }) {
  const pad = size === 'sm' ? '8px 14px' : size === 'lg' ? '14px 22px' : '11px 18px';
  const fs = size === 'sm' ? 13 : size === 'lg' ? 15 : 14;
  const variants = {
    primary: { bg: t.text, color: t.textInverse, border: t.text },
    accent:  { bg: t.accent, color: t.accentInk, border: t.accent },
    secondary:{ bg: 'transparent', color: t.text, border: t.borderStrong },
    ghost:   { bg: 'transparent', color: t.text, border: 'transparent' },
    subtle:  { bg: t.surfaceAlt, color: t.text, border: t.border },
  };
  const v = variants[variant];
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: 8, padding: pad, fontSize: fs, fontWeight: 500,
      fontFamily: t.fonts.sans,
      background: v.bg, color: v.color, border: `1px solid ${v.border}`,
      borderRadius: 999, cursor: 'pointer', letterSpacing: -0.1,
      width: full ? '100%' : 'auto',
      transition: 'all .15s',
      ...style,
    }}>
      {icon}{children}{iconRight}
    </button>
  );
}

function MBCard({ children, t, padding = 24, style = {} }) {
  return (
    <div style={{
      background: t.surface, border: `1px solid ${t.border}`,
      borderRadius: 16, padding, ...style,
    }}>{children}</div>
  );
}

function MBChip({ children, t, color, icon, style = {} }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 10px', fontSize: 12, fontWeight: 500,
      fontFamily: t.fonts.sans, letterSpacing: -0.05,
      background: color ? color : t.surfaceAlt,
      color: t.text, border: `1px solid ${t.border}`,
      borderRadius: 999, ...style,
    }}>
      {icon}{children}
    </div>
  );
}

function MBLabel({ children, t, style = {} }) {
  return (
    <div style={{
      fontFamily: t.fonts.mono, fontSize: 10,
      letterSpacing: 1.5, textTransform: 'uppercase',
      color: t.textMuted, fontWeight: 500, ...style,
    }}>{children}</div>
  );
}

// Image placeholder — subtle stripes + mono label
function MBImagePlaceholder({ t, label = 'image', ratio = '4/3', style = {} }) {
  const stripe = t.name === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(35,30,20,0.03)';
  const stripe2 = t.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(35,30,20,0.06)';
  return (
    <div style={{
      aspectRatio: ratio, background: t.bgSubtle,
      backgroundImage: `repeating-linear-gradient(135deg, ${stripe} 0 14px, ${stripe2} 14px 28px)`,
      border: `1px solid ${t.border}`, borderRadius: 12,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: t.textMuted, fontFamily: t.fonts.mono, fontSize: 11,
      letterSpacing: 0.5,
      ...style,
    }}>{label}</div>
  );
}

// Avatar — initials on tinted square
function MBAvatar({ t, name = 'User', size = 32, tint }) {
  const initials = name.split(/\s+/).slice(0,2).map(s => s[0]?.toUpperCase() || '').join('');
  const palette = ['#c8a96a', '#a87052', '#6a8e75', '#8a6aa0', '#7590b0', '#b87055'];
  const bg = tint || palette[name.charCodeAt(0) % palette.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.3,
      background: bg, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, fontFamily: t.fonts.sans,
      letterSpacing: -0.3, flexShrink: 0,
    }}>{initials}</div>
  );
}

// ─────────────────────────── APP CHROME ───────────────────────────
function MBTopbar({ t, active = 'dashboard' }) {
  const nav = [
    { key: 'dashboard', label: 'Dashboard', Icon: IconDash },
    { key: 'compose',   label: 'Compose',   Icon: IconCompose },
    { key: 'history',   label: 'History',   Icon: IconHistory },
    { key: 'analytics', label: 'Analytics', Icon: IconChart },
    { key: 'ai',        label: 'AI Tools',  Icon: IconSparkle },
    { key: 'about',     label: 'About',     Icon: IconInfo },
  ];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 32px', background: t.surface,
      borderBottom: `1px solid ${t.border}`,
      fontFamily: t.fonts.sans,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <MBLogo t={t} size={30}/>
        <div style={{ display: 'flex', gap: 2 }}>
          {nav.map(n => {
            const on = n.key === active;
            return (
              <div key={n.key} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '7px 12px', fontSize: 13, fontWeight: 500,
                color: on ? t.text : t.textMuted,
                background: on ? t.surfaceAlt : 'transparent',
                borderRadius: 8, cursor: 'pointer',
                letterSpacing: -0.1,
                position: 'relative',
              }}>
                <n.Icon size={15} stroke={on ? t.accent : t.textMuted}/>
                {n.label}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', background: t.surfaceAlt,
          borderRadius: 8, fontSize: 12, color: t.textMuted,
          fontFamily: t.fonts.mono, border: `1px solid ${t.border}`,
        }}>
          <IconSearch size={13}/> Quick find <span style={{ marginLeft: 14, opacity: .6 }}>⌘K</span>
        </div>
        <div style={{ position: 'relative', width: 18, height: 18 }}>
          <IconBell size={18} stroke={t.textMuted}/>
          <div style={{
            position: 'absolute', top: -2, right: -2, width: 7, height: 7,
            borderRadius: '50%', background: t.accent,
            border: `1.5px solid ${t.surface}`,
          }}/>
        </div>
        <MBAvatar t={t} name="Nora K" size={30}/>
      </div>
    </div>
  );
}

// Page header — big serif + small lead
function MBPageHeader({ t, eyebrow, title, lead, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      padding: '36px 40px 28px', gap: 40,
    }}>
      <div>
        {eyebrow && <MBLabel t={t} style={{ marginBottom: 10, color: t.accent }}>{eyebrow}</MBLabel>}
        <h1 style={{
          fontFamily: t.fonts.display, fontWeight: 400,
          fontSize: 42, letterSpacing: -1.2, lineHeight: 1,
          margin: 0, color: t.text,
        }}>{title}</h1>
        {lead && <div style={{
          marginTop: 10, fontFamily: t.fonts.sans, fontSize: 14,
          color: t.textMuted, maxWidth: 520, lineHeight: 1.5,
        }}>{lead}</div>}
      </div>
      {children && <div style={{ display: 'flex', gap: 10, paddingBottom: 4 }}>{children}</div>}
    </div>
  );
}

Object.assign(window, {
  MBLogoMark, MBWordmark, MBLogo,
  MBIcon, IconDash, IconCompose, IconHistory, IconChart, IconSparkle, IconInfo,
  IconArrowRight, IconArrowUpRight, IconCheck, IconPlus, IconSearch, IconImage, IconSmile,
  IconCalendar, IconClock, IconTrend, IconEye, IconHeart, IconChat, IconRepost,
  IconUpload, IconAI, IconLogout, IconBell, IconDots, IconX,
  GlyphFB, GlyphIG, GlyphX, GlyphTG, PLATFORMS,
  MBButton, MBCard, MBChip, MBLabel, MBImagePlaceholder, MBAvatar,
  MBTopbar, MBPageHeader,
});
