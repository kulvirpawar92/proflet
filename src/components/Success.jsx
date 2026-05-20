import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Success() {
  const [status, setStatus] = useState('verifying')

  useEffect(() => {
    async function verify() {
      const params = new URLSearchParams(window.location.search)
      const sessionId = params.get('session_id')
      if (!sessionId) { setStatus('error'); return }

      // Wait for webhook to process
      await new Promise(r => setTimeout(r, 2000))

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatus('error'); return }

      const { data } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .single()

      if (data?.status === 'active') {
        setStatus('success')
        setTimeout(() => { window.location.href = '/' }, 2000)
      } else {
        // Webhook might still be processing — try once more
        await new Promise(r => setTimeout(r, 3000))
        const { data: data2 } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', user.id)
          .single()
        if (data2?.status === 'active') {
          setStatus('success')
          setTimeout(() => { window.location.href = '/' }, 2000)
        } else {
          setStatus('error')
        }
      }
    }
    verify()
  }, [])

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
        maxWidth: '440px',
        background: 'white',
        borderRadius: '24px',
        padding: '2.5rem',
        boxShadow: '0 30px 100px -30px rgba(20,40,10,.2)',
        border: '1px solid oklch(92% 0.008 130)',
        textAlign: 'center'
      }}>
        <svg width="120" height="32" viewBox="0 0 120 32" fill="none" style={{ marginBottom: '1.75rem' }}>
          <rect x="0" y="12" width="7" height="20" rx="2" fill="#173404"/>
          <rect x="9" y="7" width="7" height="25" rx="2" fill="#3B6D11"/>
          <rect x="18" y="2" width="7" height="30" rx="2" fill="#639922"/>
          <text x="30" y="24" fontFamily="Georgia, serif" fontSize="18" fontWeight="700" fill="#3B6D11">prof</text>
          <text x="75" y="24" fontFamily="Georgia, serif" fontSize="18" fontWeight="400" fill="#639922">let</text>
        </svg>

        {status === 'verifying' && (
          <>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
            <h2 style={{ fontSize: '24px', fontWeight: '500', color: '#173404', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              Confirming your payment…
            </h2>
            <p style={{ fontSize: '14px', color: 'oklch(52% 0.010 140)', lineHeight: 1.6 }}>
              This will only take a moment. Please don't close this page.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: '72px', height: '72px',
              borderRadius: '50%',
              background: '#EAF3DE',
              border: '2px solid #C8E6A0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M7 16l6.5 6.5L25 10" stroke="#3B6D11" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '26px', fontWeight: '500', color: '#173404', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              Welcome to Proflet!
            </h2>
            <p style={{ fontSize: '14px', color: 'oklch(52% 0.010 140)', lineHeight: 1.6 }}>
              Payment confirmed. Taking you to your dashboard…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '24px', fontWeight: '500', color: '#173404', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '14px', color: 'oklch(52% 0.010 140)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Your payment may have gone through but we couldn't verify it automatically. Please contact <strong>hello@proflet.com</strong> and we'll sort it out straight away.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '12px 28px',
                background: 'linear-gradient(180deg, #639922 0%, #3B6D11 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '999px',
                fontSize: '14px',
                fontFamily: 'Georgia, serif',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Go to dashboard
            </button>
          </>
        )}
      </div>
    </div>
  )
}