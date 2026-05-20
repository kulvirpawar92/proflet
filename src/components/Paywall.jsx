import { useState } from 'react'
import { supabase } from '../supabase'

export default function Paywall({ session }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleCheckout() {
    setLoading(true)
    setError(null)
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      const res = await fetch(
        'https://wjjqgzyjubvhxivlqnxq.supabase.co/functions/v1/create-checkout-session',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentSession.user.email,
            userId: currentSession.user.id
          })
        }
      )
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError('Something went wrong. Please try again.')
      }
    } catch (e) {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'oklch(98.5% 0.005 110)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Georgia, serif',
      padding: '1rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: 'white',
        borderRadius: '24px',
        padding: '2.5rem',
        boxShadow: '0 30px 100px -30px rgba(20,40,10,.2), 0 4px 12px rgba(20,40,10,.06)',
        border: '1px solid oklch(92% 0.008 130)',
        textAlign: 'center'
      }}>
        {/* Logo */}
        <svg width="120" height="32" viewBox="0 0 120 32" fill="none" style={{ marginBottom: '1.75rem' }}>
          <rect x="0" y="12" width="7" height="20" rx="2" fill="#173404"/>
          <rect x="9" y="7" width="7" height="25" rx="2" fill="#3B6D11"/>
          <rect x="18" y="2" width="7" height="30" rx="2" fill="#639922"/>
          <text x="30" y="24" fontFamily="Georgia, serif" fontSize="18" fontWeight="700" fill="#3B6D11">prof</text>
          <text x="75" y="24" fontFamily="Georgia, serif" fontSize="18" fontWeight="400" fill="#639922">let</text>
        </svg>

        {/* Eyebrow */}
        <div style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: '11px',
          fontWeight: '500',
          letterSpacing: '.14em',
          textTransform: 'uppercase',
          color: '#3B6D11',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <span style={{ width: '22px', height: '1px', background: '#3B6D11', opacity: .5, display: 'inline-block' }} />
          Get started
          <span style={{ width: '22px', height: '1px', background: '#3B6D11', opacity: .5, display: 'inline-block' }} />
        </div>

        <h1 style={{
          fontSize: '30px',
          fontWeight: '500',
          color: '#173404',
          letterSpacing: '-0.02em',
          marginBottom: '10px',
          lineHeight: 1.2
        }}>
          One simple price.<br/>Everything included.
        </h1>

        <p style={{
          fontSize: '14px',
          color: 'oklch(52% 0.010 140)',
          marginBottom: '1.75rem',
          lineHeight: 1.6
        }}>
          Track rent, mortgages, expenses, maintenance and profitability — all in one place.
        </p>

        {/* Price card */}
        <div style={{
          background: '#EAF3DE',
          border: '1px solid #C8E6A0',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
            background: 'linear-gradient(90deg, #639922, #3B6D11)'
          }} />
          <div style={{
            fontSize: '52px',
            fontWeight: '500',
            color: '#173404',
            letterSpacing: '-0.03em',
            lineHeight: 1
          }}>£19</div>
          <div style={{
            fontSize: '13px',
            color: '#3B6D11',
            marginTop: '4px',
            fontWeight: '500'
          }}>per year — less than £1.60 a month</div>

          <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              'Unlimited properties',
              'Income & expense tracking',
              'Maintenance case management',
              'AI portfolio advisor',
              'CSV import & export',
              'Automatic monthly rent generation',
            ].map(f => (
              <div key={f} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: '#173404',
                textAlign: 'left'
              }}>
                <div style={{
                  width: '20px', height: '20px',
                  borderRadius: '50%',
                  background: '#3B6D11',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{
            background: '#FCEBEB',
            border: '1px solid #f5c6c6',
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '13px',
            color: '#c0392b',
            marginBottom: '1rem',
            textAlign: 'left'
          }}>{error}</div>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading}
          style={{
            width: '100%',
            padding: '15px',
            background: 'linear-gradient(180deg, #639922 0%, #3B6D11 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '999px',
            fontSize: '16px',
            fontWeight: '500',
            fontFamily: 'Georgia, serif',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? .7 : 1,
            boxShadow: '0 1px 0 rgba(255,255,255,.25) inset, 0 -1px 0 rgba(0,0,0,.15) inset, 0 8px 22px -8px rgba(59,109,17,.55)',
            transition: 'transform .18s ease',
            letterSpacing: '-0.005em'
          }}
          onMouseEnter={e => { if (!loading) e.target.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.target.style.transform = 'translateY(0)' }}
        >
          {loading ? 'Redirecting to checkout…' : 'Get Proflet — £19/year →'}
        </button>

        <div style={{ fontSize: '12px', color: 'oklch(52% 0.010 140)', marginTop: '10px' }}>
          🔒 Secure payment via Stripe · Cancel anytime
        </div>

        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid oklch(92% 0.008 130)',
          fontSize: '12px',
          color: 'oklch(52% 0.010 140)'
        }}>
          Signed in as <strong>{session?.user?.email}</strong> ·{' '}
          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              background: 'none', border: 'none',
              color: '#3B6D11', cursor: 'pointer',
              fontSize: '12px', fontFamily: 'Georgia, serif'
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}