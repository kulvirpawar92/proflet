import { useState, useEffect, useRef } from 'react'

export default function Landing({ onGetStarted = () => {} }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="proflet-lp">
      <Styles />
      <Nav scrolled={scrolled} onGetStarted={onGetStarted} />
      <Hero onGetStarted={onGetStarted} />
      <PainPoints />
      <Features />
      <HowItWorks />
      <Pricing onGetStarted={onGetStarted} />
      <Testimonials />
      <FAQ />
      <FinalCTA onGetStarted={onGetStarted} />
      <Footer />
    </div>
  )
}

function Wordmark({ size = 28 }) {
  const h = size
  const w = (size / 28) * 120
  return (
    <svg width={w} height={h} viewBox="0 0 120 28" fill="none" aria-label="Proflet" className="pl-wordmark">
      <rect x="0" y="10" width="6" height="18" rx="1.5" className="pl-mark-1" />
      <rect x="8" y="5" width="6" height="23" rx="1.5" className="pl-mark-2" />
      <rect x="16" y="1" width="6" height="27" rx="1.5" className="pl-mark-3" />
      <text x="27" y="20" fontFamily="Georgia, serif" fontSize="15" fontWeight="700" className="pl-mark-text-1">prof</text>
      <text x="63" y="20" fontFamily="Georgia, serif" fontSize="15" fontWeight="400" className="pl-mark-text-2">let</text>
    </svg>
  )
}

function Eyebrow({ children }) {
  return <div className="pl-eyebrow">{children}</div>
}

function CTA({ children, onClick, variant = 'primary', size = 'md', full = false }) {
  return (
    <button
      onClick={onClick}
      className={`pl-cta pl-cta-${variant} pl-cta-${size} ${full ? 'pl-cta-full' : ''}`}
    >
      <span>{children}</span>
      {variant === 'primary' && (
        <svg className="pl-cta-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

function Nav({ scrolled, onGetStarted }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className={`pl-nav ${scrolled ? 'pl-nav-scrolled' : ''}`}>
      <div className="pl-nav-inner">
        <a href="#top" className="pl-nav-brand"><Wordmark size={26} /></a>
        <nav className="pl-nav-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="pl-nav-actions">
          <button onClick={onGetStarted} className="pl-nav-signin">Sign in</button>
          <CTA onClick={onGetStarted} variant="primary" size="sm">Get started</CTA>
          <button
            className="pl-nav-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="pl-nav-mobile-menu">
          <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
          <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
          <button onClick={() => { setMenuOpen(false); onGetStarted() }} className="pl-nav-mobile-cta">
            Get started — £19/year
          </button>
        </div>
      )}
    </header>
  )
}

function Hero({ onGetStarted }) {
  return (
    <section className="pl-hero" id="top">
      <div className="pl-hero-bg" aria-hidden="true">
        <div className="pl-hero-grid" />
        <div className="pl-hero-glow" />
      </div>
      <div className="pl-hero-inner">
        <div className="pl-hero-badge">
          <span className="pl-hero-dot" />
          <span>Property portfolio management · Built for UK landlords</span>
        </div>
        <h1 className="pl-hero-title">
          Stop managing your<br />
          properties on <em>spreadsheets</em>.
        </h1>
        <p className="pl-hero-sub">
          Simple property portfolio management for UK landlords. Track rent, mortgages,
          renewals and maintenance — all in one place. Just <strong>£19 a year</strong>.
        </p>
        <div className="pl-hero-actions">
          <CTA onClick={onGetStarted} variant="primary" size="lg">Get started — £19/year</CTA>
          <a href="#features" className="pl-hero-secondary">
            See how it works
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3.5 5.5L7 9l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
        <div className="pl-hero-meta">
          <Check /> One flat price
          <span className="pl-hero-meta-sep">·</span>
          <Check /> Unlimited properties
          <span className="pl-hero-meta-sep">·</span>
          <Check /> Cancel anytime
        </div>
        <DashboardMock />
      </div>
    </section>
  )
}

function Check() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="pl-meta-check" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="6.5" className="pl-meta-check-bg" />
      <path d="M3.7 6.7l2 2 3.6-3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="pl-meta-check-mark" />
    </svg>
  )
}

