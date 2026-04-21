// Analytics
function ScreenAnalytics({ t }) {
  // Area chart points
  const points = [30, 42, 38, 55, 48, 62, 58, 72, 68, 85, 78, 92, 88, 104];
  const max = 110;
  const w = 640, h = 180;
  const stepX = w / (points.length - 1);
  const path = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * stepX} ${h - (v / max) * h}`).join(' ');
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;

  return (
    <div style={{ background: t.bg, fontFamily: t.fonts.sans, color: t.text, minHeight: '100%' }}>
      <MBTopbar t={t} active="analytics"/>
      <MBPageHeader t={t}
        eyebrow="Last 14 days"
        title={<>Analytics</>}
        lead="What's landing, what's falling flat, and which platform each post lives on. All in one view.">
        <MBButton t={t} variant="secondary" icon={<IconCalendar size={14}/>}>Apr 7 – Apr 20</MBButton>
        <MBButton t={t} variant="subtle" icon={<IconArrowUpRight size={14}/>}>Share report</MBButton>
      </MBPageHeader>

      <div style={{ padding: '0 40px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        {[
          { k: 'Total reach',     v: '184.2k', d: 'vs 129.1k prev', trend: '+42.7%' },
          { k: 'Engagement rate', v: '4.8%',   d: 'vs 3.9% prev',   trend: '+0.9pp' },
          { k: 'Follower growth', v: '+1,204', d: 'across 4 accts', trend: '+2.1%' },
        ].map((s, i) => (
          <MBCard key={i} t={t} padding={22}>
            <MBLabel t={t}>{s.k}</MBLabel>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
              <div style={{ fontFamily: t.fonts.display, fontSize: 42, letterSpacing: -1.2, lineHeight: 1 }}>{s.v}</div>
              <div style={{
                padding: '2px 7px', fontSize: 11, fontWeight: 500,
                background: t.accentSoft, color: t.accentText, borderRadius: 4,
              }}>{s.trend}</div>
            </div>
            <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6 }}>{s.d}</div>
          </MBCard>
        ))}
      </div>

      <div style={{ padding: '0 40px 24px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Reach chart */}
        <MBCard t={t} padding={24}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
            <div>
              <div style={{ fontFamily: t.fonts.display, fontSize: 22, letterSpacing: -0.5 }}>Reach, last 14 days</div>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>Impressions summed across platforms</div>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, color: t.textMuted }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 2, background: t.accent }}/>Reach
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 2, background: t.textSubtle, borderTop: `1px dashed ${t.textSubtle}` }}/>Prev period
              </div>
            </div>
          </div>
          <svg viewBox={`0 0 ${w} ${h + 30}`} style={{ width: '100%' }}>
            <defs>
              <linearGradient id="areagrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={t.accent} stopOpacity="0.25"/>
                <stop offset="1" stopColor={t.accent} stopOpacity="0"/>
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map(y => (
              <line key={y} x1="0" x2={w} y1={h * y} y2={h * y} stroke={t.divider} strokeDasharray="2 4"/>
            ))}
            <path d={area} fill="url(#areagrad)"/>
            <path d={path} fill="none" stroke={t.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            {points.map((v, i) => (
              <circle key={i} cx={i * stepX} cy={h - (v / max) * h} r={i === points.length - 1 ? 4 : 0} fill={t.accent}/>
            ))}
            {['Apr 7','Apr 10','Apr 14','Apr 17','Apr 20'].map((d, i) => (
              <text key={d} x={(i * (w - 20)) / 4 + 10} y={h + 20} fontFamily={t.fonts.mono} fontSize="10" fill={t.textMuted} textAnchor="middle">{d}</text>
            ))}
          </svg>
        </MBCard>

        {/* Platform breakdown */}
        <MBCard t={t} padding={24}>
          <div style={{ fontFamily: t.fonts.display, fontSize: 22, letterSpacing: -0.5 }}>By platform</div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2, marginBottom: 20 }}>Share of total reach</div>
          {[
            { key: 'ig', pct: 48, reach: '88.4k' },
            { key: 'fb', pct: 24, reach: '44.2k' },
            { key: 'x',  pct: 18, reach: '33.1k' },
            { key: 'tg', pct: 10, reach: '18.5k' },
          ].map((row, i) => {
            const p = PLATFORMS.find(x => x.key === row.key);
            return (
              <div key={row.key} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ color: t[p.color] }}><p.Glyph size={14}/></div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                    <div style={{ fontFamily: t.fonts.mono, fontSize: 11, color: t.textMuted }}>{row.reach}</div>
                    <div style={{ fontFamily: t.fonts.display, fontSize: 16, letterSpacing: -0.3 }}>{row.pct}%</div>
                  </div>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: t.surfaceAlt, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${row.pct}%`, background: t[p.color], opacity: 0.75 }}/>
                </div>
              </div>
            );
          })}
        </MBCard>
      </div>

      {/* Top posts + heatmap */}
      <div style={{ padding: '0 40px 40px', display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
        <MBCard t={t} padding={0}>
          <div style={{ padding: '16px 22px', borderBottom: `1px solid ${t.divider}` }}>
            <div style={{ fontFamily: t.fonts.display, fontSize: 22, letterSpacing: -0.5 }}>Top posts</div>
            <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>By engagement rate, last 14 days</div>
          </div>
          {[
            { rk: 1, title: 'Carousel: inside the bindery at our Cambridge print shop.', plat: 'ig', reach: '12.4k', eng: '7.3%' },
            { rk: 2, title: 'Book launch sizzle — 22-second cut from the event.', plat: 'fb', reach: '9.1k', eng: '6.7%' },
            { rk: 3, title: 'Spring reading list — 12 titles, one opinionated intro.', plat: 'ig', reach: '8.4k', eng: '5.1%' },
            { rk: 4, title: 'Q1 editorial recap: what worked, what we\'re killing.', plat: 'x',  reach: '5.8k', eng: '4.0%' },
          ].map((r, i, arr) => {
            const p = PLATFORMS.find(x => x.key === r.plat);
            return (
              <div key={r.rk} style={{
                display: 'grid', gridTemplateColumns: '40px 1fr 70px 80px 80px',
                alignItems: 'center', gap: 16, padding: '16px 22px',
                borderBottom: i < arr.length - 1 ? `1px solid ${t.divider}` : 'none',
              }}>
                <div style={{ fontFamily: t.fonts.display, fontSize: 26, color: t.textMuted, letterSpacing: -0.5 }}>{r.rk}</div>
                <div style={{ fontSize: 13, lineHeight: 1.4 }}>{r.title}</div>
                <div style={{ color: t[p.color] }}><p.Glyph size={16}/></div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: t.fonts.mono, fontSize: 12 }}>{r.reach}</div>
                  <div style={{ fontFamily: t.fonts.mono, fontSize: 10, color: t.textMuted }}>reach</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: t.fonts.mono, fontSize: 12, color: t.accent, fontWeight: 500 }}>{r.eng}</div>
                  <div style={{ fontFamily: t.fonts.mono, fontSize: 10, color: t.textMuted }}>engage</div>
                </div>
              </div>
            );
          })}
        </MBCard>

        <MBCard t={t} padding={22}>
          <div style={{ fontFamily: t.fonts.display, fontSize: 22, letterSpacing: -0.5 }}>Best time to post</div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2, marginBottom: 16 }}>Engagement heatmap · your audience</div>
          <div style={{ display: 'grid', gridTemplateColumns: '30px repeat(7, 1fr)', gap: 3 }}>
            <div></div>
            {['M','T','W','T','F','S','S'].map((d, i) => (
              <div key={i} style={{ fontFamily: t.fonts.mono, fontSize: 10, color: t.textMuted, textAlign: 'center' }}>{d}</div>
            ))}
            {['6','9','12','15','18','21'].map((hr, rowIdx) => (
              <React.Fragment key={hr}>
                <div style={{ fontFamily: t.fonts.mono, fontSize: 10, color: t.textMuted, textAlign: 'right', paddingRight: 4 }}>{hr}</div>
                {[0,1,2,3,4,5,6].map(c => {
                  const intensity = ((rowIdx * 3 + c * 7) % 11) / 10;
                  const isPeak = rowIdx === 1 && c === 1;
                  return (
                    <div key={c} style={{
                      aspectRatio: '1', borderRadius: 3,
                      background: isPeak ? t.accent : `color-mix(in oklab, ${t.accent} ${intensity * 80}%, ${t.surfaceAlt})`,
                      border: isPeak ? `2px solid ${t.text}` : 'none',
                    }}/>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          <div style={{
            marginTop: 14, padding: 10, background: t.accentSoft, borderRadius: 8,
            fontSize: 12, color: t.accentText, lineHeight: 1.4,
          }}>
            <strong>Peak:</strong> Tue 9:00 CET. Your audience engages 2.3× above the weekly average.
          </div>
        </MBCard>
      </div>
    </div>
  );
}
window.ScreenAnalytics = ScreenAnalytics;
