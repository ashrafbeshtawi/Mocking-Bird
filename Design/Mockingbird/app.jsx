// App shell — mounts the design canvas with all screens + tweaks

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "mode": "light",
  "accent": "forest"
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweaks] = React.useState(TWEAK_DEFAULTS);
  const [panelOpen, setPanelOpen] = React.useState(false);

  React.useEffect(() => {
    const onMsg = (e) => {
      if (!e?.data?.type) return;
      if (e.data.type === '__activate_edit_mode') setPanelOpen(true);
      if (e.data.type === '__deactivate_edit_mode') setPanelOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const update = (patch) => {
    const next = { ...tweaks, ...patch };
    setTweaks(next);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: patch }, '*');
  };

  const t = mbTheme(tweaks.mode, tweaks.accent);

  const artboardStyle = { border: `1px solid ${t.border}`, background: t.bg };

  return (
    <>
      <DesignCanvas>
        <DCSection title="Mockingbird" subtitle="A calm, warm publishing tool for small teams. Forest-green accent, Fraunces display + Geist UI. Toggle Tweaks for dark mode & accent color.">
          <DCArtboard label="01 · Landing" width={1280} height={820} style={artboardStyle}>
            <ScreenLanding t={t}/>
          </DCArtboard>
          <DCArtboard label="02 · Dashboard" width={1280} height={1080} style={artboardStyle}>
            <ScreenDashboard t={t}/>
          </DCArtboard>
          <DCArtboard label="03 · Compose" width={1280} height={1200} style={artboardStyle}>
            <ScreenCompose t={t}/>
          </DCArtboard>
        </DCSection>

        <DCSection title="Operations" subtitle="What you do after the post goes out — track, measure, tune.">
          <DCArtboard label="04 · Publish history" width={1280} height={1100} style={artboardStyle}>
            <ScreenHistory t={t}/>
          </DCArtboard>
          <DCArtboard label="05 · Analytics" width={1280} height={1240} style={artboardStyle}>
            <ScreenAnalytics t={t}/>
          </DCArtboard>
        </DCSection>

        <DCSection title="Settings & story" subtitle="Power-user controls and marketing pages.">
          <DCArtboard label="06 · AI tools" width={1280} height={1080} style={artboardStyle}>
            <ScreenAITools t={t}/>
          </DCArtboard>
          <DCArtboard label="07 · About" width={1280} height={1540} style={artboardStyle}>
            <ScreenAbout t={t}/>
          </DCArtboard>
        </DCSection>

        <DCPostIt top={40} left={72} rotate={-3} width={220}>
          Warm, approachable, grown-up. Forest-green accent reads as trustworthy without being corporate blue.
        </DCPostIt>
      </DesignCanvas>

      {/* Tweaks panel */}
      {panelOpen && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, width: 260,
          background: '#fbf9f4', border: '1px solid #e0d9c8',
          borderRadius: 14, padding: 16, zIndex: 1000,
          boxShadow: '0 8px 32px rgba(30,25,15,0.2)',
          fontFamily: MB_FONTS.sans, color: '#1f1a12',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: MB_FONTS.display, fontSize: 18, letterSpacing: -0.3 }}>Tweaks</div>
            <div onClick={() => setPanelOpen(false)} style={{ cursor: 'pointer', fontSize: 14, color: '#6b6252' }}>×</div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: MB_FONTS.mono, fontSize: 10, letterSpacing: 1.2, color: '#6b6252', textTransform: 'uppercase', marginBottom: 6 }}>Theme</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['light', 'dark'].map(m => (
                <div key={m} onClick={() => update({ mode: m })} style={{
                  flex: 1, padding: '8px 10px', fontSize: 12, textAlign: 'center',
                  borderRadius: 8, cursor: 'pointer', textTransform: 'capitalize',
                  background: tweaks.mode === m ? '#1f1a12' : '#f7f3ea',
                  color: tweaks.mode === m ? '#fbf9f4' : '#1f1a12',
                  border: '1px solid #e0d9c8',
                }}>{m}</div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontFamily: MB_FONTS.mono, fontSize: 10, letterSpacing: 1.2, color: '#6b6252', textTransform: 'uppercase', marginBottom: 6 }}>Accent</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {Object.entries(MB_ACCENTS).map(([k, v]) => (
                <div key={k} onClick={() => update({ accent: k })} style={{
                  flex: 1, aspectRatio: '1', borderRadius: 8, cursor: 'pointer',
                  background: v.light.accent,
                  border: tweaks.accent === k ? '2px solid #1f1a12' : '2px solid transparent',
                  boxShadow: '0 0 0 1px #e0d9c8',
                }}/>
              ))}
            </div>
            <div style={{ marginTop: 6, fontFamily: MB_FONTS.mono, fontSize: 10, color: '#6b6252', textAlign: 'center', textTransform: 'capitalize' }}>
              {tweaks.accent}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
