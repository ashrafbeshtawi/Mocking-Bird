// About page
function ScreenAbout({ t }) {
  return (
    <div style={{ background: t.bg, fontFamily: t.fonts.sans, color: t.text, minHeight: '100%' }}>
      <MBTopbar t={t} active="about"/>

      {/* Hero */}
      <div style={{ padding: '80px 48px 48px', textAlign: 'center', position: 'relative' }}>
        <MBLogoMark t={t} size={56}/>
        <MBLabel t={t} style={{ color: t.accent, marginTop: 24 }}>The story</MBLabel>
        <h1 style={{
          fontFamily: t.fonts.display, fontWeight: 400,
          fontSize: 68, letterSpacing: -2.2, lineHeight: 1,
          margin: '14px auto 0', maxWidth: 760, color: t.text,
        }}>
          Small teams deserve a <span style={{ fontStyle: 'italic', color: t.accent }}>calmer</span> way to publish.
        </h1>
        <p style={{
          fontFamily: t.fonts.serif, fontSize: 22, lineHeight: 1.5,
          color: t.textMuted, maxWidth: 620, margin: '22px auto 0',
        }}>
          We're a three-person studio building tools for editors, community managers and independent creators who are tired of the all-in-one suites charging $99/mo for bloat.
        </p>
      </div>

      {/* Principles */}
      <div style={{ padding: '48px 48px', borderTop: `1px solid ${t.border}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 64 }}>
          <div>
            <MBLabel t={t} style={{ color: t.accent }}>Our principles</MBLabel>
            <div style={{ fontFamily: t.fonts.display, fontSize: 32, letterSpacing: -0.8, lineHeight: 1.1, marginTop: 10 }}>
              Three rules we <span style={{ fontStyle: 'italic' }}>won't</span> break.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { n: '01', t1: 'Your content is yours.', t2: 'Drafts, media and analytics live in your account. No training on your data. Export everything, anytime, as a single zip.' },
              { n: '02', t1: 'Bring your own model.', t2: 'We will never lock you into an AI bundle at 10× markup. Plug in OpenAI, Anthropic, Gemini, Groq or a local Ollama — it just works.' },
              { n: '03', t1: 'One price, one product.', t2: 'No seat math, no usage tiers, no "enterprise — contact sales" page. $12/month. That\'s the pricing page.' },
            ].map((p, i) => (
              <div key={p.n} style={{
                display: 'grid', gridTemplateColumns: '70px 1fr',
                gap: 32, padding: '28px 0',
                borderTop: `1px solid ${t.border}`,
              }}>
                <div style={{ fontFamily: t.fonts.mono, fontSize: 12, color: t.accent, paddingTop: 6, letterSpacing: 1 }}>{p.n}</div>
                <div>
                  <div style={{ fontFamily: t.fonts.display, fontSize: 26, letterSpacing: -0.6, color: t.text }}>{p.t1}</div>
                  <div style={{ fontSize: 14, color: t.textMuted, marginTop: 6, maxWidth: 560, lineHeight: 1.55 }}>{p.t2}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team */}
      <div style={{ padding: '48px 48px', borderTop: `1px solid ${t.border}`, background: t.surface }}>
        <MBLabel t={t} style={{ color: t.accent }}>The team</MBLabel>
        <div style={{ fontFamily: t.fonts.display, fontSize: 32, letterSpacing: -0.8, marginTop: 10, marginBottom: 28 }}>
          Three people, one shared Notion, far too many RSS feeds.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { name: 'Asa Kowalski',   role: 'Product & design',   bio: 'Previously at Readwise. Writes a newsletter about type.', tint: '#6a8e75' },
            { name: 'Linh Marchetti', role: 'Engineering',        bio: 'Ex-Buffer. Believes in boring, predictable software.', tint: '#a87052' },
            { name: 'Tomi Farquhar',  role: 'Growth & support',   bio: 'Former indie bookseller. Talks to every new customer.', tint: '#8a6aa0' },
          ].map(m => (
            <div key={m.name} style={{
              background: t.bg, border: `1px solid ${t.border}`,
              borderRadius: 14, padding: 22,
            }}>
              <div style={{
                width: '100%', aspectRatio: '4/3', borderRadius: 10,
                background: m.tint, marginBottom: 16,
                display: 'flex', alignItems: 'flex-end', padding: 14,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: 14, right: 14, fontFamily: t.fonts.mono,
                  fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 1,
                }}>PORTRAIT</div>
                <div style={{ fontFamily: t.fonts.display, fontSize: 52, color: 'rgba(255,255,255,0.9)', letterSpacing: -1.5, lineHeight: 0.9 }}>
                  {m.name.split(' ').map(w => w[0]).join('')}
                </div>
              </div>
              <div style={{ fontFamily: t.fonts.display, fontSize: 20, letterSpacing: -0.4 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: t.accent, marginTop: 2, fontWeight: 500 }}>{m.role}</div>
              <div style={{ fontSize: 13, color: t.textMuted, marginTop: 10, lineHeight: 1.5 }}>{m.bio}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      <div style={{
        padding: '48px 48px', borderTop: `1px solid ${t.border}`,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32,
      }}>
        {[
          { k: 'Posts published', v: '2.4M' },
          { k: 'Active studios',  v: '1,840' },
          { k: 'Avg weekly save', v: '4.2h' },
          { k: 'Founded',         v: '2024' },
        ].map(s => (
          <div key={s.k}>
            <MBLabel t={t}>{s.k}</MBLabel>
            <div style={{ fontFamily: t.fonts.display, fontSize: 54, letterSpacing: -1.8, lineHeight: 1, marginTop: 8 }}>
              {s.v}
            </div>
          </div>
        ))}
      </div>

      {/* Contact */}
      <div style={{ padding: '56px 48px', borderTop: `1px solid ${t.border}`, background: t.accent, color: t.accentInk }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32 }}>
          <div>
            <div style={{ fontFamily: t.fonts.display, fontSize: 42, letterSpacing: -1.2, lineHeight: 1 }}>
              Say hello.
            </div>
            <div style={{ fontSize: 15, marginTop: 10, opacity: 0.85, maxWidth: 420 }}>
              Feature requests, bug reports, or a complaint about our footer copy — we read everything.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{
              padding: '14px 22px', fontFamily: t.fonts.mono, fontSize: 14,
              background: 'rgba(255,255,255,0.12)', borderRadius: 999,
            }}>hello@mockingbird.studio</div>
            <MBButton t={t} variant="primary" style={{ background: t.accentInk, color: t.accent, border: `1px solid ${t.accentInk}` }} iconRight={<IconArrowRight size={14}/>}>Book a call</MBButton>
          </div>
        </div>
      </div>
    </div>
  );
}
window.ScreenAbout = ScreenAbout;
