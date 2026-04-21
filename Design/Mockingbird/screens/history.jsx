// Publish History
function ScreenHistory({ t }) {
  const rows = [
    { d: 'Apr 20', time: '09:00', title: 'Spring reading list is live — 12 titles with our editors’ notes.', plats: ['fb','ig','x','tg'], status: 'published', imp: '8.4k', eng: '312' },
    { d: 'Apr 19', time: '18:45', title: 'Author Q&A reminder — registration link + dial-in details.', plats: ['fb','tg'], status: 'published', imp: '2.1k', eng: '48' },
    { d: 'Apr 19', time: '14:00', title: 'Carousel: bindery process at the Cambridge print shop.', plats: ['ig'], status: 'published', imp: '12.4k', eng: '904' },
    { d: 'Apr 18', time: '11:20', title: 'Thread: five essays that changed how we edit short fiction.', plats: ['x'], status: 'published', imp: '4.6k', eng: '187' },
    { d: 'Apr 17', time: '09:15', title: 'Meet our intern cohort — summer 2026. Introducing six new voices.', plats: ['fb','ig','tg'], status: 'published', imp: '3.2k', eng: '142' },
    { d: 'Apr 16', time: '16:00', title: 'Pop-up store at Union Square, this Saturday only.', plats: ['ig','x'], status: 'failed',    imp: '—',    eng: '—' },
    { d: 'Apr 15', time: '10:00', title: 'Q1 editorial recap: what worked, what didn\'t, what we\'re killing.', plats: ['fb','x','tg'], status: 'published', imp: '5.8k', eng: '231' },
    { d: 'Apr 14', time: '13:30', title: 'Book launch sizzle — 22-second cut from the event.', plats: ['ig','fb'], status: 'published', imp: '9.1k', eng: '612' },
  ];

  return (
    <div style={{ background: t.bg, fontFamily: t.fonts.sans, color: t.text, minHeight: '100%' }}>
      <MBTopbar t={t} active="history"/>
      <MBPageHeader t={t}
        eyebrow="Last 30 days"
        title={<>Publish <span style={{fontStyle:'italic', color:t.accent}}>history</span></>}
        lead="Every post you've put out, across every connected account. Filter, re-share or clone to draft.">
        <MBButton t={t} variant="secondary" icon={<IconSearch size={14}/>}>Find post</MBButton>
        <MBButton t={t} variant="subtle" icon={<IconArrowUpRight size={14}/>}>Export CSV</MBButton>
      </MBPageHeader>

      {/* Filter bar */}
      <div style={{ padding: '0 40px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['All', 'Published', 'Failed', 'Scheduled'].map((f, i) => (
            <div key={f} style={{
              padding: '6px 12px', fontSize: 12, fontWeight: 500,
              color: i === 0 ? t.text : t.textMuted,
              background: i === 0 ? t.surface : 'transparent',
              border: `1px solid ${i === 0 ? t.border : 'transparent'}`,
              borderRadius: 8, cursor: 'pointer',
            }}>{f}{i === 0 && <span style={{ marginLeft: 6, color: t.textMuted, fontFamily: t.fonts.mono }}>128</span>}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PLATFORMS.map(p => (
            <div key={p.key} style={{
              width: 30, height: 30, borderRadius: 8,
              background: t.surface, border: `1px solid ${t.border}`,
              color: t[p.color], display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><p.Glyph size={14}/></div>
          ))}
          <div style={{ width: 1, background: t.border, margin: '0 6px' }}/>
          <MBChip t={t} icon={<IconCalendar size={12}/>}>Apr 1 – 20</MBChip>
        </div>
      </div>

      {/* Table */}
      <div style={{ padding: '0 40px 40px' }}>
        <MBCard t={t} padding={0}>
          <div style={{
            display: 'grid', gridTemplateColumns: '110px 1fr 140px 120px 90px 80px 32px',
            padding: '12px 22px', fontFamily: t.fonts.mono, fontSize: 10,
            letterSpacing: 1.2, color: t.textMuted, textTransform: 'uppercase',
            borderBottom: `1px solid ${t.divider}`, gap: 16,
          }}>
            <div>When</div><div>Post</div><div>Platforms</div><div>Status</div><div style={{ textAlign: 'right' }}>Reach</div><div style={{ textAlign: 'right' }}>Engage</div><div></div>
          </div>
          {rows.map((r, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '110px 1fr 140px 120px 90px 80px 32px',
              alignItems: 'center', gap: 16, padding: '16px 22px',
              borderBottom: i < rows.length - 1 ? `1px solid ${t.divider}` : 'none',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{r.d}</div>
                <div style={{ fontFamily: t.fonts.mono, fontSize: 11, color: t.textMuted }}>{r.time}</div>
              </div>
              <div style={{ fontSize: 13, color: t.text, lineHeight: 1.4 }}>{r.title}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {r.plats.map(k => {
                  const p = PLATFORMS.find(x => x.key === k);
                  return (
                    <div key={k} style={{ color: t[p.color] }}><p.Glyph size={14}/></div>
                  );
                })}
              </div>
              <div>
                {r.status === 'published' ? (
                  <MBChip t={t} style={{ background: t.accentSoft, color: t.accentText, border: `1px solid ${t.accentSoft}`, fontSize: 11 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.accent }}/>
                    Published
                  </MBChip>
                ) : (
                  <MBChip t={t} style={{ background: t.dangerSoft, color: t.danger, border: `1px solid ${t.dangerSoft}`, fontSize: 11 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.danger }}/>
                    Failed · 1/2
                  </MBChip>
                )}
              </div>
              <div style={{ textAlign: 'right', fontFamily: t.fonts.mono, fontSize: 12, color: r.status === 'failed' ? t.textSubtle : t.text }}>{r.imp}</div>
              <div style={{ textAlign: 'right', fontFamily: t.fonts.mono, fontSize: 12, color: r.status === 'failed' ? t.textSubtle : t.text }}>{r.eng}</div>
              <IconDots size={14} stroke={t.textMuted}/>
            </div>
          ))}
        </MBCard>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <div style={{ fontSize: 12, color: t.textMuted, fontFamily: t.fonts.mono }}>Showing 1–8 of 128</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <MBButton t={t} variant="secondary" size="sm">Previous</MBButton>
            <MBButton t={t} variant="subtle" size="sm">Next</MBButton>
          </div>
        </div>
      </div>
    </div>
  );
}
window.ScreenHistory = ScreenHistory;
