import { useState } from 'react'
import { supabase } from '../supabase'

export default function Auth({ onBack }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else setMessage('Check your email to confirm your account!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
    }
    setLoading(false)
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://proflet.com/reset-password'
    })
    if (error) setMessage(error.message)
    else setMessage('Check your email for a password reset link!')
    setLoading(false)
  }

  const Logo = () => (
    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
      <svg width="140" height="36" viewBox="0 0 140 36" fill="none">
        <rect x="0" y="14" width="7" height="22" rx="2" fill="#173404"/>
        <rect x="10" y="8" width="7" height="28" rx="2" fill="#3B6D11"/>
        <rect x="20" y="2" width="7" height="34" rx="2" fill="#639922"/>
        <text x="35" y="26" fontFamily="Georgia, serif" fontSize="20" fontWeight="700" fill="#3B6D11">prof</text>
        <text x="83" y="26" fontFamily="Georgia, serif" fontSize="20" fontWeight="400" fill="#639922">let</text>
      </svg>
      <div style={{ fontSize: '13px', color: '#666', marginTop: '6px' }}>Property portfolio management</div>
    </div>
  )

  if (isForgotPassword) {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f6f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', position: 'relative' }}>
        <button onClick={() => { setIsForgotPassword(false); setMessage('') }} style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', background: 'none', border: 'none', color: '#666', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif', display: 'flex', alignItems: 'center', gap: '4px' }}>
          ← Back
        </button>
        <div style={{ background: 'white', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '400px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <Logo />
          <h2 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '0.5rem', textAlign: 'center', color: '#173404' }}>Reset your password</h2>
          <p style={{ fontSize: '13px', color: '#666', textAlign: 'center', marginBottom: '1.5rem' }}>Enter your email and we'll send you a reset link.</p>
          <form onSubmit={handleForgotPassword}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: '#1a1a1a', colorScheme: 'light' }}
              />
            </div>
            {message && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', marginBottom: '1rem', background: message.includes('error') || message.includes('Invalid') ? '#FCEBEB' : '#EAF3DE', color: message.includes('error') || message.includes('Invalid') ? '#791F1F' : '#27500A', fontSize: '13px' }}>
                {message}
              </div>
            )}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#3B6D11', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', fontFamily: 'Georgia, serif', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', position: 'relative' }}>
      {onBack && (
        <button onClick={onBack} style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', background: 'none', border: 'none', color: '#666', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif', display: 'flex', alignItems: 'center', gap: '4px' }}>
          ← Back
        </button>
      )}
      <div style={{ background: 'white', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '400px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <Logo />
        <h2 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '1.5rem', textAlign: 'center', color: '#173404' }}>
          {isSignUp ? 'Create your account' : 'Sign in to your account'}
        </h2>
        {isSignUp && (
          <div style={{ background: '#EAF3DE', border: '1px solid #C8E6A0', borderRadius: '8px', padding: '10px 14px', marginBottom: '1.25rem', fontSize: '13px', color: '#27500A', textAlign: 'center' }}>
            £19/year · Unlimited properties · Cancel anytime
          </div>
        )}
        <form onSubmit={handleAuth}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: '#1a1a1a', colorScheme: 'light' }}
            />
          </div>
          <div style={{ marginBottom: !isSignUp ? '0.5rem' : '1.5rem' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: '#1a1a1a', colorScheme: 'light' }}
            />
          </div>
          {!isSignUp && (
            <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
              <span onClick={() => { setIsForgotPassword(true); setMessage('') }} style={{ fontSize: '12px', color: '#3B6D11', cursor: 'pointer' }}>
                Forgot password?
              </span>
            </div>
          )}
          {message && (
            <div style={{ padding: '10px 12px', borderRadius: '8px', marginBottom: '1rem', background: message.includes('error') || message.includes('Invalid') ? '#FCEBEB' : '#EAF3DE', color: message.includes('error') || message.includes('Invalid') ? '#791F1F' : '#27500A', fontSize: '13px' }}>
              {message}
            </div>
          )}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#3B6D11', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', fontFamily: 'Georgia, serif', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '13px', color: '#666' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span onClick={() => setIsSignUp(!isSignUp)} style={{ color: '#3B6D11', cursor: 'pointer', fontWeight: '500' }}>
            {isSignUp ? 'Sign in' : 'Sign up'}
          </span>
        </div>
        {isSignUp && (
          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '12px', color: '#999' }}>
            £19/year · Cancel anytime · Secure payment via Stripe
          </div>
        )}
      </div>
    </div>
  )
}