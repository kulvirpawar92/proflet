import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Landing from './components/Landing'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import Paywall from './components/Paywall'
import Success from './components/Success'
import ResetPassword from './components/ResetPassword'

// Spinner shown while session / subscription is loading
function Loader() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'oklch(16% 0.020 145)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        width: 32,
        height: 32,
        border: '2px solid oklch(28% 0.020 145)',
        borderTopColor: '#8FCB3C',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = still loading
  const [hasSubscription, setHasSubscription] = useState(false)
  const [subLoading, setSubLoading] = useState(false)

  // Read URL at render time — survives tab switches because URL never changes
  const path = window.location.pathname
  const search = window.location.search

  // Special routes that don't need auth — render immediately
  if (path === '/reset-password') return <ResetPassword />
  if (path === '/success' || search.includes('session_id')) return <Success />

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (session === undefined) return // still loading
    if (!session) {
      setHasSubscription(false)
      return
    }
    checkSub(session.user.id)
  }, [session])

  async function checkSub(userId) {
    setSubLoading(true)
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', userId)
        .single()
      setHasSubscription(!error && data?.status === 'active')
    } catch {
      setHasSubscription(false)
    } finally {
      setSubLoading(false)
    }
  }

  // Session still loading
  if (session === undefined) return <Loader />

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!session) {
    // /auth path → show Auth page
    if (path === '/auth') {
      return (
        <Auth
          onSignIn={() => {
            // After sign-in, go to root — useEffect will check subscription
            window.location.href = '/'
          }}
        />
      )
    }
    // Everything else (including /) → Landing
    return (
      <Landing
        onGetStarted={() => { window.location.href = '/auth' }}
      />
    )
  }

  // ── Logged in — wait for subscription check ────────────────────────────────
  if (subLoading) return <Loader />

  // ── Logged in, no active subscription → Paywall ───────────────────────────
  if (!hasSubscription) {
    return (
      <Paywall
        session={session}
        onSubscribed={() => checkSub(session.user.id)}
      />
    )
  }

  // ── Logged in + active subscription → Dashboard ───────────────────────────
  return (
    <Dashboard
      session={session}
      onSignOut={async () => {
        await supabase.auth.signOut()
        window.location.href = '/'
      }}
    />
  )
}