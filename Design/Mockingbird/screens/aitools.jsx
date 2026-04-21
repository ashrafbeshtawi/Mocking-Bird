// AI Tools settings
function ScreenAITools({ t }) {
  return (
    <div style={{ background: t.bg, fontFamily: t.fonts.sans, color: t.text, minHeight: '100%' }}>
      <MBTopbar t={t} active="ai"/>
      <MBPageHeader t={t}
        eyebrow="Settings · AI"
        title={<>AI <span style={{fontStyle:'italic', color:t.accent}}>tools</span></>}
        lead="Bring your own model. Configure providers and tune the prompts that shape your per-platform drafts.">
      </MBPageHeader>

      <div style={{ padding: '0 40px 40px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 32 }}>
        {/* Sub-nav */}
        <div>
          <MBLabel t={t} style={{ marginBottom: 10 }}>Sections</MBLabel>
          {[
            { k: 'providers', label: 'Providers', count: 2, active: true },
            { k: 'prompts',   label: 'Prompts',   count: 5 },
            { k: 'routing',   label: 'Model routing', count: null },
            { k: 'limits',    label: 'Usage & limits', count: null },
            { k: 'privacy',   label: 'Privacy', count: null },
          ].map(s => (
            <div key={s.k} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 12px', marginBottom: 2, borderRadius: 8, cursor: 'pointer',
              background: s.active ? t.surfaceAlt : 'transparent',
              color: s.active ? t.text : t.textMuted, fontSize: 13, fontWeight: 500,
              border: s.active ? `1px solid ${t.border}` : `1px solid transparent`,
            }}>
              <span>{s.label}</span>
              {s.count !== null && <span style={{ fontFamily: t.fonts.mono, fontSize: 10, color: t.textMuted }}>{s.count}</span>}
            </div>
          ))}
        </div>

        {/* Providers list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <MBCard t={t} padding={22} style={{ background: t.bgSubtle }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: t.accentSoft, color: t.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><IconInfo size={18}/></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Bring your own key</div>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4, lineHeight: 1.5, maxWidth: 560 }}>
                  Mockingbird never stores your prompts or completions. Any OpenAI-compatible endpoint works — OpenAI, Anthropic, Google, Groq, or local Ollama/LM Studio.
                </div>
              </div>
              <MBButton t={t} variant="subtle" size="sm">Read docs</MBButton>
            </div>
          </MBCard>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: t.fonts.display, fontSize: 22, letterSpacing: -0.5 }}>Providers</div>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>Used to draft & rewrite posts. The first healthy provider is primary.</div>
            </div>
            <MBButton t={t} variant="accent" size="sm" icon={<IconPlus size={13}/>}>Add provider</MBButton>
          </div>

          {[
            { name: 'Anthropic',     model: 'claude-sonnet-4-5', url: 'https://api.anthropic.com/v1', status: 'healthy', primary: true },
            { name: 'Local (Ollama)', model: 'llama3.2:70b-instruct', url: 'http://localhost:11434', status: 'healthy' },
            { name: 'Google Gemini', model: 'gemini-2.5-flash', url: 'https://generativelanguage.googleapis.com/v1beta', status: 'error' },
          ].map((p, i) => (
            <MBCard key={i} t={t} padding={20}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: t.accentSoft, color: t.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: t.fonts.display, fontSize: 18, fontWeight: 500, letterSpacing: -0.3,
                }}>
                  {p.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>{p.name}</div>
                    <MBChip t={t} style={{ fontFamily: t.fonts.mono, fontSize: 10 }}>{p.model}</MBChip>
                    {p.primary && <MBChip t={t} style={{ background: t.accentSoft, color: t.accentText, border: `1px solid ${t.accentSoft}`, fontSize: 10 }}>PRIMARY</MBChip>}
                    {p.status === 'healthy' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: t.accent }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.accent }}/>Connected
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: t.danger }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.danger }}/>Auth failing
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: t.fonts.mono, fontSize: 11, color: t.textMuted, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.url} · key ••••••••••••{Math.floor(Math.random() * 9000) + 1000}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <MBButton t={t} variant="subtle" size="sm">Test</MBButton>
                  <MBButton t={t} variant="secondary" size="sm">Edit</MBButton>
                </div>
              </div>
            </MBCard>
          ))}

          {/* Default prompt preview */}
          <MBCard t={t} padding={0}>
            <div style={{ padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${t.divider}` }}>
              <div>
                <div style={{ fontFamily: t.fonts.display, fontSize: 20, letterSpacing: -0.4 }}>Default prompt · <span style={{ fontStyle: 'italic', color: t.accent }}>per-platform rewrite</span></div>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>Used when you click "Rewrite with AI" in the composer</div>
              </div>
              <MBButton t={t} variant="subtle" size="sm">Edit prompt</MBButton>
            </div>
            <div style={{
              padding: '18px 22px', fontFamily: t.fonts.mono, fontSize: 12,
              lineHeight: 1.7, color: t.text, background: t.surfaceAlt,
              whiteSpace: 'pre-wrap',
            }}>
              <span style={{ color: t.textMuted }}># system</span>{"\n"}
              You are a staff copywriter at {'{{'} brand {'}}'}. Rewrite the source draft{"\n"}
              for <span style={{ color: t.accent }}>{'{{ platform }}'}</span>, respecting its character limit of{" "}
              <span style={{ color: t.accent }}>{'{{ limit }}'}</span>.{"\n"}
              Keep the author's voice. Don't invent facts. Return only the body.
            </div>
          </MBCard>
        </div>
      </div>
    </div>
  );
}
window.ScreenAITools = ScreenAITools;
