import { useState, useRef } from 'react'
import { supabase } from '../supabase'

function fmtMoney(n) { return '£' + Math.round(n || 0).toLocaleString() }
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_TONE = {
  Received: 'pl-tone-green',
  Pending:  'pl-tone-amber',
  Overdue:  'pl-tone-red',
}

const EMPTY_FORM = {
  property_id: '',
  type: 'Rent',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  status: 'Received',
  notes: '',
}

export default function Income({ session, income, props, reload }) {
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [filterProp, setFilterProp] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [importRows, setImportRows] = useState([])
  const [importErrors, setImportErrors] = useState([])
  const [importing, setImporting] = useState(false)
  const fileRef = useRef(null)

  const total       = income.filter(i => i.status === 'Received').reduce((s, i) => s + (i.amount || 0), 0)
  const outstanding = income.filter(i => i.status !== 'Received').reduce((s, i) => s + (i.amount || 0), 0)
  const propName = (id) => props.find(p => p.id === id)?.name || '—'
  const propByName = (name) => props.find(p => p.name.toLowerCase().trim() === name.toLowerCase().trim())

  const filtered = income
    .filter(i => filterProp === 'all'   || i.property_id === filterProp)
    .filter(i => filterStatus === 'all' || i.status === filterStatus)
    .slice()
    .sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return new Date(b.date) - new Date(a.date)
    })

  function downloadTemplate() {
    const headers = ['Property Name', 'Type', 'Amount', 'Date (DD/MM/YYYY)', 'Status', 'Notes']
    const examples = props.length
      ? props.map(p => [p.name, 'Rent', p.monthly_rent || '950', '01/05/2026', 'Received', ''])
      : [['35 Lincoln Way', 'Rent', '950', '01/05/2026', 'Received', 'May 2026 rent']]
    const csv = [headers, ...examples]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'proflet-income-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function parseDate(str) {
    if (!str) return null
    const clean = str.trim()
    const dmyMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2].padStart(2,'0')}-${dmyMatch[1].padStart(2,'0')}`
    const isoMatch = clean.match(/^\d{4}-\d{2}-\d{2}$/)
    if (isoMatch) return clean
    return null
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) { alert('CSV appears to be empty'); return }
      const rows = []
      const errors = []
      lines.slice(1).forEach((line, idx) => {
        const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim())
        const [propNameRaw, type, amountRaw, dateRaw, status, notes] = cols
        const rowNum = idx + 2
        const rowErrors = []
        const matchedProp = propByName(propNameRaw || '')
        if (!propNameRaw) rowErrors.push('Property name missing')
        else if (!matchedProp) rowErrors.push(`Property "${propNameRaw}" not found in Proflet`)
        const amount = parseFloat(amountRaw)
        if (!amountRaw || isNaN(amount) || amount <= 0) rowErrors.push('Invalid amount')
        const date = parseDate(dateRaw)
        if (!date) rowErrors.push('Invalid date — use DD/MM/YYYY')
        const validStatuses = ['Received', 'Pending', 'Overdue']
        const cleanStatus = status || 'Received'
        if (!validStatuses.includes(cleanStatus)) rowErrors.push(`Invalid status "${cleanStatus}"`)
        if (rowErrors.length) {
          errors.push({ row: rowNum, errors: rowErrors, raw: line })
        } else {
          rows.push({ property_id: matchedProp.id, property_name: matchedProp.name, type: type || 'Rent', amount, date, status: cleanStatus, notes: notes || null, user_id: session.user.id })
        }
      })
      setImportRows(rows)
      setImportErrors(errors)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function confirmImport() {
    if (!importRows.length) return
    setImporting(true)
    const { error } = await supabase.from('income').insert(importRows.map(({ property_name, ...row }) => row))
    setImporting(false)
    if (error) {
      alert('Import failed: ' + error.message)
    } else {
      alert(`Successfully imported ${importRows.length} income records!`)
      setShowImport(false); setImportRows([]); setImportErrors([])
      reload()
    }
  }

  function openAdd() { setForm({ ...EMPTY_FORM }); setEditing(null); setShowForm(true) }
  function openEdit(i) { setForm(i); setEditing(i.id); setShowForm(true) }
  function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  async function save() {
    if (!form.amount) { alert('Amount is required'); return }
    if (!form.property_id) { alert('Please select a property'); return }
    setSaving(true)
    const payload = { property_id: form.property_id, type: form.type, amount: parseFloat(form.amount), date: form.date || null, status: form.status, notes: form.notes || null, user_id: session.user.id }
    if (editing) await supabase.from('income').update(payload).eq('id', editing)
    else         await supabase.from('income').insert(payload)
    setSaving(false)
    setShowForm(false); setForm({ ...EMPTY_FORM }); setEditing(null)
    reload()
  }

  async function del(id) {
    if (!confirm('Delete this record?')) return
    await supabase.from('income').delete().eq('id', id)
    reload()
  }

  async function updateStatus(id, status) {
    await supabase.from('income').update({ status }).eq('id', id)
    reload()
  }

  function exportCSV() {
    const headers = ['Property', 'Type', 'Amount (£)', 'Date', 'Status', 'Notes']
    const rows = income
      .slice().sort((a, b) => { if (!a.date && !b.date) return 0; if (!a.date) return 1; if (!b.date) return -1; return new Date(b.date) - new Date(a.date) })
      .map(i => [propName(i.property_id), i.type || '', i.amount || 0, i.date ? new Date(i.date).toLocaleDateString('en-GB') : '', i.status || '', i.notes || ''])
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `proflet-income-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="proflet-income">
      <IncomeStyles />

      <div className="pl-inc-page-head">
        <div>
          <div className="pl-inc-eyebrow">Cashflow</div>
          <h1 className="pl-inc-page-title">Income</h1>
          <div className="pl-inc-page-sub">{income.length} record{income.length === 1 ? '' : 's'} · track rent, deposits and other money in.</div>
        </div>
        <div className="pl-inc-page-actions">
          <button onClick={exportCSV} className="pl-inc-btn pl-inc-btn-ghost">↓ Export CSV</button>
          <button onClick={() => { if (!props.length) { alert('Please add your properties first before importing income records.'); return }; setImportRows([]); setImportErrors([]); setShowImport(true) }} className="pl-inc-btn pl-inc-btn-ghost">↑ Import CSV</button>
          <button onClick={openAdd} className="pl-inc-btn pl-inc-btn-primary"><span>+ Add income</span></button>
        </div>
      </div>

      <div className="pl-inc-metric-grid">
        <MetricCard label="Total received" value={fmtMoney(total)} accent="green" sub="Rent marked as paid" />
        <MetricCard label="Outstanding" value={fmtMoney(outstanding)} accent={outstanding > 0 ? 'amber' : 'green'} sub={outstanding > 0 ? 'Pending or overdue' : 'All caught up'} />
        <MetricCard label="Records" value={income.length} accent="neutral" sub="Across all properties" />
      </div>

      <div className="pl-inc-filter-row">
        <div className="pl-inc-select-wrap">
          <select value={filterProp} onChange={e => setFilterProp(e.target.value)} className="pl-inc-select">
            <option value="all">All properties</option>
            {props.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Caret />
        </div>
        <div className="pl-inc-select-wrap">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="pl-inc-select">
            <option value="all">All statuses</option>
            <option value="Received">Received</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
          </select>
          <Caret />
        </div>
        <div className="pl-inc-filter-meta">{filtered.length} of {income.length}</div>
      </div>

      <div className="pl-inc-table-card">
        <div className="pl-inc-table-scroll">
          <table className="pl-inc-table">
            <thead>
              <tr>{['Property', 'Type', 'Amount', 'Date', 'Notes', 'Status', ''].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {!filtered.length && (
                <tr>
                  <td colSpan={7} className="pl-inc-empty">
                    <div className="pl-inc-empty-mark">
                      <svg width="22" height="22" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="7" cy="7" r="5" /><path d="M7 4v6M5 6h4M5 8h4" />
                      </svg>
                    </div>
                    <div className="pl-inc-empty-title">{income.length === 0 ? 'No income recorded yet' : 'No matches'}</div>
                    <div className="pl-inc-empty-text">{income.length === 0 ? 'Add your first income record to start tracking rent and deposits.' : 'Try a different filter or add a new record.'}</div>
                  </td>
                </tr>
              )}
              {filtered.map(i => (
                <tr key={i.id} className="pl-inc-row">
                  <td className="pl-inc-cell-name">{propName(i.property_id)}</td>
                  <td className="pl-inc-cell-mono">{i.type || '—'}</td>
                  <td className="pl-inc-cell-amount">{fmtMoney(i.amount)}</td>
                  <td className="pl-inc-cell-mono">{fmtDate(i.date)}</td>
                  <td className="pl-inc-cell-notes">{i.notes || '—'}</td>
                  <td>
                    <div className={`pl-inc-status-wrap ${STATUS_TONE[i.status] || 'pl-tone-muted'}`}>
                      <select value={i.status || 'Pending'} onChange={e => updateStatus(i.id, e.target.value)} className="pl-inc-status-select">
                        <option value="Received">Received</option>
                        <option value="Pending">Pending</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    </div>
                  </td>
                  <td>
                    <div className="pl-inc-row-actions">
                      <button onClick={() => openEdit(i)} className="pl-inc-row-edit">Edit</button>
                      <button onClick={() => del(i.id)} className="pl-inc-row-del">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showImport && (
        <div className="pl-inc-modal-bg" onClick={() => setShowImport(false)}>
          <div className="pl-inc-modal" style={{ maxWidth: '620px' }} onClick={e => e.stopPropagation()}>
            <div className="pl-inc-modal-glow" aria-hidden="true" />
            <div className="pl-inc-modal-head">
              <div>
                <div className="pl-inc-eyebrow">Import</div>
                <h2 className="pl-inc-modal-title">Import income from CSV</h2>
              </div>
              <button onClick={() => setShowImport(false)} className="pl-inc-modal-close" aria-label="Close">×</button>
            </div>
            <div className="pl-inc-form-body">
              <div className="pl-import-step">
                <div className="pl-import-step-num">1</div>
                <div className="pl-import-step-body">
                  <div className="pl-import-step-title">Download the template</div>
                  <div className="pl-import-step-desc">Get a CSV template with your property names already filled in.</div>
                  <button onClick={downloadTemplate} className="pl-inc-btn pl-inc-btn-ghost" style={{ marginTop: '10px' }}>↓ Download template</button>
                </div>
              </div>
              <div className="pl-import-step">
                <div className="pl-import-step-num">2</div>
                <div className="pl-import-step-body">
                  <div className="pl-import-step-title">Upload your completed CSV</div>
                  <div className="pl-import-step-desc">Select your filled-in CSV file to preview before importing.</div>
                  <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
                  <button onClick={() => fileRef.current.click()} className="pl-inc-btn pl-inc-btn-ghost" style={{ marginTop: '10px' }}>↑ Choose file</button>
                </div>
              </div>
              {importErrors.length > 0 && (
                <div className="pl-import-errors">
                  <div className="pl-import-errors-title">⚠ {importErrors.length} row{importErrors.length > 1 ? 's' : ''} with errors — these will be skipped</div>
                  {importErrors.map((e, i) => (
                    <div key={i} className="pl-import-error-row">
                      <span className="pl-import-error-row-num">Row {e.row}</span>
                      <span>{e.errors.join(' · ')}</span>
                    </div>
                  ))}
                </div>
              )}
              {importRows.length > 0 && (
                <div className="pl-import-preview">
                  <div className="pl-import-preview-title">✓ {importRows.length} record{importRows.length > 1 ? 's' : ''} ready to import</div>
                  <div className="pl-import-table-wrap">
                    <table className="pl-inc-table" style={{ fontSize: '12px' }}>
                      <thead><tr>{['Property', 'Type', 'Amount', 'Date', 'Status', 'Notes'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                      <tbody>
                        {importRows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="pl-inc-row">
                            <td className="pl-inc-cell-name">{row.property_name}</td>
                            <td className="pl-inc-cell-mono">{row.type}</td>
                            <td className="pl-inc-cell-amount">{fmtMoney(row.amount)}</td>
                            <td className="pl-inc-cell-mono">{fmtDate(row.date)}</td>
                            <td><span className={`pl-inc-status-wrap ${STATUS_TONE[row.status] || 'pl-tone-muted'}`} style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px' }}>{row.status}</span></td>
                            <td className="pl-inc-cell-notes">{row.notes || '—'}</td>
                          </tr>
                        ))}
                        {importRows.length > 5 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '8px', color: 'var(--pl-muted)', fontSize: '12px' }}>+ {importRows.length - 5} more records</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="pl-inc-modal-foot">
              <button onClick={() => setShowImport(false)} className="pl-inc-btn pl-inc-btn-ghost">Cancel</button>
              {importRows.length > 0 && (
                <button onClick={confirmImport} disabled={importing} className="pl-inc-btn pl-inc-btn-primary" style={{ opacity: importing ? .7 : 1 }}>
                  {importing ? 'Importing…' : `Import ${importRows.length} records`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="pl-inc-modal-bg" onClick={() => setShowForm(false)}>
          <div className="pl-inc-modal" onClick={e => e.stopPropagation()}>
            <div className="pl-inc-modal-glow" aria-hidden="true" />
            <div className="pl-inc-modal-head">
              <div>
                <div className="pl-inc-eyebrow">{editing ? 'Edit' : 'Add'} income</div>
                <h2 className="pl-inc-modal-title">{editing ? 'Edit record' : 'New income record'}</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="pl-inc-modal-close" aria-label="Close">×</button>
            </div>
            <div className="pl-inc-form-body">
              <div className="pl-inc-form-grid">
                <Field full label="Property *">
                  <select value={form.property_id} onChange={e => setField('property_id', e.target.value)} className="pl-inc-input">
                    <option value="">— Select property —</option>
                    {props.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label="Type">
                  <select value={form.type} onChange={e => setField('type', e.target.value)} className="pl-inc-input">
                    <option value="Rent">Rent</option>
                    <option value="Deposit">Deposit</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>
                <Field label="Amount (£) *">
                  <input type="number" value={form.amount} onChange={e => setField('amount', e.target.value)} placeholder="0.00" className="pl-inc-input" />
                </Field>
                <Field label="Date received">
                  <input type="date" value={form.date} onChange={e => setField('date', e.target.value)} className="pl-inc-input" />
                </Field>
                <Field label="Status">
                  <select value={form.status} onChange={e => setField('status', e.target.value)} className="pl-inc-input">
                    <option value="Received">Received</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </Field>
                <Field full label="Notes">
                  <input type="text" value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="e.g. April 2026 rent" className="pl-inc-input" />
                </Field>
              </div>
              {form.property_id && form.amount && (
                <div className="pl-inc-preview">
                  <span className="pl-inc-preview-label">Preview</span>
                  <span className="pl-inc-preview-name">{propName(form.property_id)}</span>
                  <span className="pl-inc-preview-sep">·</span>
                  <span>{form.type}</span>
                  <span className="pl-inc-preview-sep">·</span>
                  <span className="pl-inc-preview-amt">{fmtMoney(parseFloat(form.amount) || 0)}</span>
                  <span className="pl-inc-preview-sep">·</span>
                  <span className={`pl-inc-preview-status ${STATUS_TONE[form.status]}`}>{form.status}</span>
                </div>
              )}
            </div>
            <div className="pl-inc-modal-foot">
              <button onClick={() => setShowForm(false)} className="pl-inc-btn pl-inc-btn-ghost">Cancel</button>
              <button onClick={save} disabled={saving} className="pl-inc-btn pl-inc-btn-primary" style={{ opacity: saving ? .7 : 1 }}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add income'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, accent = 'neutral', sub }) {
  return (
    <div className={`pl-inc-metric pl-inc-metric-${accent}`}>
      <div className="pl-inc-metric-accent" />
      <div className="pl-inc-metric-label">{label}</div>
      <div className="pl-inc-metric-value">{value}</div>
      {sub && <div className="pl-inc-metric-sub">{sub}</div>}
    </div>
  )
}

function Field({ label, full, children }) {
  return (
    <label className={`pl-inc-field ${full ? 'pl-inc-field-full' : ''}`}>
      <span className="pl-inc-field-label">{label}</span>
      {children}
    </label>
  )
}

function Caret() {
  return (
    <svg className="pl-inc-select-caret" width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 5.5L7 9.5l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IncomeStyles() {
  return (
    <style>{`
.proflet-income {
  --pl-dark:    #173404;
  --pl-mid:     #6FAD2A;
  --pl-bright:  #8FCB3C;
  --pl-light:   oklch(28% 0.040 130);
  --pl-light-b: oklch(34% 0.050 130);
  --pl-red:     #F87171;
  --pl-red-bg:  oklch(28% 0.08 25);
  --pl-amber:   #FCD34D;
  --pl-amber-bg:oklch(28% 0.08 70);
  --pl-bg:      oklch(16% 0.020 145);
  --pl-bg-2:    oklch(19% 0.022 145);
  --pl-bg-3:    oklch(14% 0.018 145);
  --pl-text:    oklch(96% 0.012 110);
  --pl-text-2:  oklch(82% 0.015 120);
  --pl-muted:   oklch(65% 0.018 130);
  --pl-border:  oklch(28% 0.020 145);
  --pl-border-2:oklch(34% 0.022 145);
  --pl-shadow-1: 0 1px 2px rgba(0,0,0,.4), 0 4px 18px -8px rgba(0,0,0,.5);
  --pl-shadow-2: 0 2px 6px rgba(0,0,0,.4), 0 18px 60px -20px rgba(0,0,0,.6);
  --pl-shadow-3: 0 30px 100px -30px rgba(0,0,0,.7), 0 4px 12px rgba(0,0,0,.4);
  --pl-r-md: 12px; --pl-r-lg: 18px;
  font-family: Georgia, 'Times New Roman', serif;
  color: var(--pl-text);
  -webkit-font-smoothing: antialiased;
}
.proflet-income * { box-sizing: border-box; }

.pl-inc-eyebrow { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 11px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--pl-mid); display: inline-flex; align-items: center; gap: 8px; }
.pl-inc-eyebrow::before { content: ''; width: 22px; height: 1px; background: currentColor; opacity: .5; display: inline-block; }
.pl-inc-page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 1.5rem; }
.pl-inc-page-title { font-family: Georgia, serif; font-weight: 500; font-size: clamp(28px, 3.4vw, 38px); letter-spacing: -0.02em; margin: .35rem 0 .25rem; color: var(--pl-text); line-height: 1.1; }
.pl-inc-page-sub { font-size: 13px; color: var(--pl-muted); }
.pl-inc-page-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

.pl-inc-btn { font-family: Georgia, serif; font-weight: 500; letter-spacing: -0.005em; font-size: 13.5px; padding: 9px 18px; border-radius: 999px; border: 0; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; transition: transform .18s ease, box-shadow .18s ease, background .18s ease; }
.pl-inc-btn-primary { color: white; background: linear-gradient(180deg, var(--pl-bright) 0%, var(--pl-mid) 100%); box-shadow: 0 1px 0 rgba(255,255,255,.25) inset, 0 -1px 0 rgba(0,0,0,.15) inset, 0 8px 22px -8px rgba(59,109,17,.55), 0 2px 4px rgba(20,40,10,.18); }
.pl-inc-btn-primary:hover { transform: translateY(-1px); }
.pl-inc-btn-ghost { background: var(--pl-light); color: var(--pl-mid); border: 1px solid var(--pl-light-b); }
.pl-inc-btn-ghost:hover { background: color-mix(in oklab, var(--pl-light) 75%, var(--pl-light-b)); }

.pl-inc-metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 1.25rem; }
.pl-inc-metric { position: relative; background: var(--pl-bg-2); border: 1px solid var(--pl-border); border-radius: var(--pl-r-md); padding: 1.1rem 1.3rem 1.15rem; overflow: hidden; box-shadow: var(--pl-shadow-1); transition: border-color .2s, box-shadow .2s, transform .2s; }
.pl-inc-metric:hover { transform: translateY(-1px); box-shadow: var(--pl-shadow-2); border-color: var(--pl-light-b); }
.pl-inc-metric-accent { position: absolute; left: 0; right: 0; top: 0; height: 2px; }
.pl-inc-metric-green .pl-inc-metric-accent { background: linear-gradient(90deg, var(--pl-bright), var(--pl-mid)); }
.pl-inc-metric-amber .pl-inc-metric-accent { background: linear-gradient(90deg, #F59E0B, var(--pl-amber)); }
.pl-inc-metric-neutral .pl-inc-metric-accent { background: linear-gradient(90deg, var(--pl-border-2), var(--pl-border)); }
.pl-inc-metric-label { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 10.5px; text-transform: uppercase; letter-spacing: .1em; color: var(--pl-muted); margin-bottom: 6px; }
.pl-inc-metric-value { font-family: Georgia, serif; font-size: 28px; font-weight: 500; letter-spacing: -0.02em; line-height: 1.1; color: var(--pl-text); }
.pl-inc-metric-green .pl-inc-metric-value { color: var(--pl-mid); }
.pl-inc-metric-amber .pl-inc-metric-value { color: var(--pl-amber); }
.pl-inc-metric-sub { font-family: ui-monospace, monospace; font-size: 11px; color: var(--pl-muted); margin-top: 6px; }
@media (max-width: 720px) { .pl-inc-metric-grid { grid-template-columns: 1fr; } }

.pl-inc-filter-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 1rem; }
.pl-inc-filter-meta { margin-left: auto; font-family: ui-monospace, monospace; font-size: 11px; text-transform: uppercase; letter-spacing: .1em; color: var(--pl-muted); }
.pl-inc-select-wrap { position: relative; display: inline-flex; }
.pl-inc-select { font-family: Georgia, serif; font-size: 13px; background: var(--pl-bg-2); border: 1px solid var(--pl-border); color: var(--pl-text); padding: 8px 30px 8px 14px; border-radius: 999px; appearance: none; cursor: pointer; }
.pl-inc-select:focus { outline: 0; border-color: var(--pl-mid); box-shadow: 0 0 0 3px color-mix(in oklab, var(--pl-mid) 18%, transparent); }
.pl-inc-select-caret { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--pl-muted); pointer-events: none; }

.pl-inc-table-card { background: var(--pl-bg-2); border: 1px solid var(--pl-border); border-radius: var(--pl-r-lg); box-shadow: var(--pl-shadow-1); overflow: hidden; }
.pl-inc-table-scroll { overflow-x: auto; }
.pl-inc-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.pl-inc-table thead tr { background: var(--pl-bg-3); border-bottom: 1px solid var(--pl-border); }
.pl-inc-table th { text-align: left; padding: 11px 16px; font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 10.5px; font-weight: 500; text-transform: uppercase; letter-spacing: .1em; color: var(--pl-muted); white-space: nowrap; }
.pl-inc-table tbody tr.pl-inc-row { border-bottom: 1px solid var(--pl-border); transition: background .15s; }
.pl-inc-table tbody tr.pl-inc-row:last-child { border-bottom: 0; }
.pl-inc-table tbody tr.pl-inc-row:hover { background: var(--pl-bg-3); }
.pl-inc-table td { padding: 12px 16px; vertical-align: middle; }
.pl-inc-cell-name { font-family: Georgia, serif; font-weight: 500; color: var(--pl-text); }
.pl-inc-cell-mono { font-family: ui-monospace, monospace; font-size: 12.5px; color: var(--pl-text-2); }
.pl-inc-cell-amount { font-family: Georgia, serif; font-weight: 500; color: var(--pl-mid); font-size: 14px; }
.pl-inc-cell-notes { color: var(--pl-muted); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }

.pl-inc-status-wrap { display: inline-flex; align-items: center; border-radius: 999px; border: 1px solid transparent; }
.pl-inc-status-select { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 11px; font-weight: 500; padding: 4px 22px 4px 12px; border-radius: 999px; border: 0; background: transparent; color: inherit; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' fill='none'><path d='M3 5.5L7 9.5l4-4' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>"); background-repeat: no-repeat; background-position: right 6px center; background-size: 9px; }
.pl-tone-green  { background: var(--pl-light);    color: var(--pl-mid);   border-color: var(--pl-light-b); }
.pl-tone-amber  { background: var(--pl-amber-bg); color: var(--pl-amber); border-color: color-mix(in oklab, var(--pl-amber) 28%, transparent); }
.pl-tone-red    { background: var(--pl-red-bg);   color: var(--pl-red);   border-color: color-mix(in oklab, var(--pl-red) 28%, transparent); }
.pl-tone-muted  { background: var(--pl-bg-3);     color: var(--pl-muted); border-color: var(--pl-border); }

.pl-inc-row-actions { display: inline-flex; gap: 6px; }
.pl-inc-row-edit, .pl-inc-row-del { font-family: Georgia, serif; font-size: 12px; padding: 5px 12px; border-radius: 999px; cursor: pointer; background: transparent; transition: background .15s, color .15s, border-color .15s; }
.pl-inc-row-edit { color: var(--pl-mid); border: 1px solid var(--pl-light-b); background: var(--pl-light); font-weight: 500; }
.pl-inc-row-edit:hover { background: color-mix(in oklab, var(--pl-light) 75%, var(--pl-light-b)); }
.pl-inc-row-del { color: var(--pl-muted); border: 1px solid var(--pl-border); }
.pl-inc-row-del:hover { color: var(--pl-red); border-color: var(--pl-red); background: var(--pl-red-bg); }

.pl-inc-empty { text-align: center; padding: 3rem 1.5rem; }
.pl-inc-empty-mark { width: 48px; height: 48px; border-radius: 14px; background: var(--pl-light); border: 1px solid var(--pl-light-b); color: var(--pl-mid); display: inline-flex; align-items: center; justify-content: center; margin-bottom: .85rem; }
.pl-inc-empty-title { font-family: Georgia, serif; font-size: 17px; font-weight: 500; color: var(--pl-text); margin-bottom: .25rem; }
.pl-inc-empty-text { font-size: 13px; color: var(--pl-muted); }

.pl-inc-modal-bg { position: fixed; inset: 0; background: color-mix(in oklab, #07140A 70%, transparent); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); display: flex; align-items: flex-start; justify-content: center; padding: 2.5rem 1rem; z-index: 1000; overflow-y: auto; animation: pl-inc-fade .25s ease both; }
@keyframes pl-inc-fade { from { opacity: 0 } to { opacity: 1 } }
.pl-inc-modal { position: relative; width: 100%; max-width: 520px; background: var(--pl-bg-2); border: 1px solid var(--pl-border-2); border-radius: 22px; box-shadow: var(--pl-shadow-3); overflow: hidden; animation: pl-inc-pop .35s cubic-bezier(.2,.7,.2,1) both; }
@keyframes pl-inc-pop { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
.pl-inc-modal-glow { position: absolute; inset: 0; background: radial-gradient(ellipse 80% 40% at 50% 0%, color-mix(in oklab, var(--pl-bright) 18%, transparent), transparent 70%); pointer-events: none; }
.pl-inc-modal-head { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 1.5rem 1.75rem 1rem; }
.pl-inc-modal-title { font-family: Georgia, serif; font-size: 22px; font-weight: 500; letter-spacing: -0.015em; margin: .35rem 0 0; color: var(--pl-text); }
.pl-inc-modal-close { background: var(--pl-bg-3); border: 1px solid var(--pl-border); border-radius: 999px; width: 32px; height: 32px; font-size: 20px; line-height: 1; color: var(--pl-muted); cursor: pointer; }
.pl-inc-modal-close:hover { color: var(--pl-text); border-color: var(--pl-border-2); }
.pl-inc-form-body { padding: 0 1.75rem 1.25rem; position: relative; }
.pl-inc-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pl-inc-field { display: flex; flex-direction: column; gap: 5px; }
.pl-inc-field-full { grid-column: 1 / -1; }
.pl-inc-field-label { font-family: ui-monospace, monospace; font-size: 10.5px; color: var(--pl-muted); text-transform: uppercase; letter-spacing: .1em; }
.pl-inc-input { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--pl-border); background: var(--pl-bg); color: var(--pl-text); font-family: Georgia, serif; font-size: 13.5px; outline: 0; transition: border-color .15s, box-shadow .15s; color-scheme: dark; }
.pl-inc-input:focus { border-color: var(--pl-mid); box-shadow: 0 0 0 3px color-mix(in oklab, var(--pl-mid) 18%, transparent); }
.pl-inc-preview { margin-top: 1rem; padding: 12px 16px; background: var(--pl-light); border: 1px solid var(--pl-light-b); border-radius: 12px; font-size: 13px; color: var(--pl-mid); display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.pl-inc-preview-label { font-family: ui-monospace, monospace; font-size: 10px; text-transform: uppercase; letter-spacing: .12em; background: color-mix(in oklab, var(--pl-mid) 18%, transparent); color: var(--pl-mid); padding: 2px 8px; border-radius: 999px; }
.pl-inc-preview-name { font-weight: 500; color: var(--pl-text); }
.pl-inc-preview-amt { font-family: Georgia, serif; font-weight: 500; }
.pl-inc-preview-sep { opacity: .5; }
.pl-inc-preview-status { font-family: ui-monospace, monospace; font-size: 10.5px; text-transform: uppercase; letter-spacing: .08em; padding: 2px 8px; border-radius: 999px; border: 1px solid; }
.pl-inc-modal-foot { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 1rem 1.75rem 1.25rem; border-top: 1px solid var(--pl-border); background: var(--pl-bg-3); }

.pl-import-step { display: flex; gap: 14px; margin-bottom: 1.25rem; align-items: flex-start; }
.pl-import-step-num { width: 28px; height: 28px; border-radius: 50%; background: var(--pl-light); border: 1px solid var(--pl-light-b); color: var(--pl-mid); display: flex; align-items: center; justify-content: center; font-family: ui-monospace, monospace; font-size: 12px; font-weight: 500; flex-shrink: 0; margin-top: 2px; }
.pl-import-step-title { font-family: Georgia, serif; font-size: 15px; font-weight: 500; color: var(--pl-text); margin-bottom: 3px; }
.pl-import-step-desc { font-size: 13px; color: var(--pl-muted); line-height: 1.5; }
.pl-import-errors { background: var(--pl-red-bg); border: 1px solid color-mix(in oklab, var(--pl-red) 28%, transparent); border-radius: 10px; padding: 12px 14px; margin-bottom: 1rem; }
.pl-import-errors-title { font-size: 13px; font-weight: 500; color: var(--pl-red); margin-bottom: 8px; }
.pl-import-error-row { font-size: 12px; color: var(--pl-red); margin-bottom: 4px; display: flex; gap: 8px; }
.pl-import-error-row-num { font-family: ui-monospace, monospace; font-weight: 500; flex-shrink: 0; }
.pl-import-preview { background: var(--pl-light); border: 1px solid var(--pl-light-b); border-radius: 10px; padding: 12px 14px; margin-bottom: 1rem; }
.pl-import-preview-title { font-size: 13px; font-weight: 500; color: var(--pl-mid); margin-bottom: 10px; }
.pl-import-table-wrap { overflow-x: auto; border-radius: 8px; background: var(--pl-bg-2); }

@media (max-width: 600px) {
  .pl-inc-form-grid { grid-template-columns: 1fr; }
  .pl-inc-modal-head, .pl-inc-form-body, .pl-inc-modal-foot { padding-left: 1.25rem; padding-right: 1.25rem; }
}
    `}</style>
  )
}
