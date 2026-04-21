// Create Post composer
function ScreenCompose({ t }) {
  return (
    <div style={{ background: t.bg, fontFamily: t.fonts.sans, color: t.text, minHeight: '100%' }}>
      <MBTopbar t={t} active="compose"/>
      <MBPageHeader t={t}
        eyebrow="Draft · autosaved just now"
        title={<>Compose</>}
        lead="Write once. Tailor per platform on the right — limits, tone and media adapt automatically.">
        <MBButton t={t} variant="secondary" icon={<IconClock size={14}/>}>Schedule</MBButton>
        <MBButton t={t} variant="accent" iconRight={<IconArrowRight size={14}/>}>Publish now</MBButton>
      </MBPageHeader>

      <div style={{ padding: '0 40px 40px', display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 24 }}>
        {/* LEFT — composer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <MBCard t={t} padding={0}>
            <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${t.divider}` }}>
              <MBLabel t={t}>Source draft</MBLabel>
              <div style={{ display: 'flex', gap: 6 }}>
                <MBChip t={t} icon={<IconAI size={11} stroke={t.accent}/>}
                  style={{ background: t.accentSoft, color: t.accentText, border: `1px solid ${t.accentSoft}` }}>
                  Rewrite with AI
                </MBChip>
              </div>
            </div>
            <div style={{ padding: '20px 24px 12px' }}>
              <div style={{
                fontFamily: t.fonts.serif, fontSize: 22, lineHeight: 1.45, color: t.text,
                minHeight: 180,
              }}>
                Spring reading list is live. Twelve titles our editors argued about, one wildly opinionated intro, and a form to tell us what to cover next quarter.
                <span style={{ color: t.textSubtle }}> Link in bio — or right here if your app allows it.</span>
                <span style={{ display: 'inline-block', width: 2, height: 22, background: t.accent, verticalAlign: -4, marginLeft: 2, animation: 'none' }}/>
              </div>
            </div>
            {/* Attached media */}
            <div style={{ padding: '0 24px 16px', display: 'flex', gap: 10 }}>
              <MBImagePlaceholder t={t} label="cover.jpg" ratio="1/1" style={{ width: 84, height: 84, flex: 'none' }}/>
              <MBImagePlaceholder t={t} label="floor.jpg" ratio="1/1" style={{ width: 84, height: 84, flex: 'none' }}/>
              <div style={{
                width: 84, height: 84, borderRadius: 12,
                border: `1.5px dashed ${t.borderStrong}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                color: t.textMuted, fontSize: 11, gap: 4,
              }}>
                <IconPlus size={18}/>Add media
              </div>
            </div>
            <div style={{
              padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderTop: `1px solid ${t.divider}`, background: t.surfaceAlt,
            }}>
              <div style={{ display: 'flex', gap: 14, color: t.textMuted }}>
                <IconImage size={16}/><IconSmile size={16}/><IconCalendar size={16}/>
                <span style={{ fontSize: 12, fontFamily: t.fonts.mono, color: t.textSubtle, marginLeft: 6 }}>#hashtags</span>
              </div>
              <div style={{ fontFamily: t.fonts.mono, fontSize: 11, color: t.textMuted }}>178 chars · source</div>
            </div>
          </MBCard>

          {/* AI assists */}
          <MBCard t={t} padding={20}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <IconSparkle size={16} stroke={t.accent}/>
              <div style={{ fontFamily: t.fonts.display, fontSize: 18, letterSpacing: -0.3 }}>Suggested moves</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {[
                { t1: 'Tighten for X', t2: 'Trim to 280 chars, keep the punch' },
                { t1: 'Warmer tone on IG', t2: 'Add a softer opening, drop the em-dash' },
                { t1: 'Add CTA for Telegram', t2: 'Include channel-invite link' },
                { t1: 'Generate alt text', t2: 'for 2 attached images' },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: 12, background: t.surfaceAlt, borderRadius: 10,
                  border: `1px solid ${t.border}`, cursor: 'pointer',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.t1}</div>
                  <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{s.t2}</div>
                </div>
              ))}
            </div>
          </MBCard>

          {/* Schedule strip */}
          <MBCard t={t} padding={20}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <MBLabel t={t}>Publishing</MBLabel>
                <div style={{ fontFamily: t.fonts.display, fontSize: 20, letterSpacing: -0.4, marginTop: 4 }}>
                  Tuesday, 21 Apr · <span style={{ fontStyle: 'italic', color: t.accent }}>09:00 CET</span>
                </div>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>Auto-picked from your best-performing slot on Tuesdays.</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <MBButton t={t} variant="subtle" size="sm">Post now</MBButton>
                <MBButton t={t} variant="subtle" size="sm">Add to queue</MBButton>
                <MBButton t={t} variant="secondary" size="sm">Change time</MBButton>
              </div>
            </div>
          </MBCard>
        </div>

        {/* RIGHT — per-platform variants */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <MBLabel t={t}>Per-platform variants · 4 active</MBLabel>
            <span style={{ fontSize: 11, color: t.textMuted }}>Switch with ⌘1—4</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { key: 'fb', used: 178, draft: 'Our spring reading list just went live — twelve titles, one opinionated intro, and a survey so you can steer what we cover next quarter.', state: 'ready' },
              { key: 'ig', used: 164, draft: 'Spring reading list ✿ twelve titles. Twelve editors who couldn\'t agree. One intro that is, frankly, unhinged.\n\nLink in bio → tell us what\'s next.', state: 'ready', media: true },
              { key: 'x',  used: 292, draft: 'Spring reading list is live — 12 titles, one wildly opinionated intro, and a survey to tell us what to cover next quarter: mockingbird.studio/reading', state: 'over' },
              { key: 'tg', used: 201, draft: '**Spring reading list is live.**\n\nTwelve titles. One argued-over intro. A survey to steer next quarter.\n\n[Open the list →](https://…)', state: 'ready' },
            ].map((v, i) => {
              const p = PLATFORMS.find(x => x.key === v.key);
              const over = v.state === 'over';
              return (
                <div key={v.key} style={{
                  background: t.surface, border: `1px solid ${over ? t.danger : t.border}`,
                  borderRadius: 12, padding: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ color: t[p.color] }}><p.Glyph size={16}/></div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                      {v.state === 'over' && (
                        <MBChip t={t} style={{ background: t.dangerSoft, color: t.danger, border: `1px solid ${t.dangerSoft}`, fontSize: 10 }}>
                          12 over limit
                        </MBChip>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <IconAI size={13} stroke={t.accent}/>
                      <IconDots size={14} stroke={t.textMuted}/>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 13, lineHeight: 1.5, color: t.text,
                    whiteSpace: 'pre-wrap', marginBottom: 10,
                  }}>{v.draft}</div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    paddingTop: 8, borderTop: `1px solid ${t.divider}`,
                  }}>
                    {/* Progress bar */}
                    <div style={{ flex: 1, height: 3, borderRadius: 2, background: t.surfaceAlt, overflow: 'hidden', marginRight: 14 }}>
                      <div style={{
                        height: '100%', width: `${Math.min(100, (v.used / p.limit) * 100 * (v.key === 'x' ? 1 : 4))}%`,
                        background: over ? t.danger : t.accent,
                      }}/>
                    </div>
                    <div style={{ fontFamily: t.fonts.mono, fontSize: 11, color: over ? t.danger : t.textMuted }}>
                      {v.used} / {p.limit.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
window.ScreenCompose = ScreenCompose;
