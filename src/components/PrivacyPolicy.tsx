import React from 'react';

export function PrivacyPolicy({ onBack }: { onBack: () => void }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#fafafa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <nav style={{ background: 'white', borderBottom: '1px solid #eaeaea', padding: '16px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
            ← Back
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Privacy Policy</h1>
        </div>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ background: 'white', borderRadius: '8px', padding: '40px', border: '1px solid #eaeaea' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px' }}>Privacy Policy</h2>
          <p style={{ color: '#888', marginBottom: '32px' }}><strong>Last updated:</strong> March 1, 2026</p>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>1. Information We Collect</h3>
            <p style={{ color: '#666', lineHeight: '1.7', marginBottom: '12px' }}>
              AppTuner collects the minimum information necessary to provide the service:
            </p>
            <ul style={{ color: '#666', lineHeight: '1.7', marginLeft: '20px' }}>
              <li>Email address and billing information for account and payment purposes</li>
              <li>Basic usage data (session counts, connection events) to monitor service health</li>
              <li>Device identifiers used only to route relay connections</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>2. How We Use Your Information</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              We use your information to provide and operate AppTuner, process payments via Stripe,
              and send you important service updates. We do not use your data for advertising or
              sell it to third parties.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>3. Your Code and Data</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              Your source code is never stored on our servers. When you run <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px' }}>apptuner start</code>,
              your JavaScript bundle is compiled locally and transmitted over an encrypted WebSocket connection
              through our relay server (<strong>relay.apptuner.io</strong>) to your device.
              The relay forwards the bundle in transit and does not persist it.
              Apple certificates uploaded for IPA signing are used immediately and deleted from our servers
              once the build is complete.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>4. Third-Party Services</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              We use <strong>Stripe</strong> for payment processing and <strong>Supabase</strong> for authentication and account storage.
              Both services operate under their own privacy policies.
              Our relay infrastructure runs on our own VPS and is not shared with third-party cloud providers.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>5. Data Retention</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              Account data is retained for as long as your account is active. You can request deletion of
              your account and associated data at any time by contacting us.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>6. Your Rights (GDPR)</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              As a company registered in the Netherlands, Rawvibe B.V. operates under GDPR.
              You have the right to access, correct, export, or delete your personal data at any time.
              Contact us at{' '}
              <a href="mailto:privacy@apptuner.io" style={{ color: '#6366f1' }}>privacy@apptuner.io</a>{' '}
              to exercise these rights.
            </p>
          </section>

          <section>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>7. Contact</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              Questions about this Privacy Policy? Contact us at{' '}
              <a href="mailto:privacy@apptuner.io" style={{ color: '#6366f1' }}>privacy@apptuner.io</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