function DashboardMock() {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const rent = [3200,3200,3200,3400,3400,3400,3400,3400,3400,3600,3600,3600]
  const exp  = [ 820, 410,2300, 510, 420, 980, 510,1200, 480, 520,3100, 540]
  const max = 4000

  return (
    <div className="pl-dash-wrap">
      <div className="pl-dash-window">
        <div className="pl-dash-titlebar">
          <span className="pl-dash-dot" /><span className="pl-dash-dot" /><span className="pl-dash-dot" />
        </div>
        <div className="pl-dash-body">
          <aside className="pl-dash-side">
            <div className="pl-dash-side-brand"><Wordmark size={22} /></div>
            <div className="pl-dash-side-section">Workspace</div>
            <div className="pl-dash-side-link pl-active"><Glyph kind="dash" /> Dashboard</div>
            <div className="pl-dash-side-link"><Glyph kind="house" /> Properties <span className="pl-dash-pill">5</span></div>
            <div className="pl-dash-side-link"><Glyph kind="coin" /> Income</div>
            <div className="pl-dash-side-link"><Glyph kind="bell" /> Alerts <span className="pl-dash-pill pl-dash-pill-warn">2</span></div>
            <div className="pl-dash-side-link"><Glyph kind="wrench" /> Maintenance</div>
            <div className="pl-dash-side-link"><Glyph kind="people" /> Contacts</div>
          </aside>
          <main className="pl-dash-main">
            <div className="pl-dash-header">
              <div>
                <div className="pl-dash-h1">Good morning, James</div>
                <div className="pl-dash-h2">Here's how your portfolio looks today.</div>
              </div>
              <div className="pl-dash-tabs">
                <span className="pl-dash-tab pl-active">Overview</span>
                <span className="pl-dash-tab">Cashflow</span>
                <span className="pl-dash-tab">Equity</span>
              </div>
            </div>
            <div className="pl-dash-stats">
              <Stat label="Total equity" value="£412,800" delta="+£6,200" up />
              <Stat label="Monthly profit" value="£2,140" delta="+£180" up />
              <Stat label="Rent collected" value="£3,400 / £3,400" delta="100%" up small />
              <Stat label="Open cases" value="2" delta="1 high" warn />
            </div>
            <div className="pl-dash-chart-card">
              <div className="pl-dash-chart-head">
                <div>
                  <div className="pl-dash-chart-title">Cashflow · last 12 months</div>
                  <div className="pl-dash-chart-sub">Rent received vs. expenses</div>
                </div>
                <div className="pl-dash-legend">
                  <span><i className="pl-leg-rent" /> Rent</span>
                  <span><i className="pl-leg-exp" /> Expenses</span>
                </div>
              </div>
              <div className="pl-dash-chart">
                {months.map((m, i) => (
                  <div key={`${m}-${i}`} className="pl-dash-bar-col">
                    <div className="pl-dash-bar-stack">
                      <div className="pl-dash-bar pl-bar-rent" style={{ height: `${(rent[i]/max)*100}%` }} />
                      <div className="pl-dash-bar pl-bar-exp"  style={{ height: `${(exp[i]/max)*100}%` }} />
                    </div>
                    <div className="pl-dash-bar-label">{m.charAt(0)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pl-dash-row">
              <div className="pl-dash-alerts">
                <div className="pl-dash-card-title">Upcoming alerts</div>
                <AlertRow color="amber" title="Buildings insurance — 14 Ash Grove" detail="Renews in 23 days" />
                <AlertRow color="red"   title="Mortgage fixed rate ending — 8 Penn St" detail="Expires in 67 days" />
                <AlertRow color="green" title="Tenancy renewal — 12 Oak Lane" detail="Renews automatically" />
              </div>
              <div className="pl-dash-mini">
                <div className="pl-dash-card-title">Properties</div>
                <PropRow name="14 Ash Grove" rent="£1,400" status="Paid" />
                <PropRow name="8 Penn Street" rent="£1,200" status="Paid" />
                <PropRow name="12 Oak Lane" rent="£800" status="Due 3d" warn />
              </div>
            </div>
          </main>
        </div>
      </div>
      <div className="pl-dash-shadow" />
    </div>
  )
}

function Stat({ label, value, delta, up, warn, small }) {
  return (
    <div className="pl-stat">
      <div className="pl-stat-label">{label}</div>
      <div className={`pl-stat-value ${small ? 'pl-stat-small' : ''}`}>{value}</div>
      <div className={`pl-stat-delta ${up ? 'pl-up' : ''} ${warn ? 'pl-warn' : ''}`}>
        {up && '▲ '}{warn && '● '}{delta}
      </div>
    </div>
  )
}

function AlertRow({ color, title, detail }) {
  return (
    <div className="pl-alert-row">
      <span className={`pl-alert-dot pl-alert-${color}`} />
      <div className="pl-alert-text">
        <div className="pl-alert-title">{title}</div>
        <div className="pl-alert-detail">{detail}</div>
      </div>
    </div>
  )
}

function PropRow({ name, rent, status, warn }) {
  return (
    <div className="pl-prop-row">
      <div className="pl-prop-thumb" />
      <div className="pl-prop-text">
        <div className="pl-prop-name">{name}</div>
        <div className="pl-prop-rent">{rent} / mo</div>
      </div>
      <div className={`pl-prop-status ${warn ? 'pl-warn' : ''}`}>{status}</div>
    </div>
  )
}

function Glyph({ kind }) {
  const s = { width: 14, height: 14, viewBox: '0 0 14 14', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (kind) {
    case 'dash':   return <svg {...s}><rect x="2" y="2" width="4.5" height="4.5" rx="1"/><rect x="7.5" y="2" width="4.5" height="4.5" rx="1"/><rect x="2" y="7.5" width="4.5" height="4.5" rx="1"/><rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1"/></svg>
    case 'house':  return <svg {...s}><path d="M2 6.5L7 2.5l5 4V12a.5.5 0 01-.5.5h-9A.5.5 0 012 12V6.5z"/><path d="M5.5 12.5V8h3v4.5"/></svg>
    case 'coin':   return <svg {...s}><circle cx="7" cy="7" r="5"/><path d="M7 4v6M5 6h4M5 8h4"/></svg>
    case 'bell':   return <svg {...s}><path d="M3 10.5h8M4 10.5V7a3 3 0 016 0v3.5M5.5 11.5a1.5 1.5 0 003 0"/></svg>
    case 'wrench': return <svg {...s}><path d="M9 2.5a2.5 2.5 0 00-2.5 3l-4 4a1 1 0 101.5 1.5l4-4A2.5 2.5 0 109 2.5z"/></svg>
    case 'people': return <svg {...s}><circle cx="5" cy="5" r="2"/><circle cx="10" cy="6" r="1.5"/><path d="M2 12c0-1.7 1.3-3 3-3s3 1.3 3 3M9 11.5c0-1.1.7-2 2-2s2 .9 2 2"/></svg>
    case 'shield': return <svg {...s}><path d="M7 1.5L2.5 3v4c0 3 2 5 4.5 5.5C9.5 12 11.5 10 11.5 7V3L7 1.5z"/><path d="M5 7l1.5 1.5L9 6"/></svg>
    case 'doc':    return <svg {...s}><path d="M3.5 1.5h5L11 4v8.5H3.5z"/><path d="M5 6h4M5 8h4M5 10h2.5"/></svg>
    case 'chart':  return <svg {...s}><path d="M2 11.5h10M3.5 11.5V7m2.5 4.5V4.5m2.5 7V8.5m2.5 3V6"/></svg>
    case 'lock':   return <svg {...s}><rect x="2.5" y="6" width="9" height="6" rx="1"/><path d="M4.5 6V4.5a2.5 2.5 0 015 0V6"/></svg>
    case 'ai':     return <svg {...s}><path d="M7 1.5l1.2 3.3L11.5 6 8.2 7.2 7 10.5 5.8 7.2 2.5 6l3.3-1.2L7 1.5z"/><path d="M11 10l.6 1.4 1.4.6-1.4.6L11 14l-.6-1.4-1.4-.6 1.4-.6L11 10z"/></svg>
    default: return null
  }
}

function PainPoints() {
  const items = [
    { quote: 'Insurance renewed late', rest: 'because the date was buried in an old email.', tag: 'Last month' },
    { quote: 'No idea if the portfolio is profitable', rest: 'once you factor in every cost.', tag: 'Every Sunday' },
    { quote: 'Chasing a contractor\'s number', rest: 'across three different WhatsApp threads.', tag: 'Right now' },
    { quote: 'Spreadsheets with twelve tabs', rest: 'that break every time something changes.', tag: 'Forever' },
    { quote: 'Mortgage fix ending in two weeks', rest: 'and no time left to shop the market.', tag: 'Worst case' },
  ]
  return (
    <section className="pl-section pl-section-pain">
      <div className="pl-section-inner">
        <div className="pl-section-head">
          <Eyebrow>The problem</Eyebrow>
          <h2 className="pl-section-title">If you've said any of these out loud,<br />you're not alone.</h2>
        </div>
        <div className="pl-pain-grid">
          {items.map((p, i) => (
            <figure key={i} className="pl-pain-card" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="pl-pain-quotemark">"</div>
              <blockquote className="pl-pain-quote">
                <strong>{p.quote}</strong> {p.rest}
              </blockquote>
              <figcaption className="pl-pain-tag">{p.tag}</figcaption>
            </figure>
          ))}
          <div className="pl-pain-card pl-pain-card-cta">
            <div className="pl-pain-cta-title">Sound familiar?</div>
            <div className="pl-pain-cta-text">Proflet replaces the spreadsheet, the email reminders, and the three WhatsApp threads.</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Features() {
  const features = [
    { glyph: 'dash',   title: 'Portfolio dashboard',     desc: 'Total equity, monthly profit, and upcoming alerts — on one screen the moment you log in.' },
    { glyph: 'ai',     title: 'Proflet AI assistant',     desc: 'Ask anything about your portfolio in plain English — profitability, equity, upcoming renewals, repair spend. Answers grounded in your real data.', highlight: true },
    { glyph: 'coin',   title: 'Rent & income tracking',  desc: 'Log payments, mark rent received or overdue, and see exactly what\'s owed across every property.' },
    { glyph: 'bell',   title: 'Renewal alerts',          desc: 'Insurance, remortgage dates, tenancies — Proflet tells you 90 days out, not the day after.' },
    { glyph: 'wrench', title: 'Maintenance tracking',    desc: 'Log issues, set priority, track status. Linked to the property, the contractor and the spend.' },
    { glyph: 'chart',  title: 'Mortgage & equity view',  desc: 'Live LTV, equity, and how much you could release across each property in your portfolio.' },
    { glyph: 'people', title: 'Contacts in one place',   desc: 'Tenants, contractors, brokers, agents — searchable and linked to the right property.' },
  ]
  return (
    <section className="pl-section pl-section-features" id="features">
      <div className="pl-section-inner">
        <div className="pl-section-head pl-section-head-center">
          <Eyebrow>What you get</Eyebrow>
          <h2 className="pl-section-title">Everything your portfolio needs.<br />Nothing you'll never use.</h2>
          <p className="pl-section-sub">Built specifically for UK landlords. No enterprise bloat, no twenty-tab settings menu, no per-seat pricing.</p>
        </div>
        <div className="pl-feature-grid">
          {features.map((f, i) => (
            <div key={f.title} className={`pl-feature-card ${f.highlight ? 'pl-feature-card-ai' : ''}`} style={{ animationDelay: `${i * 60}ms` }}>
              <div className="pl-feature-icon"><Glyph kind={f.glyph} /></div>
              <div className="pl-feature-title">{f.title}</div>
              <div className="pl-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: '01', title: 'Create your account',         desc: 'Sign up in under a minute. Pay £19, get instant access to everything.' },
    { n: '02', title: 'Add your properties',         desc: 'Enter your properties with their key details — value, mortgage, rent, tenancy dates.' },
    { n: '03', title: 'See your portfolio clearly',  desc: 'Your dashboard shows profit, equity, yield and any upcoming alerts straight away.' },
    { n: '04', title: 'Stay on top every month',     desc: 'Rent records auto-generate. Mark payments received, log expenses, close cases.' },
  ]
  return (
    <section className="pl-section pl-section-how">
      <div className="pl-section-inner">
        <div className="pl-section-head">
          <Eyebrow>Getting started</Eyebrow>
          <h2 className="pl-section-title">Up and running in under an hour.</h2>
        </div>
        <ol className="pl-how-list">
          {steps.map(s => (
            <li key={s.n} className="pl-how-step">
              <div className="pl-how-num">{s.n}</div>
              <div className="pl-how-body">
                <div className="pl-how-title">{s.title}</div>
                <div className="pl-how-desc">{s.desc}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Pricing({ onGetStarted }) {
  const items = [
    'Unlimited properties',
    'Proflet AI assistant — ask anything about your portfolio',
    'Income & expense tracking',
    'Renewal & remortgage alerts',
    'Maintenance & case tracking',
    'Contacts & contractor log',
    'Portfolio P&L and equity overview',
    'Auto-generated monthly records',
    'Works on desktop and mobile',
  ]
  return (
    <section className="pl-section pl-section-pricing" id="pricing">
      <div className="pl-section-inner">
        <div className="pl-section-head pl-section-head-center">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="pl-section-title">One plan. Everything in.<br />For £19 a year, run your properties like a professional.</h2>
        </div>
        <div className="pl-price-card">
          <div className="pl-price-card-glow" aria-hidden="true" />
          <div className="pl-price-head">
            <div className="pl-price-pill">One plan · Everything included</div>
            <div className="pl-price-name">Proflet</div>
            <div className="pl-price-tag">Unlimited properties · Built for UK landlords</div>
          </div>
          <div className="pl-price-amount">
            <span className="pl-price-currency">£</span>
            <span className="pl-price-number">19</span>
            <div className="pl-price-per">
              <span>/year</span>
              <small>≈ £1.58 / month</small>
            </div>
          </div>
          <div className="pl-price-divider" />
          <ul className="pl-price-list">
            {items.map(item => (
              <li key={item} className="pl-price-item">
                <span className="pl-price-tick">
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M2 5.5L4.5 8 9 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
          <CTA onClick={onGetStarted} variant="primary" size="lg" full>Get started — £19/year</CTA>
          <div className="pl-price-fine">
            <Check /> Pay once a year
            <span className="pl-hero-meta-sep">·</span>
            <Check /> Cancel anytime
          </div>
        </div>
        <div className="pl-price-foot">
          <span><Glyph kind="lock" /> Encrypted at rest · UK-hosted data</span>
          <span><Glyph kind="shield" /> 30-day money-back guarantee</span>
          <span><Glyph kind="doc" /> Export everything, any time</span>
        </div>
      </div>
    </section>
  )
}

function Testimonials() {
  const items = [
    { stat: '£2,300', label: 'Average cost', body: 'of missing a mortgage fixed-rate end. Proflet warns you 90 days out.', source: 'Industry estimate' },
    { stat: '73%', label: 'Still on spreadsheets', body: 'of UK landlords manage their portfolio in Excel — with all the broken formulas that come with it.', source: 'Landlord survey' },
    { stat: '68%', label: 'Most stressful part', body: 'of landlords say property admin is the most stressful part of owning a rental.', source: 'Landlord survey' },
    { stat: '1.4m', label: 'UK landlords', body: 'with one to four properties — and almost none have proper software for it.', source: 'HMRC / industry data' },
  ]
  return (
    <section className="pl-section pl-section-testi">
      <div className="pl-section-inner">
        <div className="pl-section-head">
          <Eyebrow>Why it matters</Eyebrow>
          <h2 className="pl-section-title">The cost of staying disorganised<br />is bigger than you think.</h2>
        </div>
        <div className="pl-testi-grid">
          {items.map((t, i) => (
            <figure key={i} className="pl-testi-card pl-stat-card" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="pl-stat-card-num">{t.stat}</div>
              <div className="pl-stat-card-label">{t.label}</div>
              <p className="pl-stat-card-body">{t.body}</p>
              <div className="pl-stat-card-source">{t.source}</div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  const faqs = [
    { q: 'How does payment work?', a: 'You pay £19 up front for a full year of access. That\u2019s it — no monthly billing, no per-property fees, no add-ons.' },
    { q: 'What if I want a refund?', a: 'If Proflet isn\u2019t for you, email us within 30 days of paying and we\u2019ll refund you in full, no questions asked.' },
    { q: 'Is my data secure?', a: 'Yes. Your data is stored in an encrypted database, never shared with third parties, and only accessible with your login.' },
    { q: 'Can I use it on my phone?', a: 'Yes — it works on any device through your browser. A dedicated mobile app is coming soon.' },
    { q: 'Can I cancel anytime?', a: 'Yes. No contracts, no cancellation fees. Cancel from your account settings in under a minute.' },
    { q: 'How many properties can I add?', a: 'As many as you like. The plan includes unlimited properties — add new ones whenever you grow the portfolio.' },
  ]
  const [open, setOpen] = useState(0)
  return (
    <section className="pl-section pl-section-faq" id="faq">
      <div className="pl-section-inner pl-faq-layout">
        <div className="pl-faq-head">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="pl-section-title">Common questions.</h2>
          <p className="pl-section-sub">Can't see yours? Email <a href="mailto:hello@proflet.com">hello@proflet.com</a> and we'll come back the same day.</p>
        </div>
        <div className="pl-faq-list">
          {faqs.map((f, i) => (
            <FAQItem key={i} {...f} isOpen={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQItem({ q, a, isOpen, onToggle }) {
  const ref = useRef(null)
  return (
    <div className={`pl-faq-item ${isOpen ? 'pl-faq-open' : ''}`}>
      <button className="pl-faq-q" onClick={onToggle} aria-expanded={isOpen}>
        <span>{q}</span>
        <span className="pl-faq-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 5.5L7 9.5l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
      </button>
      <div className="pl-faq-a-wrap" style={{ maxHeight: isOpen ? (ref.current?.scrollHeight || 200) + 'px' : 0 }}>
        <div ref={ref} className="pl-faq-a">{a}</div>
      </div>
    </div>
  )
}

function FinalCTA({ onGetStarted }) {
  return (
    <section className="pl-section pl-section-final">
      <div className="pl-section-inner">
        <div className="pl-final-card">
          <div className="pl-final-bg" aria-hidden="true">
            <div className="pl-final-glow" />
            <div className="pl-final-grid" />
          </div>
          <Wordmark size={32} />
          <h2 className="pl-final-title">Get your portfolio under control<br />in an afternoon.</h2>
          <p className="pl-final-sub">Join the landlords who've ditched the spreadsheets. £19 a year, everything included.</p>
          <CTA onClick={onGetStarted} variant="primary-light" size="lg">Get started — £19/year</CTA>
          <div className="pl-final-meta">
            <Check /> One flat price
            <span className="pl-hero-meta-sep">·</span>
            <Check /> Unlimited properties
            <span className="pl-hero-meta-sep">·</span>
            <Check /> Cancel anytime
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="pl-footer">
      <div className="pl-footer-inner">
        <div className="pl-footer-brand"><Wordmark size={26} /></div>
        <div className="pl-footer-text">Built for UK landlords · © 2026 Proflet Ltd.</div>
        <div className="pl-footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="mailto:hello@proflet.com">Contact</a>
        </div>
      </div>
    </footer>
  )
}

function Styles() {
  return (
    <style>{`
.proflet-lp {
  /* Brand */
  --pl-dark:    #173404;
  --pl-mid:     #6FAD2A;
  --pl-bright:  #8FCB3C;
  --pl-light:   oklch(28% 0.040 130);
  --pl-light-b: oklch(34% 0.050 130);

  /* Dark mode tokens — always on */
  --pl-bg:      oklch(16% 0.020 145);
  --pl-bg-2:    oklch(19% 0.022 145);
  --pl-bg-3:    oklch(14% 0.018 145);
  --pl-surface: oklch(22% 0.022 145);
  --pl-text:    oklch(96% 0.012 110);
  --pl-text-2:  oklch(82% 0.015 120);
  --pl-muted:   oklch(65% 0.018 130);
  --pl-border:  oklch(28% 0.020 145);
  --pl-border-2:oklch(34% 0.022 145);
  --pl-shadow-1: 0 1px 2px rgba(0,0,0,.4), 0 4px 18px -8px rgba(0,0,0,.5);
  --pl-shadow-2: 0 2px 6px rgba(0,0,0,.4), 0 18px 60px -20px rgba(0,0,0,.6);
  --pl-shadow-3: 0 30px 100px -30px rgba(0,0,0,.7), 0 4px 12px rgba(0,0,0,.4);
  --pl-grad-soft: linear-gradient(180deg, oklch(18% 0.025 145) 0%, oklch(15% 0.020 145) 100%);

  --pl-r-sm: 8px; --pl-r-md: 12px; --pl-r-lg: 18px; --pl-r-xl: 24px;

  font-family: Georgia, 'Times New Roman', serif;
  color: var(--pl-text);
  background: var(--pl-bg);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

.proflet-lp * { box-sizing: border-box; }
.proflet-lp a { color: inherit; }

/* Mark colors */
.pl-mark-1 { fill: var(--pl-bright); opacity: .55; }
.pl-mark-2 { fill: var(--pl-bright); opacity: .8; }
.pl-mark-3 { fill: var(--pl-bright); }
.pl-mark-text-1 { fill: var(--pl-bright); }
.pl-mark-text-2 { fill: var(--pl-bright); opacity: .75; }

.pl-eyebrow {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 11px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase;
  color: var(--pl-mid); margin-bottom: .9rem;
  display: inline-flex; align-items: center; gap: 8px;
}
.pl-eyebrow::before { content: ''; width: 22px; height: 1px; background: currentColor; display: inline-block; opacity: .5; }

.pl-section { position: relative; padding: 6rem 1.5rem; }
.pl-section-inner { max-width: 1140px; margin: 0 auto; }
.pl-section-head { max-width: 720px; margin-bottom: 3rem; }
.pl-section-head-center { margin-left: auto; margin-right: auto; text-align: center; }
.pl-section-head-center .pl-eyebrow::before { display: none; }
.pl-section-title { font-family: Georgia, serif; font-weight: 500; font-size: clamp(28px, 3.6vw, 44px); line-height: 1.12; letter-spacing: -0.02em; color: var(--pl-text); margin: 0 0 1rem; text-wrap: balance; }
.pl-section-sub { font-size: 17px; color: var(--pl-text-2); line-height: 1.6; margin: 0; max-width: 560px; }
.pl-section-head-center .pl-section-sub { margin-left: auto; margin-right: auto; }

.pl-cta { position: relative; display: inline-flex; align-items: center; gap: 8px; font-family: Georgia, serif; font-weight: 500; border: 0; cursor: pointer; border-radius: 999px; transition: transform .18s ease, box-shadow .18s ease; white-space: nowrap; letter-spacing: -0.005em; }
.pl-cta-sm { font-size: 13px; padding: 8px 16px; }
.pl-cta-md { font-size: 14px; padding: 10px 20px; }
.pl-cta-lg { font-size: 16px; padding: 14px 28px; }
.pl-cta-full { display: flex; width: 100%; justify-content: center; }
.pl-cta-primary { color: white; background: linear-gradient(180deg, var(--pl-bright) 0%, var(--pl-mid) 100%); box-shadow: 0 1px 0 rgba(255,255,255,.25) inset, 0 -1px 0 rgba(0,0,0,.15) inset, 0 8px 22px -8px rgba(59,109,17,.55), 0 2px 4px rgba(20,40,10,.18); }
.pl-cta-primary:hover { transform: translateY(-1px); }
.pl-cta-primary-light { color: var(--pl-dark); background: linear-gradient(180deg, #ffffff 0%, #F4FAEA 100%); box-shadow: 0 8px 22px -8px rgba(0,0,0,.35), 0 2px 4px rgba(0,0,0,.15); }
.pl-cta-primary-light:hover { transform: translateY(-1px); }
.pl-cta-arrow { transition: transform .2s ease; }
.pl-cta:hover .pl-cta-arrow { transform: translateX(3px); }

/* Nav */
.pl-nav { position: sticky; top: 0; z-index: 100; backdrop-filter: saturate(160%) blur(14px); -webkit-backdrop-filter: saturate(160%) blur(14px); background: color-mix(in oklab, var(--pl-bg) 78%, transparent); border-bottom: 1px solid transparent; transition: border-color .25s ease; }
.pl-nav-scrolled { border-bottom-color: var(--pl-border); background: color-mix(in oklab, var(--pl-bg) 92%, transparent); }
.pl-nav-inner { max-width: 1140px; margin: 0 auto; padding: 0 1.5rem; height: 64px; display: flex; align-items: center; gap: 24px; }
.pl-nav-brand { display: inline-flex; }
.pl-nav-links { display: flex; gap: 28px; margin-left: 12px; }
.pl-nav-links a { color: var(--pl-text-2); text-decoration: none; font-size: 14px; transition: color .18s ease; }
.pl-nav-links a:hover { color: var(--pl-text); }
.pl-nav-actions { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.pl-nav-signin { font-family: inherit; font-size: 13px; color: var(--pl-text-2); background: transparent; border: 0; padding: 8px 12px; cursor: pointer; border-radius: 999px; transition: color .18s, background .18s; }
.pl-nav-signin:hover { color: var(--pl-text); background: var(--pl-bg-3); }
@media (max-width: 720px) { .pl-nav-links { display: none; } }

.pl-nav-hamburger { display: none; background: none; border: none; cursor: pointer; color: var(--pl-text); padding: 6px; border-radius: 8px; transition: background .18s; align-items: center; justify-content: center; }
.pl-nav-hamburger:hover { background: var(--pl-bg-3); }
@media (max-width: 720px) { .pl-nav-hamburger { display: flex; } }

.pl-nav-mobile-menu { display: flex; flex-direction: column; background: var(--pl-bg); border-top: 1px solid var(--pl-border); padding: 1rem 1.5rem 1.5rem; gap: 0; }
.pl-nav-mobile-menu a { font-size: 17px; color: var(--pl-text); text-decoration: none; padding: 14px 0; border-bottom: 1px solid var(--pl-border); font-family: Georgia, serif; display: block; }
.pl-nav-mobile-menu a:hover { color: var(--pl-mid); }
.pl-nav-mobile-cta { margin-top: 1.25rem; padding: 14px; background: linear-gradient(180deg, var(--pl-bright) 0%, var(--pl-mid) 100%); color: white; border: none; border-radius: 999px; font-family: Georgia, serif; font-size: 16px; font-weight: 500; cursor: pointer; width: 100%; }

/* Hero */
.pl-hero { position: relative; padding: 6rem 1.5rem 2rem; overflow: hidden; }
.pl-hero-bg { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.pl-hero-grid { position: absolute; inset: -1px 0 0 0; background-image: linear-gradient(to right, var(--pl-border) 1px, transparent 1px), linear-gradient(to bottom, var(--pl-border) 1px, transparent 1px); background-size: 56px 56px; mask-image: radial-gradient(ellipse 70% 50% at 50% 0%, #000 0%, transparent 70%); opacity: .55; }
.pl-hero-glow { position: absolute; top: -200px; left: 50%; transform: translateX(-50%); width: 900px; height: 600px; background: radial-gradient(closest-side, color-mix(in oklab, var(--pl-bright) 32%, transparent), transparent 70%); filter: blur(40px); opacity: .5; }
.pl-hero-inner { position: relative; z-index: 1; max-width: 920px; margin: 0 auto; text-align: center; }
.pl-hero-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px 6px 10px; background: var(--pl-bg-2); border: 1px solid var(--pl-border); border-radius: 999px; font-size: 12px; color: var(--pl-text-2); box-shadow: var(--pl-shadow-1); margin-bottom: 1.75rem; animation: pl-fade-up .6s ease both; }
.pl-hero-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--pl-bright); box-shadow: 0 0 0 4px color-mix(in oklab, var(--pl-bright) 25%, transparent); }
.pl-hero-title { font-family: Georgia, serif; font-weight: 500; font-size: clamp(40px, 6vw, 72px); line-height: 1.05; letter-spacing: -0.025em; color: var(--pl-text); margin: 0 0 1.25rem; text-wrap: balance; animation: pl-fade-up .7s ease both .05s; }
.pl-hero-title em { font-style: italic; background: linear-gradient(120deg, var(--pl-bright), var(--pl-mid)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.pl-hero-sub { font-size: clamp(16px, 1.6vw, 19px); color: var(--pl-text-2); max-width: 580px; margin: 0 auto 2rem; line-height: 1.55; animation: pl-fade-up .7s ease both .12s; }
.pl-hero-sub strong { color: var(--pl-text); font-weight: 700; }
.pl-hero-actions { display: flex; gap: 14px; justify-content: center; align-items: center; flex-wrap: wrap; animation: pl-fade-up .7s ease both .18s; }
.pl-hero-secondary { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: var(--pl-text-2); text-decoration: none; padding: 10px 8px; transition: color .18s; }
.pl-hero-secondary:hover { color: var(--pl-text); }
.pl-hero-meta { margin-top: 1.25rem; font-size: 12px; color: var(--pl-muted); display: inline-flex; flex-wrap: wrap; justify-content: center; gap: 6px; align-items: center; animation: pl-fade-up .7s ease both .22s; }
.pl-hero-meta-sep { opacity: .5; }
.pl-meta-check { color: var(--pl-mid); flex-shrink: 0; }
.pl-meta-check-bg { fill: color-mix(in oklab, var(--pl-mid) 18%, transparent); }
.pl-meta-check-mark { color: var(--pl-mid); }

/* Dashboard mock */
.pl-dash-wrap { margin-top: 4rem; position: relative; animation: pl-fade-up 1s ease both .35s; }
.pl-dash-window { position: relative; background: var(--pl-bg-2); border: 1px solid var(--pl-border); border-radius: 14px; box-shadow: var(--pl-shadow-3); overflow: hidden; text-align: left; transform: rotateX(2deg); transform-origin: 50% 100%; }
.pl-dash-titlebar { display: flex; align-items: center; gap: 6px; padding: 10px 14px; background: var(--pl-bg-3); border-bottom: 1px solid var(--pl-border); }
.pl-dash-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--pl-border-2); }
.pl-dash-dot:nth-child(1) { background: #FF5F57; }
.pl-dash-dot:nth-child(2) { background: #FEBC2E; }
.pl-dash-dot:nth-child(3) { background: #28C840; }
.pl-dash-body { display: grid; grid-template-columns: 200px 1fr; min-height: 460px; }
.pl-dash-side { background: var(--pl-bg-3); border-right: 1px solid var(--pl-border); padding: 18px 14px; font-family: Georgia, serif; font-size: 13px; }
.pl-dash-side-brand { padding: 0 4px 16px; }
.pl-dash-side-section { font-family: ui-monospace, monospace; font-size: 10px; text-transform: uppercase; letter-spacing: .12em; color: var(--pl-muted); padding: 8px 6px; }
.pl-dash-side-link { display: flex; align-items: center; gap: 10px; padding: 7px 8px; border-radius: 6px; color: var(--pl-text-2); margin-bottom: 1px; }
.pl-dash-side-link.pl-active { background: var(--pl-light); color: var(--pl-mid); font-weight: 500; }
.pl-dash-pill { margin-left: auto; font-family: ui-monospace, monospace; font-size: 10px; background: var(--pl-bg-2); border: 1px solid var(--pl-border); color: var(--pl-muted); padding: 1px 6px; border-radius: 999px; }
.pl-dash-pill-warn { color: #FCD34D; background: oklch(28% 0.08 70); border-color: oklch(40% 0.10 70); }
.pl-dash-main { padding: 22px; display: flex; flex-direction: column; gap: 16px; }
.pl-dash-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.pl-dash-h1 { font-size: 18px; font-weight: 500; color: var(--pl-text); }
.pl-dash-h2 { font-size: 12px; color: var(--pl-muted); margin-top: 2px; }
.pl-dash-tabs { display: flex; gap: 2px; background: var(--pl-bg-3); border: 1px solid var(--pl-border); border-radius: 8px; padding: 3px; }
.pl-dash-tab { font-size: 11px; padding: 5px 10px; border-radius: 6px; color: var(--pl-muted); }
.pl-dash-tab.pl-active { background: var(--pl-bg-2); color: var(--pl-text); }
.pl-dash-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.pl-stat { border: 1px solid var(--pl-border); background: var(--pl-bg-2); border-radius: 10px; padding: 12px 14px; }
.pl-stat-label { font-size: 11px; color: var(--pl-muted); }
.pl-stat-value { font-family: Georgia, serif; font-size: 22px; font-weight: 500; color: var(--pl-text); margin: 4px 0 6px; }
.pl-stat-small { font-size: 14px; }
.pl-stat-delta { font-family: ui-monospace, monospace; font-size: 10.5px; color: var(--pl-muted); }
.pl-stat-delta.pl-up { color: var(--pl-mid); }
.pl-stat-delta.pl-warn { color: #FCD34D; }
.pl-dash-chart-card { border: 1px solid var(--pl-border); background: var(--pl-bg-2); border-radius: 10px; padding: 14px 16px 12px; }
.pl-dash-chart-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.pl-dash-chart-title { font-size: 13px; font-weight: 500; color: var(--pl-text); }
.pl-dash-chart-sub { font-size: 11px; color: var(--pl-muted); margin-top: 1px; }
.pl-dash-legend { display: flex; gap: 12px; font-size: 11px; color: var(--pl-muted); }
.pl-dash-legend i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
.pl-leg-rent { background: var(--pl-mid); }
.pl-leg-exp { background: var(--pl-light-b); }
.pl-dash-chart { display: grid; grid-template-columns: repeat(12, 1fr); align-items: end; gap: 6px; height: 100px; }
.pl-dash-bar-col { display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; }
.pl-dash-bar-stack { display: flex; gap: 2px; align-items: end; height: 100%; width: 100%; justify-content: center; }
.pl-dash-bar { width: 6px; border-radius: 2px 2px 0 0; }
.pl-bar-rent { background: var(--pl-mid); }
.pl-bar-exp { background: var(--pl-light-b); }
.pl-dash-bar-label { font-family: ui-monospace, monospace; font-size: 9px; color: var(--pl-muted); }
.pl-dash-row { display: grid; grid-template-columns: 1.4fr 1fr; gap: 10px; }
.pl-dash-alerts, .pl-dash-mini { border: 1px solid var(--pl-border); background: var(--pl-bg-2); border-radius: 10px; padding: 14px 16px; }
.pl-dash-card-title { font-size: 13px; font-weight: 500; color: var(--pl-text); margin-bottom: 8px; }
.pl-alert-row { display: flex; gap: 10px; padding: 7px 0; border-top: 1px solid var(--pl-border); }
.pl-alert-row:first-of-type { border-top: 0; }
.pl-alert-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
.pl-alert-amber { background: #F59E0B; box-shadow: 0 0 0 3px rgba(245,158,11,.18); }
.pl-alert-red { background: #DC2626; box-shadow: 0 0 0 3px rgba(220,38,38,.18); }
.pl-alert-green { background: var(--pl-bright); box-shadow: 0 0 0 3px color-mix(in oklab, var(--pl-bright) 22%, transparent); }
.pl-alert-title { font-size: 12px; color: var(--pl-text); }
.pl-alert-detail { font-size: 11px; color: var(--pl-muted); margin-top: 1px; font-family: ui-monospace, monospace; }
.pl-prop-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-top: 1px solid var(--pl-border); }
.pl-prop-row:first-of-type { border-top: 0; }
.pl-prop-thumb { width: 28px; height: 28px; border-radius: 6px; background: repeating-linear-gradient(135deg, var(--pl-light) 0 6px, var(--pl-light-b) 6px 12px); flex-shrink: 0; }
.pl-prop-text { flex: 1; min-width: 0; }
.pl-prop-name { font-size: 12px; color: var(--pl-text); }
.pl-prop-rent { font-size: 11px; color: var(--pl-muted); font-family: ui-monospace, monospace; }
.pl-prop-status { font-size: 11px; font-family: ui-monospace, monospace; color: var(--pl-mid); background: var(--pl-light); padding: 2px 8px; border-radius: 999px; }
.pl-prop-status.pl-warn { color: #FCD34D; background: oklch(28% 0.08 70); }
.pl-dash-shadow { position: absolute; left: 8%; right: 8%; bottom: -30px; height: 60px; background: radial-gradient(ellipse at center, rgba(20,40,10,.30), transparent 70%); filter: blur(20px); z-index: -1; }
@media (max-width: 880px) { .pl-dash-body { grid-template-columns: 1fr; } .pl-dash-side { display: none; } .pl-dash-stats { grid-template-columns: repeat(2, 1fr); } .pl-dash-row { grid-template-columns: 1fr; } }

/* Pain */
.pl-section-pain { background: var(--pl-bg-2); border-top: 1px solid var(--pl-border); border-bottom: 1px solid var(--pl-border); }
.pl-pain-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.pl-pain-card { position: relative; background: var(--pl-bg); border: 1px solid var(--pl-border); border-radius: var(--pl-r-lg); padding: 1.5rem 1.5rem 1.25rem; min-height: 170px; display: flex; flex-direction: column; justify-content: space-between; transition: transform .2s ease, box-shadow .2s ease; animation: pl-fade-up .6s ease both; }
.pl-pain-card:hover { transform: translateY(-2px); box-shadow: var(--pl-shadow-2); }
.pl-pain-quotemark { font-family: Georgia, serif; font-size: 56px; line-height: 0.6; color: var(--pl-bright); opacity: .25; margin-bottom: .5rem; }
.pl-pain-quote { margin: 0; font-size: 15.5px; line-height: 1.55; color: var(--pl-text-2); font-style: italic; }
.pl-pain-quote strong { color: var(--pl-text); font-style: normal; font-weight: 600; display: block; margin-bottom: 4px; }
.pl-pain-tag { margin-top: 1rem; font-family: ui-monospace, monospace; font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--pl-muted); }
.pl-pain-card-cta { background: linear-gradient(135deg, var(--pl-mid), var(--pl-dark)); border: 0; color: white; padding: 1.5rem; display: flex; flex-direction: column; justify-content: flex-end; }
.pl-pain-cta-title { font-size: 22px; font-weight: 500; margin-bottom: .5rem; }
.pl-pain-cta-text { font-size: 14px; opacity: .85; line-height: 1.5; }
@media (max-width: 880px) { .pl-pain-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .pl-pain-grid { grid-template-columns: 1fr; } }

/* Features */
.pl-section-features { background: var(--pl-bg); }
.pl-feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.pl-feature-card { position: relative; background: var(--pl-bg-2); border: 1px solid var(--pl-border); border-radius: var(--pl-r-lg); padding: 1.6rem; overflow: hidden; transition: transform .2s ease, box-shadow .2s ease; animation: pl-fade-up .6s ease both; }
.pl-feature-card:hover { transform: translateY(-3px); box-shadow: var(--pl-shadow-2); border-color: var(--pl-light-b); }
.pl-feature-icon { width: 38px; height: 38px; border-radius: 10px; background: var(--pl-light); border: 1px solid var(--pl-light-b); color: var(--pl-mid); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 1rem; }
.pl-feature-icon svg { width: 18px; height: 18px; }
.pl-feature-title { font-size: 17px; font-weight: 500; color: var(--pl-text); letter-spacing: -0.01em; margin-bottom: .4rem; }
.pl-feature-desc { font-size: 14px; color: var(--pl-text-2); line-height: 1.55; }
.pl-feature-card-ai { background: linear-gradient(180deg, color-mix(in oklab, var(--pl-bright) 8%, var(--pl-bg-2)) 0%, var(--pl-bg-2) 60%); border-color: var(--pl-light-b); }
.pl-feature-card-ai .pl-feature-icon { background: linear-gradient(135deg, var(--pl-mid), var(--pl-dark)); border-color: var(--pl-mid); color: white; }
@media (max-width: 880px) { .pl-feature-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .pl-feature-grid { grid-template-columns: 1fr; } }

/* How */
.pl-section-how { background: var(--pl-bg-3); border-top: 1px solid var(--pl-border); border-bottom: 1px solid var(--pl-border); }
.pl-how-list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; position: relative; }
.pl-how-list::before { content: ''; position: absolute; top: 22px; left: 6%; right: 6%; height: 1px; background: repeating-linear-gradient(to right, var(--pl-border-2) 0 6px, transparent 6px 12px); }
.pl-how-step { position: relative; padding: 0 14px; }
.pl-how-num { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; background: var(--pl-bg); border: 1px solid var(--pl-border-2); color: var(--pl-mid); font-family: ui-monospace, monospace; font-size: 13px; font-weight: 500; margin-bottom: 1rem; z-index: 1; }
.pl-how-title { font-size: 16px; font-weight: 500; color: var(--pl-text); margin-bottom: .35rem; }
.pl-how-desc { font-size: 13.5px; color: var(--pl-text-2); line-height: 1.55; }
@media (max-width: 880px) { .pl-how-list { grid-template-columns: 1fr; gap: 1.25rem; } .pl-how-list::before { display: none; } .pl-how-step { padding: 0; display: grid; grid-template-columns: 56px 1fr; gap: 1rem; align-items: start; } .pl-how-num { margin: 0; } }

/* Pricing */
.pl-section-pricing { background: var(--pl-bg); }
.pl-price-card { position: relative; max-width: 460px; margin: 0 auto; background: var(--pl-bg-2); border: 1px solid var(--pl-border-2); border-radius: var(--pl-r-xl); padding: 2rem 2rem 1.75rem; box-shadow: var(--pl-shadow-2); overflow: hidden; text-align: left; }
.pl-price-card-glow { position: absolute; inset: 0; background: radial-gradient(ellipse 80% 40% at 50% 0%, color-mix(in oklab, var(--pl-bright) 22%, transparent), transparent 70%); pointer-events: none; }
.pl-price-head { position: relative; }
.pl-price-pill { display: inline-block; font-family: ui-monospace, monospace; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; background: var(--pl-light); color: var(--pl-mid); padding: 4px 10px; border-radius: 999px; border: 1px solid var(--pl-light-b); margin-bottom: 1.25rem; }
.pl-price-name { font-family: Georgia, serif; font-size: 24px; font-weight: 500; color: var(--pl-text); }
.pl-price-tag { font-size: 13px; color: var(--pl-muted); margin-top: 2px; }
.pl-price-amount { display: flex; align-items: flex-start; gap: 4px; margin: 1.5rem 0 1rem; }
.pl-price-currency { font-family: Georgia, serif; font-size: 28px; color: var(--pl-text); margin-top: 8px; font-weight: 500; }
.pl-price-number { font-family: Georgia, serif; font-size: 84px; line-height: .95; font-weight: 500; color: var(--pl-mid); letter-spacing: -0.04em; padding-right: 4px; }
.pl-price-per { display: flex; flex-direction: column; justify-content: flex-end; padding-bottom: 8px; margin-left: 4px; }
.pl-price-per span { font-size: 16px; color: var(--pl-text-2); }
.pl-price-per small { font-size: 11.5px; color: var(--pl-muted); font-family: ui-monospace, monospace; margin-top: 2px; }
.pl-price-divider { height: 1px; background: var(--pl-border); margin: .25rem 0 1.25rem; }
.pl-price-list { list-style: none; padding: 0; margin: 0 0 1.5rem; display: grid; gap: 8px; }
.pl-price-item { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--pl-text); }
.pl-price-tick { width: 18px; height: 18px; border-radius: 50%; background: var(--pl-light); color: var(--pl-mid); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pl-price-fine { margin-top: .9rem; text-align: center; font-size: 12px; color: var(--pl-muted); display: inline-flex; width: 100%; justify-content: center; gap: 6px; flex-wrap: wrap; align-items: center; }
.pl-price-foot { margin-top: 1.5rem; display: flex; flex-wrap: wrap; gap: 16px 28px; justify-content: center; font-size: 12.5px; color: var(--pl-muted); }
.pl-price-foot span { display: inline-flex; align-items: center; gap: 8px; }
.pl-price-foot svg { color: var(--pl-mid); }

/* Testimonials */
.pl-section-testi { background: var(--pl-bg-2); border-top: 1px solid var(--pl-border); border-bottom: 1px solid var(--pl-border); }
.pl-testi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.pl-testi-card { background: var(--pl-bg); border: 1px solid var(--pl-border); border-radius: var(--pl-r-lg); padding: 1.6rem; transition: transform .2s ease, box-shadow .2s ease; animation: pl-fade-up .6s ease both; }
.pl-testi-card:hover { transform: translateY(-2px); box-shadow: var(--pl-shadow-2); }
.pl-stat-card { display: flex; flex-direction: column; }
.pl-stat-card-num { font-family: Georgia, serif; font-size: clamp(34px, 3.2vw, 48px); font-weight: 500; line-height: 1.05; letter-spacing: -0.025em; color: var(--pl-mid); margin-bottom: .5rem; white-space: nowrap; }
.pl-stat-card-label { font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--pl-mid); margin-bottom: .9rem; }
.pl-stat-card-body { font-size: 14px; line-height: 1.55; color: var(--pl-text-2); margin: 0 0 1.25rem; flex: 1; }
.pl-stat-card-source { font-family: ui-monospace, monospace; font-size: 11px; color: var(--pl-muted); padding-top: .85rem; border-top: 1px solid var(--pl-border); }
@media (max-width: 1000px) { .pl-testi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .pl-testi-grid { grid-template-columns: 1fr; } }

/* FAQ */
.pl-section-faq { background: var(--pl-bg); }
.pl-faq-layout { display: grid; grid-template-columns: 1fr 1.6fr; gap: 4rem; align-items: start; }
.pl-faq-head { position: sticky; top: 96px; }
.pl-faq-head a { color: var(--pl-mid); }
.pl-faq-list { display: flex; flex-direction: column; }
.pl-faq-item { border-bottom: 1px solid var(--pl-border); }
.pl-faq-item:first-child { border-top: 1px solid var(--pl-border); }
.pl-faq-q { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 1.25rem 0; background: transparent; border: 0; cursor: pointer; font-family: Georgia, serif; font-size: 16px; font-weight: 500; color: var(--pl-text); text-align: left; transition: color .18s; }
.pl-faq-q:hover { color: var(--pl-mid); }
.pl-faq-icon { width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--pl-border); display: inline-flex; align-items: center; justify-content: center; color: var(--pl-text-2); transition: transform .25s ease, background .2s, color .2s; flex-shrink: 0; }
.pl-faq-open .pl-faq-icon { transform: rotate(180deg); background: var(--pl-light); border-color: var(--pl-light-b); color: var(--pl-mid); }
.pl-faq-a-wrap { overflow: hidden; transition: max-height .3s ease; }
.pl-faq-a { font-size: 14px; color: var(--pl-text-2); line-height: 1.65; padding: 0 0 1.25rem; max-width: 60ch; }
@media (max-width: 880px) { .pl-faq-layout { grid-template-columns: 1fr; gap: 1.5rem; } .pl-faq-head { position: static; } }

/* Final CTA */
.pl-section-final { padding: 4rem 1.5rem 6rem; background: var(--pl-bg); }
.pl-final-card { position: relative; max-width: 920px; margin: 0 auto; border-radius: var(--pl-r-xl); padding: 4rem 2rem; text-align: center; color: white; background: linear-gradient(135deg, #2A5808 0%, var(--pl-dark) 60%, #0a1d02 100%); overflow: hidden; isolation: isolate; }
.pl-final-bg { position: absolute; inset: 0; pointer-events: none; }
.pl-final-glow { position: absolute; top: -150px; left: -10%; width: 60%; height: 400px; background: radial-gradient(closest-side, color-mix(in oklab, var(--pl-bright) 50%, transparent), transparent 70%); filter: blur(40px); }
.pl-final-grid { position: absolute; inset: 0; background-image: linear-gradient(to right, rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.04) 1px, transparent 1px); background-size: 40px 40px; mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, #000, transparent 80%); }
.pl-final-card .pl-mark-1 { fill: rgba(255,255,255,.45); }
.pl-final-card .pl-mark-2 { fill: rgba(255,255,255,.7); }
.pl-final-card .pl-mark-3 { fill: #ffffff; }
.pl-final-card .pl-mark-text-1 { fill: #ffffff; }
.pl-final-card .pl-mark-text-2 { fill: rgba(255,255,255,.7); }
.pl-final-title { font-family: Georgia, serif; font-size: clamp(28px, 4vw, 44px); font-weight: 500; margin: 1.25rem 0 .75rem; letter-spacing: -0.02em; line-height: 1.1; text-wrap: balance; }
.pl-final-sub { font-size: 17px; opacity: .82; margin: 0 auto 2rem; max-width: 480px; line-height: 1.55; }
.pl-final-meta { margin-top: 1.25rem; font-size: 12.5px; opacity: .75; display: inline-flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: center; }
.pl-final-card .pl-meta-check { color: var(--pl-bright); }
.pl-final-card .pl-meta-check-bg { fill: rgba(143,203,60,.25); }

/* Footer */
.pl-footer { border-top: 1px solid var(--pl-border); background: var(--pl-bg-3); padding: 1.75rem 1.5rem; }
.pl-footer-inner { max-width: 1140px; margin: 0 auto; display: flex; align-items: center; flex-wrap: wrap; gap: 16px; }
.pl-footer-text { font-size: 12.5px; color: var(--pl-muted); margin-left: 1rem; }
.pl-footer-links { margin-left: auto; display: flex; gap: 20px; }
.pl-footer-links a { font-size: 12.5px; color: var(--pl-muted); text-decoration: none; transition: color .18s; }
.pl-footer-links a:hover { color: var(--pl-text); }

@keyframes pl-fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { .proflet-lp *, .proflet-lp *::before, .proflet-lp *::after { animation: none !important; transition: none !important; } }
    `}</style>
  )
}
