// Landing page — minimal, focused hero
function ScreenLanding({ t }) {
  const hairline = { borderTop: `1px solid ${t.border}` };
  return (
    <div style={{
      background: t.bg, fontFamily: t.fonts.sans, color: t.text,
      minHeight: '100%', display: 'flex', flexDirection: 'column',
    }}>
      {/* Minimal navbar — just logo + sign in */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '22px 48px',
      }}>
        <MBLogo t={t} size={30}/>
        <span style={{ fontSize: 13, color: t.textMuted }}>Sign in</span>
      </div>

      {/* Hero — single focused column */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 48px', textAlign: 'center',
        position: 'relative',
      }}>
        <MBLabel t={t} style={{ color: t.accent, marginBottom: 28 }}>Publish across four · in one keystroke</MBLabel>

        <h1 style={{
          fontFamily: t.fonts.display, fontWeight: 400,
          fontSize: 104, lineHeight: 0.92, letterSpacing: -4,
          margin: 0, color: t.text, maxWidth: 980,
        }}>
          Write once.<br/>
          <span style={{ fontStyle: 'italic', color: t.accent }}>Land everywhere</span><span style={{color:t.accent}}>.</span>
        </h1>

        <p style={{
          marginTop: 32, fontFamily: t.fonts.serif, fontSize: 22,
          lineHeight: 1.45, color: t.textMuted, maxWidth: 560,
        }}>
          A calm composer for Facebook, Instagram, X and Telegram — tailored per platform, published when you say go.
        </p>

        <div style={{ marginTop: 44 }}>
          <MBButton t={t} variant="accent" size="lg" iconRight={<IconArrowRight size={16}/>}>
            Start free
          </MBButton>
        </div>

        {/* Just the four platform marks, quiet */}
        <div style={{
          marginTop: 72, display: 'flex', gap: 28,
          color: t.textSubtle, opacity: 0.7,
        }}>
          {PLATFORMS.map(p => (
            <div key={p.key}><p.Glyph size={18}/></div>
          ))}
        </div>
      </div>
    </div>
  );
}
window.ScreenLanding = ScreenLanding;
