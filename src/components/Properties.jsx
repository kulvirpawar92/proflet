import { useState } from 'react'
import { supabase } from '../supabase'

/**
 * Proflet — Properties
 *
 * Drop-in replacement for the existing Properties page.
 * Shares the design language of Landing.jsx + Dashboard.jsx — same CSS tokens,
 * Georgia / monospace type pairing, and brand greens.
 *
 * Wrap your app shell in <div className="proflet-app"> (or rely on the
 * existing dashboard wrapper) so the --pl-* tokens are available. As a safety
 * net, this file injects its own scoped <style> block under .proflet-props.
 *
 * Functionality preserved 1:1:
 *   • property cards, click to open detail
 *   • 4 detail tabs (Overview, Financials, Mortgage, Tenancy)
 *   • 4-tab add/edit modal (Basic info, Tenancy, Mortgage, Insurance)
 *   • filter by status, sort by name/profit/value/yield
 *   • LTV progress bar, badges, alerts
 */

/* ──────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                  */
/* ──────────────────────────────────────────────────────────────────────── */

function fmtMoney(n) { return '£' + Math.round(n || 0).toLocaleString() }
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function daysUntil(d) {
  if (!d) return null
  return Math.round((new Date(d) - new Date()) / 86400000)
}

const STATUS_TONE = {
  'Owned':       'pl-tone-info',
  'Under Offer': 'pl-tone-amber',
  'Sold':        'pl-tone-muted',
}
const OCC_TONE = {
  'Occupied':         'pl-tone-green',
  'Vacant':           'pl-tone-red',
  'Notice Given':     'pl-tone-amber',
  'Maintenance Void': 'pl-tone-amber',
}

const FORM_TABS = [
  { id: 'basic',     label: 'Basic info' },
  { id: 'tenancy',   label: 'Tenancy' },
  { id: 'mortgage',  label: 'Mortgage' },
  { id: 'insurance', label: 'Insurance' },
]
const DETAIL_TABS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'financials', label: 'Financials' },
  { id: 'mortgage',   label: 'Mortgage' },
  { id: 'tenancy',    label: 'Tenancy' },
]

/* ──────────────────────────────────────────────────────────────────────── */
/*  Reusable bits                                                            */
/* ──────────────────────────────────────────────────────────────────────── */

function Badge({ label, tone }) {
  if (!label) return null
  return <span className={`pl-badge ${tone || 'pl-tone-muted'}`}>{label}</span>
}

function Eyebrow({ children }) {
  return <div className="pl-prop-eyebrow">{children}</div>
}

function SectionHead({ children }) {
  return <div className="pl-prop-sec-head">{children}</div>
}

function DetailRow({ label, value, valueColor }) {
  return (
    <div className="pl-prop-detail-row">
      <span className="pl-prop-detail-label">{label}</span>
      <span className="pl-prop-detail-value" style={valueColor ? { color: valueColor } : undefined}>{value || '—'}</span>
    </div>
  )
}

function MetricCard({ label, value, color, sub }) {
  return (
    <div className="pl-prop-metric">
      <div className="pl-prop-metric-label">{label}</div>
      <div className="pl-prop-metric-value" style={color ? { color } : undefined}>{value}</div>
      {sub && <div className="pl-prop-metric-sub">{sub}</div>}
    </div>
  )
}

