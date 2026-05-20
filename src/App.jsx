import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import Landing from './components/Landing'
import Paywall from './components/Paywall'
import Success from './components/Success'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [subLoading, setSubLoading] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [page, setPage] = useState('landing')

  useEffect(() => {
    // Check for Stripe success redirect
    const path = window.location.pathname
    const search = window.location.search
    if (path === '/success' || search.includes('session_id')) {
      setPage('success')
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) checkSubscription(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) checkSubscription(session.user.id)
      else { setSubscription(null); setLoading(false) }
    })

    return () => authListener.unsubscribe()
  }, [])

  async function checkSubscription(userId) {
    setSubLoading(true)
    const { data } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .single()
    setSubscription(data)
    setSubLoading(false)
    setLoading(false)
  }

  if (loading || subLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f6f4', fontFamily: 'Georgia, serif', color: '#3B6D11', fontSize: '14px' }}>
      Loading Proflet...
    </div>
  )

  // Stripe success redirect
  if (page === 'success') return <Success />

  // Not logged in
  if (!session) {
    if (showAuth) return <Auth onBack={() => setShowAuth(false)} />
    return <Landing onGetStarted={() => setShowAuth(true)} />
  }

  // Logged in but no active subscription
  if (!subscription || subscription.status !== 'active') {
    return <Paywall session={session} />
  }

  // Logged in and subscribed
  return <Dashboard session={session} />
}