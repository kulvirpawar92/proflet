import { useEffect } from 'react'

export default function Terms() {
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
          Terms &amp; Conditions
        </h1>
        <p style={{ color: 'oklch(0.55 0.02 250)', marginBottom: '48px', fontSize: '14px' }}>
          Last updated: October 2026
        </p>

        <Section title="1. Acceptance of terms">
          <p>By creating an account and using Proflet ("the Service"), you agree to be bound by these Terms &amp; Conditions. If you do not agree, do not use the Service.</p>
          <p>These terms are governed by the laws of England and Wales.</p>
        </Section>

        <Section title="2. The Service">
          <p>Proflet is a property portfolio management tool designed for UK landlords. It allows you to track properties, income, expenses, tasks, and contacts, and includes an AI-powered assistant.</p>
          <p>We reserve the right to modify, suspend, or discontinue any part of the Service at any time with reasonable notice.</p>
        </Section>

        <Section title="3. Your account">
          <ul>
            <li>You must be at least 18 years old to use Proflet</li>
            <li>You are responsible for maintaining the security of your account credentials</li>
            <li>You must not share your account with others</li>
            <li>You are responsible for all activity that occurs under your account</li>
            <li>Notify us immediately at <a href="mailto:hello@proflet.com" style={{ color: 'oklch(0.7 0.15 200)' }}>hello@proflet.com</a> if you suspect unauthorised access</li>
          </ul>
        </Section>

        <Section title="4. Subscription and payment">
          <ul>
            <li>Proflet is offered as an annual subscription at the price displayed at the time of purchase</li>
            <li>Payments are processed securely by Stripe</li>
            <li>Your subscription renews automatically each year unless cancelled before the renewal date</li>
            <li>You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period — no partial refunds are issued</li>
            <li>We reserve the right to change pricing with at least 30 days' notice</li>
          </ul>
        </Section>

        <Section title="5. Acceptable use">
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to gain unauthorised access to other users' data</li>
            <li>Reverse engineer, copy, or create derivative works of the Service</li>
            <li>Use the Service to store or transmit malicious code</li>
            <li>Resell or sublicense the Service to third parties</li>
          </ul>
        </Section>

        <Section title="6. Your data">
          <p>You retain ownership of all data you enter into Proflet. By using the Service, you grant us a limited licence to store and process your data solely to provide the Service to you.</p>
          <p>We do not sell your data. See our <a href="/privacy" style={{ color: 'oklch(0.7 0.15 200)' }}>Privacy Policy</a> for full details on how we handle your data.</p>
        </Section>

        <Section title="7. AI assistant">
          <p>The Proflet AI assistant is powered by Anthropic's Claude API. When you use the AI chat feature:</p>
          <ul>
            <li>Your messages and relevant portfolio data are sent to Anthropic for processing</li>
            <li>AI responses are provided for informational purposes only and do not constitute financial, legal, or tax advice</li>
            <li>You should always consult a qualified professional for advice specific to your circumstances</li>
            <li>We cannot guarantee the accuracy or completeness of AI-generated responses</li>
          </ul>
        </Section>

        <Section title="8. Disclaimer of warranties">
          <p>The Service is provided "as is" without warranties of any kind, express or implied. We do not warrant that:</p>
          <ul>
            <li>The Service will be uninterrupted or error-free</li>
            <li>Any information provided (including AI responses) is accurate, complete, or suitable for your purposes</li>
          </ul>
          <p>Nothing in these terms excludes liability that cannot be excluded under UK law, including liability for death or personal injury caused by negligence.</p>
        </Section>

        <Section title="9. Limitation of liability">
          <p>To the maximum extent permitted by law, Proflet's total liability to you for any claim arising from use of the Service shall not exceed the amount you paid in subscription fees in the 12 months preceding the claim.</p>
          <p>We are not liable for any indirect, incidental, or consequential losses, including lost profits or data loss.</p>
        </Section>

        <Section title="10. Termination">
          <p>We may suspend or terminate your account if you breach these terms, with notice where reasonably practicable. You may close your account at any time by contacting <a href="mailto:hello@proflet.com" style={{ color: 'oklch(0.7 0.15 200)' }}>hello@proflet.com</a>.</p>
          <p>On termination, your right to use the Service ceases immediately. We will delete your data in accordance with our Privacy Policy.</p>
        </Section>

        <Section title="11. Changes to these terms">
          <p>We may update these Terms &amp; Conditions from time to time. We will notify you by email or in-app notice of material changes. Continued use of the Service after changes constitutes acceptance.</p>
        </Section>

        <Section title="12. Contact">
          <p>For any questions about these terms, contact us at <a href="mailto:hello@proflet.com" style={{ color: 'oklch(0.7 0.15 200)' }}>hello@proflet.com</a>.</p>
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
