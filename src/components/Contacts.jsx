import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

/**
 * Proflet — Contacts page
 *
 * Drop-in component matched to the Proflet landing/dashboard design system.
 * Same CSS variable system, same Georgia + ui-monospace type pairing,
 * same brand greens, same card vocabulary. Light + dark via prefers-color-scheme.
 *
 * Functionally identical to the previous Contacts: same Supabase calls,
 * same form fields, same filters, same tel:/mailto: handling.
 */

const CONTACT_TYPES = ['Tenant', 'Contractor', 'Letting agent', 'Solicitor', 'Mortgage broker', 'Accountant', 'Insurance broker', 'Other']

// Each contact type has its own tone — keys map into the colour vocabulary
// established by the rest of the app.
const TYPE_TONE = {
  'Tenant':           'green',
  'Contractor':       'blue',
  'Letting agent':    'amber',
  'Solicitor':        'purple',
  'Mortgage broker':  'teal',
  'Accountant':       'red',
  'Insurance broker': 'indigo',
  'Other':            'grey',
}

const EMPTY_FORM = {
  type: 'Tenant',
  name: '',
  company: '',
  email: '',
  phone: '',
  address: '',
  notes: ''
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).map(s => s[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export default function Contacts({ session, contacts, reload }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!showForm) return
    const onKey = (e) => { if (e.key === 'Escape') setShowForm(false) }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [showForm])

  const filtered = contacts
    .filter(c => filterType === 'all' || c.type === filterType)
    .filter(c => {
      if (!search) return true
      const q = search.toLowerCase()
      return (c.name || '').toLowerCase().includes(q)
        || (c.company || '').toLowerCase().includes(q)
        || (c.email || '').toLowerCase().includes(q)
    })
    .slice()
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  function openAdd() { setForm({ ...EMPTY_FORM }); setEditing(null); setShowForm(true) }
  function openEdit(c) { setForm({ ...EMPTY_FORM, ...c }); setEditing(c.id); setShowForm(true) }
  function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  async function save() {
    if (!form.name) { alert('Name is required'); return }
    setSaving(true)
    const payload = {
      type: form.type,
      name: form.name,
      company: form.company || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      notes: form.notes || null,
      user_id: session.user.id
    }
    if (editing) await supabase.from('contacts').update(payload).eq('id', editing)
    else         await supabase.from('contacts').insert(payload)
    setSaving(false)
    setShowForm(false)
    setForm({ ...EMPTY_FORM })
    setEditing(null)
    reload()
  }

  async function del(id) {
    if (!confirm('Remove this contact?')) return
    await supabase.from('contacts').delete().eq('id', id)
    reload()
  }

  const counts = CONTACT_TYPES.reduce((acc, t) => {
    acc[t] = contacts.filter(c => c.type === t).length
    return acc
  }, {})

  return (
    <div className="pf-contacts">
      <Styles />

      {/* Page head */}
      <div className="pf-page-head">
        <div>
          <div className="pf-eyebrow">Contacts</div>
          <h1 className="pf-page-title">Your network of people</h1>
          <div className="pf-page-sub">{contacts.length} contact{contacts.length === 1 ? '' : 's'} across the portfolio</div>
        </div>
        <button className="pf-cta pf-cta-primary" onClick={openAdd}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <span>Add contact</span>
        </button>
      </div>

      {/* Clickable filter chips (formerly "summary cards") */}
      <div className="pf-type-chips">
        <button
          className={`pf-type-chip pf-type-chip-all ${filterType === 'all' ? 'pf-type-chip-active' : ''}`}
          onClick={() => setFilterType('all')}
        >
          <span className="pf-type-chip-count">{contacts.length}</span>
          <span className="pf-type-chip-label">All</span>
        </button>
        {CONTACT_TYPES.map(t => (
          <button
            key={t}
            className={`pf-type-chip pf-type-chip-${TYPE_TONE[t]} ${filterType === t ? 'pf-type-chip-active' : ''}`}
            onClick={() => setFilterType(filterType === t ? 'all' : t)}
          >
            <span className="pf-type-chip-count">{counts[t] || 0}</span>
            <span className="pf-type-chip-label">{t}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="pf-search-row">
        <div className="pf-search">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="pf-search-icon">
            <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, company or email…"
            className="pf-search-input"
          />
          {search && (
            <button className="pf-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>
        <div className="pf-search-meta">
          {filtered.length} of {contacts.length}
        </div>
      </div>

      {/* Cards */}
      {!filtered.length ? (
        <div className="pf-empty-card">
          <div className="pf-empty-icon">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="8" r="4"/>
              <path d="M4 18c0-3 3-5 7-5s7 2 7 5"/>
            </svg>
          </div>
          <div className="pf-empty-title">{contacts.length ? 'No contacts match these filters' : 'No contacts yet'}</div>
          <div className="pf-empty-sub">{contacts.length ? 'Try clearing your search or filter.' : 'Add tenants, contractors, brokers and anyone else you need to keep track of.'}</div>
          {!contacts.length && (
            <button className="pf-cta pf-cta-primary pf-cta-sm" onClick={openAdd} style={{ marginTop: 16 }}>
              <span>+ Add your first contact</span>
            </button>
          )}
        </div>
      ) : (
        <div className="pf-card-grid">
          {filtered.map(c => {
            const tone = TYPE_TONE[c.type] || 'grey'
            return (
              <article key={c.id} className={`pf-contact-card pf-card-tone-${tone}`}>
                <div className="pf-contact-glow" aria-hidden="true" />

                <header className="pf-contact-head">
                  <div className={`pf-avatar pf-avatar-${tone}`}>{initials(c.name)}</div>
                  <div className="pf-contact-id">
                    <div className="pf-contact-name">{c.name}</div>
                    {c.company && <div className="pf-contact-company">{c.company}</div>}
                  </div>
                  <span className={`pf-tag pf-tag-${tone}`}>
                    <span className="pf-tag-dot" />
                    {c.type}
                  </span>
                </header>

                <div className="pf-contact-body">
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="pf-contact-line">
                      <span className="pf-contact-icon">
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="3" width="10" height="8" rx="1"/>
                          <path d="M2.5 4l4.5 3.5L11.5 4"/>
                        </svg>
                      </span>
                      <span className="pf-contact-text">{c.email}</span>
                    </a>
                  )}
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="pf-contact-line">
                      <span className="pf-contact-icon">
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 2.5h2l1 2.5-1.2.9a7 7 0 003.3 3.3l.9-1.2L11.5 9V11a1 1 0 01-1.1 1A9 9 0 012 3.6 1 1 0 013 2.5z"/>
                        </svg>
                      </span>
                      <span className="pf-contact-text">{c.phone}</span>
                    </a>
                  )}
                  {c.address && (
                    <div className="pf-contact-line pf-contact-line-plain">
                      <span className="pf-contact-icon">
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 12.5c2.5-3 4-5 4-7a4 4 0 10-8 0c0 2 1.5 4 4 7z"/>
                          <circle cx="7" cy="5.5" r="1.4"/>
                        </svg>
                      </span>
                      <span className="pf-contact-text">{c.address}</span>
                    </div>
                  )}
                </div>

                {c.notes && <div className="pf-contact-notes">{c.notes}</div>}

                <footer className="pf-contact-foot">
                  <button className="pf-btn-edit" onClick={() => openEdit(c)}>Edit</button>
                  <button className="pf-btn-delete" onClick={() => del(c.id)}>Remove</button>
                </footer>
              </article>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="pf-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="pf-modal">
            <div className="pf-modal-glow" aria-hidden="true" />

            <div className="pf-modal-head">
              <div>
                <div className="pf-eyebrow">{editing ? 'Edit contact' : 'New contact'}</div>
                <h2 className="pf-modal-title">{editing ? 'Edit contact' : 'Add a contact'}</h2>
              </div>
              <button className="pf-modal-close" onClick={() => setShowForm(false)} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="pf-form-grid">
              <Field label="Type" full>
                <div className="pf-type-radio">
                  {CONTACT_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`pf-type-radio-btn pf-type-radio-${TYPE_TONE[t]} ${form.type === t ? 'pf-type-radio-active' : ''}`}
                      onClick={() => setField('type', t)}
                    >
                      <span className="pf-tag-dot" />
                      {t}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Name" required full>
                <input
                  type='text'
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder='Jane Smith'
                  className="pf-input"
                  autoFocus
                />
              </Field>

              <Field label="Company">
                <input type='text' value={form.company} onChange={e => setField('company', e.target.value)} placeholder='Smith & Co' className="pf-input" />
              </Field>

              <Field label="Email">
                <input type='email' value={form.email} onChange={e => setField('email', e.target.value)} placeholder='jane@example.com' className="pf-input" />
              </Field>

              <Field label="Phone" full>
                <input type='tel' value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder='07700 900 000' className="pf-input" />
              </Field>

              <Field label="Address" full>
                <input type='text' value={form.address} onChange={e => setField('address', e.target.value)} placeholder='Optional' className="pf-input" />
              </Field>

              <Field label="Notes" full>
                <textarea
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                  rows={3}
                  placeholder='Anything to remember…'
                  className="pf-input pf-textarea"
                />
              </Field>
            </div>

            <div className="pf-modal-foot">
              <button className="pf-cta pf-cta-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="pf-cta pf-cta-primary" onClick={save} disabled={saving}>
                <span>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add contact'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, required, full, children }) {
  return (
    <div className={`pf-field ${full ? 'pf-field-full' : ''}`}>
      <label className="pf-field-label">{label}{required && <span className="pf-req">*</span>}</label>
      {children}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Styles                                                                   */
/* ──────────────────────────────────────────────────────────────────────── */

function Styles() {
  return (
    <style>{`
.pf-contacts {
  --pl-dark:    #173404;
  --pl-mid:     #3B6D11;
  --pl-bright:  #639922;
  --pl-light:   #EAF3DE;
  --pl-light-b: #C8E6A0;

  --pl-bg:      oklch(98.5% 0.005 110);
  --pl-bg-2:    #ffffff;
  --pl-bg-3:    oklch(96.5% 0.012 120);
  --pl-text:    oklch(20% 0.015 145);
  --pl-text-2:  oklch(38% 0.012 145);
  --pl-muted:   oklch(52% 0.010 140);
  --pl-border:  oklch(92% 0.008 130);
  --pl-border-2:oklch(88% 0.012 130);
  --pl-shadow-1: 0 1px 2px rgba(20,40,10,.04), 0 4px 18px -8px rgba(20,40,10,.10);
  --pl-shadow-2: 0 2px 6px rgba(20,40,10,.06), 0 18px 60px -20px rgba(20,40,10,.18);
  --pl-shadow-3: 0 30px 100px -30px rgba(20,40,10,.32), 0 4px 12px rgba(20,40,10,.06);

  /* Per-type tone palette */
  --t-green-fg:   #27500A;  --t-green-bg:   #EAF3DE;  --t-green-bd:   #C8E6A0;
  --t-blue-fg:    #0C447C;  --t-blue-bg:    #E6F1FB;  --t-blue-bd:    #BCD7F0;
  --t-amber-fg:   #B45309;  --t-amber-bg:   #FEF3C7;  --t-amber-bd:   #FDE68A;
  --t-purple-fg:  #5B21B6;  --t-purple-bg:  #EDE9FE;  --t-purple-bd:  #C4B5FD;
  --t-teal-fg:    #0F766E;  --t-teal-bg:    #CCFBF1;  --t-teal-bd:    #99F6E4;
  --t-red-fg:     #B91C1C;  --t-red-bg:     #FEE2E2;  --t-red-bd:     #FECACA;
  --t-indigo-fg:  #3730A3;  --t-indigo-bg:  #E0E7FF;  --t-indigo-bd:  #C7D2FE;
  --t-grey-fg:    #4B5563;  --t-grey-bg:    #F1F5F1;  --t-grey-bd:    #E5E7EB;

  font-family: Georgia, 'Times New Roman', serif;
  color: var(--pl-text);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

@media (prefers-color-scheme: dark) {
  .pf-contacts {
    --pl-bg:      oklch(16% 0.020 145);
    --pl-bg-2:    oklch(19% 0.022 145);
    --pl-bg-3:    oklch(14% 0.018 145);
    --pl-text:    oklch(96% 0.012 110);
    --pl-text-2:  oklch(82% 0.015 120);
    --pl-muted:   oklch(65% 0.018 130);
    --pl-border:  oklch(28% 0.020 145);
    --pl-border-2:oklch(34% 0.022 145);
    --pl-bright:  #8FCB3C;
    --pl-mid:     #6FAD2A;
    --pl-light:   oklch(28% 0.040 130);
    --pl-light-b: oklch(34% 0.050 130);
    --pl-shadow-1: 0 1px 2px rgba(0,0,0,.4), 0 4px 18px -8px rgba(0,0,0,.5);
    --pl-shadow-2: 0 2px 6px rgba(0,0,0,.4), 0 18px 60px -20px rgba(0,0,0,.6);
    --pl-shadow-3: 0 30px 100px -30px rgba(0,0,0,.7), 0 4px 12px rgba(0,0,0,.4);

    --t-green-fg:   #C8E6A0;  --t-green-bg:   oklch(28% 0.06 130); --t-green-bd:   oklch(38% 0.08 130);
    --t-blue-fg:    #93C5FD;  --t-blue-bg:    oklch(28% 0.08 240); --t-blue-bd:    oklch(38% 0.10 240);
    --t-amber-fg:   #FCD34D;  --t-amber-bg:   oklch(28% 0.08 70);  --t-amber-bd:   oklch(38% 0.10 70);
    --t-purple-fg:  #C4B5FD;  --t-purple-bg:  oklch(28% 0.10 290); --t-purple-bd:  oklch(38% 0.12 290);
    --t-teal-fg:    #5EEAD4;  --t-teal-bg:    oklch(28% 0.08 190); --t-teal-bd:    oklch(38% 0.10 190);
    --t-red-fg:     #FCA5A5;  --t-red-bg:     oklch(28% 0.10 25);  --t-red-bd:     oklch(38% 0.12 25);
    --t-indigo-fg:  #A5B4FC;  --t-indigo-bg:  oklch(28% 0.10 270); --t-indigo-bd:  oklch(38% 0.12 270);
    --t-grey-fg:    #D1D5DB;  --t-grey-bg:    oklch(24% 0.010 150); --t-grey-bd:    oklch(32% 0.012 150);
  }
}

.pf-contacts * { box-sizing: border-box; }

/* Eyebrow */
.pf-eyebrow {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--pl-mid);
  margin-bottom: .5rem;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.pf-eyebrow::before {
  content: '';
  width: 18px; height: 1px;
  background: currentColor;
  display: inline-block;
  opacity: .5;
}

/* Page head */
.pf-page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 1.5rem;
}
.pf-page-title {
  font-family: Georgia, serif;
  font-weight: 500;
  font-size: clamp(22px, 2.4vw, 28px);
  line-height: 1.15;
  letter-spacing: -0.015em;
  color: var(--pl-text);
  margin: 0 0 .25rem;
}
.pf-page-sub {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 12px;
  color: var(--pl-muted);
  letter-spacing: .02em;
}

/* CTAs */
.pf-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: Georgia, serif;
  font-weight: 500;
  font-size: 14px;
  border: 0;
  cursor: pointer;
  border-radius: 999px;
  padding: 10px 20px;
  transition: transform .18s ease, box-shadow .18s ease, background .18s ease, color .18s, border-color .18s;
  white-space: nowrap;
  letter-spacing: -0.005em;
}
.pf-cta-sm { font-size: 13px; padding: 8px 16px; }
.pf-cta-primary {
  color: white;
  background: linear-gradient(180deg, var(--pl-bright) 0%, var(--pl-mid) 100%);
  box-shadow:
    0 1px 0 rgba(255,255,255,.25) inset,
    0 -1px 0 rgba(0,0,0,.15) inset,
    0 8px 22px -8px rgba(59,109,17,.55),
    0 2px 4px rgba(20,40,10,.18);
}
.pf-cta-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow:
    0 1px 0 rgba(255,255,255,.3) inset,
    0 -1px 0 rgba(0,0,0,.18) inset,
    0 14px 30px -10px rgba(59,109,17,.7),
    0 3px 6px rgba(20,40,10,.22);
}
.pf-cta-primary:disabled { opacity: .65; cursor: default; }
.pf-cta-ghost {
  background: transparent;
  color: var(--pl-text-2);
  border: 1px solid var(--pl-border-2);
}
.pf-cta-ghost:hover { background: var(--pl-bg-3); color: var(--pl-text); }

/* Type chip filters */
.pf-type-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 1rem;
}
.pf-type-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--pl-bg-2);
  border: 1px solid var(--pl-border);
  border-radius: 999px;
  padding: 6px 14px 6px 8px;
  cursor: pointer;
  font-family: Georgia, serif;
  font-size: 13px;
  color: var(--pl-text-2);
  transition: all .18s ease;
}
.pf-type-chip:hover { border-color: var(--pl-border-2); transform: translateY(-1px); box-shadow: var(--pl-shadow-1); }
.pf-type-chip-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  padding: 0 6px;
  height: 22px;
  border-radius: 999px;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 11px;
  font-weight: 500;
  background: var(--pl-bg-3);
  color: var(--pl-text);
  letter-spacing: -0.005em;
}
.pf-type-chip-label { letter-spacing: -0.005em; }

.pf-type-chip-all.pf-type-chip-active { background: var(--pl-light); border-color: var(--pl-light-b); color: var(--pl-mid); }
.pf-type-chip-all.pf-type-chip-active .pf-type-chip-count { background: var(--pl-mid); color: white; }

/* Per-type active states */
${['green','blue','amber','purple','teal','red','indigo','grey'].map(tone => `
.pf-type-chip-${tone}.pf-type-chip-active {
  background: var(--t-${tone}-bg);
  border-color: var(--t-${tone}-bd);
  color: var(--t-${tone}-fg);
}
.pf-type-chip-${tone}.pf-type-chip-active .pf-type-chip-count {
  background: var(--t-${tone}-fg);
  color: white;
}
`).join('')}

/* Search */
.pf-search-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}
.pf-search {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 240px;
  max-width: 480px;
  background: var(--pl-bg-2);
  border: 1px solid var(--pl-border);
  border-radius: 999px;
  padding: 0 12px;
  transition: border-color .18s, box-shadow .18s;
}
.pf-search:focus-within { border-color: var(--pl-mid); box-shadow: 0 0 0 3px color-mix(in oklab, var(--pl-mid) 18%, transparent); }
.pf-search-icon { color: var(--pl-muted); flex-shrink: 0; }
.pf-search-input {
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  font-family: Georgia, serif;
  font-size: 13.5px;
  color: var(--pl-text);
  padding: 10px 12px;
}
.pf-search-input::placeholder { color: var(--pl-muted); }
.pf-search-clear {
  background: var(--pl-bg-3);
  border: 0;
  border-radius: 50%;
  width: 20px; height: 20px;
  cursor: pointer;
  color: var(--pl-muted);
  display: inline-flex; align-items: center; justify-content: center;
  transition: color .18s, background .18s;
}
.pf-search-clear:hover { color: var(--pl-text); background: var(--pl-border); }
.pf-search-meta {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: var(--pl-muted);
  letter-spacing: .04em;
}

/* Cards grid */
.pf-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 12px;
}
.pf-contact-card {
  position: relative;
  background: var(--pl-bg-2);
  border: 1px solid var(--pl-border);
  border-radius: 16px;
  padding: 1.25rem 1.25rem 1.1rem;
  box-shadow: var(--pl-shadow-1);
  overflow: hidden;
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
  display: flex;
  flex-direction: column;
  gap: .85rem;
}
.pf-contact-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--pl-shadow-2);
}
.pf-contact-glow {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 70% 50% at 50% 0%, color-mix(in oklab, currentColor 10%, transparent), transparent 70%);
  pointer-events: none;
  opacity: 0;
  transition: opacity .25s ease;
}
.pf-contact-card:hover .pf-contact-glow { opacity: 1; }

${['green','blue','amber','purple','teal','red','indigo','grey'].map(tone => `
.pf-card-tone-${tone} { color: var(--t-${tone}-fg); }
.pf-card-tone-${tone}:hover { border-color: var(--t-${tone}-bd); }
.pf-card-tone-${tone}::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--t-${tone}-fg), color-mix(in oklab, var(--t-${tone}-fg) 60%, transparent));
  opacity: 0;
  transition: opacity .2s;
}
.pf-card-tone-${tone}:hover::before { opacity: .8; }
`).join('')}

.pf-contact-head {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}
.pf-avatar {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: Georgia, serif;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: -0.01em;
  border: 1px solid;
  position: relative;
}
.pf-avatar::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255,255,255,.45), rgba(255,255,255,0) 60%);
  pointer-events: none;
}
${['green','blue','amber','purple','teal','red','indigo','grey'].map(tone => `
.pf-avatar-${tone} {
  background: linear-gradient(135deg, color-mix(in oklab, var(--t-${tone}-fg) 18%, var(--t-${tone}-bg)) 0%, var(--t-${tone}-bg) 100%);
  color: var(--t-${tone}-fg);
  border-color: var(--t-${tone}-bd);
}
`).join('')}

.pf-contact-id { flex: 1; min-width: 0; color: var(--pl-text); }
.pf-contact-name {
  font-family: Georgia, serif;
  font-weight: 500;
  font-size: 15px;
  letter-spacing: -0.005em;
  color: var(--pl-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pf-contact-company {
  font-family: ui-monospace, monospace;
  font-size: 11.5px;
  color: var(--pl-muted);
  margin-top: 1px;
  letter-spacing: .02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Type tag */
.pf-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: ui-monospace, monospace;
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: .04em;
  text-transform: uppercase;
  padding: 3px 9px 3px 7px;
  border-radius: 999px;
  border: 1px solid transparent;
  white-space: nowrap;
  flex-shrink: 0;
}
.pf-tag-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
${['green','blue','amber','purple','teal','red','indigo','grey'].map(tone => `
.pf-tag-${tone} { color: var(--t-${tone}-fg); background: var(--t-${tone}-bg); border-color: var(--t-${tone}-bd); }
`).join('')}

.pf-contact-body { display: flex; flex-direction: column; gap: 5px; color: var(--pl-text); }
.pf-contact-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--pl-text-2);
  text-decoration: none;
  padding: 4px 0;
  border-radius: 6px;
  transition: color .18s;
}
a.pf-contact-line:hover { color: var(--pl-mid); }
.pf-contact-icon {
  width: 22px; height: 22px;
  border-radius: 7px;
  background: var(--pl-bg-3);
  color: var(--pl-muted);
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
a.pf-contact-line:hover .pf-contact-icon { background: var(--pl-light); color: var(--pl-mid); }
.pf-contact-line-plain { color: var(--pl-text-2); }
.pf-contact-text {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  letter-spacing: .01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.pf-contact-notes {
  font-style: italic;
  font-family: Georgia, serif;
  font-size: 13px;
  color: var(--pl-text-2);
  background: var(--pl-bg-3);
  border-left: 2px solid var(--pl-light-b);
  padding: 8px 12px;
  border-radius: 0 8px 8px 0;
  line-height: 1.5;
}

.pf-contact-foot {
  display: flex;
  gap: 6px;
  margin-top: auto;
  padding-top: .6rem;
  border-top: 1px solid var(--pl-border);
}
.pf-btn-edit, .pf-btn-delete {
  font-family: Georgia, serif;
  font-size: 12px;
  background: transparent;
  border: 1px solid var(--pl-border);
  border-radius: 999px;
  padding: 4px 12px;
  cursor: pointer;
  transition: color .18s, background .18s, border-color .18s;
}
.pf-btn-edit { color: var(--pl-mid); border-color: var(--pl-light-b); background: color-mix(in oklab, var(--pl-light) 50%, transparent); }
.pf-btn-edit:hover { background: var(--pl-light); }
.pf-btn-delete { color: var(--pl-muted); margin-left: auto; }
.pf-btn-delete:hover { color: var(--t-red-fg); border-color: color-mix(in oklab, var(--t-red-fg) 35%, var(--pl-border)); background: color-mix(in oklab, var(--t-red-bg) 35%, transparent); }

/* Empty state */
.pf-empty-card {
  background: var(--pl-bg-2);
  border: 1px solid var(--pl-border);
  border-radius: 16px;
  padding: 4rem 1.5rem;
  text-align: center;
  box-shadow: var(--pl-shadow-1);
  display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.pf-empty-icon {
  width: 56px; height: 56px;
  border-radius: 16px;
  background: var(--pl-light);
  border: 1px solid var(--pl-light-b);
  color: var(--pl-mid);
  display: inline-flex; align-items: center; justify-content: center;
  margin-bottom: .85rem;
}
.pf-empty-title { font-family: Georgia, serif; font-size: 17px; color: var(--pl-text); font-weight: 500; letter-spacing: -0.005em; }
.pf-empty-sub { font-size: 13px; color: var(--pl-muted); max-width: 340px; }

/* Modal */
.pf-modal-backdrop {
  position: fixed; inset: 0;
  background: color-mix(in oklab, var(--pl-text) 50%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1000;
  animation: pf-fade .2s ease both;
  overflow-y: auto;
}
.pf-modal {
  position: relative;
  background: var(--pl-bg-2);
  border: 1px solid var(--pl-border-2);
  border-radius: 22px;
  padding: 1.75rem;
  width: 100%;
  max-width: 560px;
  box-shadow: var(--pl-shadow-3);
  overflow: hidden;
  animation: pf-pop .25s ease both;
}
.pf-modal-glow {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 80% 40% at 50% 0%, color-mix(in oklab, var(--pl-bright) 18%, transparent), transparent 70%);
  pointer-events: none;
}
.pf-modal-head {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 1.5rem;
}
.pf-modal-title {
  font-family: Georgia, serif;
  font-size: 22px;
  font-weight: 500;
  color: var(--pl-text);
  letter-spacing: -0.015em;
  margin: 0;
}
.pf-modal-close {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: var(--pl-bg-3);
  border: 1px solid var(--pl-border);
  color: var(--pl-text-2);
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  transition: color .18s, background .18s, border-color .18s;
  flex-shrink: 0;
}
.pf-modal-close:hover { color: var(--pl-text); background: var(--pl-light); border-color: var(--pl-light-b); }

.pf-form-grid {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.pf-field { display: flex; flex-direction: column; gap: 5px; }
.pf-field-full { grid-column: 1 / -1; }
.pf-field-label {
  font-family: ui-monospace, monospace;
  font-size: 10.5px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--pl-muted);
}
.pf-req { color: var(--pl-mid); margin-left: 4px; }
.pf-input {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  font-family: Georgia, serif;
  font-size: 14px;
  color: var(--pl-text);
  background: var(--pl-bg);
  border: 1px solid var(--pl-border);
  border-radius: 10px;
  padding: 10px 14px;
  outline: none;
  transition: border-color .18s, box-shadow .18s, background .18s;
  color-scheme: light dark;
}
.pf-input:focus {
  border-color: var(--pl-mid);
  background: var(--pl-bg-2);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--pl-mid) 18%, transparent);
}
.pf-textarea { font-family: Georgia, serif; line-height: 1.55; min-height: 80px; resize: vertical; }

/* Type radio (colour-coded) */
.pf-type-radio {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pf-type-radio-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: .04em;
  text-transform: uppercase;
  padding: 6px 12px 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--pl-border);
  background: var(--pl-bg-2);
  color: var(--pl-text-2);
  cursor: pointer;
  transition: all .18s ease;
}
.pf-type-radio-btn:hover { border-color: var(--pl-border-2); color: var(--pl-text); }
${['green','blue','amber','purple','teal','red','indigo','grey'].map(tone => `
.pf-type-radio-${tone}.pf-type-radio-active {
  background: var(--t-${tone}-bg);
  color: var(--t-${tone}-fg);
  border-color: var(--t-${tone}-bd);
}
`).join('')}

.pf-modal-foot {
  position: relative;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--pl-border);
}

@media (max-width: 540px) {
  .pf-form-grid { grid-template-columns: 1fr; }
}

/* Animations */
@keyframes pf-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pf-pop  {
  from { opacity: 0; transform: translateY(8px) scale(.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .pf-contacts *, .pf-contacts *::before, .pf-contacts *::after {
    animation: none !important;
    transition: none !important;
  }
}
    `}</style>
  )
}
