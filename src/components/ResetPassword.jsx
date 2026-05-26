import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  const handleReset = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) { setMessage('Passwords do not match'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setMessage(error.message)
    else {
      setMessage('Password updated! Redirecting...')
      setTimeout(() => { window.location.href = '/' }, 2000)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '400px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <svg width="140" height="36" viewBox="0 0 140 36" fill="none">
            <rect x="0" y="14" width="7" height="22" rx="2" fill="#173404"/>
            <rect x="10" y="8" width="7" height="28" rx="2" fill="#3B6D11"/>
            <rect x="20" y="2" width="7" height="34" rx="2" fill="#639922"/>
            <text x="35" y="26" fontFamily="Georgia, serif" fontSize="20" fontWeight="700" fill="#3B6D11">prof</text>
            <text x="83" y="26" fontFamily="Georgia, serif" fontSize="20" fontWeight="400" fill="#639922">let</text>
          </svg>
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '0.5rem', textAlign: 'center', color: '#173404' }}>Set a new password</h2>
        <p style={{ fontSize: '13px', color: '#666', textAlign: 'center', marginBottom: '1.5rem' }}>Enter your new password below.</p>
        {!ready ? (
          <p style={{ textAlign: 'center', color: '#666', fontSize: '13px' }}>Verifying your reset link…</p>
        ) : (
          <form onSubmit={handleReset}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: '#1a1a1a', colorScheme: 'light' }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: '#1a1a1a', colorScheme: 'light' }}
              />
            </div>
            {message && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', marginBottom: '1rem', background: message.includes('match') || message.includes('error') ? '#FCEBEB' : '#EAF3DE', color: message.includes('match') || message.includes('error') ? '#791F1F' : '#27500A', fontSize: '13px' }}>
                {message}
              </div>
            )}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#3B6D11', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', fontFamily: 'Georgia, serif', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}