import { useEffect } from 'react'

export default function Privacy() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'oklch(0.15 0.02 250)',
      color: 'oklch(0.92 0.01 250)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '0 0 80px 0'
    }}>
      {/* Header */}
      <div style={{
        background: 'oklch(0.18 0.025 250)',
        borderBottom: '1px solid oklch(0.28 0.03 250)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <a
          href="/"
          style={{
            color: 'oklch(0.7 0.15 200)',
            textDecoration: 'none',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          ← Back
        </a>
        <span style={{ color: 'oklch(0.4 0.02 250)', fontSize: '14px' }}>|</span>
        <span style={{ fontSize: '14px', color: 'oklch(0.6 0.02 250)' }}>Proflet</span>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          marginBottom: '8px',
          color: 'oklch(0.95 0.01 250)'
        }}>
          Privacy Policy
        </h1>
        <p style={{ color: 'oklch(0.55 0.02 250)', marginBottom: '48px', fontSize: '14px' }}>
          Last updated: October 2026
        </p>

        <Section title="1. Who we are">
          <p>Proflet is a UK-based property portfolio management service. We are the data controller for the personal data you provide when using Proflet.</p>
          <p>If you have any questions about this policy or how we handle your data, contact us at <a href="mailto:hello@proflet.com" style={{ color: 'oklch(0.7 0.15 200)' }}>hello@proflet.com</a>.</p>
        </Section>

        <Section title="2. What data we collect">
          <p>We collect and process the following personal data:</p>
          <ul>
            <li><strong>Account data:</strong> your email address and password (stored securely via Supabase Auth)</li>
            <li><strong>Property data:</strong> property addresses, rental amounts, tenancy details, mortgage information, and any other data you enter into the app</li>
            <li><strong>Financial data:</strong> income and expense records you enter for your properties</li>
            <li><strong>Payment data:</strong> subscription payment information processed by Stripe. We do not store your card details — Stripe handles this directly</li>
            <li><strong>Usage data:</strong> how you interact with the app, including pages visited and features used</li>
            <li><strong>AI chat data:</strong> messages you send to Proflet AI and the responses you receive</li>
          </ul>
        </Section>

        <Section title="3. Why we collect it (legal basis)">
          <p>We process your data under the following lawful bases:</p>
          <ul>
            <li><strong>Contract:</strong> to provide the Proflet service you have signed up for</li>
            <li><strong>Legitimate interests:</strong> to improve the product, fix bugs, and keep the service secure</li>
            <li><strong>Legal obligation:</strong> where we are required to retain records by law</li>
          </ul>
        </Section>

        <Section title="4. Who we share your data with">
          <p>We use the following third-party services to operate Proflet:</p>
          <ul>
            <li><strong>Supabase</strong> — database and authentication. Your data is stored on Supabase's infrastructure (EU region). <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer" style={{ color: 'oklch(0.7 0.15 200)' }}>Supabase Privacy Policy</a></li>
            <li><strong>Stripe</strong> — payment processing. We share only what is necessary to process your subscription. <a href="https://stripe.com/gb/privacy" target="_blank" rel="noreferrer" style={{ color: 'oklch(0.7 0.15 200)' }}>Stripe Privacy Policy</a></li>
            <li><strong>Anthropic</strong> — AI responses in the Proflet AI chat feature. Messages you send to the chat, along with relevant portfolio context, are processed by Anthropic's Claude API. <a href="https://www.anthropic.com/privacy" target="_blank" rel="noreferrer" style={{ color: 'oklch(0.7 0.15 200)' }}>Anthropic Privacy Policy</a></li>
            <li><strong>Vercel</strong> — hosting for the Proflet web application</li>
          </ul>
          <p>We do not sell your data to third parties.</p>
        </Section>

        <Section title="5. How long we keep your data">
          <ul>
            <li><strong>Account and property data:</strong> kept for as long as your account is active. If you delete your account, your data is deleted within 30 days</li>
            <li><strong>AI chat history:</strong> stored in your account and deleted when you clear your chat history or delete your account</li>
            <li><strong>Payment records:</strong> retained for 7 years as required by UK tax and accounting law</li>
          </ul>
        </Section>

        <Section title="6. Your rights under UK GDPR">
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access</strong> the personal data we hold about you</li>
            <li><strong>Correct</strong> inaccurate data</li>
            <li><strong>Delete</strong> your data (right to erasure)</li>
            <li><strong>Restrict</strong> how we process your data</li>
            <li><strong>Data portability</strong> — receive your data in a machine-readable format</li>
            <li><strong>Object</strong> to processing based on legitimate interests</li>
          </ul>
          <p>To exercise any of these rights, email us at <a href="mailto:hello@proflet.com" style={{ color: 'oklch(0.7 0.15 200)' }}>hello@proflet.com</a>. We will respond within 30 days.</p>
          <p>You also have the right to lodge a complaint with the <a href="https://ico.org.uk" target="_blank" rel="noreferrer" style={{ color: 'oklch(0.7 0.15 200)' }}>Information Commissioner's Office (ICO)</a>.</p>
        </Section>

        <Section title="7. Cookies">
          <p>Proflet uses only essential cookies required for authentication and session management. We do not use advertising or tracking cookies.</p>
        </Section>

        <Section title="8. Security">
          <p>We take reasonable technical and organisational measures to protect your data, including encrypted data storage, secure authentication, and row-level security policies to ensure users can only access their own data.</p>
        </Section>

        <Section title="9. Changes to this policy">
          <p>We may update this Privacy Policy from time to time. We will notify you by email or in-app notice if we make material changes. Continued use of Proflet after changes constitutes acceptance of the updated policy.</p>
        </Section>

        <Section title="10. Contact">
          <p>For any privacy-related queries, contact us at <a href="mailto:hello@proflet.com" style={{ color: 'oklch(0.7 0.15 200)' }}>hello@proflet.com</a>.</p>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '40px' }}>
      <h2 style={{
        fontSize: '18px',
        fontWeight: '600',
        marginBottom: '16px',
        color: 'oklch(0.88 0.02 250)',
        paddingBottom: '8px',
        borderBottom: '1px solid oklch(0.25 0.02 250)'
      }}>
        {title}
      </h2>
      <div style={{
        fontSize: '15px',
        lineHeight: '1.7',
        color: 'oklch(0.72 0.02 250)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {children}
      </div>
    </div>
  )
}
