import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'

const SYSTEM_PROMPT = `You are Proflet AI, a specialist UK buy-to-let property advisor built into Proflet — a portfolio management app for UK landlords.

Your role:
- Give concise, actionable advice on rental properties, finances, and portfolio strategy
- Think in terms of yield, equity, cash flow, LTV, and monthly profit
- Be aware of UK landlord law: Renters' Rights Act 2024 (abolished fixed-term tenancies, Section 21 no longer valid, rent increases require Section 13 notice with 2 months notice), EPC requirements, deposit protection rules, right to rent checks
- Flag risks proactively — high LTV, low yield, upcoming renewals, overdue tasks
- When asked for numbers, be precise and show your working briefly
- Keep replies concise — landlords are busy. Use bullet points and bold for scannability.
- Never make up data. Only use what's in the portfolio context provided.
- If something isn't in the data, say so clearly.

Format: use **bold** for key figures, bullet points for lists, and keep paragraphs short. Never write walls of text.`

const SUGGESTIONS_STATIC = [
  'Which property is most profitable?',
  'What is my total equity?',
  'How much have I spent on repairs?',
  'What is my average yield?',
]

function buildDynamicSuggestions(props, expenses, tasks, income) {
  const suggestions = []
  const today = new Date()

  props.forEach(p => {
    if (p.insurance_renewal) {
      const d = Math.round((new Date(p.insurance_renewal) - today) / 86400000)
      if (d >= 0 && d <= 45) suggestions.push(`Insurance renewal coming up for ${p.name} — what should I do?`)
    }
    if (p.remortgage_date) {
      const d = Math.round((new Date(p.remortgage_date) - today) / 86400000)
      if (d >= 0 && d <= 90) suggestions.push(`Remortgage date approaching for ${p.name} — any advice?`)
    }
    if (p.tenancy_end) {
      const d = Math.round((new Date(p.tenancy_end) - today) / 86400000)
      if (d >= 0 && d <= 60) suggestions.push(`Rent review due for ${p.name} — how do I serve notice?`)
    }
    if (p.current_value && p.mortgage_balance) {
      const ltv = Math.round(p.mortgage_balance / p.current_value * 100)
      if (ltv > 80) suggestions.push(`${p.name} has high LTV (${ltv}%) — what are my options?`)
    }
  })

  const overdueTasks = tasks.filter(t => t.status !== 'Done' && t.due_date && t.due_date < today.toISOString().slice(0, 10))
  if (overdueTasks.length > 0) suggestions.push(`I have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} — help me prioritise`)

  const overdueIncome = income.filter(i => i.status?.toLowerCase() === 'overdue')
  if (overdueIncome.length > 0) suggestions.push(`${overdueIncome.length} rent payment${overdueIncome.length > 1 ? 's are' : ' is'} overdue — what are my options?`)

  return suggestions.slice(0, 3)
}

