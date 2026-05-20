import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

const expenseTypes = ['Mortgage', 'Repairs', 'Insurance', 'Utilities', 'Management fee', 'Service charge', 'Legal', 'Tax', 'Other']

const EMPTY_FORM = {
  property_id: '',
  type: 'Mortgage',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  recurring: 'no',
  notes: ''
}

function fmtMoney(n) { return '£' + Math.round(n || 0).toLocaleString() }
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Expenses({ session, expenses, props, reload }) {
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [filterProp, setFilterProp] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [importRows, setImportRows] = useState([])
  const [importErrors, setImportErrors] = useState([])
  const [importing, setImporting] = useState(false)
  const fileRef = useRef(null)

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

  useEffect(() => {
    if (!showImport) return
    const onKey = (e) => { if (e.key === 'Escape') setShowImport(false) }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [showImport])

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const recurring = expenses.filter(e => e.recurring).reduce((s, e) => s + (e.amount || 0), 0)
  const propName = (id) => props.find(p => p.id === id)?.name || '—'
  const propByName = (name) => props.find(p => p.name.toLowerCase().trim() === name.toLowerCase().trim())

  const filtered = expenses
    .filter(e => filterProp === 'all' || e.property_id === filterProp)
    .filter(e => filterType === 'all' || e.type === filterType)
    .slice()
    .sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return new Date(b.date) - new Date(a.date)
    })

  function parseDate(str) {
    if (!str) return null
    const clean = str.trim()
    const dmyMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2].padStart(2,'0')}-${dmyMatch[1].padStart(2,'0')}`
    const isoMatch = clean.match(/^\d{4}-\d{2}-\d{2}$/)
    if (isoMatch) return clean
    return null
  }

  function downloadTemplate() {
    const headers = ['Property Name', 'Type', 'Amount', 'Date (DD/MM/YYYY)', 'Recurring (yes/no)', 'Notes']
    const examples = props.length
      ? props.map(p => [p.name, 'Mortgage', '500', '01/05/2026', 'yes', ''])
      : [['35 Lincoln Way', 'Mortgage', '640', '01/05/2026', 'yes', 'NatWest']]
    const csv = [headers, ...examples]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'proflet-expenses-template.csv'
    a.click()
    URL.revokeObjectURL(url)
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
        const [propNameRaw, type, amountRaw, dateRaw, recurringRaw, notes] = cols
        const rowNum = idx + 2
        const rowErrors = []

        const matchedProp = propByName(propNameRaw || '')
        if (!propNameRaw) rowErrors.push('Property name missing')
        else if (!matchedProp) rowErrors.push(`Property "${propNameRaw}" not found in Proflet`)

        const amount = parseFloat(amountRaw)
        if (!amountRaw || isNaN(amount) || amount <= 0) rowErrors.push('Invalid amount')

        const date = parseDate(dateRaw)
        if (!date) rowErrors.push('Invalid date — use DD/MM/YYYY')

        const validTypes = [...expenseTypes]
        const cleanType = type || 'Other'
        if (!validTypes.includes(cleanType)) rowErrors.push(`Unknown type "${cleanType}" — will use "Other"`)

        const recurringVal = (recurringRaw || '').toLowerCase().trim()
        const isRecurring = recurringVal === 'yes' || recurringVal === 'monthly' || recurringVal === 'true'

        if (rowErrors.length) {
          errors.push({ row: rowNum, errors: rowErrors, raw: line })
        } else {
          rows.push({
            property_id: matchedProp.id,
            property_name: matchedProp.name,
            type: validTypes.includes(cleanType) ? cleanType : 'Other',
            amount,
            date,
            recurring: isRecurring,
            notes: notes || null,
            user_id: session.user.id
          })
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
    const { error } = await supabase.from('expenses').insert(
      importRows.map(({ property_name, ...row }) => row)
    )
    setImporting(false)
    if (error) {
      alert('Import failed: ' + error.message)
    } else {
      alert(`Successfully imported ${importRows.length} expense records!`)
      setShowImport(false)
      setImportRows([])
      setImportErrors([])
      reload()
    }
  }

  function exportCSV() {
    const headers = ['Property', 'Type', 'Amount (£)', 'Date', 'Recurring', 'Notes']
    const rows = expenses
      .slice().sort((a, b) => {
        if (!a.date && !b.date) return 0
        if (!a.date) return 1
        if (!b.date) return -1
        return new Date(b.date) - new Date(a.date)
      })
      .map(e => [
        propName(e.property_id), e.type || '', e.amount || 0,
        e.date ? new Date(e.date).toLocaleDateString('en-GB') : '',
        e.recurring ? 'Monthly' : 'One-off', e.notes || ''
      ])
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `proflet-expenses-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function openAdd() { setForm({ ...EMPTY_FORM }); setEditing(null); setShowForm(true) }
  function openEdit(e) { setForm({ ...e, recurring: e.recurring ? 'yes' : 'no' }); setEditing(e.id); setShowForm(true) }
  function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  async function save() {
    if (!form.amount) { alert('Amount is required'); return }
    if (!form.property_id) { alert('Please select a property'); return }
    setSaving(true)
    const payload = {
      property_id: form.property_id,
      type: form.type,
      amount: parseFloat(form.amount),
      date: form.date || null,
      recurring: form.recurring === 'yes',
      notes: form.notes || null,
      user_id: session.user.id
    }
    if (editing) {
      await supabase.from('expenses').update(payload).eq('id', editing)
    } else {
      await supabase.from('expenses').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    setForm({ ...EMPTY_FORM })
    setEditing(null)
    reload()
  }

  async function del(id) {
    if (!confirm('Delete this record?')) return
    await supabase.from('expenses').delete().eq('id', id)
    reload()
  }

  const filtersActive = filterProp !== 'all' || filterType !== 'all'

  return (
    <div className="pf-expenses">
      <Styles />

      {/* Page head */}
      <div className="pf-page-head">
        <div>
          <div className="pf-eyebrow">Expenses</div>
          <h1 className="pf-page-title">Outgoings across your portfolio</h1>
          <div className="pf-page-sub">{expenses.length} {expenses.length === 1 ? 'record' : 'records'} tracked</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="pf-cta pf-cta-export" onClick={exportCSV}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v8M4 7l3 3 3-3M2 12h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Export CSV</span>
          </button>
          <button className="pf-cta pf-cta-export" onClick={() => {
            if (!props.length) { alert('Please add your properties first before importing expense records.'); return }
            setImportRows([]); setImportErrors([]); setShowImport(true)
          }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 10V2M4 5l3-3 3 3M2 12h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Import CSV</span>
          </button>
          <button className="pf-cta pf-cta-primary" onClick={openAdd}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <span>Add expense</span>
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="pf-metric-grid">
        <MetricCard label="Total expenses" value={fmtMoney(total)} accent="red" />
        <MetricCard label="Monthly recurring" value={fmtMoney(recurring)} accent="amber" />
        <MetricCard label="Records" value={expenses.length} accent="green" />
      </div>

      {/* Filters */}
      <div className="pf-filters">
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
          <label className="pf-filter-label">Type</label>
          <div className="pf-select-wrap">
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="pf-select">
              <option value='all'>All types</option>
              {expenseTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <Caret />
          </div>
        </div>
        <div className="pf-filter-meta">
          <span className="pf-filter-count">{filtered.length} of {expenses.length}</span>
          {filtersActive && (
            <button className="pf-filter-clear" onClick={() => { setFilterProp('all'); setFilterType('all') }}>Clear</button>
          )}
        </div>
      </div>

      {/* Table card */}
      <div className="pf-table-card">
        <div className="pf-table-scroll">
          <table className="pf-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Type</th>
                <th className="pf-num">Amount</th>
                <th>Date</th>
                <th>Notes</th>
                <th>Recurring</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!filtered.length && (
                <tr className="pf-empty-row">
                  <td colSpan={7}>
                    <div className="pf-empty">
                      <div className="pf-empty-icon">
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h14v14H4z"/><path d="M4 9h14M9 4v14"/>
                        </svg>
                      </div>
                      <div className="pf-empty-title">{expenses.length ? 'No expenses match these filters' : 'No expense records yet'}</div>
                      <div className="pf-empty-sub">{expenses.length ? 'Try clearing filters to see everything.' : 'Add your first expense to start tracking outgoings.'}</div>
                      {!expenses.length && (
                        <button className="pf-cta pf-cta-primary pf-cta-sm" onClick={openAdd} style={{ marginTop: 16 }}>
                          <span>+ Add expense</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map(e => (
                <tr key={e.id}>
                  <td className="pf-cell-prop">{propName(e.property_id)}</td>
                  <td className="pf-cell-mono">{e.type || '—'}</td>
                  <td className="pf-num pf-cell-amount">{fmtMoney(e.amount)}</td>
                  <td className="pf-cell-mono">{fmtDate(e.date)}</td>
                  <td className="pf-cell-notes">{e.notes || '—'}</td>
                  <td>
                    <span className={`pf-badge ${e.recurring ? 'pf-badge-blue' : 'pf-badge-grey'}`}>
                      <span className="pf-badge-dot" />
                      {e.recurring ? 'Monthly' : 'One-off'}
                    </span>
                  </td>
                  <td>
                    <div className="pf-row-actions">
                      <button className="pf-btn-edit" onClick={() => openEdit(e)}>Edit</button>
                      <button className="pf-btn-delete" onClick={() => del(e.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import modal */}
      {showImport && (
        <div className="pf-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowImport(false)}>
          <div className="pf-modal" style={{ maxWidth: '620px' }}>
            <div className="pf-modal-glow" aria-hidden="true" />
            <div className="pf-modal-head">
              <div>
                <div className="pf-eyebrow">Import</div>
                <h2 className="pf-modal-title">Import expenses from CSV</h2>
              </div>
              <button className="pf-modal-close" onClick={() => setShowImport(false)} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div style={{ padding: '0 1.75rem 1.25rem' }}>
              {/* Step 1 */}
              <div className="pf-import-step">
                <div className="pf-import-step-num">1</div>
                <div className="pf-import-step-body">
                  <div className="pf-import-step-title">Download the template</div>
                  <div className="pf-import-step-desc">Get a CSV template with your property names pre-filled. Add your expenses then save the file.</div>
                  <button onClick={downloadTemplate} className="pf-cta pf-cta-ghost pf-cta-sm" style={{ marginTop: '10px' }}>
                    ↓ Download template
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="pf-import-step">
                <div className="pf-import-step-num">2</div>
                <div className="pf-import-step-body">
                  <div className="pf-import-step-title">Upload your completed CSV</div>
                  <div className="pf-import-step-desc">
                    Select your filled-in CSV to preview records before importing.
                    Recurring column accepts: <strong>yes</strong> or <strong>no</strong>
                  </div>
                  <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
                  <button onClick={() => fileRef.current.click()} className="pf-cta pf-cta-ghost pf-cta-sm" style={{ marginTop: '10px' }}>
                    ↑ Choose file
                  </button>
                </div>
              </div>

              {/* Errors */}
              {importErrors.length > 0 && (
                <div className="pf-import-errors">
                  <div className="pf-import-errors-title">⚠ {importErrors.length} row{importErrors.length > 1 ? 's' : ''} with errors — these will be skipped</div>
                  {importErrors.map((e, i) => (
                    <div key={i} className="pf-import-error-row">
                      <span className="pf-import-error-row-num">Row {e.row}</span>
                      <span>{e.errors.join(' · ')}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview */}
              {importRows.length > 0 && (
                <div className="pf-import-preview">
                  <div className="pf-import-preview-title">
                    ✓ {importRows.length} record{importRows.length > 1 ? 's' : ''} ready to import
                  </div>
                  <div className="pf-import-table-wrap">
                    <table className="pf-table" style={{ fontSize: '12px' }}>
                      <thead>
                        <tr>
                          {['Property', 'Type', 'Amount', 'Date', 'Recurring', 'Notes'].map(h => <th key={h}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            <td className="pf-cell-prop">{row.property_name}</td>
                            <td className="pf-cell-mono">{row.type}</td>
                            <td className="pf-cell-amount">{fmtMoney(row.amount)}</td>
                            <td className="pf-cell-mono">{fmtDate(row.date)}</td>
                            <td>
                              <span className={`pf-badge ${row.recurring ? 'pf-badge-blue' : 'pf-badge-grey'}`}>
                                <span className="pf-badge-dot" />
                                {row.recurring ? 'Monthly' : 'One-off'}
                              </span>
                            </td>
                            <td className="pf-cell-notes">{row.notes || '—'}</td>
                          </tr>
                        ))}
                        {importRows.length > 5 && (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '8px', color: 'var(--pl-muted)', fontSize: '12px' }}>
                              + {importRows.length - 5} more records
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="pf-modal-foot">
              <button className="pf-cta pf-cta-ghost" onClick={() => setShowImport(false)}>Cancel</button>
              {importRows.length > 0 && (
                <button onClick={confirmImport} disabled={importing} className="pf-cta pf-cta-primary" style={{ opacity: importing ? .7 : 1 }}>
                  <span>{importing ? 'Importing…' : `Import ${importRows.length} records`}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="pf-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="pf-modal">
            <div className="pf-modal-glow" aria-hidden="true" />
            <div className="pf-modal-head">
              <div>
                <div className="pf-eyebrow">{editing ? 'Edit record' : 'New record'}</div>
                <h2 className="pf-modal-title">{editing ? 'Edit expense' : 'Add expense'}</h2>
              </div>
              <button className="pf-modal-close" onClick={() => setShowForm(false)} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="pf-form-grid">
              <Field label="Property" required full>
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
                    {expenseTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <Caret />
                </div>
              </Field>
              <Field label="Amount (£)" required>
                <input type='number' value={form.amount} onChange={e => setField('amount', e.target.value)} placeholder='0.00' className="pf-input" />
              </Field>
              <Field label="Date">
                <input type='date' value={form.date} onChange={e => setField('date', e.target.value)} className="pf-input" />
              </Field>
              <Field label="Recurring">
                <div className="pf-select-wrap">
                  <select value={form.recurring} onChange={e => setField('recurring', e.target.value)} className="pf-input">
                    <option value='no'>One-off</option>
                    <option value='yes'>Yes, monthly</option>
                  </select>
                  <Caret />
                </div>
              </Field>
              <Field label="Notes / supplier" full>
                <input type='text' value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder='e.g. NatWest mortgage' className="pf-input" />
              </Field>
            </div>

            {form.property_id && form.amount && (
              <div className="pf-preview">
                <div className="pf-preview-pill">Preview</div>
                <div className="pf-preview-line">
                  <span className="pf-preview-prop">{propName(form.property_id)}</span>
                  <span className="pf-preview-sep">·</span>
                  <span className="pf-preview-type">{form.type}</span>
                  <span className="pf-preview-sep">·</span>
                  <span className="pf-preview-amount">{fmtMoney(parseFloat(form.amount) || 0)}</span>
                  <span className={`pf-badge ${form.recurring === 'yes' ? 'pf-badge-blue' : 'pf-badge-grey'}`}>
                    <span className="pf-badge-dot" />
                    {form.recurring === 'yes' ? 'Monthly' : 'One-off'}
                  </span>
                </div>
              </div>
            )}

            <div className="pf-modal-foot">
              <button className="pf-cta pf-cta-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="pf-cta pf-cta-primary" onClick={save} disabled={saving}>
                <span>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add expense'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, accent }) {
  return (
    <div className={`pf-metric pf-metric-${accent}`}>
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
    <svg className="pf-caret" width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function Styles() {
  return (
    <style>{`
.pf-expenses {
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
  --pf-red:    #C0392B;
  --pf-red-bg: #FCEBEB;
  --pf-amber:    #B45309;
  --pf-amber-bg: #FEF3C7;
  --pf-blue:    #0C447C;
  --pf-blue-bg: #E6F1FB;
  --pf-blue-bd: #BCD7F0;
  font-family: Georgia, 'Times New Roman', serif;
  color: var(--pl-text);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
@media (prefers-color-scheme: dark) {
  .pf-expenses {
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
    --pf-amber:    #FCD34D;
    --pf-amber-bg: oklch(28% 0.08 70);
    --pf-blue:    #93C5FD;
    --pf-blue-bg: oklch(28% 0.08 240);
    --pf-blue-bd: oklch(38% 0.10 240);
  }
}
.pf-expenses * { box-sizing: border-box; }
.pf-eyebrow { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 11px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--pl-mid); margin-bottom: .5rem; display: inline-flex; align-items: center; gap: 8px; }
.pf-eyebrow::before { content: ''; width: 18px; height: 1px; background: currentColor; display: inline-block; opacity: .5; }
.pf-page-head { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px; margin-bottom: 1.75rem; }
.pf-page-title { font-family: Georgia, serif; font-weight: 500; font-size: clamp(22px, 2.4vw, 28px); line-height: 1.15; letter-spacing: -0.015em; color: var(--pl-text); margin: 0 0 .25rem; }
.pf-page-sub { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12px; color: var(--pl-muted); letter-spacing: .02em; }
.pf-cta { display: inline-flex; align-items: center; gap: 8px; font-family: Georgia, serif; font-weight: 500; font-size: 14px; border: 0; cursor: pointer; border-radius: 999px; padding: 10px 20px; transition: transform .18s ease, box-shadow .18s ease, background .18s ease, color .18s, border-color .18s; white-space: nowrap; letter-spacing: -0.005em; }
.pf-cta-sm { font-size: 13px; padding: 8px 16px; }
.pf-cta-primary { color: white; background: linear-gradient(180deg, var(--pl-bright) 0%, var(--pl-mid) 100%); box-shadow: 0 1px 0 rgba(255,255,255,.25) inset, 0 -1px 0 rgba(0,0,0,.15) inset, 0 8px 22px -8px rgba(59,109,17,.55), 0 2px 4px rgba(20,40,10,.18); }
.pf-cta-primary:hover:not(:disabled) { transform: translateY(-1px); }
.pf-cta-primary:disabled { opacity: .65; cursor: default; }
.pf-cta-ghost { background: transparent; color: var(--pl-text-2); border: 1px solid var(--pl-border-2); }
.pf-cta-ghost:hover { background: var(--pl-bg-3); color: var(--pl-text); }
.pf-cta-export { background: var(--pl-light); color: var(--pl-mid); border: 1px solid var(--pl-light-b); }
.pf-cta-export:hover { background: color-mix(in oklab, var(--pl-light) 75%, var(--pl-light-b)); }
.pf-metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 1.5rem; }
.pf-metric { position: relative; background: var(--pl-bg-2); border: 1px solid var(--pl-border); border-radius: 14px; padding: 1.1rem 1.25rem 1rem; box-shadow: var(--pl-shadow-1); overflow: hidden; transition: transform .18s ease, box-shadow .18s ease, border-color .18s; }
.pf-metric:hover { transform: translateY(-1px); box-shadow: var(--pl-shadow-2); border-color: var(--pl-border-2); }
.pf-metric-accent { position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--pl-bright), var(--pl-mid)); opacity: .9; }
.pf-metric-red .pf-metric-accent { background: linear-gradient(90deg, #E76A5C, var(--pf-red)); }
.pf-metric-amber .pf-metric-accent { background: linear-gradient(90deg, #F59E0B, #B45309); }
.pf-metric-green .pf-metric-accent { background: linear-gradient(90deg, var(--pl-bright), var(--pl-mid)); }
.pf-metric-label { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--pl-muted); margin-bottom: .5rem; }
.pf-metric-value { font-family: Georgia, serif; font-size: 26px; font-weight: 500; color: var(--pl-text); letter-spacing: -0.015em; line-height: 1.1; }
@media (max-width: 760px) { .pf-metric-grid { grid-template-columns: 1fr; } }
.pf-filters { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; margin-bottom: 1rem; }
.pf-filter-group { display: flex; flex-direction: column; gap: 4px; }
.pf-filter-label { font-family: ui-monospace, monospace; font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--pl-muted); }
.pf-select-wrap { position: relative; display: inline-flex; align-items: center; }
.pf-select { appearance: none; -webkit-appearance: none; font-family: Georgia, serif; font-size: 13px; color: var(--pl-text); background: var(--pl-bg-2); border: 1px solid var(--pl-border); border-radius: 999px; padding: 7px 30px 7px 14px; cursor: pointer; outline: none; transition: border-color .18s, box-shadow .18s; }
.pf-select:hover { border-color: var(--pl-border-2); }
.pf-select:focus { border-color: var(--pl-mid); box-shadow: 0 0 0 3px color-mix(in oklab, var(--pl-mid) 18%, transparent); }
.pf-caret { position: absolute; right: 12px; pointer-events: none; color: var(--pl-muted); }
.pf-filter-meta { margin-left: auto; display: inline-flex; align-items: center; gap: 12px; }
.pf-filter-count { font-family: ui-monospace, monospace; font-size: 11px; color: var(--pl-muted); letter-spacing: .04em; }
.pf-filter-clear { font-family: Georgia, serif; font-size: 12px; color: var(--pl-mid); background: transparent; border: 0; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
.pf-filter-clear:hover { background: var(--pl-light); }
.pf-table-card { background: var(--pl-bg-2); border: 1px solid var(--pl-border); border-radius: 16px; box-shadow: var(--pl-shadow-1); overflow: hidden; }
.pf-table-scroll { overflow-x: auto; }
.pf-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.pf-table thead tr { background: var(--pl-bg-3); border-bottom: 1px solid var(--pl-border); }
.pf-table th { text-align: left; padding: 11px 16px; font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--pl-muted); font-weight: 500; white-space: nowrap; }
.pf-table th.pf-num { text-align: right; }
.pf-table tbody tr { border-bottom: 1px solid var(--pl-border); transition: background .15s ease; }
.pf-table tbody tr:last-child { border-bottom: 0; }
.pf-table tbody tr:hover { background: var(--pl-bg-3); }
.pf-table td { padding: 12px 16px; vertical-align: middle; font-size: 13.5px; color: var(--pl-text-2); }
.pf-table td.pf-num { text-align: right; }
.pf-cell-prop { font-family: Georgia, serif; font-weight: 500; color: var(--pl-text); letter-spacing: -0.005em; }
.pf-cell-mono { font-family: ui-monospace, monospace; font-size: 12px; color: var(--pl-text-2); }
.pf-cell-amount { font-family: Georgia, serif; font-weight: 500; color: var(--pf-red); letter-spacing: -0.01em; }
.pf-cell-notes { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--pl-text-2); font-style: italic; }
.pf-badge { display: inline-flex; align-items: center; gap: 6px; font-family: ui-monospace, monospace; font-size: 11px; font-weight: 500; padding: 3px 10px 3px 8px; border-radius: 999px; letter-spacing: .02em; white-space: nowrap; border: 1px solid transparent; }
.pf-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.pf-badge-blue { color: var(--pf-blue); background: var(--pf-blue-bg); border-color: var(--pf-blue-bd); }
.pf-badge-grey { color: var(--pl-muted); background: var(--pl-bg-3); border-color: var(--pl-border); }
.pf-row-actions { display: inline-flex; gap: 6px; }
.pf-btn-edit, .pf-btn-delete { font-family: Georgia, serif; font-size: 12px; background: transparent; border: 1px solid var(--pl-border); border-radius: 999px; padding: 4px 12px; cursor: pointer; transition: color .18s, background .18s, border-color .18s; }
.pf-btn-edit { color: var(--pl-mid); border-color: var(--pl-light-b); background: color-mix(in oklab, var(--pl-light) 50%, transparent); }
.pf-btn-edit:hover { background: var(--pl-light); }
.pf-btn-delete { color: var(--pl-muted); }
.pf-btn-delete:hover { color: var(--pf-red); border-color: color-mix(in oklab, var(--pf-red) 35%, var(--pl-border)); background: color-mix(in oklab, var(--pf-red-bg) 35%, transparent); }
.pf-empty-row td { padding: 0; }
.pf-empty { padding: 3rem 1.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.pf-empty-icon { width: 44px; height: 44px; border-radius: 12px; background: var(--pl-light); border: 1px solid var(--pl-light-b); color: var(--pl-mid); display: inline-flex; align-items: center; justify-content: center; margin-bottom: .75rem; }
.pf-empty-title { font-family: Georgia, serif; font-size: 16px; color: var(--pl-text); font-weight: 500; }
.pf-empty-sub { font-size: 13px; color: var(--pl-muted); }
.pf-modal-backdrop { position: fixed; inset: 0; background: color-mix(in oklab, var(--pl-text) 50%, transparent); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 1000; animation: pf-fade .2s ease both; }
.pf-modal { position: relative; background: var(--pl-bg-2); border: 1px solid var(--pl-border-2); border-radius: 22px; padding: 1.75rem; width: 100%; max-width: 540px; box-shadow: var(--pl-shadow-3); overflow: hidden; animation: pf-pop .25s ease both; }
.pf-modal-glow { position: absolute; inset: 0; background: radial-gradient(ellipse 80% 40% at 50% 0%, color-mix(in oklab, var(--pl-bright) 18%, transparent), transparent 70%); pointer-events: none; }
.pf-modal-head { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 1.5rem; }
.pf-modal-title { font-family: Georgia, serif; font-size: 22px; font-weight: 500; color: var(--pl-text); letter-spacing: -0.015em; margin: 0; }
.pf-modal-close { width: 30px; height: 30px; border-radius: 50%; background: var(--pl-bg-3); border: 1px solid var(--pl-border); color: var(--pl-text-2); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: color .18s, background .18s, border-color .18s; flex-shrink: 0; }
.pf-modal-close:hover { color: var(--pl-text); background: var(--pl-light); border-color: var(--pl-light-b); }
.pf-form-grid { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.pf-field { display: flex; flex-direction: column; gap: 5px; }
.pf-field-full { grid-column: 1 / -1; }
.pf-field-label { font-family: ui-monospace, monospace; font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--pl-muted); }
.pf-req { color: var(--pl-mid); margin-left: 4px; }
.pf-input { appearance: none; -webkit-appearance: none; width: 100%; font-family: Georgia, serif; font-size: 14px; color: var(--pl-text); background: var(--pl-bg); border: 1px solid var(--pl-border); border-radius: 10px; padding: 10px 14px; outline: none; transition: border-color .18s, box-shadow .18s, background .18s; color-scheme: light dark; }
.pf-input:focus { border-color: var(--pl-mid); background: var(--pl-bg-2); box-shadow: 0 0 0 3px color-mix(in oklab, var(--pl-mid) 18%, transparent); }
.pf-form-grid select.pf-input { padding-right: 32px; cursor: pointer; }
.pf-preview { position: relative; margin-top: 1.25rem; padding: 14px 16px; background: linear-gradient(180deg, color-mix(in oklab, var(--pl-bright) 8%, var(--pl-bg-2)) 0%, var(--pl-bg-2) 80%); border: 1px solid var(--pl-light-b); border-radius: 12px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.pf-preview-pill { font-family: ui-monospace, monospace; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; background: var(--pl-mid); color: white; padding: 3px 8px; border-radius: 999px; }
.pf-preview-line { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 13.5px; color: var(--pl-text); }
.pf-preview-prop { font-family: Georgia, serif; font-weight: 500; }
.pf-preview-type { font-family: ui-monospace, monospace; font-size: 12px; color: var(--pl-text-2); }
.pf-preview-amount { font-family: Georgia, serif; font-weight: 500; color: var(--pl-mid); }
.pf-preview-sep { color: var(--pl-muted); opacity: .6; }
.pf-modal-foot { position: relative; display: flex; justify-content: flex-end; gap: 10px; margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--pl-border); }

/* Import specific */
.pf-import-step { display: flex; gap: 14px; margin-bottom: 1.25rem; align-items: flex-start; }
.pf-import-step-num { width: 28px; height: 28px; border-radius: 50%; background: var(--pl-light); border: 1px solid var(--pl-light-b); color: var(--pl-mid); display: flex; align-items: center; justify-content: center; font-family: ui-monospace, monospace; font-size: 12px; font-weight: 500; flex-shrink: 0; margin-top: 2px; }
.pf-import-step-body {}
.pf-import-step-title { font-family: Georgia, serif; font-size: 15px; font-weight: 500; color: var(--pl-text); margin-bottom: 3px; }
.pf-import-step-desc { font-size: 13px; color: var(--pl-muted); line-height: 1.5; }
.pf-import-errors { background: var(--pf-red-bg); border: 1px solid color-mix(in oklab, var(--pf-red) 28%, transparent); border-radius: 10px; padding: 12px 14px; margin-bottom: 1rem; }
.pf-import-errors-title { font-size: 13px; font-weight: 500; color: var(--pf-red); margin-bottom: 8px; }
.pf-import-error-row { font-size: 12px; color: var(--pf-red); margin-bottom: 4px; display: flex; gap: 8px; }
.pf-import-error-row-num { font-family: ui-monospace, monospace; font-weight: 500; flex-shrink: 0; }
.pf-import-preview { background: var(--pl-light); border: 1px solid var(--pl-light-b); border-radius: 10px; padding: 12px 14px; margin-bottom: 1rem; }
.pf-import-preview-title { font-size: 13px; font-weight: 500; color: var(--pl-mid); margin-bottom: 10px; }
.pf-import-table-wrap { overflow-x: auto; border-radius: 8px; background: var(--pl-bg-2); }

@media (max-width: 540px) { .pf-form-grid { grid-template-columns: 1fr; } }
@keyframes pf-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pf-pop { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
@media (prefers-reduced-motion: reduce) {
  .pf-expenses *, .pf-expenses *::before, .pf-expenses *::after { animation: none !important; transition: none !important; }
}
    `}</style>
  )
}