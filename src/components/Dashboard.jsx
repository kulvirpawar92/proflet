import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Properties from './Properties'
import Income from './Income'
import Expenses from './Expenses'
import Cases from './Cases'
import Tasks from './Tasks'
import Contacts from './Contacts'
import AIChat from './AIChat'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, ComposedChart, Area
} from 'recharts'

function fmt(n) { return '£' + Math.round(n || 0).toLocaleString() }

function fmtDays(d) {
  if (d < 0) return `${Math.abs(d)} days overdue`
  if (d === 0) return 'today'
  if (d === 1) return 'tomorrow'
  if (d <= 7)  return `in ${d} days`
  if (d <= 30) return `in ${Math.round(d / 7)} week${Math.round(d / 7) > 1 ? 's' : ''}`
  return `in ${Math.round(d / 30)} month${Math.round(d / 30) > 1 ? 's' : ''}`
}

const PERIODS = [
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '12M', months: 12 },
  { label: 'YTD', months: null },
]

function Wordmark({ size = 28 }) {
  const h = size
  const w = (size / 28) * 120
  return (
    <svg width={w} height={h} viewBox="0 0 120 28" fill="none" aria-label="Proflet" className="pf-wordmark">
      <rect x="0"  y="10" width="6" height="18" rx="1.5" className="pf-mark-1" />
      <rect x="8"  y="5"  width="6" height="23" rx="1.5" className="pf-mark-2" />
      <rect x="16" y="1"  width="6" height="27" rx="1.5" className="pf-mark-3" />
      <text x="27" y="20" fontFamily="Georgia, serif" fontSize="15" fontWeight="700" className="pf-mark-text-1">prof</text>
      <text x="63" y="20" fontFamily="Georgia, serif" fontSize="15" fontWeight="400" className="pf-mark-text-2">let</text>
    </svg>
  )
}

function MetricCard({ label, value, sub, accent, highlight, deltaUp }) {
  return (
    <div className={`pf-metric ${highlight ? 'pf-metric-highlight' : ''}`}>
      <div className="pf-metric-label">{label}</div>
      <div className={`pf-metric-value ${accent ? `pf-metric-${accent}` : ''}`}>{value}</div>
      {sub && (
        <div className={`pf-metric-sub ${deltaUp === true ? 'pf-up' : deltaUp === false ? 'pf-warn' : ''}`}>
          {deltaUp === true && '▲ '}{deltaUp === false && '● '}{sub}
        </div>
      )}
    </div>
  )
}

function SectionTitle({ children, action }) {
  return (
    <div className="pf-section-title-row">
      <div className="pf-section-eyebrow">{children}</div>
      {action}
    </div>
  )
}

function Card({ children, className = '', style }) {
  return <div className={`pf-card ${className}`} style={style}>{children}</div>
}

