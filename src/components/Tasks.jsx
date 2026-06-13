import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const TASK_TYPES = ['Inspection', 'Rent chase', 'Maintenance', 'Admin', 'Renewal', 'Remortgage', 'Legal', 'Other']

const EMPTY_FORM = {
  property_id: '',
  title: '',
  type: 'Admin',
  due_date: '',
  reminder_date: '',
  priority: 'Medium',
  case_id: '',
  notes: ''
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Tasks({ session, tasks, props, cases, reload }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('open')
  const [filterProp, setFilterProp] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')

  useEffect(() => {
    if (!showForm) return
    const onKey = (e) => { if (e.key === 'Escape') setShowForm(false) }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [showForm])

  const today = new Date().toISOString().slice(0, 10)
  const propName = (id) => props.find(p => p.id === id)?.name || '—'
  const caseName = (id) => cases?.find(c => c.id === id)?.title || ''

  const filtered = tasks
    .filter(t => filterStatus === 'all' || (filterStatus === 'open' ? t.status !== 'Done' : t.status === 'Done'))
    .filter(t => filterProp === 'all' || t.property_id === filterProp)
    .filter(t => filterType === 'all' || t.type === filterType)
    .filter(t => filterPriority === 'all' || t.priority === filterPriority)
    .slice().reverse()

  const open = tasks.filter(t => t.status !== 'Done').length
  const overdue = tasks.filter(t => t.status !== 'Done' && t.due_date && t.due_date < today).length
  const dueToday = tasks.filter(t => t.status !== 'Done' && t.due_date === today).length

  function openAdd() { setForm({ ...EMPTY_FORM }); setEditing(null); setShowForm(true) }
  function openEdit(t) { setForm({ ...EMPTY_FORM, ...t }); setEditing(t.id); setShowForm(true) }
  function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  async function save() {
    if (!form.title) { alert('Title is required'); return }
    setSaving(true)
    const payload = { title: form.title, type: form.type || null, property_id: form.property_id || null, priority: form.priority, due_date: form.due_date || null, reminder_date: form.reminder_date || null, case_id: form.case_id || null, notes: form.notes || null, user_id: session.user.id }
    if (!editing) payload.status = 'Open'
    if (editing) await supabase.from('tasks').update(payload).eq('id', editing)
    else await supabase.from('tasks').insert(payload)
    setSaving(false); setShowForm(false); setForm({ ...EMPTY_FORM }); setEditing(null); reload()
  }

  async function markDone(id) {
    await supabase.from('tasks').update({ status: 'Done' }).eq('id', id); reload()
  }

  async function del(id) {
    if (!confirm('Delete this task?')) return
    await supabase.from('tasks').delete().eq('id', id); reload()
  }

  const filtersActive = filterStatus !== 'open' || filterProp !== 'all' || filterType !== 'all' || filterPriority !== 'all'

  return (
    <div className="pf-tasks">
      <Styles />

      <div className="pf-page-head">
        <div>
          <div className="pf-eyebrow">Tasks</div>
          <h1 className="pf-page-title">Things to do across your portfolio</h1>
          <div className="pf-page-sub">{open} open · {tasks.length} total</div>
        </div>
        <button className="pf-cta pf-cta-primary" onClick={openAdd}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          <span>Add task</span>
        </button>
      </div>

      <div className="pf-metric-grid">
        <MetricCard label="Open tasks" value={open} accent="green" />
        <MetricCard label="Overdue" value={overdue} accent={overdue > 0 ? 'red' : 'neutral'} alert={overdue > 0} />
        <MetricCard label="Due today" value={dueToday} accent={dueToday > 0 ? 'amber' : 'neutral'} alert={dueToday > 0} />
        <MetricCard label="Total" value={tasks.length} accent="neutral" />
      </div>

      <div className="pf-filters">
        <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus} options={[{ v: 'open', l: 'Open tasks' }, { v: 'done', l: 'Completed' }, { v: 'all', l: 'All tasks' }]} />
        <FilterSelect label="Property" value={filterProp} onChange={setFilterProp} options={[{ v: 'all', l: 'All properties' }, ...props.map(p => ({ v: p.id, l: p.name }))]} />
        <FilterSelect label="Type" value={filterType} onChange={setFilterType} options={[{ v: 'all', l: 'All types' }, ...TASK_TYPES.map(t => ({ v: t, l: t }))]} />
        <FilterSelect label="Priority" value={filterPriority} onChange={setFilterPriority} options={[{ v: 'all', l: 'All priorities' }, ...['High', 'Medium', 'Low'].map(p => ({ v: p, l: p }))]} />
        <div className="pf-filter-meta">
          <span className="pf-filter-count">{filtered.length} of {tasks.length}</span>
          {filtersActive && <button className="pf-filter-clear" onClick={() => { setFilterStatus('open'); setFilterProp('all'); setFilterType('all'); setFilterPriority('all') }}>Clear</button>}
        </div>
      </div>

      <div className="pf-table-card">
        <div className="pf-table-scroll">
          <table className="pf-table">
            <thead>
              <tr><th>Task</th><th>Property</th><th>Type</th><th>Priority</th><th>Due</th><th>Reminder</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {!filtered.length && (
                <tr className="pf-empty-row">
                  <td colSpan={8}>
                    <div className="pf-empty">
                      <div className="pf-empty-icon">
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 11l3.5 3.5L17 6"/></svg>
                      </div>
                      <div className="pf-empty-title">{tasks.length ? 'No tasks match these filters' : 'No tasks yet'}</div>
                      <div className="pf-empty-sub">{tasks.length ? 'Try clearing filters to see everything.' : 'Add your first task to start tracking what needs doing.'}</div>
                      {!tasks.length && <button className="pf-cta pf-cta-primary pf-cta-sm" onClick={openAdd} style={{ marginTop: 16 }}><span>+ Add task</span></button>}
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map(t => {
                const isDone = t.status === 'Done'
                const isOverdue = !isDone && t.due_date && t.due_date < today
                const isDueToday = !isDone && t.due_date === today
                const hasReminder = t.reminder_date && t.reminder_date >= today && !isDone
                return (
                  <tr key={t.id} className={isDone ? 'pf-row-done' : ''}>
                    <td className="pf-cell-title">
                      <div className={`pf-task-title ${isOverdue ? 'pf-overdue' : ''}`}>{t.title}</div>
                      {t.case_id && caseName(t.case_id) && <div className="pf-task-link">↳ {caseName(t.case_id)}</div>}
                      {t.notes && <div className="pf-task-notes">{t.notes}</div>}
                    </td>
                    <td className="pf-cell-mono">{propName(t.property_id)}</td>
                    <td>{t.type ? <span className="pf-type-chip">{t.type}</span> : <span className="pf-cell-muted">—</span>}</td>
                    <td><PriorityBadge level={t.priority} /></td>
                    <td><DueCell date={t.due_date} isOverdue={isOverdue} isDueToday={isDueToday} /></td>
                    <td><span className={`pf-cell-mono ${hasReminder ? 'pf-reminder-active' : ''}`}>{t.reminder_date ? fmtDate(t.reminder_date) : '—'}</span></td>
                    <td>
                      <span className={`pf-status ${isDone ? 'pf-status-done' : 'pf-status-open'}`}>
                        <span className="pf-badge-dot" />{t.status}
                      </span>
                    </td>
                    <td>
                      <div className="pf-row-actions">
                        {!isDone && (
                          <button className="pf-btn-done" onClick={() => markDone(t.id)}>
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Done
                          </button>
                        )}
                        <button className="pf-btn-edit" onClick={() => openEdit(t)}>Edit</button>
                        <button className="pf-btn-delete" onClick={() => del(t.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="pf-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="pf-modal">
            <div className="pf-modal-glow" aria-hidden="true" />
            <div className="pf-modal-head">
              <div>
                <div className="pf-eyebrow">{editing ? 'Edit task' : 'New task'}</div>
                <h2 className="pf-modal-title">{editing ? 'Edit task' : 'Add task'}</h2>
              </div>
              <button className="pf-modal-close" onClick={() => setShowForm(false)} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="pf-form-grid">
              <Field label="Title" required full>
                <input type='text' value={form.title} onChange={e => setField('title', e.target.value)} placeholder='e.g. Renew gas safety certificate' className="pf-input" />
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
                    {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <Caret />
                </div>
              </Field>
              <Field label="Priority">
                <div className="pf-prio-seg">
                  {['Low', 'Medium', 'High'].map(p => (
                    <button key={p} type="button" className={`pf-prio-seg-btn pf-prio-seg-${p.toLowerCase()} ${form.priority === p ? 'pf-prio-active' : ''}`} onClick={() => setField('priority', p)}>{p}</button>
                  ))}
                </div>
              </Field>
              <Field label="Due date">
                <input type='date' value={form.due_date || ''} onChange={e => setField('due_date', e.target.value)} className="pf-input" />
              </Field>
              <Field label="Reminder date">
                <input type='date' value={form.reminder_date || ''} onChange={e => setField('reminder_date', e.target.value)} className="pf-input" />
              </Field>
              <Field label="Linked case" full>
                <div className="pf-select-wrap">
                  <select value={form.case_id || ''} onChange={e => setField('case_id', e.target.value)} className="pf-input">
                    <option value=''>— None —</option>
                    {(cases || []).filter(c => c.status !== 'Closed').map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <Caret />
                </div>
              </Field>
              <Field label="Notes" full>
                <input type='text' value={form.notes || ''} onChange={e => setField('notes', e.target.value)} placeholder='Any additional details' className="pf-input" />
              </Field>
            </div>
            <div className="pf-modal-foot">
              <button className="pf-cta pf-cta-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="pf-cta pf-cta-primary" onClick={save} disabled={saving}>
                <span>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add task'}</span>
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

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="pf-filter-group">
      <label className="pf-filter-label">{label}</label>
      <div className="pf-select-wrap">
        <select value={value} onChange={e => onChange(e.target.value)} className="pf-select">
          {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <Caret />
      </div>
    </div>
  )
}

function PriorityBadge({ level }) {
  const tone = level === 'High' ? 'red' : level === 'Medium' ? 'amber' : 'green'
  return (
    <span className={`pf-badge pf-badge-${tone}`}>
      <span className="pf-badge-dot" />{level || 'Medium'}
    </span>
  )
}

function DueCell({ date, isOverdue, isDueToday }) {
  if (!date) return <span className="pf-cell-muted">—</span>
  if (isOverdue) return (
    <span className="pf-due-pill pf-due-overdue">
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1L10.5 10H.5L5.5 1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M5.5 4.5v2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="5.5" cy="8.2" r=".7" fill="currentColor"/></svg>
      {fmtDate(date)}
    </span>
  )
  if (isDueToday) return (
    <span className="pf-due-pill pf-due-today">
      <span className="pf-badge-dot" />{fmtDate(date)}
    </span>
  )
  return <span className="pf-cell-mono">{fmtDate(date)}</span>
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
.pf-tasks {
  --pl-dark:    #173404;
  --pl-mid:     #6FAD2A;
  --pl-bright:  #8FCB3C;
  --pl-light:   oklch(28% 0.040 130);
  --pl-light-b: oklch(34% 0.050 130);
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
  --pf-red:     #FCA5A5;
  --pf-red-bg:  oklch(28% 0.08 25);
  --pf-red-bd:  oklch(38% 0.10 25);
  --pf-amber:   #FCD34D;
  --pf-amber-bg:oklch(28% 0.08 70);
  --pf-amber-bd:oklch(38% 0.10 70);
  --pf-green:   #C8E6A0;
  --pf-green-bg:oklch(28% 0.060 130);
  --pf-green-bd:oklch(38% 0.080 130);
  font-family: Georgia, 'Times New Roman', serif;
  color: var(--pl-text);
  -webkit-font-smoothing: antialiased;
}
.pf-tasks * { box-sizing: border-box; }

.pf-eyebrow { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 11px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--pl-mid); margin-bottom: .5rem; display: inline-flex; align-items: center; gap: 8px; }
.pf-eyebrow::before { content: ''; width: 18px; height: 1px; background: currentColor; display: inline-block; opacity: .5; }
.pf-page-head { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px; margin-bottom: 1.75rem; }
.pf-page-title { font-family: Georgia, serif; font-weight: 500; font-size: clamp(22px, 2.4vw, 28px); line-height: 1.15; letter-spacing: -0.015em; color: var(--pl-text); margin: 0 0 .25rem; }
.pf-page-sub { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12px; color: var(--pl-muted); letter-spacing: .02em; }

.pf-cta { display: inline-flex; align-items: center; gap: 8px; font-family: Georgia, serif; font-weight: 500; font-size: 14px; border: 0; cursor: pointer; border-radius: 999px; padding: 10px 20px; transition: transform .18s ease, box-shadow .18s ease, background .18s, color .18s, border-color .18s; white-space: nowrap; letter-spacing: -0.005em; }
.pf-cta-sm { font-size: 13px; padding: 8px 16px; }
.pf-cta-primary { color: white; background: linear-gradient(180deg, var(--pl-bright) 0%, var(--pl-mid) 100%); box-shadow: 0 1px 0 rgba(255,255,255,.25) inset, 0 -1px 0 rgba(0,0,0,.15) inset, 0 8px 22px -8px rgba(59,109,17,.55), 0 2px 4px rgba(20,40,10,.18); }
.pf-cta-primary:hover:not(:disabled) { transform: translateY(-1px); }
.pf-cta-primary:disabled { opacity: .65; cursor: default; }
.pf-cta-ghost { background: transparent; color: var(--pl-text-2); border: 1px solid var(--pl-border-2); }
.pf-cta-ghost:hover { background: var(--pl-bg-3); color: var(--pl-text); }

.pf-metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 1.5rem; }
.pf-metric { position: relative; background: var(--pl-bg-2); border: 1px solid var(--pl-border); border-radius: 14px; padding: 1.1rem 1.25rem 1rem; box-shadow: var(--pl-shadow-1); overflow: hidden; transition: transform .18s ease, box-shadow .18s ease, border-color .18s; }
.pf-metric:hover { transform: translateY(-1px); box-shadow: var(--pl-shadow-2); border-color: var(--pl-border-2); }
.pf-metric-accent { position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--pl-bright), var(--pl-mid)); opacity: .9; }
.pf-metric-red .pf-metric-accent    { background: linear-gradient(90deg, #E76A5C, var(--pf-red)); }
.pf-metric-amber .pf-metric-accent  { background: linear-gradient(90deg, #F59E0B, var(--pf-amber)); }
.pf-metric-green .pf-metric-accent  { background: linear-gradient(90deg, var(--pl-bright), var(--pl-mid)); }
.pf-metric-neutral .pf-metric-accent { background: linear-gradient(90deg, var(--pl-border-2), var(--pl-border)); opacity: .6; }
.pf-metric-label { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--pl-muted); margin-bottom: .5rem; }
.pf-metric-value { font-family: Georgia, serif; font-size: 26px; font-weight: 500; color: var(--pl-text); letter-spacing: -0.015em; line-height: 1.1; }
.pf-metric-alert.pf-metric-red .pf-metric-value { color: var(--pf-red); }
.pf-metric-alert.pf-metric-amber .pf-metric-value { color: var(--pf-amber); }
@media (max-width: 880px) { .pf-metric-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .pf-metric-grid { grid-template-columns: 1fr; } }

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
.pf-table tbody tr { border-bottom: 1px solid var(--pl-border); transition: background .15s ease; }
.pf-table tbody tr:last-child { border-bottom: 0; }
.pf-table tbody tr:hover { background: var(--pl-bg-3); }
.pf-table td { padding: 12px 16px; vertical-align: middle; font-size: 13.5px; color: var(--pl-text-2); }
.pf-cell-title { max-width: 260px; }
.pf-task-title { font-family: Georgia, serif; font-weight: 500; color: var(--pl-text); letter-spacing: -0.005em; font-size: 14px; }
.pf-task-title.pf-overdue { color: var(--pf-red); }
.pf-task-link { font-family: ui-monospace, monospace; font-size: 11px; color: var(--pl-mid); margin-top: 3px; }
.pf-task-notes { font-size: 11.5px; color: var(--pl-muted); margin-top: 2px; font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 240px; }
.pf-cell-mono { font-family: ui-monospace, monospace; font-size: 12px; color: var(--pl-text-2); }
.pf-cell-muted { color: var(--pl-muted); font-family: ui-monospace, monospace; font-size: 12px; }
.pf-reminder-active { color: var(--pf-amber); }
.pf-type-chip { display: inline-flex; align-items: center; font-family: ui-monospace, monospace; font-size: 11px; padding: 3px 10px; border-radius: 999px; background: var(--pl-bg-3); color: var(--pl-text-2); border: 1px solid var(--pl-border); letter-spacing: .02em; }
.pf-row-done td { opacity: .55; }
.pf-row-done .pf-task-title { text-decoration: line-through; color: var(--pl-muted); }

.pf-badge { display: inline-flex; align-items: center; gap: 6px; font-family: ui-monospace, monospace; font-size: 11px; font-weight: 500; padding: 3px 10px 3px 8px; border-radius: 999px; letter-spacing: .02em; white-space: nowrap; border: 1px solid transparent; }
.pf-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.pf-badge-red   { color: var(--pf-red);   background: var(--pf-red-bg);   border-color: var(--pf-red-bd); }
.pf-badge-amber { color: var(--pf-amber); background: var(--pf-amber-bg); border-color: var(--pf-amber-bd); }
.pf-badge-green { color: var(--pf-green); background: var(--pf-green-bg); border-color: var(--pf-green-bd); }

.pf-due-pill { display: inline-flex; align-items: center; gap: 6px; font-family: ui-monospace, monospace; font-size: 11.5px; font-weight: 500; padding: 3px 10px 3px 8px; border-radius: 999px; letter-spacing: .02em; white-space: nowrap; border: 1px solid transparent; }
.pf-due-overdue { color: var(--pf-red); background: var(--pf-red-bg); border-color: var(--pf-red-bd); font-weight: 600; }
.pf-due-today   { color: var(--pf-amber); background: var(--pf-amber-bg); border-color: var(--pf-amber-bd); }

.pf-status { display: inline-flex; align-items: center; gap: 6px; font-family: ui-monospace, monospace; font-size: 11px; font-weight: 500; padding: 3px 10px 3px 8px; border-radius: 999px; border: 1px solid transparent; }
.pf-status-open { color: var(--pl-mid); background: var(--pl-light); border-color: var(--pl-light-b); }
.pf-status-done { color: var(--pl-muted); background: var(--pl-bg-3); border-color: var(--pl-border); }

.pf-row-actions { display: inline-flex; gap: 6px; flex-wrap: wrap; }
.pf-btn-done, .pf-btn-edit, .pf-btn-delete { font-family: Georgia, serif; font-size: 12px; background: transparent; border: 1px solid var(--pl-border); border-radius: 999px; padding: 4px 12px; cursor: pointer; transition: color .18s, background .18s, border-color .18s; display: inline-flex; align-items: center; gap: 5px; }
.pf-btn-done { color: var(--pl-mid); border-color: var(--pl-light-b); background: color-mix(in oklab, var(--pl-light) 50%, transparent); }
.pf-btn-done:hover { background: var(--pl-light); }
.pf-btn-edit { color: var(--pl-text-2); }
.pf-btn-edit:hover { color: var(--pl-mid); border-color: var(--pl-light-b); background: color-mix(in oklab, var(--pl-light) 40%, transparent); }
.pf-btn-delete { color: var(--pl-muted); }
.pf-btn-delete:hover { color: var(--pf-red); border-color: color-mix(in oklab, var(--pf-red) 35%, var(--pl-border)); background: color-mix(in oklab, var(--pf-red-bg) 35%, transparent); }

.pf-empty-row td { padding: 0; }
.pf-empty { padding: 3rem 1.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.pf-empty-icon { width: 44px; height: 44px; border-radius: 12px; background: var(--pl-light); border: 1px solid var(--pl-light-b); color: var(--pl-mid); display: inline-flex; align-items: center; justify-content: center; margin-bottom: .75rem; }
.pf-empty-title { font-family: Georgia, serif; font-size: 16px; color: var(--pl-text); font-weight: 500; }
.pf-empty-sub { font-size: 13px; color: var(--pl-muted); }

.pf-modal-backdrop { position: fixed; inset: 0; background: color-mix(in oklab, #07140A 70%, transparent); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 1000; animation: pf-fade .2s ease both; }
.pf-modal { position: relative; background: var(--pl-bg-2); border: 1px solid var(--pl-border-2); border-radius: 22px; padding: 1.75rem; width: 100%; max-width: 560px; box-shadow: var(--pl-shadow-3); overflow: hidden; animation: pf-pop .25s ease both; }
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
.pf-input { appearance: none; -webkit-appearance: none; width: 100%; font-family: Georgia, serif; font-size: 14px; color: var(--pl-text); background: var(--pl-bg); border: 1px solid var(--pl-border); border-radius: 10px; padding: 10px 14px; outline: none; transition: border-color .18s, box-shadow .18s, background .18s; color-scheme: dark; }
.pf-input:focus { border-color: var(--pl-mid); background: var(--pl-bg-2); box-shadow: 0 0 0 3px color-mix(in oklab, var(--pl-mid) 18%, transparent); }
.pf-form-grid select.pf-input { padding-right: 32px; cursor: pointer; }

.pf-prio-seg { display: inline-flex; background: var(--pl-bg); border: 1px solid var(--pl-border); border-radius: 999px; padding: 3px; gap: 2px; }
.pf-prio-seg-btn { flex: 1; font-family: Georgia, serif; font-size: 13px; background: transparent; border: 0; color: var(--pl-text-2); padding: 6px 10px; border-radius: 999px; cursor: pointer; transition: background .18s, color .18s, box-shadow .18s; }
.pf-prio-seg-btn:hover { color: var(--pl-text); }
.pf-prio-active { box-shadow: 0 1px 2px rgba(0,0,0,.15); font-weight: 500; }
.pf-prio-seg-low.pf-prio-active    { background: var(--pf-green-bg); color: var(--pf-green); }
.pf-prio-seg-medium.pf-prio-active { background: var(--pf-amber-bg); color: var(--pf-amber); }
.pf-prio-seg-high.pf-prio-active   { background: var(--pf-red-bg);   color: var(--pf-red); }

.pf-modal-foot { position: relative; display: flex; justify-content: flex-end; gap: 10px; margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--pl-border); }

@media (max-width: 540px) { .pf-form-grid { grid-template-columns: 1fr; } }
@keyframes pf-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pf-pop { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
@media (prefers-reduced-motion: reduce) { .pf-tasks *, .pf-tasks *::before, .pf-tasks *::after { animation: none !important; transition: none !important; } }
    `}</style>
  )
}
