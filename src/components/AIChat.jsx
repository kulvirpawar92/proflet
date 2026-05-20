import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'

const C = {
  dark: '#173404', mid: '#3B6D11', bright: '#639922',
  light: '#EAF3DE', lightBorder: '#C8E6A0',
  text: '#1a1a1a', subtle: '#666',
  bg: '#f4f6f4', card: 'white', border: '#e8e8e8',
}

const SUGGESTIONS = [
  'Which property is most profitable?',
  'What is my total equity?',
  'Are any tenancies ending soon?',
  'How much have I spent on repairs?',
  'What is my average yield?',
  'Any upcoming renewals I should know about?',
]

export default function AIChat({ props, income, expenses, cases, tasks, contacts, session }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Hi! I'm your Proflet AI assistant. I have access to your full portfolio — ${props.length} propert${props.length === 1 ? 'y' : 'ies'}, income records, expenses, cases, and tasks. Ask me anything about your portfolio.`
      }])
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  function buildContext() {
    const fmt = (n) => '£' + Math.round(n || 0).toLocaleString()
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : 'not set'

    const propDetails = props.map(p => {
      const propIncome = income.filter(i => i.property_id === p.id)
      const propExpenses = expenses.filter(e => e.property_id === p.id)
      const totalIncome = propIncome.filter(i => i.status === 'Received').reduce((s, i) => s + (i.amount || 0), 0)
      const totalExpenses = propExpenses.reduce((s, e) => s + (e.amount || 0), 0)
      const equity = (p.current_value || 0) - (p.mortgage_balance || 0)
      const ltv = p.current_value ? Math.round((p.mortgage_balance || 0) / p.current_value * 100) : 0
      const yield_ = p.current_value ? ((p.monthly_rent || 0) * 12 / p.current_value * 100).toFixed(1) : 0
      const recurringExp = propExpenses.filter(e => e.recurring).reduce((s, e) => s + (e.amount || 0), 0)
      const monthlyProfit = (p.monthly_rent || 0) - recurringExp

      return `
Property: ${p.name}
- Address: ${p.address || 'not set'}, ${p.postcode || ''}
- Type: ${p.type || 'not set'} | Bedrooms: ${p.bedrooms || '?'} | Bathrooms: ${p.bathrooms || '?'}
- Status: ${p.status || 'not set'} | Occupancy: ${p.occupancy_status || 'not set'}
- Purchase price: ${fmt(p.purchase_price)} | Current value: ${fmt(p.current_value)}
- Monthly rent: ${fmt(p.monthly_rent)}
- Mortgage lender: ${p.mortgage_lender || 'not set'} | Balance: ${fmt(p.mortgage_balance)} | Monthly payment: ${fmt(p.mortgage_payment)}
- Interest rate: ${p.interest_rate ? p.interest_rate + '%' : 'not set'} | Fixed term ends: ${fmtDate(p.fixed_term_end)} | Remortgage date: ${fmtDate(p.remortgage_date)}
- Equity: ${fmt(equity)} | LTV: ${ltv}%
- Gross yield: ${yield_}%
- Monthly profit: ${fmt(monthlyProfit)}
- Tenancy start: ${fmtDate(p.tenancy_start)} | Tenancy end: ${fmtDate(p.tenancy_end)}
- Insurance provider: ${p.insurance_provider || 'not set'} | Renewal: ${fmtDate(p.insurance_renewal)}
- Total income received: ${fmt(totalIncome)}
- Total expenses: ${fmt(totalExpenses)}
- Net P&L: ${fmt(totalIncome - totalExpenses)}`
    }).join('\n')

    const totalEquity = props.reduce((s, p) => s + (p.current_value || 0) - (p.mortgage_balance || 0), 0)
    const totalRent = props.reduce((s, p) => s + (p.monthly_rent || 0), 0)
    const totalMortgage = props.reduce((s, p) => s + (p.mortgage_payment || 0), 0)
    const totalRecurringExp = expenses.filter(e => e.recurring).reduce((s, e) => s + (e.amount || 0), 0)
    const totalMonthlyProfit = totalRent - totalRecurringExp
    const totalPortfolioValue = props.reduce((s, p) => s + (p.current_value || 0), 0)
    const totalReceived = income.filter(i => i.status === 'Received').reduce((s, i) => s + (i.amount || 0), 0)
    const totalPending = income.filter(i => i.status === 'Pending').reduce((s, i) => s + (i.amount || 0), 0)
    const totalOverdue = income.filter(i => i.status === 'Overdue').reduce((s, i) => s + (i.amount || 0), 0)

    const openCases = cases.filter(c => c.status !== 'Closed').length
    const highCases = cases.filter(c => c.priority === 'High' && c.status !== 'Closed').length
    const openTasks = tasks.filter(t => t.status !== 'Done').length
    const today = new Date().toISOString().slice(0, 10)
    const overdueTasks = tasks.filter(t => t.status !== 'Done' && t.due_date && t.due_date < today).length

    return `
PORTFOLIO SUMMARY
- Total properties: ${props.length}
- Total portfolio value: ${fmt(totalPortfolioValue)}
- Total equity: ${fmt(totalEquity)}
- Monthly rent income: ${fmt(totalRent)}
- Monthly mortgage payments: ${fmt(totalMortgage)}
- Monthly recurring expenses: ${fmt(totalRecurringExp)}
- Monthly profit: ${fmt(totalMonthlyProfit)}
- Annual profit estimate: ${fmt(totalMonthlyProfit * 12)}

INCOME SUMMARY
- Total received: ${fmt(totalReceived)}
- Pending: ${fmt(totalPending)}
- Overdue: ${fmt(totalOverdue)}
- Total records: ${income.length}

EXPENSE SUMMARY
- Total expenses logged: ${fmt(expenses.reduce((s, e) => s + (e.amount || 0), 0))}
- Monthly recurring total: ${fmt(totalRecurringExp)}
- Total records: ${expenses.length}

CASES & TASKS
- Open cases: ${openCases} (${highCases} high priority)
- Open tasks: ${openTasks} (${overdueTasks} overdue)

CONTACTS
- Total contacts: ${contacts.length}

PROPERTY DETAILS
${propDetails}

Today's date: ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
`
  }

  async function send(text) {
    const userText = text || input.trim()
    if (!userText || loading) return
    setInput('')

    const newMessages = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setLoading(true)

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
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
            portfolioContext: buildContext()
          })
        }
      )
      const data = await res.json()
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I couldn\'t connect. Please try again.' }])
    }
    setLoading(false)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem',
          width: '52px', height: '52px', borderRadius: '50%',
          background: open ? '#173404' : '#3B6D11',
          border: 'none', cursor: 'pointer', zIndex: 1000,
          boxShadow: '0 4px 20px rgba(59,109,17,.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s ease',
          color: 'white'
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
          width: '380px', height: '520px',
          background: 'white', borderRadius: '16px',
          boxShadow: '0 8px 40px rgba(0,0,0,.18)',
          border: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column',
          zIndex: 999, overflow: 'hidden',
          fontFamily: 'Georgia, serif'
        }}>
          {/* Header */}
          <div style={{
            background: C.mid, color: 'white',
            padding: '1rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'rgba(255,255,255,.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px'
            }}>✦</div>
            <div>
              <div style={{ fontWeight: '500', fontSize: '14px' }}>Proflet AI</div>
              <div style={{ fontSize: '11px', opacity: .8 }}>Ask about your portfolio</div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: 'white', cursor: 'pointer', opacity: .8, fontSize: '18px',
              lineHeight: 1, padding: '0 2px'
            }}>×</button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '1rem',
            display: 'flex', flexDirection: 'column', gap: '10px'
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  maxWidth: '85%',
                  padding: '9px 13px',
                  borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: m.role === 'user' ? C.mid : C.bg,
                  color: m.role === 'user' ? 'white' : C.text,
                  fontSize: '13px',
                  lineHeight: '1.5',
                  border: m.role === 'assistant' ? `1px solid ${C.border}` : 'none'
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
                  background: C.bg, border: `1px solid ${C.border}`,
                  display: 'flex', gap: '4px', alignItems: 'center'
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: C.mid, opacity: .5,
                      animation: `pl-bounce 1.2s ease infinite ${i * .2}s`
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && !loading && (
            <div style={{ padding: '0 1rem .75rem', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {SUGGESTIONS.slice(0, 4).map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  fontSize: '11px', padding: '5px 10px',
                  background: C.light, color: C.mid,
                  border: `1px solid ${C.lightBorder}`,
                  borderRadius: '20px', cursor: 'pointer',
                  fontFamily: 'Georgia, serif', lineHeight: 1.3
                }}>{s}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: '.75rem 1rem',
            borderTop: `1px solid ${C.border}`,
            display: 'flex', gap: '8px', alignItems: 'flex-end'
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder='Ask about your portfolio...'
              rows={1}
              style={{
                flex: 1, padding: '9px 12px',
                borderRadius: '10px', border: `1px solid ${C.border}`,
                fontSize: '13px', outline: 'none', resize: 'none',
                fontFamily: 'Georgia, serif', lineHeight: '1.4',
                background: C.bg, color: C.text, colorScheme: 'light',
                maxHeight: '80px', overflowY: 'auto'
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: input.trim() && !loading ? C.mid : C.border,
                border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background .15s', flexShrink: 0
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
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </>
  )
}