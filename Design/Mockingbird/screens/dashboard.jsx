// Dashboard — home
function ScreenDashboard({ t }) {
  const bar = (h, c = t.accent) => (
    <div style={{ width: 14, height: h, background: c, borderRadius: 3 }}/>
  );
  const heights = [38, 52, 28, 64, 46, 72, 42, 58, 34, 68, 50, 44, 76];

  return (
    <div style={{ background: t.bg, fontFamily: t.fonts.sans, color: t.text, minHeight: '100%' }}>
      <MBTopbar t={t} active="dashboard"/>
      <MBPageHeader t={t}
        eyebrow="Tuesday · 20 April"
        title={<>Good morning, <span style={{fontStyle:'italic', color:t.accent}}>Nora</span>.</>}
        lead="Three posts scheduled today. Your X draft is 40 characters over limit — quick fix in the composer.">
        <MBButton t={t} variant="secondary" icon={<IconCalendar size={14}/>}>Calendar</MBButton>
        <MBButton t={t} variant="accent" icon={<IconPlus size={14}/>}>New post</MBButton>
      </MBPageHeader>

      <div style={{ padding: '0 40px 40px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* LEFT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { k: 'Published', v: '128', d: 'this month', trend: '+14%' },
              { k: 'Scheduled', v: '21',  d: 'next 7 days', trend: '8 today' },
              { k: 'Reach',     v: '34.2k', d: 'last 7 days', trend: '+42%' },
              { k: 'Drafts',    v: '7',   d: 'in progress', trend: '2 stale' },
            ].map((s, i) => (
              <MBCard key={i} t={t} padding={18}>
                <MBLabel t={t}>{s.k}</MBLabel>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                  <div style={{ fontFamily: t.fonts.display, fontSize: 34, letterSpacing: -1, lineHeight: 1 }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: t.accent, fontWeight: 500 }}>{s.trend}</div>
                </div>
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>{s.d}</div>
              </MBCard>
            ))}
          </div>

          {/* Activity chart */}
          <MBCard t={t} padding={22}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: t.fonts.display, fontSize: 22, letterSpacing: -0.5 }}>Publishing rhythm</div>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>Posts per day · last 13 days</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['7d', '30d', '90d'].map((r, i) => (
                  <div key={r} style={{
                    padding: '4px 10px', fontSize: 11, fontFamily: t.fonts.mono,
                    color: i === 0 ? t.text : t.textMuted,
                    background: i === 0 ? t.surfaceAlt : 'transparent',
                    border: `1px solid ${i === 0 ? t.border : 'transparent'}`,
                    borderRadius: 6,
                  }}>{r}</div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 110, marginTop: 24, paddingLeft: 4 }}>
              {heights.map((h, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: '100%', height: h,
                    background: i === 5 || i === 12 ? t.accent : t.accentSoft,
                    borderRadius: 4,
                  }}/>
                  <div style={{ fontFamily: t.fonts.mono, fontSize: 9, color: t.textMuted }}>
                    {['M','T','W','T','F','S','S','M','T','W','T','F','S'][i]}
                  </div>
                </div>
              ))}
            </div>
          </MBCard>

          {/* Today's queue */}
          <MBCard t={t} padding={0}>
            <div style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${t.divider}` }}>
              <div>
                <div style={{ fontFamily: t.fonts.display, fontSize: 22, letterSpacing: -0.5 }}>Today's queue</div>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>3 scheduled · 1 awaiting review</div>
              </div>
              <span style={{ fontSize: 12, color: t.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>See all <IconArrowRight size={12}/></span>
            </div>
            {[
              { time: '09:00', status: 'scheduled', title: 'Spring reading list — 12 titles with our editors’ notes.', plats: ['fb','ig','x','tg'] },
              { time: '11:30', status: 'review',    title: 'Reply to the Kirkus thread about short-form memoir.', plats: ['x'] },
              { time: '14:00', status: 'scheduled', title: 'Carousel: inside look at bindery process at the Cambridge print shop.', plats: ['ig'] },
              { time: '18:45', status: 'scheduled', title: 'Author Q&A reminder — registration link + dial-in details.', plats: ['fb','tg'] },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '80px 1fr 140px 100px',
                alignItems: 'center', gap: 16, padding: '16px 22px',
                borderBottom: i < 3 ? `1px solid ${t.divider}` : 'none',
              }}>
                <div style={{ fontFamily: t.fonts.mono, fontSize: 13, color: t.text, fontWeight: 500 }}>{row.time}</div>
                <div style={{ fontSize: 13, color: t.text, lineHeight: 1.4 }}>{row.title}</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {row.plats.map(k => {
                    const p = PLATFORMS.find(x => x.key === k);
                    return (
                      <div key={k} style={{
                        width: 22, height: 22, borderRadius: 6,
                        background: t.surfaceAlt, color: t[p.color],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${t.border}`,
                      }}><p.Glyph size={11}/></div>
                    );
                  })}
                </div>
                <div>
                  {row.status === 'scheduled' && (
                    <MBChip t={t} style={{ background: t.accentSoft, color: t.accentText, border: `1px solid ${t.accentSoft}` }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.accent }}/>
                      Scheduled
                    </MBChip>
                  )}
                  {row.status === 'review' && (
                    <MBChip t={t} style={{ background: t.warningSoft, color: t.warning, border: `1px solid ${t.warningSoft}` }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.warning }}/>
                      Review
                    </MBChip>
                  )}
                </div>
              </div>
            ))}
          </MBCard>
        </div>

        {/* RIGHT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <MBCard t={t} padding={20} style={{ background: t.accent, color: t.accentInk, border: `1px solid ${t.accent}` }}>
            <MBLabel t={t} style={{ color: t.accentInk, opacity: 0.7 }}>Highlight · week 16</MBLabel>
            <div style={{ fontFamily: t.fonts.display, fontSize: 48, letterSpacing: -1.2, lineHeight: 1, marginTop: 14 }}>
              12.4k
            </div>
            <div style={{ fontSize: 13, marginTop: 4, opacity: 0.85 }}>impressions on your Tuesday reel</div>
            <div style={{
              marginTop: 16, padding: '10px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.12)', fontSize: 12, lineHeight: 1.4,
            }}>
              <span style={{ fontStyle: 'italic' }}>"Bindery process"</span> outperformed your 90-day IG average by 3.2×. Consider a follow-up on the printing floor.
            </div>
          </MBCard>

          <MBCard t={t} padding={20}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontFamily: t.fonts.display, fontSize: 20, letterSpacing: -0.4 }}>Connected accounts</div>
              <IconPlus size={16} stroke={t.textMuted}/>
            </div>
            {PLATFORMS.map((p, i) => {
              const meta = {
                fb: { handle: 'Meridian Books', status: 'healthy' },
                ig: { handle: '@meridian.books', status: 'healthy' },
                x:  { handle: '@meridianbooks', status: 'refresh' },
                tg: { handle: 'MeridianBooks channel', status: 'healthy' },
              }[p.key];
              return (
                <div key={p.key} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${t.divider}`,
                }}>
                  <div style={{ color: t[p.color] }}><p.Glyph size={20}/></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: t.textMuted }}>{meta.handle}</div>
                  </div>
                  {meta.status === 'healthy' ? (
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: t.accent }}/>
                  ) : (
                    <span style={{ fontSize: 10, color: t.warning, fontFamily: t.fonts.mono, letterSpacing: 0.5 }}>RENEW</span>
                  )}
                </div>
              );
            })}
          </MBCard>

          <MBCard t={t} padding={20}>
            <div style={{ fontFamily: t.fonts.display, fontSize: 20, letterSpacing: -0.4, marginBottom: 12 }}>Suggestions</div>
            {[
              'Best time to post on X today: 14:20',
              'Your Friday engagement dips — try a thread',
              'Add alt text to 3 draft images',
            ].map((s, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, padding: '8px 0',
                borderTop: i === 0 ? 'none' : `1px solid ${t.divider}`,
                fontSize: 12, color: t.textMuted, lineHeight: 1.4,
              }}>
                <IconSparkle size={13} stroke={t.accent}/>{s}
              </div>
            ))}
          </MBCard>
        </div>
      </div>
    </div>
  );
}
window.ScreenDashboard = ScreenDashboard;