function PrimaryButton({ onClick, children, size = 'md', full, type = 'button' }) {
  return (
    <button type={type} onClick={onClick} className={`pl-prop-btn pl-prop-btn-primary pl-prop-btn-${size} ${full ? 'pl-prop-btn-full' : ''}`}>
      {children}
    </button>
  )
}
function GhostButton({ onClick, children, size = 'md', full }) {
  return (
    <button type="button" onClick={onClick} className={`pl-prop-btn pl-prop-btn-ghost pl-prop-btn-${size} ${full ? 'pl-prop-btn-full' : ''}`}>
      {children}
    </button>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Properties                                                               */
/* ──────────────────────────────────────────────────────────────────────── */

export default function Properties({ session, props, expenses, income, cases, tasks, reload, calcProp, fmt }) {
  const money = fmt || fmtMoney
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [formTab, setFormTab] = useState('basic')
  const [detailId, setDetailId] = useState(null)
  const [detailTab, setDetailTab] = useState('overview')
  const [filter, setFilter] = useState('All')
  const [sortBy, setSortBy] = useState('name')

  function openAdd() { setForm({}); setEditing(null); setFormTab('basic'); setShowForm(true) }
  function openEdit(p, e) { if (e) e.stopPropagation(); setForm(p); setEditing(p.id); setFormTab('basic'); setShowForm(true) }
  function openDetail(p) { setDetailId(p.id); setDetailTab('overview') }
  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  async function save() {
    if (!form.name) { alert('Property name is required'); return }
    const payload = { ...form, user_id: session.user.id }
    if (editing) {
      await supabase.from('properties').update(payload).eq('id', editing)
    } else {
      await supabase.from('properties').insert(payload)
    }
    setShowForm(false); setForm({}); setEditing(null); reload()
  }

  async function del(id, e) {
    e.stopPropagation()
    if (!confirm('Delete this property? All related records will also be deleted.')) return
    await supabase.from('properties').delete().eq('id', id)
    if (detailId === id) setDetailId(null)
    reload()
  }

  const statuses = ['All', 'Owned', 'Under Offer', 'Sold']
  const filtered = props
    .filter(p => filter === 'All' || p.status === filter)
    .sort((a, b) => {
      if (sortBy === 'profit') return calcProp(b).monthlyProfit - calcProp(a).monthlyProfit
      if (sortBy === 'value')  return (b.current_value || 0) - (a.current_value || 0)
      if (sortBy === 'yield')  return calcProp(b).grossYield - calcProp(a).grossYield
      return (a.name || '').localeCompare(b.name || '')
    })

  const detailProp = props.find(p => p.id === detailId)

  /* ─── Detail view ──────────────────────────────────────────────────────── */
  if (detailProp) {
    const c = calcProp(detailProp)
    const propIncome   = (income   || []).filter(i => i.property_id === detailProp.id)
    const propExpenses = (expenses || []).filter(e => e.property_id === detailProp.id)
    const propCases    = (cases    || []).filter(c => c.property_id === detailProp.id)
    const propTasks    = (tasks    || []).filter(t => t.property_id === detailProp.id)
    const totalIncome   = propIncome.filter(i => i.status === 'Received').reduce((s, i) => s + (i.amount || 0), 0)
    const totalExpenses = propExpenses.reduce((s, e) => s + (e.amount || 0), 0)

    const alerts = []
    if (detailProp.insurance_renewal) {
      const d = daysUntil(detailProp.insurance_renewal)
      if (d !== null && d <= 45) alerts.push({ tone: d <= 7 ? 'red' : 'amber', msg: 'Insurance renewal',  detail: fmtDate(detailProp.insurance_renewal) })
    }
    if (detailProp.remortgage_date) {
      const d = daysUntil(detailProp.remortgage_date)
      if (d !== null && d <= 90) alerts.push({ tone: d <= 14 ? 'red' : 'amber', msg: 'Remortgage date',   detail: fmtDate(detailProp.remortgage_date) })
    }
    if (detailProp.tenancy_end) {
      const d = daysUntil(detailProp.tenancy_end)
      if (d !== null && d <= 60) alerts.push({ tone: d <= 0 ? 'red' : 'amber', msg: 'Tenancy ending',     detail: fmtDate(detailProp.tenancy_end) })
    }

    return (
      <div className="proflet-props">
        <PropStyles />

        {/* Detail header */}
        <div className="pl-prop-detail-head">
          <button onClick={() => setDetailId(null)} className="pl-prop-back">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8.5 3.5L5 7l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>
          <div className="pl-prop-detail-title-wrap">
            <Eyebrow>Property</Eyebrow>
            <h1 className="pl-prop-detail-title">{detailProp.name}</h1>
            <div className="pl-prop-detail-meta">
              {detailProp.address || 'No address'}{detailProp.postcode ? ` · ${detailProp.postcode}` : ''} · {detailProp.bedrooms || '?'} bed {detailProp.type || 'property'}
            </div>
          </div>
          <div className="pl-prop-detail-actions">
            <Badge label={detailProp.status} tone={STATUS_TONE[detailProp.status]} />
            <Badge label={detailProp.occupancy_status} tone={OCC_TONE[detailProp.occupancy_status]} />
            <PrimaryButton onClick={(e) => openEdit(detailProp, e)} size="sm">Edit</PrimaryButton>
          </div>
        </div>

        {/* Metrics */}
        <div className="pl-prop-metric-grid">
          <MetricCard
            label="Monthly profit"
            value={money(c.monthlyProfit)}
            color={c.monthlyProfit >= 0 ? 'var(--pl-mid)' : 'var(--pl-red)'}
            sub={`${money(c.monthlyProfit * 12)} / yr`}
          />
          <MetricCard
            label="Equity"
            value={money(c.equity)}
            sub={`LTV ${c.ltv}%`}
          />
          <MetricCard
            label="Gross yield"
            value={c.grossYield + '%'}
            color={c.grossYield >= 5 ? 'var(--pl-mid)' : 'var(--pl-amber)'}
          />
          <MetricCard
            label="Equity release"
            value={money(c.equityRelease)}
            color="var(--pl-amber-deep)"
            sub="At 75% LTV"
          />
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="pl-prop-alert-row">
            {alerts.map((a, i) => (
              <div key={i} className={`pl-prop-alert pl-prop-alert-${a.tone}`}>
                <span className={`pl-prop-alert-dot pl-prop-alert-dot-${a.tone}`} />
                <span className="pl-prop-alert-msg">{a.msg}</span>
                <span className="pl-prop-alert-sep">·</span>
                <span className="pl-prop-alert-detail">{a.detail}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="pl-prop-tabs">
          {DETAIL_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setDetailTab(t.id)}
              className={`pl-prop-tab ${detailTab === t.id ? 'pl-prop-tab-active' : ''}`}
            >{t.label}</button>
          ))}
        </div>

        {detailTab === 'overview' && (
          <div className="pl-prop-grid-2">
            <div className="pl-prop-card">
              <SectionHead>Property details</SectionHead>
              <DetailRow label="Purchase price" value={detailProp.purchase_price ? money(detailProp.purchase_price) : null} />
              <DetailRow label="Current value"  value={detailProp.current_value  ? money(detailProp.current_value)  : null} />
              <DetailRow label="Purchase date"  value={fmtDate(detailProp.purchase_date)} />
              <DetailRow label="Type"           value={detailProp.type} />
              <DetailRow label="Bedrooms"       value={detailProp.bedrooms} />
              <DetailRow label="Bathrooms"      value={detailProp.bathrooms} />
              <DetailRow label="Status"         value={detailProp.status} />
              <DetailRow label="Occupancy"      value={detailProp.occupancy_status} />
            </div>
            <div className="pl-prop-card">
              <SectionHead>Tenancy snapshot</SectionHead>
              <DetailRow label="Monthly rent"     value={detailProp.monthly_rent ? money(detailProp.monthly_rent) : null} />
              <DetailRow label="Tenancy start"    value={fmtDate(detailProp.tenancy_start)} />
              <DetailRow label="Tenancy end"      value={fmtDate(detailProp.tenancy_end)} />
              <SectionHead>Mortgage snapshot</SectionHead>
              <DetailRow label="Lender"           value={detailProp.mortgage_lender} />
              <DetailRow label="Balance"          value={detailProp.mortgage_balance ? money(detailProp.mortgage_balance) : null} />
              <DetailRow label="Monthly payment"  value={detailProp.mortgage_payment ? money(detailProp.mortgage_payment) : null} />
              <DetailRow label="Remortgage date"  value={fmtDate(detailProp.remortgage_date)} />
            </div>
            {detailProp.notes && (
              <div className="pl-prop-card pl-prop-card-full">
                <SectionHead>Notes</SectionHead>
                <div className="pl-prop-notes">{detailProp.notes}</div>
              </div>
            )}
          </div>
        )}

        {detailTab === 'financials' && (
          <div className="pl-prop-grid-2">
            <div className="pl-prop-card">
              <div className="pl-prop-card-head">
                <SectionHead>Income</SectionHead>
                <span className="pl-prop-card-meta">{propIncome.length} records</span>
              </div>
              {!propIncome.length
                ? <div className="pl-prop-empty">No income records</div>
                : propIncome.slice().reverse().slice(0, 8).map(i => (
                    <div key={i.id} className="pl-prop-line">
                      <span className="pl-prop-line-label">{i.type}{i.date ? ' · ' + fmtDate(i.date) : ''}</span>
                      <span className="pl-prop-line-value">{money(i.amount)}</span>
                    </div>
                  ))
              }
              <div className="pl-prop-total pl-prop-total-green">
                <span>Total received</span>
                <span>{money(totalIncome)}</span>
              </div>
            </div>

            <div className="pl-prop-card">
              <div className="pl-prop-card-head">
                <SectionHead>Expenses</SectionHead>
                <span className="pl-prop-card-meta">{propExpenses.length} records</span>
              </div>
              {!propExpenses.length
                ? <div className="pl-prop-empty">No expense records</div>
                : propExpenses.slice().reverse().slice(0, 8).map(e => (
                    <div key={e.id} className="pl-prop-line">
                      <span className="pl-prop-line-label">{e.type}{e.recurring ? ' · recurring' : ''}</span>
                      <span className="pl-prop-line-value">{money(e.amount)}</span>
                    </div>
                  ))
              }
              <div className="pl-prop-total pl-prop-total-red">
                <span>Total expenses</span>
                <span>{money(totalExpenses)}</span>
              </div>
            </div>

            <div className="pl-prop-card pl-prop-card-full">
              <SectionHead>P&amp;L summary</SectionHead>
              <div className="pl-prop-pl-grid">
                {[
                  { label: 'Total income',   value: money(totalIncome),   color: 'var(--pl-mid)' },
                  { label: 'Total expenses', value: money(totalExpenses), color: 'var(--pl-red)' },
                  { label: 'Net P&L',        value: money(totalIncome - totalExpenses), color: (totalIncome - totalExpenses) >= 0 ? 'var(--pl-mid)' : 'var(--pl-red)' },
                ].map(m => (
                  <div key={m.label} className="pl-prop-pl-cell">
                    <div className="pl-prop-pl-label">{m.label}</div>
                    <div className="pl-prop-pl-value" style={{ color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {detailTab === 'mortgage' && (
          <div className="pl-prop-grid-2">
            <div className="pl-prop-card">
              <SectionHead>Mortgage details</SectionHead>
              <DetailRow label="Lender"            value={detailProp.mortgage_lender} />
              <DetailRow label="Product"           value={detailProp.mortgage_product} />
              <DetailRow label="Balance"           value={detailProp.mortgage_balance ? money(detailProp.mortgage_balance) : null} />
              <DetailRow label="Monthly payment"   value={detailProp.mortgage_payment ? money(detailProp.mortgage_payment) : null} />
              <DetailRow label="Interest rate"     value={detailProp.interest_rate ? detailProp.interest_rate + '%' : null} />
              <DetailRow label="Fixed term ends"   value={fmtDate(detailProp.fixed_term_end)} />
              <DetailRow label="Remortgage date"   value={fmtDate(detailProp.remortgage_date)} />
            </div>
            <div className="pl-prop-card">
              <SectionHead>Equity analysis</SectionHead>
              <DetailRow label="Current value"        value={detailProp.current_value ? money(detailProp.current_value) : null} />
              <DetailRow label="Mortgage balance"     value={detailProp.mortgage_balance ? money(detailProp.mortgage_balance) : null} />
              <DetailRow label="Equity"               value={money(c.equity)} valueColor="var(--pl-mid)" />
              <DetailRow
                label="LTV"
                value={c.ltv + '%'}
                valueColor={c.ltv > 75 ? 'var(--pl-red)' : c.ltv > 65 ? 'var(--pl-amber)' : 'var(--pl-mid)'}
              />
              <DetailRow label="Max borrowing (75%)"  value={money((detailProp.current_value || 0) * 0.75)} />

              <div className="pl-prop-equity-card">
                <div className="pl-prop-equity-label">Equity release available</div>
                <div className="pl-prop-equity-value">{money(c.equityRelease)}</div>
                <div className="pl-prop-equity-sub">At 75% LTV threshold</div>
              </div>
            </div>
          </div>
        )}

        {detailTab === 'tenancy' && (
          <div className="pl-prop-grid-2">
            <div className="pl-prop-card">
              <SectionHead>Tenancy details</SectionHead>
              <DetailRow label="Occupancy status"  value={detailProp.occupancy_status} />
              <DetailRow label="Monthly rent"      value={detailProp.monthly_rent ? money(detailProp.monthly_rent) : null} />
              <DetailRow label="Annual rent"       value={detailProp.monthly_rent ? money(detailProp.monthly_rent * 12) : null} />
              <DetailRow label="Tenancy start"     value={fmtDate(detailProp.tenancy_start)} />
              <DetailRow label="Tenancy end"       value={fmtDate(detailProp.tenancy_end)} />
              {detailProp.tenancy_end && (() => {
                const d = daysUntil(detailProp.tenancy_end)
                const tone = d <= 30 ? 'amber' : 'green'
                return (
                  <div className={`pl-prop-callout pl-prop-callout-${tone}`}>
                    {d <= 0 ? 'Tenancy has ended' : `${d} days until tenancy ends`}
                  </div>
                )
              })()}
            </div>
            <div className="pl-prop-card">
              <SectionHead>Insurance</SectionHead>
              <DetailRow label="Provider"      value={detailProp.insurance_provider} />
              <DetailRow label="Policy number" value={detailProp.policy_number} />
              <DetailRow label="Renewal date"  value={fmtDate(detailProp.insurance_renewal)} />
              {detailProp.insurance_renewal && (() => {
                const d = daysUntil(detailProp.insurance_renewal)
                const tone = d <= 14 ? 'red' : d <= 45 ? 'amber' : 'green'
                return (
                  <div className={`pl-prop-callout pl-prop-callout-${tone}`}>
                    {d <= 0 ? 'Insurance has expired!' : `${d} days until renewal`}
                  </div>
                )
              })()}
              <SectionHead>Related activity</SectionHead>
              <DetailRow label="Open cases" value={propCases.filter(c => c.status !== 'Closed').length} />
              <DetailRow label="Open tasks" value={propTasks.filter(t => t.status !== 'Done').length} />
            </div>
          </div>
        )}

        {showForm && renderForm()}
      </div>
    )
  }

  /* ─── Form modal ──────────────────────────────────────────────────────── */
  function renderForm() {
    const idx = FORM_TABS.findIndex(t => t.id === formTab)
    return (
      <div className="pl-prop-modal-bg" onClick={() => setShowForm(false)}>
        <div className="pl-prop-modal" onClick={e => e.stopPropagation()}>
          <div className="pl-prop-modal-glow" aria-hidden="true" />
          <div className="pl-prop-modal-head">
            <div>
              <Eyebrow>{editing ? 'Edit property' : 'Add property'}</Eyebrow>
              <h2 className="pl-prop-modal-title">{form.name || (editing ? 'Edit property' : 'New property')}</h2>
            </div>
            <button onClick={() => setShowForm(false)} className="pl-prop-modal-close" aria-label="Close">×</button>
          </div>

          <div className="pl-prop-tabs pl-prop-tabs-form">
            {FORM_TABS.map((t, i) => (
              <button key={t.id} onClick={() => setFormTab(t.id)} className={`pl-prop-tab ${formTab === t.id ? 'pl-prop-tab-active' : ''}`}>
                <span className="pl-prop-tab-num">{i + 1}</span> {t.label}
              </button>
            ))}
          </div>

          <div className="pl-prop-form-body">
            {formTab === 'basic' && (
              <div className="pl-prop-form-grid">
                <Field full label="Property name *">
                  <input type="text" value={form.name || ''} onChange={f('name')} placeholder="e.g. 35 Lincoln Way" className="pl-prop-input" />
                </Field>
                <Field full label="Full address">
                  <input type="text" value={form.address || ''} onChange={f('address')} className="pl-prop-input" />
                </Field>
                <Field label="Postcode">
                  <input type="text" value={form.postcode || ''} onChange={f('postcode')} className="pl-prop-input" />
                </Field>
                <Field label="Type">
                  <select value={form.type || ''} onChange={f('type')} className="pl-prop-input">
                    <option value="">Select…</option>
                    {['House', 'Flat', 'HMO', 'Commercial', 'Other'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Bedrooms">
                  <input type="number" value={form.bedrooms || ''} onChange={f('bedrooms')} className="pl-prop-input" />
                </Field>
                <Field label="Bathrooms">
                  <input type="number" value={form.bathrooms || ''} onChange={f('bathrooms')} className="pl-prop-input" />
                </Field>
                <Field label="Purchase price (£)">
                  <input type="number" value={form.purchase_price || ''} onChange={f('purchase_price')} className="pl-prop-input" />
                </Field>
                <Field label="Current value (£)">
                  <input type="number" value={form.current_value || ''} onChange={f('current_value')} className="pl-prop-input" />
                </Field>
                <Field label="Purchase date">
                  <input type="date" value={form.purchase_date || ''} onChange={f('purchase_date')} className="pl-prop-input" />
                </Field>
                <Field label="Status">
                  <select value={form.status || ''} onChange={f('status')} className="pl-prop-input">
                    <option value="">Select…</option>
                    {['Owned', 'Under Offer', 'Sold'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field full label="Notes">
                  <textarea value={form.notes || ''} onChange={f('notes')} rows={2} className="pl-prop-input pl-prop-textarea" />
                </Field>
              </div>
            )}

            {formTab === 'tenancy' && (
              <div className="pl-prop-form-grid">
                <Field label="Monthly rent (£)">
                  <input type="number" value={form.monthly_rent || ''} onChange={f('monthly_rent')} className="pl-prop-input" />
                </Field>
                <Field label="Occupancy status">
                  <select value={form.occupancy_status || ''} onChange={f('occupancy_status')} className="pl-prop-input">
                    <option value="">Select…</option>
                    {['Occupied', 'Vacant', 'Notice Given', 'Maintenance Void'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Tenancy start">
                  <input type="date" value={form.tenancy_start || ''} onChange={f('tenancy_start')} className="pl-prop-input" />
                </Field>
                <Field label="Tenancy end">
                  <input type="date" value={form.tenancy_end || ''} onChange={f('tenancy_end')} className="pl-prop-input" />
                </Field>
              </div>
            )}

            {formTab === 'mortgage' && (
              <div className="pl-prop-form-grid">
                <Field label="Lender">
                  <input type="text" value={form.mortgage_lender || ''} onChange={f('mortgage_lender')} className="pl-prop-input" />
                </Field>
                <Field label="Product name">
                  <input type="text" value={form.mortgage_product || ''} onChange={f('mortgage_product')} className="pl-prop-input" />
                </Field>
                <Field label="Balance (£)">
                  <input type="number" value={form.mortgage_balance || ''} onChange={f('mortgage_balance')} className="pl-prop-input" />
                </Field>
                <Field label="Monthly payment (£)">
                  <input type="number" value={form.mortgage_payment || ''} onChange={f('mortgage_payment')} className="pl-prop-input" />
                </Field>
                <Field label="Interest rate (%)">
                  <input type="number" step="0.01" value={form.interest_rate || ''} onChange={f('interest_rate')} className="pl-prop-input" />
                </Field>
                <Field label="Fixed term ends">
                  <input type="date" value={form.fixed_term_end || ''} onChange={f('fixed_term_end')} className="pl-prop-input" />
                </Field>
                <Field label="Remortgage date">
                  <input type="date" value={form.remortgage_date || ''} onChange={f('remortgage_date')} className="pl-prop-input" />
                </Field>
              </div>
            )}

            {formTab === 'insurance' && (
              <div className="pl-prop-form-grid">
                <Field label="Insurance provider">
                  <input type="text" value={form.insurance_provider || ''} onChange={f('insurance_provider')} className="pl-prop-input" />
                </Field>
                <Field label="Policy number">
                  <input type="text" value={form.policy_number || ''} onChange={f('policy_number')} className="pl-prop-input" />
                </Field>
                <Field label="Renewal date">
                  <input type="date" value={form.insurance_renewal || ''} onChange={f('insurance_renewal')} className="pl-prop-input" />
                </Field>
              </div>
            )}
          </div>

          <div className="pl-prop-modal-foot">
            <div className="pl-prop-step-dots">
              {FORM_TABS.map((t, i) => (
                <div key={t.id} className={`pl-prop-step-dot ${i <= idx ? 'pl-prop-step-dot-on' : ''}`} />
              ))}
            </div>
            <div className="pl-prop-modal-actions">
              <GhostButton onClick={() => setShowForm(false)}>Cancel</GhostButton>
              {formTab !== 'basic' && (
                <GhostButton onClick={() => setFormTab(FORM_TABS[idx - 1].id)}>← Back</GhostButton>
              )}
              {formTab !== 'insurance'
                ? <PrimaryButton onClick={() => setFormTab(FORM_TABS[idx + 1].id)}>Next →</PrimaryButton>
                : <PrimaryButton onClick={save}>Save property</PrimaryButton>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ─── List view ───────────────────────────────────────────────────────── */
  return (
    <div className="proflet-props">
      <PropStyles />

      <div className="pl-prop-page-head">
        <div>
          <Eyebrow>Portfolio</Eyebrow>
          <h1 className="pl-prop-page-title">Properties</h1>
          <div className="pl-prop-page-sub">{props.length} propert{props.length === 1 ? 'y' : 'ies'} · filter and sort to find what you need</div>
        </div>
        <div className="pl-prop-page-actions">
          <div className="pl-prop-select-wrap">
            <select value={filter} onChange={e => setFilter(e.target.value)} className="pl-prop-select">
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>
            <Caret />
          </div>
          <div className="pl-prop-select-wrap">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="pl-prop-select">
              <option value="name">Sort: Name</option>
              <option value="profit">Sort: Profit</option>
              <option value="value">Sort: Value</option>
              <option value="yield">Sort: Yield</option>
            </select>
            <Caret />
          </div>
          <PrimaryButton onClick={openAdd}>+ Add property</PrimaryButton>
        </div>
      </div>

      {!filtered.length && (
        <div className="pl-prop-empty-state">
          <div className="pl-prop-empty-mark">
            <svg width="28" height="28" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 6.5L7 2.5l5 4V12a.5.5 0 01-.5.5h-9A.5.5 0 012 12V6.5z"/>
              <path d="M5.5 12.5V8h3v4.5"/>
            </svg>
          </div>
          <div className="pl-prop-empty-title">{props.length === 0 ? 'No properties yet' : 'No matches'}</div>
          <div className="pl-prop-empty-text">
            {props.length === 0
              ? 'Add your first property to start tracking rent, mortgage and equity.'
              : 'Try a different filter or add a new property.'}
          </div>
          {props.length === 0 && <PrimaryButton onClick={openAdd}>+ Add your first property</PrimaryButton>}
        </div>
      )}

      <div className="pl-prop-card-grid">
        {filtered.map(p => {
          const c = calcProp(p)
          const profitColor = c.monthlyProfit >= 0 ? 'var(--pl-mid)' : 'var(--pl-red)'
          const yieldColor  = c.grossYield >= 5 ? 'var(--pl-mid)' : 'var(--pl-amber)'
          const ltvColor    = c.ltv > 75 ? 'var(--pl-red)' : c.ltv > 65 ? 'var(--pl-amber)' : 'var(--pl-mid)'
          return (
            <article
              key={p.id}
              onClick={() => openDetail(p)}
              className="pl-prop-card pl-prop-card-clickable"
            >
              <div className="pl-prop-card-glow" aria-hidden="true" />
              <header className="pl-prop-card-top">
                <div className="pl-prop-card-id">
                  <div className="pl-prop-thumb">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 6.5L7 2.5l5 4V12a.5.5 0 01-.5.5h-9A.5.5 0 012 12V6.5z"/>
                      <path d="M5.5 12.5V8h3v4.5"/>
                    </svg>
                  </div>
                  <div>
                    <div className="pl-prop-card-name">{p.name}</div>
                    <div className="pl-prop-card-addr">{p.address || 'No address'} · {p.bedrooms || '?'} bed {p.type || 'property'}</div>
                  </div>
                </div>
                <div className="pl-prop-card-badges">
                  <Badge label={p.status} tone={STATUS_TONE[p.status]} />
                  <Badge label={p.occupancy_status} tone={OCC_TONE[p.occupancy_status]} />
                </div>
              </header>

              <div className="pl-prop-card-stats">
                <CardStat label="Monthly rent"   value={money(c.rent)} />
                <CardStat label="Monthly profit" value={money(c.monthlyProfit)} color={profitColor} />
                <CardStat label="Equity"         value={money(c.equity)} />
                <CardStat label="Gross yield"    value={c.grossYield + '%'} color={yieldColor} />
              </div>

              <div className="pl-prop-card-ltv">
                <div className="pl-prop-card-ltv-row">
                  <span>LTV</span>
                  <span style={{ color: ltvColor, fontWeight: 500 }}>{c.ltv}%</span>
                </div>
                <div className="pl-prop-card-ltv-track">
                  <div className="pl-prop-card-ltv-fill" style={{ width: Math.min(c.ltv, 100) + '%', background: ltvColor }} />
                </div>
              </div>

              <footer className="pl-prop-card-foot">
                <button className="pl-prop-card-foot-edit" onClick={(e) => openEdit(p, e)}>Edit</button>
                <button className="pl-prop-card-foot-del"  onClick={(e) => del(p.id, e)}>Delete</button>
                <span className="pl-prop-card-foot-go">
                  Open
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </footer>
            </article>
          )
        })}
      </div>

      {showForm && renderForm()}
    </div>
  )
}

function CardStat({ label, value, color }) {
  return (
    <div className="pl-prop-card-stat">
      <div className="pl-prop-card-stat-label">{label}</div>
      <div className="pl-prop-card-stat-value" style={color ? { color } : undefined}>{value}</div>
    </div>
  )
}

function Field({ label, full, children }) {
  return (
    <label className={`pl-prop-field ${full ? 'pl-prop-field-full' : ''}`}>
      <span className="pl-prop-field-label">{label}</span>
      {children}
    </label>
  )
}

function Caret() {
  return (
    <svg className="pl-prop-select-caret" width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 5.5L7 9.5l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Styles                                                                   */
/* ──────────────────────────────────────────────────────────────────────── */

function PropStyles() {
  return (
    <style>{`
.proflet-props {
  /* Brand */
  --pl-dark:    #173404;
  --pl-mid:     #3B6D11;
  --pl-bright:  #639922;
  --pl-light:   #EAF3DE;
  --pl-light-b: #C8E6A0;

  /* Tones */
  --pl-red:        #C0392B;
  --pl-red-bg:     #FCEBEB;
  --pl-amber:      #B45309;
  --pl-amber-deep: #854F0B;
  --pl-amber-bg:   #FEF3E2;
  --pl-info:       #0C447C;
  --pl-info-bg:    #E6F1FB;

  /* Surface — fall back so this works even if outer shell not present */
  --pl-bg:      var(--pl-bg, oklch(98.5% 0.005 110));
  --pl-bg-2:    var(--pl-bg-2, #ffffff);
  --pl-bg-3:    var(--pl-bg-3, oklch(96.5% 0.012 120));
  --pl-text:    var(--pl-text, oklch(20% 0.015 145));
  --pl-text-2:  var(--pl-text-2, oklch(38% 0.012 145));
  --pl-muted:   var(--pl-muted, oklch(52% 0.010 140));
  --pl-border:  var(--pl-border, oklch(92% 0.008 130));
  --pl-border-2:var(--pl-border-2, oklch(88% 0.012 130));

  --pl-shadow-1: 0 1px 2px rgba(20,40,10,.04), 0 4px 18px -8px rgba(20,40,10,.10);
  --pl-shadow-2: 0 2px 6px rgba(20,40,10,.06), 0 18px 60px -20px rgba(20,40,10,.18);
  --pl-shadow-3: 0 30px 100px -30px rgba(20,40,10,.32), 0 4px 12px rgba(20,40,10,.06);

  --pl-r-md: 12px;
  --pl-r-lg: 18px;

  font-family: Georgia, 'Times New Roman', serif;
  color: var(--pl-text);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
@media (prefers-color-scheme: dark) {
  .proflet-props {
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
    --pl-red:     #F87171;
    --pl-red-bg:  oklch(28% 0.08 25);
    --pl-amber:   #FCD34D;
    --pl-amber-deep:#FCD34D;
    --pl-amber-bg:oklch(28% 0.08 70);
    --pl-info:    #93C5FD;
    --pl-info-bg: oklch(28% 0.06 240);
  }
}
.proflet-props * { box-sizing: border-box; }

/* Eyebrow + section headings */
.pl-prop-eyebrow {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--pl-mid);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.pl-prop-eyebrow::before {
  content: '';
  width: 22px; height: 1px;
  background: currentColor;
  opacity: .5;
  display: inline-block;
}
.pl-prop-sec-head {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: var(--pl-muted);
  margin: 1.25rem 0 .6rem;
}
.pl-prop-sec-head:first-child { margin-top: 0; }

/* Page head */
.pl-prop-page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}
.pl-prop-page-title {
  font-family: Georgia, serif;
  font-weight: 500;
  font-size: clamp(28px, 3.4vw, 38px);
  letter-spacing: -0.02em;
  margin: .35rem 0 .25rem;
  color: var(--pl-text);
  line-height: 1.1;
}
.pl-prop-page-sub { font-size: 13px; color: var(--pl-muted); }
.pl-prop-page-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

/* Buttons */
.pl-prop-btn {
  font-family: Georgia, serif;
  font-weight: 500;
  letter-spacing: -0.005em;
  border-radius: 999px;
  border: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  transition: transform .18s ease, box-shadow .18s ease, background .18s ease, color .18s ease, border-color .18s ease;
}
.pl-prop-btn-sm { font-size: 12.5px; padding: 7px 14px; }
.pl-prop-btn-md { font-size: 13.5px; padding: 9px 18px; }
.pl-prop-btn-lg { font-size: 15px;   padding: 12px 24px; }
.pl-prop-btn-full { display: flex; width: 100%; justify-content: center; }
.pl-prop-btn-primary {
  color: white;
  background: linear-gradient(180deg, var(--pl-bright) 0%, var(--pl-mid) 100%);
  box-shadow:
    0 1px 0 rgba(255,255,255,.25) inset,
    0 -1px 0 rgba(0,0,0,.15) inset,
    0 8px 22px -8px rgba(59,109,17,.55),
    0 2px 4px rgba(20,40,10,.18);
}
.pl-prop-btn-primary:hover { transform: translateY(-1px); }
.pl-prop-btn-ghost {
  background: var(--pl-bg-2);
  color: var(--pl-text-2);
  border: 1px solid var(--pl-border);
}
.pl-prop-btn-ghost:hover { color: var(--pl-text); border-color: var(--pl-border-2); }

/* Selects */
.pl-prop-select-wrap { position: relative; display: inline-flex; }
.pl-prop-select {
  font-family: Georgia, serif;
  font-size: 13px;
  background: var(--pl-bg-2);
  border: 1px solid var(--pl-border);
  color: var(--pl-text);
  padding: 8px 30px 8px 14px;
  border-radius: 999px;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  transition: border-color .15s, box-shadow .15s;
}
.pl-prop-select:hover { border-color: var(--pl-border-2); }
.pl-prop-select:focus { outline: 0; border-color: var(--pl-mid); box-shadow: 0 0 0 3px color-mix(in oklab, var(--pl-mid) 18%, transparent); }
.pl-prop-select-caret { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--pl-muted); pointer-events: none; }

/* Badges */
.pl-badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 500;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  letter-spacing: .04em;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
  border: 1px solid transparent;
}
.pl-tone-green  { background: var(--pl-light);    color: var(--pl-mid);   border-color: var(--pl-light-b); }
.pl-tone-amber  { background: var(--pl-amber-bg); color: var(--pl-amber); border-color: color-mix(in oklab, var(--pl-amber) 28%, transparent); }
.pl-tone-red    { background: var(--pl-red-bg);   color: var(--pl-red);   border-color: color-mix(in oklab, var(--pl-red)   28%, transparent); }
.pl-tone-info   { background: var(--pl-info-bg);  color: var(--pl-info);  border-color: color-mix(in oklab, var(--pl-info)  28%, transparent); }
.pl-tone-muted  { background: var(--pl-bg-3);     color: var(--pl-muted); border-color: var(--pl-border); }

/* Empty state */
.pl-prop-empty-state {
  text-align: center;
  padding: 4rem 1.5rem;
  background: var(--pl-bg-2);
  border: 1px dashed var(--pl-border-2);
  border-radius: var(--pl-r-lg);
}
.pl-prop-empty-mark {
  width: 56px; height: 56px;
  border-radius: 16px;
  background: var(--pl-light);
  border: 1px solid var(--pl-light-b);
  color: var(--pl-mid);
  display: inline-flex; align-items: center; justify-content: center;
  margin-bottom: 1rem;
}
.pl-prop-empty-title { font-family: Georgia, serif; font-size: 19px; font-weight: 500; color: var(--pl-text); margin-bottom: .25rem; }
.pl-prop-empty-text  { font-size: 13.5px; color: var(--pl-muted); margin-bottom: 1.25rem; }

/* Property card grid */
.pl-prop-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}
.pl-prop-card {
  position: relative;
  background: var(--pl-bg-2);
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-r-lg);
  padding: 1.4rem 1.5rem 1.25rem;
  overflow: hidden;
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}
.pl-prop-card-clickable { cursor: pointer; }
.pl-prop-card-glow {
  position: absolute; inset: 0;
  background: radial-gradient(circle at 0% 0%, color-mix(in oklab, var(--pl-bright) 8%, transparent), transparent 60%);
  opacity: 0;
  transition: opacity .25s ease;
  pointer-events: none;
}
.pl-prop-card-clickable:hover {
  transform: translateY(-3px);
  box-shadow: var(--pl-shadow-2);
  border-color: var(--pl-light-b);
}
.pl-prop-card-clickable:hover .pl-prop-card-glow { opacity: 1; }

.pl-prop-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 1rem; position: relative; }
.pl-prop-card-id  { display: flex; gap: 12px; align-items: flex-start; min-width: 0; }
.pl-prop-thumb {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: var(--pl-light);
  color: var(--pl-mid);
  border: 1px solid var(--pl-light-b);
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.pl-prop-card-name { font-family: Georgia, serif; font-size: 16px; font-weight: 500; color: var(--pl-text); letter-spacing: -0.01em; }
.pl-prop-card-addr { font-size: 12px; color: var(--pl-muted); margin-top: 2px; font-family: ui-monospace, monospace; }
.pl-prop-card-badges { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; flex-shrink: 0; }

.pl-prop-card-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 1rem;
  position: relative;
}
.pl-prop-card-stat {
  background: var(--pl-bg-3);
  border-radius: 8px;
  padding: 8px 10px;
  border: 1px solid transparent;
}
.pl-prop-card-stat-label { font-family: ui-monospace, monospace; font-size: 10px; color: var(--pl-muted); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 2px; }
.pl-prop-card-stat-value { font-family: Georgia, serif; font-size: 14px; font-weight: 500; color: var(--pl-text); letter-spacing: -0.005em; }

.pl-prop-card-ltv { margin-bottom: 1rem; position: relative; }
.pl-prop-card-ltv-row { display: flex; justify-content: space-between; font-size: 11px; color: var(--pl-muted); font-family: ui-monospace, monospace; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 5px; }
.pl-prop-card-ltv-track {
  height: 5px;
  background: var(--pl-bg-3);
  border-radius: 999px;
  overflow: hidden;
}
.pl-prop-card-ltv-fill { height: 100%; border-radius: 999px; transition: width .35s ease; }

.pl-prop-card-foot { display: flex; align-items: center; gap: 8px; position: relative; }
.pl-prop-card-foot-edit, .pl-prop-card-foot-del {
  font-family: Georgia, serif;
  font-size: 12.5px;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition: background .15s, color .15s, border-color .15s;
}
.pl-prop-card-foot-edit {
  flex: 1;
  background: var(--pl-light);
  color: var(--pl-mid);
  border: 1px solid var(--pl-light-b);
  font-weight: 500;
}
.pl-prop-card-foot-edit:hover { background: color-mix(in oklab, var(--pl-light) 75%, var(--pl-light-b)); }
.pl-prop-card-foot-del {
  background: transparent;
  color: var(--pl-muted);
  border: 1px solid var(--pl-border);
}
.pl-prop-card-foot-del:hover { color: var(--pl-red); border-color: var(--pl-red); background: var(--pl-red-bg); }
.pl-prop-card-foot-go {
  margin-left: auto;
  display: inline-flex; align-items: center; gap: 4px;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--pl-mid);
  opacity: .6;
  transition: opacity .15s, transform .15s;
}
.pl-prop-card-clickable:hover .pl-prop-card-foot-go { opacity: 1; transform: translateX(2px); }

/* Detail header */
.pl-prop-detail-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 16px;
  align-items: center;
  margin-bottom: 1.25rem;
  padding: 1rem 1.25rem;
  background: var(--pl-bg-2);
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-r-lg);
  position: relative;
  overflow: hidden;
}
.pl-prop-detail-head::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 60% 80% at 0% 0%, color-mix(in oklab, var(--pl-bright) 10%, transparent), transparent 60%);
  pointer-events: none;
}
.pl-prop-back {
  position: relative;
  display: inline-flex; align-items: center; gap: 6px;
  font-family: Georgia, serif;
  font-size: 12.5px;
  padding: 7px 14px;
  border-radius: 999px;
  background: var(--pl-bg-3);
  color: var(--pl-text-2);
  border: 1px solid var(--pl-border);
  cursor: pointer;
}
.pl-prop-back:hover { color: var(--pl-text); border-color: var(--pl-border-2); }
.pl-prop-detail-title-wrap { position: relative; min-width: 0; }
.pl-prop-detail-title {
  font-family: Georgia, serif;
  font-weight: 500;
  font-size: clamp(22px, 2.6vw, 28px);
  letter-spacing: -0.015em;
  color: var(--pl-text);
  margin: .25rem 0 .25rem;
  line-height: 1.15;
}
.pl-prop-detail-meta { font-size: 12.5px; color: var(--pl-muted); font-family: ui-monospace, monospace; }
.pl-prop-detail-actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; justify-content: flex-end; position: relative; }

/* Metric cards (detail) */
.pl-prop-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 1.25rem;
}
.pl-prop-metric {
  background: var(--pl-bg-2);
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-r-md);
  padding: 1rem 1.15rem;
  position: relative;
  overflow: hidden;
  transition: border-color .2s, box-shadow .2s;
}
.pl-prop-metric::after {
  content: '';
  position: absolute; left: 0; right: 0; top: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--pl-bright), var(--pl-mid));
  opacity: .85;
}
.pl-prop-metric:hover { border-color: var(--pl-light-b); box-shadow: var(--pl-shadow-1); }
.pl-prop-metric-label { font-family: ui-monospace, monospace; font-size: 10.5px; color: var(--pl-muted); text-transform: uppercase; letter-spacing: .1em; margin-bottom: 6px; }
.pl-prop-metric-value { font-family: Georgia, serif; font-size: 22px; font-weight: 500; color: var(--pl-text); letter-spacing: -0.015em; line-height: 1.1; }
.pl-prop-metric-sub   { font-size: 11px; color: var(--pl-muted); margin-top: 4px; font-family: ui-monospace, monospace; }
@media (max-width: 880px) { .pl-prop-metric-grid { grid-template-columns: repeat(2, 1fr); } }

/* Alerts row */
.pl-prop-alert-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 1.25rem; }
.pl-prop-alert {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-family: Georgia, serif;
  border: 1px solid transparent;
}
.pl-prop-alert-amber { background: var(--pl-amber-bg); color: var(--pl-amber); border-color: color-mix(in oklab, var(--pl-amber) 30%, transparent); }
.pl-prop-alert-red   { background: var(--pl-red-bg);   color: var(--pl-red);   border-color: color-mix(in oklab, var(--pl-red)   30%, transparent); }
.pl-prop-alert-dot { width: 7px; height: 7px; border-radius: 50%; }
.pl-prop-alert-dot-amber { background: var(--pl-amber); box-shadow: 0 0 0 3px color-mix(in oklab, var(--pl-amber) 22%, transparent); }
.pl-prop-alert-dot-red   { background: var(--pl-red);   box-shadow: 0 0 0 3px color-mix(in oklab, var(--pl-red)   22%, transparent); }
.pl-prop-alert-msg { font-weight: 500; }
.pl-prop-alert-sep { opacity: .5; }
.pl-prop-alert-detail { font-family: ui-monospace, monospace; font-size: 11px; opacity: .85; }

/* Tabs */
.pl-prop-tabs {
  display: flex; gap: 4px;
  border-bottom: 1px solid var(--pl-border);
  margin-bottom: 1.25rem;
  overflow-x: auto;
}
.pl-prop-tab {
  font-family: Georgia, serif;
  font-size: 13.5px;
  padding: 10px 18px;
  background: transparent;
  border: 0;
  color: var(--pl-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color .15s, border-color .15s;
  display: inline-flex; align-items: center; gap: 8px;
  white-space: nowrap;
}
.pl-prop-tab:hover { color: var(--pl-text-2); }
.pl-prop-tab-active {
  color: var(--pl-mid);
  border-color: var(--pl-mid);
  font-weight: 500;
}
.pl-prop-tab-num {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px;
  border-radius: 50%;
  font-family: ui-monospace, monospace;
  font-size: 10px;
  background: var(--pl-bg-3);
  color: var(--pl-muted);
  border: 1px solid var(--pl-border);
}
.pl-prop-tab-active .pl-prop-tab-num { background: var(--pl-light); color: var(--pl-mid); border-color: var(--pl-light-b); }

/* Detail body grid */
.pl-prop-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pl-prop-card-full { grid-column: 1 / -1; }
.pl-prop-card .pl-prop-card,
.proflet-props .pl-prop-grid-2 > .pl-prop-card {
  background: var(--pl-bg-2);
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-r-md);
  padding: 1.2rem 1.4rem;
  position: relative;
  overflow: hidden;
}
.pl-prop-grid-2 > .pl-prop-card { background: var(--pl-bg-2); border: 1px solid var(--pl-border); border-radius: var(--pl-r-md); padding: 1.2rem 1.4rem; }
@media (max-width: 880px) { .pl-prop-grid-2 { grid-template-columns: 1fr; } }

.pl-prop-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: .25rem; }
.pl-prop-card-head .pl-prop-sec-head { margin: 0; }
.pl-prop-card-meta { font-family: ui-monospace, monospace; font-size: 11px; color: var(--pl-muted); }

.pl-prop-detail-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--pl-border);
  font-size: 13px;
}
.pl-prop-detail-row:last-child { border-bottom: 0; }
.pl-prop-detail-label { color: var(--pl-muted); }
.pl-prop-detail-value { font-weight: 500; color: var(--pl-text); font-family: ui-monospace, monospace; font-size: 12.5px; }

.pl-prop-line {
  display: flex; justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px solid var(--pl-border);
  font-size: 13px;
}
.pl-prop-line:last-of-type { border-bottom: 0; }
.pl-prop-line-label { color: var(--pl-muted); }
.pl-prop-line-value { font-weight: 500; color: var(--pl-text); font-family: ui-monospace, monospace; }
.pl-prop-empty { text-align: center; padding: 1.25rem; color: var(--pl-muted); font-size: 13px; }
.pl-prop-total {
  margin-top: .85rem;
  padding: .85rem 1rem;
  border-radius: 10px;
  display: flex; justify-content: space-between;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid transparent;
}
.pl-prop-total-green { background: var(--pl-light);  color: var(--pl-mid); border-color: var(--pl-light-b); }
.pl-prop-total-red   { background: var(--pl-red-bg); color: var(--pl-red); border-color: color-mix(in oklab, var(--pl-red) 28%, transparent); }
.pl-prop-total span:first-child { font-weight: 400; opacity: .85; }

.pl-prop-pl-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.pl-prop-pl-cell { background: var(--pl-bg-3); border-radius: 10px; padding: 1rem; text-align: center; border: 1px solid var(--pl-border); }
.pl-prop-pl-label { font-family: ui-monospace, monospace; font-size: 10.5px; color: var(--pl-muted); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 4px; }
.pl-prop-pl-value { font-family: Georgia, serif; font-size: 18px; font-weight: 500; letter-spacing: -0.01em; }
@media (max-width: 600px) { .pl-prop-pl-grid { grid-template-columns: 1fr; } }

.pl-prop-equity-card {
  margin-top: 1rem;
  padding: 1.1rem 1.25rem;
  background: linear-gradient(135deg, var(--pl-light) 0%, color-mix(in oklab, var(--pl-light) 60%, var(--pl-bg-2)) 100%);
  border: 1px solid var(--pl-light-b);
  border-radius: var(--pl-r-md);
}
.pl-prop-equity-label { font-family: ui-monospace, monospace; font-size: 10.5px; color: var(--pl-mid); text-transform: uppercase; letter-spacing: .1em; margin-bottom: 4px; font-weight: 500; }
.pl-prop-equity-value { font-family: Georgia, serif; font-size: 26px; font-weight: 500; color: var(--pl-mid); letter-spacing: -0.015em; }
.pl-prop-equity-sub { font-size: 11px; color: var(--pl-muted); margin-top: 2px; font-family: ui-monospace, monospace; }

.pl-prop-callout {
  margin-top: 1rem;
  padding: .85rem 1rem;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 500;
  border: 1px solid transparent;
}
.pl-prop-callout-green { background: var(--pl-light);    color: var(--pl-mid);   border-color: var(--pl-light-b); }
.pl-prop-callout-amber { background: var(--pl-amber-bg); color: var(--pl-amber); border-color: color-mix(in oklab, var(--pl-amber) 28%, transparent); }
.pl-prop-callout-red   { background: var(--pl-red-bg);   color: var(--pl-red);   border-color: color-mix(in oklab, var(--pl-red)   28%, transparent); }

.pl-prop-notes { font-size: 13.5px; color: var(--pl-text-2); line-height: 1.65; }

/* Modal */
.pl-prop-modal-bg {
  position: fixed; inset: 0;
  background: color-mix(in oklab, #07140A 70%, transparent);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2.5rem 1rem;
  z-index: 1000;
  overflow-y: auto;
  animation: pl-prop-fade .25s ease both;
}
@keyframes pl-prop-fade { from { opacity: 0 } to { opacity: 1 } }
.pl-prop-modal {
  position: relative;
  width: 100%;
  max-width: 600px;
  background: var(--pl-bg-2);
  border: 1px solid var(--pl-border-2);
  border-radius: 22px;
  box-shadow: var(--pl-shadow-3);
  overflow: hidden;
  animation: pl-prop-pop .35s cubic-bezier(.2,.7,.2,1) both;
}
@keyframes pl-prop-pop {
  from { opacity: 0; transform: translateY(12px) scale(.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
}
.pl-prop-modal-glow {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 80% 40% at 50% 0%, color-mix(in oklab, var(--pl-bright) 18%, transparent), transparent 70%);
  pointer-events: none;
}
.pl-prop-modal-head {
  position: relative;
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  padding: 1.5rem 1.75rem 1rem;
}
.pl-prop-modal-title { font-family: Georgia, serif; font-size: 22px; font-weight: 500; letter-spacing: -0.015em; margin: .35rem 0 0; color: var(--pl-text); }
.pl-prop-modal-close {
  background: var(--pl-bg-3);
  border: 1px solid var(--pl-border);
  border-radius: 999px;
  width: 32px; height: 32px;
  font-size: 20px;
  line-height: 1;
  color: var(--pl-muted);
  cursor: pointer;
  transition: color .15s, border-color .15s;
}
.pl-prop-modal-close:hover { color: var(--pl-text); border-color: var(--pl-border-2); }

.pl-prop-tabs-form { padding: 0 1.75rem; margin-bottom: 1.25rem; border-bottom: 1px solid var(--pl-border); }
.pl-prop-tabs-form .pl-prop-tab { padding: 10px 14px; font-size: 13px; }

.pl-prop-form-body { padding: 0 1.75rem 1rem; }
.pl-prop-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pl-prop-field { display: flex; flex-direction: column; gap: 5px; }
.pl-prop-field-full { grid-column: 1 / -1; }
.pl-prop-field-label { font-family: ui-monospace, monospace; font-size: 10.5px; color: var(--pl-muted); text-transform: uppercase; letter-spacing: .1em; }
.pl-prop-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--pl-border);
  background: var(--pl-bg);
  color: var(--pl-text);
  font-family: Georgia, serif;
  font-size: 13.5px;
  outline: 0;
  transition: border-color .15s, box-shadow .15s;
}
.pl-prop-input:focus { border-color: var(--pl-mid); box-shadow: 0 0 0 3px color-mix(in oklab, var(--pl-mid) 18%, transparent); }
.pl-prop-textarea { resize: vertical; min-height: 64px; }

.pl-prop-modal-foot {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.75rem 1.25rem;
  border-top: 1px solid var(--pl-border);
  background: var(--pl-bg-3);
}
.pl-prop-step-dots { display: inline-flex; gap: 6px; }
.pl-prop-step-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--pl-border);
  transition: background .2s;
}
.pl-prop-step-dot-on { background: var(--pl-mid); }
.pl-prop-modal-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }

@media (max-width: 600px) {
  .pl-prop-form-grid { grid-template-columns: 1fr; }
  .pl-prop-modal-head, .pl-prop-form-body, .pl-prop-modal-foot, .pl-prop-tabs-form { padding-left: 1.25rem; padding-right: 1.25rem; }
}
    `}</style>
  )
}
