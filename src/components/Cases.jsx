import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

/**
 * Proflet — Cases page
 *
 * Drop-in component matched to the Proflet landing/dashboard design system.
 * Same CSS variable system, same Georgia + ui-monospace type pairing,
 * same brand greens, same card vocabulary. Light + dark via prefers-color-scheme.
 *
 * Functionally identical to the previous Cases: same Supabase calls,
 * same form fields, same filters, inline status editor, same overdue logic.
 */

const CASE_TYPES = ['Maintenance', 'Insurance', 'Legal', 'Remortgage', 'Tenant issue', 'Inspection', 'Other']
const STATUSES = ['New', 'In Progress', 'Waiting', 'Closed']
const PRIORITIES = ['High', 'Medium', 'Low']

const EMPTY_FORM = {
  property_id: '',
  title: '',
  type: 'Maintenance',
  priority: 'Medium',
  status: 'New',
  target_date: '',
  contact_id: '',
  notes: ''
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const PRIORITY_KEY = { High: 'red', Medium: 'amber', Low: 'green' }
const STATUS_KEY   = { New: 'blue', 'In Progress': 'amber', Waiting: 'amber', Closed: 'grey' }

export default function Cases({ session, cases, props, contacts, reload }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('open')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterProp, setFilterProp] = useState('all')
  const [filterType, setFilterType] = useState('all')

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

  const today = new Date().toISOString().slice(0, 10)
  const propName = (id) => props.find(p => p.id === id)?.name || '—'
  const contactName = (id) => contacts?.find(c => c.id === id)?.name || ''

  const filtered = cases
    .filter(c => filterStatus === 'all' || (filterStatus === 'open' ? c.status !== 'Closed' : c.status === 'Closed'))
    .filter(c => filterPriority === 'all' || c.priority === filterPriority)
    .filter(c => filterProp === 'all' || c.property_id === filterProp)
    .filter(c => filterType === 'all' || c.type === filterType)
    .slice()
    .reverse()

  const open = cases.filter(c => c.status !== 'Closed').length
  const high = cases.filter(c => c.priority === 'High' && c.status !== 'Closed').length
  const overdue = cases.filter(c => c.status !== 'Closed' && c.target_date && c.target_date < today).length

  function openAdd() { setForm({ ...EMPTY_FORM }); setEditing(null); setShowForm(true) }
  function openEdit(c) { setForm({ ...EMPTY_FORM, ...c }); setEditing(c.id); setShowForm(true) }
  function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  async function save() {
    if (!form.title) { alert('Title is required'); return }
    setSaving(true)
    const payload = {
      title: form.title,
      type: form.type || null,
      property_id: form.property_id || null,
      priority: form.priority,
      status: form.status,
      target_date: form.target_date || null,
      contact_id: form.contact_id || null,
      notes: form.notes || null,
      user_id: session.user.id
    }
    if (editing) {
      await supabase.from('cases').update(payload).eq('id', editing)
    } else {
      await supabase.from('cases').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    setForm({ ...EMPTY_FORM })
    setEditing(null)
    reload()
  }

  async function del(id) {
    if (!confirm('Delete this case?')) return
    await supabase.from('cases').delete().eq('id', id)
    reload()
  }

  async function updateStatus(id, status) {
    await supabase.from('cases').update({ status }).eq('id', id)
    reload()
  }

  const filtersActive = filterStatus !== 'open' || filterPriority !== 'all' || filterProp !== 'all' || filterType !== 'all'

  return (
    <div className="pf-cases">
      <Styles />

      {/* Page head */}
      <div className="pf-page-head">
        <div>
          <div className="pf-eyebrow">Cases</div>
          <h1 className="pf-page-title">Issues & follow-ups across the portfolio</h1>
          <div className="pf-page-sub">{open} open · {cases.length} total</div>
        </div>
        <button className="pf-cta pf-cta-primary" onClick={openAdd}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <span>New case</span>
        </button>
      </div>

      {/* Metric cards */}
      <div className="pf-metric-grid">
        <MetricCard label="Open cases" value={open} accent="green" />
        <MetricCard label="High priority" value={high} accent={high > 0 ? 'red' : 'neutral'} alert={high > 0} />
        <MetricCard label="Overdue" value={overdue} accent={overdue > 0 ? 'red' : 'neutral'} alert={overdue > 0} />
        <MetricCard label="Total" value={cases.length} accent="neutral" />
      </div>

      {/* Filters */}
      <div className="pf-filters">
        <div className="pf-filter-group">
          <label className="pf-filter-label">Status</label>
          <div className="pf-select-wrap">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="pf-select">
              <option value='open'>Open cases</option>
              <option value='closed'>Closed cases</option>
              <option value='all'>All cases</option>
            </select>
            <Caret />
          </div>
        </div>
        <div className="pf-filter-group">
          <label className="pf-filter-label">Property</label>
          <div className="pf-select-wrap">
            <select value={filterProp} onChange={e => setFilterProp(e.target.value)} className="pf-select">
              <option value='all'>All properties</option>
              {props.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Caret />
          </div>
        </div>
        <div className="pf-filter-group">
          <label className="pf-filter-label">Priority</label>
          <div className="pf-select-wrap">
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="pf-select">
              <option value='all'>All priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <Caret />
          </div>
        </div>
        <div className="pf-filter-group">
          <label className="pf-filter-label">Type</label>
          <div className="pf-select-wrap">
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="pf-select">
              <option value='all'>All types</option>
              {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <Caret />
          </div>
        </div>
        <div className="pf-filter-meta">
          <span className="pf-filter-count">{filtered.length} of {cases.length}</span>
          {filtersActive && (
            <button className="pf-filter-clear" onClick={() => {
              setFilterStatus('open'); setFilterPriority('all'); setFilterProp('all'); setFilterType('all')
            }}>Clear</button>
          )}
        </div>
      </div>

      {/* Table card */}
      <div className="pf-table-card">
        <div className="pf-table-scroll">
          <table className="pf-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Property</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due</th>
                <th>Contact</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!filtered.length && (
                <tr className="pf-empty-row">
                  <td colSpan={8}>
                    <div className="pf-empty">
                      <div className="pf-empty-icon">
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="16" height="14" rx="2"/><path d="M3 9h16M8 4v14"/>
                        </svg>
                      </div>
                      <div className="pf-empty-title">{cases.length ? 'No cases match these filters' : 'No cases yet'}</div>
                      <div className="pf-empty-sub">{cases.length ? 'Try clearing filters to see everything.' : 'Log your first issue to start tracking it.'}</div>
                      {!cases.length && (
                        <button className="pf-cta pf-cta-primary pf-cta-sm" onClick={openAdd} style={{ marginTop: 16 }}>
                          <span>+ New case</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map(c => {
                const isOverdue = c.status !== 'Closed' && c.target_date && c.target_date < today
                return (
                  <tr key={c.id}>
                    <td className="pf-cell-title">
                      <div className="pf-title-main">{c.title}</div>
                      {c.notes && <div className="pf-title-notes">{c.notes}</div>}
                    </td>
                    <td className="pf-cell-mono">{propName(c.property_id)}</td>
                    <td>
                      {c.type
                        ? <span className="pf-chip">{c.type}</span>
                        : <span className="pf-cell-mono">—</span>}
                    </td>
                    <td>
                      <span className={`pf-badge pf-badge-${PRIORITY_KEY[c.priority] || 'grey'}`}>
                        <span className="pf-badge-dot" />
                        {c.priority || '—'}
                      </span>
                    </td>
                    <td>
                      <div className={`pf-status-select pf-badge-${STATUS_KEY[c.status] || 'grey'}`}>
                        <span className="pf-badge-dot" />
                        <select
                          value={c.status || 'New'}
                          onChange={e => updateStatus(c.id, e.target.value)}
                          aria-label="Update status"
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <Caret />
                      </div>
                    </td>
                    <td>
                      {c.target_date ? (
                        <span className={`pf-date ${isOverdue ? 'pf-date-overdue' : ''}`}>
                          {isOverdue && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                              <path d="M6 1.5l5 9H1l5-9zM6 5v2.5M6 8.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          {fmtDate(c.target_date)}
                        </span>
                      ) : <span className="pf-cell-mono">—</span>}
                    </td>
                    <td className="pf-cell-mono">{c.contact_id ? contactName(c.contact_id) : '—'}</td>
                    <td>
                      <div className="pf-row-actions">
                        <button className="pf-btn-edit" onClick={() => openEdit(c)}>Edit</button>
                        <button className="pf-btn-delete" onClick={() => del(c.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="pf-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="pf-modal">
            <div className="pf-modal-glow" aria-hidden="true" />

            <div className="pf-modal-head">
              <div>
                <div className="pf-eyebrow">{editing ? 'Edit case' : 'New case'}</div>
                <h2 className="pf-modal-title">{editing ? 'Edit case' : 'Log a new case'}</h2>
              </div>
              <button className="pf-modal-close" onClick={() => setShowForm(false)} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="pf-form-grid">
              <Field label="Title" required full>
                <input
                  type='text'
                  value={form.title}
                  onChange={e => setField('title', e.target.value)}
                  placeholder='e.g. Boiler repair needed'
                  className="pf-input"
                  autoFocus
                />
              </Field>

              <Field label="Property" full>
                <div className="pf-select-wrap">
                  <select value={form.property_id} onChange={e => setField('property_id', e.target.value)} className="pf-input">
                    <option value=''>— Select property —</option>
                    {props.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <Caret />
                </div>
              </Field>

              <Field label="Type">
                <div className="pf-select-wrap">
                  <select value={form.type} onChange={e => setField('type', e.target.value)} className="pf-input">
                    {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <Caret />
                </div>
              </Field>

              <Field label="Priority">
                <div className="pf-segmented" role="group" aria-label="Priority">
                  {['Low', 'Medium', 'High'].map(o => (
                    <button
                      type="button"
                      key={o}
                      onClick={() => setField('priority', o)}
                      className={`pf-seg pf-seg-${PRIORITY_KEY[o]} ${form.priority === o ? 'pf-seg-active' : ''}`}
                    >
                      <span className="pf-badge-dot" />
                      {o}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Status">
                <div className="pf-select-wrap">
                  <select value={form.status} onChange={e => setField('status', e.target.value)} className="pf-input">
                    {STATUSES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <Caret />
                </div>
              </Field>

              <Field label="Target date">
                <input type='date' value={form.target_date} onChange={e => setField('target_date', e.target.value)} className="pf-input" />
              </Field>

              <Field label="Assigned contact" full>
                <div className="pf-select-wrap">
                  <select value={form.contact_id} onChange={e => setField('contact_id', e.target.value)} className="pf-input">
                    <option value=''>— None —</option>
                    {(contacts || []).map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.type ? ` · ${c.type}` : ''}</option>
                    ))}
                  </select>
                  <Caret />
                </div>
              </Field>

              <Field label="Notes" full>
                <textarea
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                  rows={3}
                  placeholder='Describe the issue…'
                  className="pf-input pf-textarea"
                />
              </Field>
            </div>

            <div className="pf-modal-foot">
              <button className="pf-cta pf-cta-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="pf-cta pf-cta-primary" onClick={save} disabled={saving}>
                <span>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add case'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, accent, alert }) {
  return (
    <div className={`pf-metric pf-metric-${accent} ${alert ? 'pf-metric-alert' : ''}`}>
      <div className="pf-metric-accent" />
      <div className="pf-metric-label">{label}</div>
      <div className="pf-metric-value">{value}</div>
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

function Caret() {
  return (
    <svg className="pf-caret" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function Styles() {
  return (
    <style>{`
.pf-cases {
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

  /* Tones */
  --pf-red:    #C0392B;
  --pf-red-bg: #FCEBEB;
  --pf-red-bd: #F4C7C2;
  --pf-amber:    #B45309;
  --pf-amber-bg: #FEF3C7;
  --pf-amber-bd: #FDE68A;
  --pf-blue:    #0C447C;
  --pf-blue-bg: #E6F1FB;
  --pf-blue-bd: #BCD7F0;
  --pf-green:    var(--pl-mid);
  --pf-green-bg: var(--pl-light);
  --pf-green-bd: var(--pl-light-b);
  --pf-grey:    var(--pl-muted);
  --pf-grey-bg: var(--pl-bg-3);
  --pf-grey-bd: var(--pl-border);

  font-family: Georgia, 'Times New Roman', serif;
  color: var(--pl-text);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

@media (prefers-color-scheme: dark) {
  .pf-cases {
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

    --pf-red:    #FCA5A5;
    --pf-red-bg: oklch(28% 0.08 25);
    --pf-red-bd: oklch(38% 0.10 25);
    --pf-amber:    #FCD34D;
    --pf-amber-bg: oklch(28% 0.08 70);
    --pf-amber-bd: oklch(38% 0.10 70);
    --pf-blue:    #93C5FD;
    --pf-blue-bg: oklch(28% 0.08 240);
    --pf-blue-bd: oklch(38% 0.10 240);
    --pf-green:    var(--pl-bright);
    --pf-green-bg: var(--pl-light);
    --pf-green-bd: var(--pl-light-b);
    --pf-grey:    var(--pl-muted);
    --pf-grey-bg: var(--pl-bg-3);
    --pf-grey-bd: var(--pl-border);
  }
}

.pf-cases * { box-sizing: border-box; }

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
  margin-bottom: 1.75rem;
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

/* CTA */
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

/* Metric cards */
.pf-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 1.5rem;
}
.pf-metric {
  position: relative;
  background: var(--pl-bg-2);
  border: 1px solid var(--pl-border);
  border-radius: 14px;
  padding: 1.1rem 1.25rem 1rem;
  box-shadow: var(--pl-shadow-1);
  overflow: hidden;
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s;
}
.pf-metric:hover { transform: translateY(-1px); box-shadow: var(--pl-shadow-2); border-color: var(--pl-border-2); }
.pf-metric-accent {
  position: absolute; top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--pl-bright), var(--pl-mid));
  opacity: .9;
}
.pf-metric-red    .pf-metric-accent { background: linear-gradient(90deg, #E76A5C, var(--pf-red)); }
.pf-metric-green  .pf-metric-accent { background: linear-gradient(90deg, var(--pl-bright), var(--pl-mid)); }
.pf-metric-neutral .pf-metric-accent { background: linear-gradient(90deg, var(--pl-border-2), var(--pl-border)); opacity: .8; }
.pf-metric-alert .pf-metric-value { color: var(--pf-red); }
.pf-metric-label {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 11px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--pl-muted);
  margin-bottom: .5rem;
}
.pf-metric-value {
  font-family: Georgia, serif;
  font-size: 26px;
  font-weight: 500;
  color: var(--pl-text);
  letter-spacing: -0.015em;
  line-height: 1.1;
}
@media (max-width: 760px) { .pf-metric-grid { grid-template-columns: repeat(2, 1fr); } }

/* Filters */
.pf-filters {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.pf-filter-group { display: flex; flex-direction: column; gap: 4px; }
.pf-filter-label {
  font-family: ui-monospace, monospace;
  font-size: 10.5px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--pl-muted);
}
.pf-select-wrap { position: relative; display: inline-flex; align-items: center; }
.pf-select {
  appearance: none;
  -webkit-appearance: none;
  font-family: Georgia, serif;
  font-size: 13px;
  color: var(--pl-text);
  background: var(--pl-bg-2);
  border: 1px solid var(--pl-border);
  border-radius: 999px;
  padding: 7px 30px 7px 14px;
  cursor: pointer;
  outline: none;
  transition: border-color .18s, box-shadow .18s;
}
.pf-select:hover { border-color: var(--pl-border-2); }
.pf-select:focus { border-color: var(--pl-mid); box-shadow: 0 0 0 3px color-mix(in oklab, var(--pl-mid) 18%, transparent); }
.pf-caret {
  position: absolute;
  right: 12px;
  pointer-events: none;
  color: var(--pl-muted);
}
.pf-filter-meta { margin-left: auto; display: inline-flex; align-items: center; gap: 12px; }
.pf-filter-count {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: var(--pl-muted);
  letter-spacing: .04em;
}
.pf-filter-clear {
  font-family: Georgia, serif;
  font-size: 12px;
  color: var(--pl-mid);
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}
.pf-filter-clear:hover { background: var(--pl-light); }

/* Table card */
.pf-table-card {
  background: var(--pl-bg-2);
  border: 1px solid var(--pl-border);
  border-radius: 16px;
  box-shadow: var(--pl-shadow-1);
  overflow: hidden;
}
.pf-table-scroll { overflow-x: auto; }
.pf-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}
.pf-table thead tr {
  background: var(--pl-bg-3);
  border-bottom: 1px solid var(--pl-border);
}
.pf-table th {
  text-align: left;
  padding: 11px 16px;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 10.5px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--pl-muted);
  font-weight: 500;
  white-space: nowrap;
}
.pf-table tbody tr {
  border-bottom: 1px solid var(--pl-border);
  transition: background .15s ease;
}
.pf-table tbody tr:last-child { border-bottom: 0; }
.pf-table tbody tr:hover { background: var(--pl-bg-3); }
.pf-table td {
  padding: 12px 16px;
  vertical-align: middle;
  font-size: 13.5px;
  color: var(--pl-text-2);
}
.pf-cell-title { max-width: 260px; }
.pf-title-main {
  font-family: Georgia, serif;
  font-weight: 500;
  color: var(--pl-text);
  letter-spacing: -0.005em;
}
.pf-title-notes {
  font-size: 11.5px;
  color: var(--pl-muted);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240px;
  font-style: italic;
}
.pf-cell-mono {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: var(--pl-text-2);
}
.pf-chip {
  display: inline-flex;
  align-items: center;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 999px;
  letter-spacing: .02em;
  white-space: nowrap;
  background: var(--pl-bg-3);
  color: var(--pl-text-2);
  border: 1px solid var(--pl-border);
}

/* Date / overdue */
.pf-date {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: var(--pl-text-2);
}
.pf-date-overdue {
  color: var(--pf-red);
  font-weight: 600;
  background: var(--pf-red-bg);
  border: 1px solid var(--pf-red-bd);
  padding: 2px 9px 2px 7px;
  border-radius: 999px;
}

/* Badges */
.pf-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  font-weight: 500;
  padding: 3px 10px 3px 8px;
  border-radius: 999px;
  letter-spacing: .02em;
  white-space: nowrap;
  border: 1px solid transparent;
}
.pf-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

.pf-badge-red    { color: var(--pf-red);   background: var(--pf-red-bg);   border-color: var(--pf-red-bd); }
.pf-badge-amber  { color: var(--pf-amber); background: var(--pf-amber-bg); border-color: var(--pf-amber-bd); }
.pf-badge-green  { color: var(--pf-green); background: var(--pf-green-bg); border-color: var(--pf-green-bd); }
.pf-badge-blue   { color: var(--pf-blue);  background: var(--pf-blue-bg);  border-color: var(--pf-blue-bd); }
.pf-badge-grey   { color: var(--pf-grey);  background: var(--pf-grey-bg);  border-color: var(--pf-grey-bd); }

/* Inline status select — wear the badge as the control */
.pf-status-select {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 24px 3px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: .02em;
  cursor: pointer;
  transition: filter .15s ease;
}
.pf-status-select:hover { filter: brightness(.97); }
.pf-status-select select {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  border: 0;
  outline: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  padding: 0 2px 0 0;
  letter-spacing: .02em;
}
.pf-status-select .pf-caret {
  right: 8px;
  color: currentColor;
  opacity: .65;
}

/* Row actions */
.pf-row-actions { display: inline-flex; gap: 6px; }
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
.pf-btn-delete { color: var(--pl-muted); }
.pf-btn-delete:hover { color: var(--pf-red); border-color: color-mix(in oklab, var(--pf-red) 35%, var(--pl-border)); background: color-mix(in oklab, var(--pf-red-bg) 35%, transparent); }

/* Empty state */
.pf-empty-row td { padding: 0; }
.pf-empty {
  padding: 3rem 1.5rem;
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.pf-empty-icon {
  width: 44px; height: 44px;
  border-radius: 12px;
  background: var(--pl-light);
  border: 1px solid var(--pl-light-b);
  color: var(--pl-mid);
  display: inline-flex; align-items: center; justify-content: center;
  margin-bottom: .75rem;
}
.pf-empty-title { font-family: Georgia, serif; font-size: 16px; color: var(--pl-text); font-weight: 500; }
.pf-empty-sub { font-size: 13px; color: var(--pl-muted); }

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
}
.pf-modal {
  position: relative;
  background: var(--pl-bg-2);
  border: 1px solid var(--pl-border-2);
  border-radius: 22px;
  padding: 1.75rem;
  width: 100%;
  max-width: 560px;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  box-shadow: var(--pl-shadow-3);
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
.pf-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
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
.pf-form-grid select.pf-input { padding-right: 32px; cursor: pointer; }
.pf-textarea { resize: vertical; min-height: 84px; line-height: 1.5; }

/* Segmented priority */
.pf-segmented {
  display: inline-flex;
  background: var(--pl-bg);
  border: 1px solid var(--pl-border);
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
  width: 100%;
}
.pf-seg {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  letter-spacing: .02em;
  padding: 6px 8px;
  border-radius: 7px;
  cursor: pointer;
  background: transparent;
  border: 0;
  color: var(--pl-muted);
  transition: background .18s, color .18s;
}
.pf-seg:hover { color: var(--pl-text); }
.pf-seg .pf-badge-dot { background: currentColor; opacity: .55; }
.pf-seg-active { background: var(--pl-bg-2); box-shadow: 0 1px 2px rgba(0,0,0,.06); color: var(--pl-text); }
.pf-seg-active.pf-seg-red    { color: var(--pf-red); }
.pf-seg-active.pf-seg-amber  { color: var(--pf-amber); }
.pf-seg-active.pf-seg-green  { color: var(--pf-green); }
.pf-seg-active .pf-badge-dot { opacity: 1; }

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
  .pf-cases *, .pf-cases *::before, .pf-cases *::after {
    animation: none !important;
    transition: none !important;
  }
}
    `}</style>
  )
}