function buildContext(props, income, expenses, cases, tasks, contacts) {
  const fmt = (n) => '£' + Math.round(n || 0).toLocaleString()
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : 'not set'

  const propDetails = props.map(p => {
    const propIncome = income.filter(i => i.property_id === p.id)
    const propExpenses = expenses.filter(e => e.property_id === p.id)
    const totalIncome = propIncome.filter(i => i.status?.toLowerCase() === 'received').reduce((s, i) => s + (i.amount || 0), 0)
    const totalExpenses = propExpenses.reduce((s, e) => s + (e.amount || 0), 0)
    const equity = (p.current_value || 0) - (p.mortgage_balance || 0)
    const ltv = p.current_value ? Math.round((p.mortgage_balance || 0) / p.current_value * 100) : 0
    const yld = p.current_value ? ((p.monthly_rent || 0) * 12 / p.current_value * 100).toFixed(1) : 0
    const mExp = propExpenses.filter(e => e.recurring).reduce((s, e) => s + (e.amount || 0), 0)
    const monthlyProfit = (p.monthly_rent || 0) - mExp

    return `
Property: ${p.name}
- Address: ${p.address || 'not set'}, ${p.postcode || ''}
- Type: ${p.type || 'not set'} | Bedrooms: ${p.bedrooms || '?'} | Bathrooms: ${p.bathrooms || '?'}
- Status: ${p.status || 'not set'} | Occupancy: ${p.occupancy_status || 'not set'}
- Purchase price: ${fmt(p.purchase_price)} | Current value: ${fmt(p.current_value)}
- Monthly rent: ${fmt(p.monthly_rent)} | Monthly recurring expenses: ${fmt(mExp)} | Monthly profit: ${fmt(monthlyProfit)}
- Mortgage: ${p.mortgage_lender || 'not set'} | Balance: ${fmt(p.mortgage_balance)} | Payment: ${fmt(p.mortgage_payment)} | Rate: ${p.interest_rate ? p.interest_rate + '%' : 'not set'}
- Fixed term ends: ${fmtDate(p.fixed_term_end)} | Remortgage date: ${fmtDate(p.remortgage_date)}
- Equity: ${fmt(equity)} | LTV: ${ltv}% | Gross yield: ${yld}%
- Tenancy start: ${fmtDate(p.tenancy_start)} | Rent review date: ${fmtDate(p.tenancy_end)}
- Insurance: ${p.insurance_provider || 'not set'} | Renewal: ${fmtDate(p.insurance_renewal)}
- Total income received (all time): ${fmt(totalIncome)} | Total expenses: ${fmt(totalExpenses)} | Net P&L: ${fmt(totalIncome - totalExpenses)}`
  }).join('\n')

  const totalEquity = props.reduce((s, p) => s + (p.current_value || 0) - (p.mortgage_balance || 0), 0)
  const totalRent = props.reduce((s, p) => s + (p.monthly_rent || 0), 0)
  const totalMortgage = props.reduce((s, p) => s + (p.mortgage_payment || 0), 0)
  const totalRecurringExp = expenses.filter(e => e.recurring).reduce((s, e) => s + (e.amount || 0), 0)
  const totalMonthlyProfit = totalRent - totalRecurringExp
  const totalPortfolioValue = props.reduce((s, p) => s + (p.current_value || 0), 0)
  const portfolioYield = totalPortfolioValue ? ((totalRent * 12 / totalPortfolioValue) * 100).toFixed(1) : 0
  const totalReceived = income.filter(i => i.status?.toLowerCase() === 'received').reduce((s, i) => s + (i.amount || 0), 0)
  const totalPending = income.filter(i => i.status?.toLowerCase() === 'pending').reduce((s, i) => s + (i.amount || 0), 0)
  const totalOverdue = income.filter(i => i.status?.toLowerCase() === 'overdue').reduce((s, i) => s + (i.amount || 0), 0)
  const openCases = cases.filter(c => c.status !== 'Closed').length
  const highCases = cases.filter(c => c.priority === 'High' && c.status !== 'Closed').length
  const openTasks = tasks.filter(t => t.status !== 'Done').length
  const today = new Date().toISOString().slice(0, 10)
  const overdueTasks = tasks.filter(t => t.status !== 'Done' && t.due_date && t.due_date < today).length

  return `PORTFOLIO SUMMARY
- Properties: ${props.length} | Total value: ${fmt(totalPortfolioValue)} | Total equity: ${fmt(totalEquity)}
- Monthly rent: ${fmt(totalRent)} | Mortgage payments: ${fmt(totalMortgage)} | Recurring expenses: ${fmt(totalRecurringExp)}
- Monthly profit: ${fmt(totalMonthlyProfit)} | Annual estimate: ${fmt(totalMonthlyProfit * 12)}
- Portfolio gross yield: ${portfolioYield}%

INCOME: received ${fmt(totalReceived)} | pending ${fmt(totalPending)} | overdue ${fmt(totalOverdue)} | ${income.length} records
EXPENSES: ${fmt(expenses.reduce((s, e) => s + (e.amount || 0), 0))} total | ${expenses.length} records
CASES: ${openCases} open (${highCases} high priority)
TASKS: ${openTasks} open (${overdueTasks} overdue)
CONTACTS: ${contacts.length}

PROPERTY DETAILS
${propDetails}

Today: ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
}

// Simple markdown renderer — bold, bullets, line breaks
function MarkdownText({ text }) {
  const lines = text.split('\n')
  return (
    <div style={{ lineHeight: 1.55 }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: '0.4em' }} />
        const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('• ')
        const content = isBullet ? line.trim().slice(2) : line
        const parts = content.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j}>{part.slice(2, -2)}</strong>
          }
          return part
        })
        if (isBullet) {
          return (
            <div key={i} style={{ display: 'flex', gap: '7px', marginBottom: '3px' }}>
              <span style={{ color: '#6FAD2A', flexShrink: 0, marginTop: '1px' }}>•</span>
              <span>{parts}</span>
            </div>
          )
        }
        return <div key={i} style={{ marginBottom: '3px' }}>{parts}</div>
      })}
    </div>
  )
}

export default function AIChat({ props, income, expenses, cases, tasks, contacts, session }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const dynamicSuggestions = buildDynamicSuggestions(props, expenses, tasks, income)
  const allSuggestions = [...dynamicSuggestions, ...SUGGESTIONS_STATIC].slice(0, 4)

  // Load chat history from Supabase on first open
  useEffect(() => {
    if (!open || historyLoaded) return
    async function loadHistory() {
      const { data } = await supabase
        .from('chat_messages')
        .select('role, content, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })
        .limit(20)

      if (data && data.length > 0) {
        setMessages(data.map(m => ({ role: m.role, content: m.content })))
      } else {
        setMessages([{
          role: 'assistant',
          content: `Hi! I'm your Proflet AI — I have your full portfolio in front of me: **${props.length} propert${props.length === 1 ? 'y' : 'ies'}**, all income, expenses, cases and tasks. What do you want to know?`
        }])
      }
      setHistoryLoaded(true)
    }
    loadHistory()
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  async function saveMessage(role, content) {
    await supabase.from('chat_messages').insert({
      user_id: session.user.id,
      role,
      content
    })
    // Keep only last 20 messages per user
    const { data } = await supabase
      .from('chat_messages')
      .select('id, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    if (data && data.length > 20) {
      const toDelete = data.slice(20).map(m => m.id)
      await supabase.from('chat_messages').delete().in('id', toDelete)
    }
  }

  async function send(text) {
    const userText = text || input.trim()
    if (!userText || loading) return
    setInput('')

    const newMessages = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setLoading(true)

    await saveMessage('user', userText)

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      const res = await fetch(
        'https://wjjqgzyjubvhxivlqnxq.supabase.co/functions/v1/ai-chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession.access_token}`
          },
          body: JSON.stringify({
            systemPrompt: SYSTEM_PROMPT,
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
            portfolioContext: buildContext(props, income, expenses, cases, tasks, contacts)
          })
        }
      )
      const data = await res.json()
      const reply = data.reply || 'Sorry, something went wrong. Please try again.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      await saveMessage('assistant', reply)
    } catch {
      const errMsg = 'Sorry, I couldn\'t connect. Please try again.'
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }])
    }
    setLoading(false)
  }

  async function clearHistory() {
    await supabase.from('chat_messages').delete().eq('user_id', session.user.id)
    setMessages([{
      role: 'assistant',
      content: `Hi! I'm your Proflet AI — I have your full portfolio in front of me: **${props.length} propert${props.length === 1 ? 'y' : 'ies'}**, all income, expenses, cases and tasks. What do you want to know?`
    }])
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem',
          width: '54px', height: '54px', borderRadius: '50%',
          background: open
            ? 'linear-gradient(180deg, #3B6D11 0%, #173404 100%)'
            : 'linear-gradient(180deg, #6FAD2A 0%, #3B6D11 100%)',
          border: 'none', cursor: 'pointer', zIndex: 1000,
          boxShadow: '0 4px 24px rgba(59,109,17,.5), 0 1px 0 rgba(255,255,255,.2) inset',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s ease',
        }}
        title="Ask Proflet AI"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 3l12 12M15 3L3 15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 2C6.03 2 2 5.69 2 10.2c0 2.4 1.1 4.56 2.87 6.1L4 20l3.93-1.57C8.87 18.8 9.92 19 11 19c4.97 0 9-3.69 9-8.2C20 6.3 16.52 2 11 2z" fill="white"/>
            <path d="M7 10h8M7 13h5" stroke="#3B6D11" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '5rem', right: '1.5rem',
          width: 'min(500px, calc(100vw - 2rem))',
          height: 'min(620px, calc(100vh - 8rem))',
          background: 'oklch(16% 0.020 145)',
          borderRadius: '20px',
          boxShadow: '0 30px 100px -20px rgba(0,0,0,.7), 0 4px 12px rgba(0,0,0,.4)',
          border: '1px solid oklch(28% 0.020 145)',
          display: 'flex', flexDirection: 'column',
          zIndex: 999, overflow: 'hidden',
          fontFamily: 'Georgia, serif',
          animation: 'pl-chat-pop .3s cubic-bezier(.2,.7,.2,1) both'
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(180deg, oklch(22% 0.040 130) 0%, oklch(19% 0.030 130) 100%)',
            borderBottom: '1px solid oklch(28% 0.020 145)',
            padding: '1rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '10px',
            position: 'relative', overflow: 'hidden', flexShrink: 0
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse 80% 100% at 0% 50%, color-mix(in oklab, #8FCB3C 12%, transparent), transparent 60%)',
              pointerEvents: 'none'
            }} />
            <div style={{
              width: '34px', height: '34px', borderRadius: '10px',
              background: 'linear-gradient(180deg, #6FAD2A 0%, #3B6D11 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', flexShrink: 0,
              boxShadow: '0 2px 8px rgba(59,109,17,.4)'
            }}>✦</div>
            <div style={{ position: 'relative' }}>
              <div style={{ fontWeight: '500', fontSize: '14px', color: 'oklch(96% 0.012 110)' }}>Proflet AI</div>
              <div style={{ fontSize: '11px', color: 'oklch(65% 0.018 130)', fontFamily: 'ui-monospace, monospace', letterSpacing: '.04em' }}>
                {props.length} propert{props.length === 1 ? 'y' : 'ies'} · live portfolio data
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center', position: 'relative' }}>
              <button
                onClick={clearHistory}
                title="Clear chat history"
                style={{
                  background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)',
                  borderRadius: '8px', padding: '5px 10px',
                  color: 'oklch(65% 0.018 130)', cursor: 'pointer',
                  fontSize: '11px', fontFamily: 'ui-monospace, monospace', letterSpacing: '.04em'
                }}
              >Clear</button>
              <button onClick={() => setOpen(false)} style={{
                background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)',
                borderRadius: '8px', width: '28px', height: '28px',
                color: 'oklch(65% 0.018 130)', cursor: 'pointer',
                fontSize: '16px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>×</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '1rem',
            display: 'flex', flexDirection: 'column', gap: '10px'
          }}>
            {!historyLoaded && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'oklch(65% 0.018 130)', fontSize: '13px' }}>
                Loading…
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start'
              }}>
                {m.role === 'assistant' && (
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '7px', flexShrink: 0,
                    background: 'linear-gradient(180deg, #6FAD2A 0%, #3B6D11 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', marginRight: '7px', marginTop: '2px',
                    alignSelf: 'flex-start'
                  }}>✦</div>
                )}
                <div style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: m.role === 'user'
                    ? 'linear-gradient(180deg, #6FAD2A 0%, #3B6D11 100%)'
                    : 'oklch(19% 0.022 145)',
                  color: m.role === 'user' ? 'white' : 'oklch(96% 0.012 110)',
                  fontSize: '13px',
                  border: m.role === 'assistant' ? '1px solid oklch(28% 0.020 145)' : 'none',
                  boxShadow: m.role === 'user' ? '0 2px 12px rgba(59,109,17,.3)' : 'none'
                }}>
                  {m.role === 'assistant'
                    ? <MarkdownText text={m.content} />
                    : m.content
                  }
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '7px', flexShrink: 0,
                  background: 'linear-gradient(180deg, #6FAD2A 0%, #3B6D11 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px'
                }}>✦</div>
                <div style={{
                  padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
                  background: 'oklch(19% 0.022 145)', border: '1px solid oklch(28% 0.020 145)',
                  display: 'flex', gap: '5px', alignItems: 'center'
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: '#6FAD2A',
                      animation: `pl-bounce 1.2s ease infinite ${i * .2}s`
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Dynamic suggestions */}
          {messages.length <= 1 && historyLoaded && !loading && (
            <div style={{ padding: '0 1rem .75rem', display: 'flex', flexWrap: 'wrap', gap: '6px', flexShrink: 0 }}>
              {allSuggestions.map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  fontSize: '11.5px', padding: '6px 12px',
                  background: 'oklch(22% 0.040 130)',
                  color: '#6FAD2A',
                  border: '1px solid oklch(28% 0.040 130)',
                  borderRadius: '20px', cursor: 'pointer',
                  fontFamily: 'Georgia, serif', lineHeight: 1.3,
                  transition: 'background .15s'
                }}>{s}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: '.75rem 1rem',
            borderTop: '1px solid oklch(28% 0.020 145)',
            display: 'flex', gap: '8px', alignItems: 'flex-end',
            background: 'oklch(14% 0.018 145)', flexShrink: 0
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder='Ask about your portfolio…'
              rows={1}
              style={{
                flex: 1, padding: '10px 13px',
                borderRadius: '10px',
                border: '1px solid oklch(28% 0.020 145)',
                fontSize: '13px', outline: 'none', resize: 'none',
                fontFamily: 'Georgia, serif', lineHeight: '1.4',
                background: 'oklch(19% 0.022 145)',
                color: 'oklch(96% 0.012 110)',
                colorScheme: 'dark',
                maxHeight: '80px', overflowY: 'auto'
              }}
              onFocus={e => { e.target.style.borderColor = '#6FAD2A'; e.target.style.boxShadow = '0 0 0 3px rgba(111,173,42,.18)' }}
              onBlur={e => { e.target.style.borderColor = 'oklch(28% 0.020 145)'; e.target.style.boxShadow = 'none' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{
                width: '38px', height: '38px', borderRadius: '10px',
                background: input.trim() && !loading
                  ? 'linear-gradient(180deg, #6FAD2A 0%, #3B6D11 100%)'
                  : 'oklch(28% 0.020 145)',
                border: 'none',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background .15s', flexShrink: 0,
                boxShadow: input.trim() && !loading ? '0 2px 8px rgba(59,109,17,.35)' : 'none'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8h12M8 3l7 5-7 5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pl-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: .5; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes pl-chat-pop {
          from { opacity: 0; transform: translateY(10px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  )
}