function Segment({ options, current, onChange }) {
  return (
    <div className="pf-segment">
      {options.map(o => (
        <button
          key={o.value}
          className={`pf-segment-btn ${current === o.value ? 'pf-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function Dashboard({ session }) {
  const [page, setPage] = useState('dashboard')
  const [props, setProps] = useState([])
  const [income, setIncome] = useState([])
  const [expenses, setExpenses] = useState([])
  const [cases, setCases] = useState([])
  const [tasks, setTasks] = useState([])
  const [contacts, setContacts] = useState([])
  const [period, setPeriod] = useState('12M')
  const [profitView, setProfitView] = useState('chart')
  const [equityView, setEquityView] = useState('release')
  const [generating, setGenerating] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const uid = session.user.id
    const [p, i, e, c, t, co] = await Promise.all([
      supabase.from('properties').select('*').eq('user_id', uid),
      supabase.from('income').select('*').eq('user_id', uid),
      supabase.from('expenses').select('*').eq('user_id', uid),
      supabase.from('cases').select('*').eq('user_id', uid),
      supabase.from('tasks').select('*').eq('user_id', uid),
      supabase.from('contacts').select('*').eq('user_id', uid),
    ])
    setProps(p.data || [])
    setIncome(i.data || [])
    setExpenses(e.data || [])
    setCases(c.data || [])
    setTasks(t.data || [])
    setContacts(co.data || [])
  }

  async function generateMonthly() {
    if (!confirm('Generate income and expense records for this month?')) return
    setGenerating(true)
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      const res = await fetch(
        'https://wjjqgzyjubvhxivlqnxq.supabase.co/functions/v1/generate-monthly-records',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession.access_token}`
          },
          body: JSON.stringify({})
        }
      )
      const data = await res.json()
      if (data.success) {
        alert(`Done! Created ${data.incomeCreated} income and ${data.expensesCreated} expense records for ${data.month}`)
        loadAll()
      } else {
        alert('Error: ' + (data.error || 'Unknown error'))
      }
    } catch (e) {
      alert('Something went wrong: ' + e.message)
    }
    setGenerating(false)
  }

  function calcProp(p) {
    const val = p.current_value || 0
    const mort = p.mortgage_balance || 0
    const rent = p.monthly_rent || 0
    const now = new Date()
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const mExp = expenses
      .filter(e => e.property_id === p.id && e.recurring && e.date && e.date.startsWith(currentKey))
      .reduce((s, e) => s + (e.amount || 0), 0)
    const equity = val - mort
    const ltv = val ? Math.round(mort / val * 100) : 0
    const equityRelease = Math.max(0, (val * 0.75) - mort)
    const monthlyProfit = rent - mExp
    const grossYield = val ? parseFloat((rent * 12 / val * 100).toFixed(1)) : 0
    return { val, mort, rent, mExp, equity, ltv, equityRelease, monthlyProfit, grossYield }
  }

  const totals = props.reduce((a, p) => {
    const c = calcProp(p)
    return {
      val: a.val + c.val, mort: a.mort + c.mort,
      equity: a.equity + c.equity, rent: a.rent + c.rent,
      exp: a.exp + c.mExp, profit: a.profit + c.monthlyProfit,
      er: a.er + c.equityRelease
    }
  }, { val: 0, mort: 0, equity: 0, rent: 0, exp: 0, profit: 0, er: 0 })

  const avgYield = props.length
    ? (props.reduce((s, p) => s + calcProp(p).grossYield, 0) / props.length).toFixed(1)
    : 0

  const healthScore = () => {
    if (!props.length) return null
    let score = 100
    const today = new Date().toISOString().slice(0, 10)
    const vacant = props.filter(p => p.occupancy_status === 'Vacant').length
    const highCases = cases.filter(c => c.priority === 'High' && c.status !== 'Closed').length
    const overdueTasks = tasks.filter(t => t.status !== 'Done' && t.due_date && t.due_date < today).length
    const overdueRent = income.filter(i => i.status === 'Overdue').length
    const avgLtv = totals.val ? Math.round(totals.mort / totals.val * 100) : 0
    const days = d => d ? Math.round((new Date(d) - new Date()) / 86400000) : null
    const insuranceExpiring = props.filter(p => { const d = days(p.insurance_renewal); return d !== null && d <= 30 }).length
    const remortgageExpiring = props.filter(p => { const d = days(p.remortgage_date); return d !== null && d <= 60 }).length
    const tenancyExpiring = props.filter(p => { const d = days(p.tenancy_end); return d !== null && d <= 30 }).length
    score -= vacant * 15
    score -= highCases * 10
    score -= overdueTasks * 5
    score -= overdueRent * 8
    score -= insuranceExpiring * 8
    score -= remortgageExpiring * 6
    score -= tenancyExpiring * 6
    if (avgLtv > 80) score -= 15
    else if (avgLtv > 70) score -= 5
    return Math.max(0, Math.min(100, score))
  }
  const health = healthScore()
  const healthTone = health >= 80 ? 'good' : health >= 60 ? 'fair' : 'poor'
  const healthLabel = health >= 80 ? 'Good' : health >= 60 ? 'Fair' : 'Needs attention'

  function getMonthCount() {
    if (period === 'YTD') return new Date().getMonth() + 1
    return PERIODS.find(p => p.label === period)?.months || 12
  }

  function monthlyChartData() {
    const months = []
    const count = getMonthCount()
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
      const monthIncome = income
        .filter(inc => inc.date && inc.date.startsWith(key) && inc.status === 'received')
        .reduce((s, inc) => s + (inc.amount || 0), 0)
      const monthExpenses = expenses
        .filter(exp => exp.date && exp.date.startsWith(key))
        .reduce((s, exp) => s + (exp.amount || 0), 0)
      months.push({
        month: label,
        Income: Math.round(monthIncome),
        Expenses: Math.round(monthExpenses),
        Profit: Math.round(monthIncome - monthExpenses)
      })
    }
    return months
  }

  const propProfitData = props.map(p => {
    const c = calcProp(p)
    return {
      name: p.name.length > 16 ? p.name.slice(0, 16) + '…' : p.name,
      Profit: Math.round(c.monthlyProfit),
      Rent: Math.round(c.rent),
      Costs: Math.round(c.mExp)
    }
  })

  const equityChartData = props.map(p => {
    const c = calcProp(p)
    return {
      name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
      Equity: Math.round(c.equity),
      Mortgage: Math.round(c.mort),
      'Equity Release': Math.round(c.equityRelease),
      LTV: c.ltv
    }
  })

  function cashFlowForecast() {
    const months = []
    for (let i = 1; i <= 3; i++) {
      const d = new Date()
      d.setMonth(d.getMonth() + i)
      months.push({
        month: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
        Projected: Math.round(totals.rent - totals.exp)
      })
    }
    return months
  }

  function summarySentence() {
    const parts = []
    if (totals.profit > 0) parts.push(`generating ${fmt(totals.profit)} profit per month`)
    const vacantCount = props.filter(p => p.occupancy_status === 'Vacant').length
    if (vacantCount > 0) parts.push(`${vacantCount} vacant propert${vacantCount > 1 ? 'ies' : 'y'}`)
    if (totals.er > 0) parts.push(`${fmt(totals.er)} equity release available`)
    return parts.join(' · ')
  }

  const today = new Date().toISOString().slice(0, 10)
  const alerts = []
  props.forEach(p => {
    const days = d => d ? Math.round((new Date(d) - new Date()) / 86400000) : null
    if (p.occupancy_status === 'Vacant')
      alerts.push({ urgency: 'red', msg: p.name + ' is vacant', detail: 'No rental income', days: -999 })
    if (p.insurance_renewal) {
      const d = days(p.insurance_renewal)
      if (d !== null && d <= 45) alerts.push({ urgency: d <= 7 ? 'red' : 'amber', msg: 'Insurance renewal — ' + p.name, detail: fmtDays(d), days: d })
    }
    if (p.remortgage_date) {
      const d = days(p.remortgage_date)
      if (d !== null && d <= 90) alerts.push({ urgency: d <= 14 ? 'red' : 'amber', msg: 'Remortgage — ' + p.name, detail: fmtDays(d), days: d })
    }
    if (p.tenancy_end) {
      const d = days(p.tenancy_end)
      if (d !== null && d <= 60) alerts.push({ urgency: d <= 0 ? 'red' : d <= 30 ? 'amber' : 'blue', msg: 'Tenancy ending — ' + p.name, detail: fmtDays(d), days: d })
    }
  })
  income.filter(i => i.status === 'Overdue')
    .forEach(i => {
      const propName = props.find(p => p.id === i.property_id)?.name || 'Unknown'
      alerts.push({ urgency: 'red', msg: 'Overdue rent — ' + propName, detail: fmt(i.amount), days: -999 })
    })
  tasks.filter(t => t.status !== 'Done' && t.due_date && t.due_date < today)
    .forEach(t => alerts.push({ urgency: 'red', msg: 'Overdue: ' + t.title, detail: fmtDays(Math.round((new Date(t.due_date) - new Date()) / 86400000)), days: -999 }))
  alerts.sort((a, b) => a.days - b.days)

  const customTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="pf-tooltip">
          <div className="pf-tooltip-label">{label}</div>
          {payload.map(p => (
            <div key={p.name} className="pf-tooltip-row" style={{ color: p.color }}>
              <span className="pf-tooltip-dot" style={{ background: p.color }} />
              <span className="pf-tooltip-name">{p.name}</span>
              <span className="pf-tooltip-value">
                {typeof p.value === 'number' && p.name !== 'LTV' ? fmt(p.value) : p.value + (p.name === 'LTV' ? '%' : '')}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const C = {
    mid: '#6FAD2A',
    bright: '#8FCB3C',
    light: 'oklch(28% 0.040 130)',
    lightBorder: 'oklch(34% 0.050 130)',
    border: 'oklch(28% 0.020 145)',
    muted: 'oklch(65% 0.018 130)',
  }

  const navItems = ['dashboard', 'properties', 'income', 'expenses', 'cases', 'tasks', 'contacts']
  const sharedProps = { session, props, income, expenses, cases, tasks, contacts, reload: loadAll, calcProp, fmt }

  const greeting = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'
  const userName = session?.user?.user_metadata?.first_name || ''

  return (
    <div className="proflet-app">
      <DashStyles />

      <header className="pf-nav">
        <div className="pf-nav-inner">
          <a href="#" className="pf-nav-brand"><Wordmark size={26} /></a>
          <nav className="pf-nav-tabs">
            {navItems.map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`pf-nav-tab ${page === n ? 'pf-active' : ''}`}
              >
                {n}
              </button>
            ))}
          </nav>
          <button onClick={() => supabase.auth.signOut()} className="pf-nav-signout">Sign out</button>
        </div>
      </header>

      <div className="pf-body">
        {page === 'dashboard' && (
          <div className="pf-dash">
            <div className="pf-dash-header">
              <div>
                <div className="pf-dash-eyebrow">Overview · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                <h1 className="pf-dash-title">Good {greeting}{userName ? `, ${userName}` : ''}.</h1>
                {props.length > 0 && (
                  <div className="pf-dash-summary">{summarySentence()}</div>
                )}
              </div>
              <div className="pf-dash-controls">
                <button
                  onClick={generateMonthly}
                  disabled={generating}
                  className={`pf-cta pf-cta-primary ${generating ? 'pf-cta-loading' : ''}`}
                >
                  {generating ? (
                    <>
                      <span className="pf-spinner" />
                      <span>Generating…</span>
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M2.5 6.5a4 4 0 116.5 3.1M9 7V4M9 7l3 .5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Generate this month</span>
                    </>
                  )}
                </button>
                <Segment
                  current={period}
                  onChange={setPeriod}
                  options={PERIODS.map(p => ({ value: p.label, label: p.label }))}
                />
              </div>
            </div>

            <div className="pf-metric-grid">
              <MetricCard label="Portfolio value" value={fmt(totals.val)} sub={`${props.length} propert${props.length === 1 ? 'y' : 'ies'}`} />
              <MetricCard label="Total equity" value={fmt(totals.equity)} sub={`Avg LTV ${totals.val ? Math.round(totals.mort / totals.val * 100) : 0}%`} />
              <MetricCard label="Net monthly profit" value={fmt(totals.profit)} sub={`${fmt(totals.profit * 12)} per year`} accent="mid" highlight deltaUp />
              <MetricCard label="Avg gross yield" value={avgYield + '%'} sub="Annual rent / value" accent={parseFloat(avgYield) >= 5 ? 'mid' : 'amber'} />
            </div>

            <div className="pf-metric-grid pf-metric-grid-2">
              <MetricCard label="Monthly rent" value={fmt(totals.rent)} />
              <MetricCard label="Monthly costs" value={fmt(totals.exp)} />
              <MetricCard label="Mortgage debt" value={fmt(totals.mort)} sub={`${totals.val ? Math.round(totals.mort / totals.val * 100) : 0}% LTV`} />
              {health !== null && (
                <div className="pf-metric pf-metric-health">
                  <div className="pf-metric-label">Portfolio health</div>
                  <div className="pf-health-row">
                    <div className={`pf-health-ring pf-health-${healthTone}`} style={{ '--health': health + '%' }}>
                      <div className="pf-health-num">{health}</div>
                    </div>
                    <div className={`pf-health-label pf-health-text-${healthTone}`}>{healthLabel}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="pf-grid-2">
              <Card>
                <SectionTitle>Monthly income vs expenses</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyChartData()} barSize={period === '12M' ? 8 : 14} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: C.muted, fontFamily: 'Georgia, serif' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: C.muted, fontFamily: 'Georgia, serif' }} axisLine={false} tickLine={false} tickFormatter={v => '£' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                    <Tooltip content={customTooltip} cursor={{ fill: 'rgba(99,153,34,0.06)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Georgia, serif', paddingTop: '8px' }} iconType="circle" iconSize={8} />
                    <Bar dataKey="Income" fill={C.mid} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Expenses" fill={C.lightBorder} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <SectionTitle>Monthly profit trend</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={monthlyChartData()}>
                    <defs>
                      <linearGradient id="pfProfitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={C.bright} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={C.bright} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: C.muted, fontFamily: 'Georgia, serif' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: C.muted, fontFamily: 'Georgia, serif' }} axisLine={false} tickLine={false} tickFormatter={v => '£' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                    <Tooltip content={customTooltip} cursor={{ stroke: C.lightBorder, strokeWidth: 1, strokeDasharray: '3 3' }} />
                    <Area type="monotone" dataKey="Profit" stroke="none" fill="url(#pfProfitGrad)" />
                    <Line type="monotone" dataKey="Profit" stroke={C.mid} strokeWidth={2} dot={{ fill: C.mid, r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: C.mid, stroke: '#fff', strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <div className="pf-grid-2">
              <Card>
                <SectionTitle action={
                  <Segment current={profitView} onChange={setProfitView} options={[{ value: 'chart', label: 'Chart' }, { value: 'detail', label: 'Detail' }]} />
                }>Profit by property</SectionTitle>
                {!props.length ? <EmptyState>No properties yet</EmptyState> : profitView === 'chart' ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={propProfitData} layout="vertical" barSize={18}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: C.muted, fontFamily: 'Georgia, serif' }} axisLine={false} tickLine={false} tickFormatter={v => '£' + v} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: C.muted, fontFamily: 'Georgia, serif' }} axisLine={false} tickLine={false} width={90} />
                      <Tooltip content={customTooltip} cursor={{ fill: 'rgba(99,153,34,0.06)' }} />
                      <Bar dataKey="Profit" radius={[0, 4, 4, 0]} fill={C.mid} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="pf-table">
                    <div className="pf-table-head"><span>Property</span><span>Rent</span><span>Costs</span><span>Profit</span></div>
                    {props.map(p => {
                      const c = calcProp(p)
                      return (
                        <div key={p.id} className="pf-table-row">
                          <div>
                            <div className="pf-table-name">{p.name.length > 16 ? p.name.slice(0, 16) + '…' : p.name}</div>
                            <div className="pf-table-meta">Yield {c.grossYield}%</div>
                          </div>
                          <div className="pf-num">{fmt(c.rent)}</div>
                          <div className="pf-num">{fmt(c.mExp)}</div>
                          <div className={`pf-num pf-num-strong ${c.monthlyProfit >= 0 ? 'pf-text-mid' : 'pf-text-red'}`}>{fmt(c.monthlyProfit)}</div>
                        </div>
                      )
                    })}
                    <div className="pf-table-row pf-table-total">
                      <span>Total</span>
                      <span className="pf-num">{fmt(totals.rent)}</span>
                      <span className="pf-num">{fmt(totals.exp)}</span>
                      <span className="pf-num pf-text-mid">{fmt(totals.profit)}</span>
                    </div>
                  </div>
                )}
              </Card>

              <Card>
                <SectionTitle action={
                  <Segment current={equityView} onChange={setEquityView} options={[{ value: 'release', label: 'Release' }, { value: 'breakdown', label: 'Breakdown' }]} />
                }>Equity & mortgage per property</SectionTitle>
                {!props.length ? <EmptyState>No properties yet</EmptyState> : equityView === 'release' ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={equityChartData} layout="vertical" barSize={18}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: C.muted, fontFamily: 'Georgia, serif' }} axisLine={false} tickLine={false} tickFormatter={v => '£' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: C.muted, fontFamily: 'Georgia, serif' }} axisLine={false} tickLine={false} width={90} />
                      <Tooltip content={customTooltip} cursor={{ fill: 'rgba(99,153,34,0.06)' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Georgia, serif', paddingTop: '8px' }} iconType="circle" iconSize={8} />
                      <Bar dataKey="Equity" stackId="a" fill={C.mid} />
                      <Bar dataKey="Equity Release" stackId="b" fill={C.bright} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="pf-table">
                    <div className="pf-table-head"><span>Property</span><span>Value</span><span>Mortgage</span><span>LTV</span></div>
                    {props.map(p => {
                      const c = calcProp(p)
                      const ltvTone = c.ltv > 75 ? 'red' : c.ltv > 65 ? 'amber' : 'mid'
                      return (
                        <div key={p.id} className="pf-table-row">
                          <div>
                            <div className="pf-table-name">{p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name}</div>
                            <div className="pf-table-meta">Equity {fmt(c.equity)}</div>
                          </div>
                          <div className="pf-num">{fmt(c.val)}</div>
                          <div className="pf-num">{fmt(c.mort)}</div>
                          <div className={`pf-num pf-num-strong pf-text-${ltvTone}`}>{c.ltv}%</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            </div>

            <div className="pf-grid-2">
              <Card className="pf-card-alerts">
                <SectionTitle>Alerts & reminders</SectionTitle>
                <div className="pf-alerts-caption">Vacant · Insurance (45d) · Remortgage (90d) · Tenancy (60d) · Overdue tasks · Overdue rent</div>
                {!alerts.length ? (
                  <div className="pf-alerts-clear">
                    <div className="pf-alerts-clear-icon">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7.5L6 10l5-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <div className="pf-alerts-clear-title">All clear</div>
                      <div className="pf-alerts-clear-sub">No upcoming alerts on your portfolio.</div>
                    </div>
                  </div>
                ) : (
                  <div className="pf-alerts-list">
                    {alerts.map((a, i) => (
                      <div key={i} className={`pf-alert pf-alert-${a.urgency}`}>
                        <span className="pf-alert-pulse" />
                        <div className="pf-alert-body">
                          <div className="pf-alert-title">{a.msg}</div>
                          <div className="pf-alert-detail">{a.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <SectionTitle>3-month cash flow forecast</SectionTitle>
                <div className="pf-alerts-caption">Based on current recurring income and expenses</div>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={cashFlowForecast()} barSize={44}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.muted, fontFamily: 'Georgia, serif' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: C.muted, fontFamily: 'Georgia, serif' }} axisLine={false} tickLine={false} tickFormatter={v => '£' + v} />
                    <Tooltip content={customTooltip} cursor={{ fill: 'rgba(99,153,34,0.06)' }} />
                    <Bar dataKey="Projected" fill={C.mid} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="pf-forecast-foot">
                  <span className="pf-forecast-label">Projected quarterly profit</span>
                  <span className="pf-forecast-value">{fmt(totals.profit * 3)}</span>
                </div>
              </Card>
            </div>
          </div>
        )}

        {page === 'properties' && <Properties {...sharedProps} />}
        {page === 'income'     && <Income     {...sharedProps} />}
        {page === 'expenses'   && <Expenses   {...sharedProps} />}
        {page === 'cases'      && <Cases      {...sharedProps} />}
        {page === 'tasks'      && <Tasks      {...sharedProps} />}
        {page === 'contacts'   && <Contacts   {...sharedProps} />}
      </div>

      <AIChat props={props} income={income} expenses={expenses} cases={cases} tasks={tasks} contacts={contacts} session={session} />
    </div>
  )
}

function EmptyState({ children }) {
  return (
    <div className="pf-empty">
      <div className="pf-empty-icon">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 8.5L10 3.5l7 5V16a1 1 0 01-1 1H4a1 1 0 01-1-1V8.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 17v-5h4v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="pf-empty-text">{children}</div>
    </div>
  )
}

function DashStyles() {
  return (
    <style>{`
.proflet-app {
  --pl-dark:    #173404;
  --pl-mid:     #6FAD2A;
  --pl-bright:  #8FCB3C;
  --pl-light:   oklch(28% 0.040 130);
  --pl-light-b: oklch(34% 0.050 130);
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
  --pl-amber:   #FCD34D;
  --pl-amber-b: oklch(40% 0.10 70);
  --pl-amber-bg: oklch(28% 0.08 70);
  --pl-red:     #FCA5A5;
  --pl-red-b:   oklch(40% 0.12 30);
  --pl-red-bg:  oklch(28% 0.08 30);
  --pl-blue:    #93C5FD;
  --pl-blue-bg: oklch(28% 0.06 240);
  --pl-blue-b:  oklch(40% 0.10 240);
  --pl-r-sm: 8px; --pl-r-md: 12px; --pl-r-lg: 18px; --pl-r-xl: 24px;
  font-family: Georgia, 'Times New Roman', serif;
  color: var(--pl-text);
  background: var(--pl-bg);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

.proflet-app * { box-sizing: border-box; }
.proflet-app a { color: inherit; }

.pf-mark-1 { fill: var(--pl-bright); opacity: .55; }
.pf-mark-2 { fill: var(--pl-bright); opacity: .8; }
.pf-mark-3 { fill: var(--pl-bright); }
.pf-mark-text-1 { fill: var(--pl-bright); }
.pf-mark-text-2 { fill: var(--pl-bright); opacity: .75; }

.pf-nav { position: sticky; top: 0; z-index: 100; backdrop-filter: saturate(160%) blur(14px); -webkit-backdrop-filter: saturate(160%) blur(14px); background: color-mix(in oklab, var(--pl-bg) 85%, transparent); border-bottom: 1px solid var(--pl-border); }
.pf-nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; height: 64px; display: flex; align-items: center; gap: 24px; }
.pf-nav-brand { display: inline-flex; flex-shrink: 0; }
.pf-nav-tabs { display: flex; gap: 2px; margin-left: 12px; overflow-x: auto; scrollbar-width: none; }
.pf-nav-tabs::-webkit-scrollbar { display: none; }
.pf-nav-tab { font-family: Georgia, serif; font-size: 13.5px; font-weight: 400; text-transform: capitalize; background: transparent; border: 0; color: var(--pl-text-2); padding: 8px 14px; border-radius: 999px; cursor: pointer; white-space: nowrap; transition: color .18s, background .18s; }
.pf-nav-tab:hover { color: var(--pl-text); background: var(--pl-bg-3); }
.pf-nav-tab.pf-active { background: var(--pl-light); color: var(--pl-mid); font-weight: 500; border: 1px solid var(--pl-light-b); padding: 7px 13px; }
.pf-nav-signout { margin-left: auto; font-family: Georgia, serif; font-size: 12.5px; color: var(--pl-text-2); background: transparent; border: 1px solid var(--pl-border); border-radius: 999px; padding: 7px 14px; cursor: pointer; white-space: nowrap; transition: color .18s, border-color .18s, background .18s; }
.pf-nav-signout:hover { color: var(--pl-text); border-color: var(--pl-border-2); background: var(--pl-bg-3); }

.pf-body { max-width: 1200px; margin: 0 auto; padding: 1.75rem 1.5rem 4rem; }
.pf-dash { display: flex; flex-direction: column; gap: 14px; }
.pf-dash-header { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1.25rem; margin-bottom: .5rem; }
.pf-dash-eyebrow { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 11px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--pl-mid); margin-bottom: .55rem; display: inline-flex; align-items: center; gap: 8px; }
.pf-dash-eyebrow::before { content: ''; width: 22px; height: 1px; background: currentColor; display: inline-block; opacity: .5; }
.pf-dash-title { font-family: Georgia, serif; font-weight: 500; font-size: clamp(28px, 3vw, 36px); line-height: 1.12; letter-spacing: -0.02em; color: var(--pl-text); margin: 0; }
.pf-dash-summary { font-size: 14px; color: var(--pl-text-2); margin-top: .5rem; line-height: 1.55; }
.pf-dash-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.pf-cta { position: relative; display: inline-flex; align-items: center; gap: 8px; font-family: Georgia, serif; font-weight: 500; font-size: 13px; border: 0; cursor: pointer; border-radius: 999px; padding: 9px 16px; transition: transform .18s ease, box-shadow .18s ease; white-space: nowrap; }
.pf-cta-primary { color: white; background: linear-gradient(180deg, var(--pl-bright) 0%, var(--pl-mid) 100%); box-shadow: 0 1px 0 rgba(255,255,255,.25) inset, 0 -1px 0 rgba(0,0,0,.15) inset, 0 8px 22px -8px rgba(59,109,17,.55), 0 2px 4px rgba(20,40,10,.18); }
.pf-cta-primary:hover { transform: translateY(-1px); }
.pf-cta-primary:disabled, .pf-cta-loading { opacity: .8; cursor: wait; transform: none; }
.pf-spinner { width: 11px; height: 11px; border: 1.5px solid rgba(255,255,255,.4); border-top-color: white; border-radius: 50%; animation: pf-spin .7s linear infinite; }
@keyframes pf-spin { to { transform: rotate(360deg); } }

.pf-segment { display: inline-flex; gap: 2px; padding: 3px; background: var(--pl-bg-3); border: 1px solid var(--pl-border); border-radius: 999px; }
.pf-segment-btn { font-family: Georgia, serif; font-size: 11.5px; background: transparent; border: 0; color: var(--pl-text-2); padding: 5px 12px; border-radius: 999px; cursor: pointer; transition: color .18s, background .18s; }
.pf-segment-btn:hover { color: var(--pl-text); }
.pf-segment-btn.pf-active { background: var(--pl-bg-2); color: var(--pl-text); box-shadow: 0 1px 2px rgba(0,0,0,.06); font-weight: 500; }

.pf-metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.pf-metric-grid-2 { margin-bottom: .5rem; }
.pf-metric { position: relative; background: var(--pl-bg-2); border: 1px solid var(--pl-border); border-radius: var(--pl-r-md); padding: 1rem 1.15rem 1.05rem; box-shadow: var(--pl-shadow-1); overflow: hidden; transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
.pf-metric::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 100% 0%, color-mix(in oklab, var(--pl-bright) 8%, transparent), transparent 60%); opacity: 0; transition: opacity .25s ease; pointer-events: none; }
.pf-metric:hover { box-shadow: var(--pl-shadow-2); border-color: var(--pl-border-2); }
.pf-metric:hover::before { opacity: 1; }
.pf-metric-highlight { background: linear-gradient(180deg, color-mix(in oklab, var(--pl-bright) 8%, var(--pl-bg-2)) 0%, var(--pl-bg-2) 70%); border-color: var(--pl-light-b); }
.pf-metric-highlight::after { content: ''; position: absolute; inset: 0 0 auto 0; height: 1px; background: linear-gradient(90deg, transparent, color-mix(in oklab, var(--pl-bright) 60%, transparent), transparent); }
.pf-metric-label { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 10.5px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: var(--pl-muted); margin-bottom: 8px; position: relative; }
.pf-metric-value { font-family: Georgia, serif; font-size: 24px; font-weight: 500; letter-spacing: -0.015em; color: var(--pl-text); line-height: 1.1; position: relative; }
.pf-metric-mid { color: var(--pl-mid); }
.pf-metric-amber { color: var(--pl-amber); }
.pf-metric-red { color: var(--pl-red); }
.pf-metric-sub { font-family: ui-monospace, monospace; font-size: 11px; color: var(--pl-muted); margin-top: 6px; position: relative; }
.pf-metric-sub.pf-up { color: var(--pl-mid); }
.pf-metric-sub.pf-warn { color: var(--pl-amber); }

.pf-metric-health { display: flex; flex-direction: column; }
.pf-health-row { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
.pf-health-ring { --health: 0%; --ring: var(--pl-mid); width: 44px; height: 44px; border-radius: 50%; background: conic-gradient(var(--ring) var(--health), color-mix(in oklab, var(--ring) 16%, transparent) var(--health)); display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; }
.pf-health-ring::before { content: ''; position: absolute; inset: 4px; background: var(--pl-bg-2); border-radius: 50%; }
.pf-health-num { position: relative; font-family: Georgia, serif; font-size: 16px; font-weight: 500; color: var(--pl-text); letter-spacing: -0.01em; }
.pf-health-good { --ring: var(--pl-mid); }
.pf-health-fair { --ring: #D97706; }
.pf-health-poor { --ring: #B91C1C; }
.pf-health-label { font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: .04em; }
.pf-health-text-good { color: var(--pl-mid); }
.pf-health-text-fair { color: var(--pl-amber); }
.pf-health-text-poor { color: var(--pl-red); }

.pf-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pf-card { position: relative; background: var(--pl-bg-2); border: 1px solid var(--pl-border); border-radius: var(--pl-r-lg); padding: 1.25rem 1.4rem; box-shadow: var(--pl-shadow-1); transition: box-shadow .2s ease, border-color .2s ease; }
.pf-card:hover { box-shadow: var(--pl-shadow-2); }
.pf-section-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 12px; flex-wrap: wrap; }
.pf-section-eyebrow { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 10.5px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--pl-mid); display: inline-flex; align-items: center; gap: 8px; }
.pf-section-eyebrow::before { content: ''; width: 18px; height: 1px; background: currentColor; display: inline-block; opacity: .5; }

.pf-tooltip { background: var(--pl-bg-2); border: 1px solid var(--pl-border); border-radius: var(--pl-r-md); box-shadow: var(--pl-shadow-2); padding: 10px 14px; font-family: Georgia, serif; font-size: 12px; min-width: 140px; }
.pf-tooltip-label { font-weight: 500; color: var(--pl-text); margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--pl-border); font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: .04em; text-transform: uppercase; }
.pf-tooltip-row { display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 3px; color: var(--pl-text); }
.pf-tooltip-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.pf-tooltip-name { color: var(--pl-text-2); flex: 1; }
.pf-tooltip-value { font-family: ui-monospace, monospace; color: var(--pl-text); font-weight: 500; }

.pf-table { display: flex; flex-direction: column; }
.pf-table-head { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; font-family: ui-monospace, monospace; font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--pl-muted); padding: 0 0 8px; border-bottom: 1px solid var(--pl-border); }
.pf-table-head span:not(:first-child) { text-align: right; }
.pf-table-row { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; align-items: center; padding: 9px 0; border-bottom: 1px solid var(--pl-border); font-size: 13.5px; }
.pf-table-row:last-child { border-bottom: 0; }
.pf-table-name { color: var(--pl-text); font-weight: 500; }
.pf-table-meta { font-family: ui-monospace, monospace; font-size: 11px; color: var(--pl-muted); margin-top: 2px; }
.pf-num { text-align: right; font-family: ui-monospace, monospace; font-size: 12.5px; color: var(--pl-text-2); }
.pf-num-strong { font-weight: 600; }
.pf-text-mid { color: var(--pl-mid); }
.pf-text-red { color: var(--pl-red); }
.pf-text-amber { color: var(--pl-amber); }
.pf-table-total { border-bottom: 0; border-top: 1px solid var(--pl-border-2); padding-top: 12px; margin-top: 4px; font-weight: 500; color: var(--pl-text); }
.pf-table-total span:first-child { color: var(--pl-text); }

.pf-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem 1rem; gap: 12px; color: var(--pl-muted); }
.pf-empty-icon { width: 44px; height: 44px; border-radius: 12px; background: var(--pl-light); border: 1px solid var(--pl-light-b); color: var(--pl-mid); display: inline-flex; align-items: center; justify-content: center; }
.pf-empty-text { font-family: ui-monospace, monospace; font-size: 12px; letter-spacing: .04em; }

.pf-card-alerts { display: flex; flex-direction: column; }
.pf-alerts-caption { font-family: ui-monospace, monospace; font-size: 10.5px; letter-spacing: .04em; color: var(--pl-muted); margin: -6px 0 1rem; }
.pf-alerts-clear { display: flex; align-items: center; gap: 12px; padding: 1rem 1.1rem; background: var(--pl-light); border: 1px solid var(--pl-light-b); border-radius: var(--pl-r-md); }
.pf-alerts-clear-icon { width: 32px; height: 32px; border-radius: 50%; background: var(--pl-mid); color: white; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pf-alerts-clear-title { font-size: 14px; font-weight: 500; color: var(--pl-mid); }
.pf-alerts-clear-sub { font-size: 12px; color: var(--pl-text-2); margin-top: 2px; }
.pf-alerts-list { display: flex; flex-direction: column; gap: 6px; }
.pf-alert { display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; border-radius: var(--pl-r-md); border: 1px solid transparent; position: relative; transition: transform .2s ease; }
.pf-alert:hover { transform: translateX(2px); }
.pf-alert-pulse { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
.pf-alert-red { background: var(--pl-red-bg); border-color: var(--pl-red-b); }
.pf-alert-red .pf-alert-pulse { background: #DC2626; box-shadow: 0 0 0 3px rgba(220,38,38,.18); }
.pf-alert-red .pf-alert-detail { color: var(--pl-red); }
.pf-alert-amber { background: var(--pl-amber-bg); border-color: var(--pl-amber-b); }
.pf-alert-amber .pf-alert-pulse { background: #F59E0B; box-shadow: 0 0 0 3px rgba(245,158,11,.18); }
.pf-alert-amber .pf-alert-detail { color: var(--pl-amber); }
.pf-alert-blue { background: var(--pl-blue-bg); border-color: var(--pl-blue-b); }
.pf-alert-blue .pf-alert-pulse { background: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,.18); }
.pf-alert-blue .pf-alert-detail { color: var(--pl-blue); }
.pf-alert-body { flex: 1; min-width: 0; }
.pf-alert-title { font-size: 13px; color: var(--pl-text); font-weight: 500; }
.pf-alert-detail { font-size: 11.5px; font-family: ui-monospace, monospace; margin-top: 2px; font-weight: 500; letter-spacing: .02em; }

.pf-forecast-foot { margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; padding: .85rem 1rem; background: var(--pl-light); border: 1px solid var(--pl-light-b); border-radius: var(--pl-r-md); }
.pf-forecast-label { font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--pl-mid); }
.pf-forecast-value { font-family: Georgia, serif; font-size: 18px; font-weight: 500; color: var(--pl-mid); letter-spacing: -0.01em; }

@media (max-width: 1000px) { .pf-metric-grid { grid-template-columns: repeat(2, 1fr); } .pf-grid-2 { grid-template-columns: 1fr; } }
@media (max-width: 600px) { .pf-metric-grid { grid-template-columns: 1fr; } .pf-dash-header { align-items: flex-start; } .pf-dash-controls { width: 100%; } }
@media (prefers-reduced-motion: reduce) { .proflet-app *, .proflet-app *::before, .proflet-app *::after { animation: none !important; transition: none !important; } }
    `}</style>
  )
}
