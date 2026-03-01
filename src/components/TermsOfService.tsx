import React from 'react';

export function TermsOfService({ onBack }: { onBack: () => void }) {
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
          <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Terms of Service</h1>
        </div>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ background: 'white', borderRadius: '8px', padding: '40px', border: '1px solid #eaeaea' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px' }}>Terms of Service</h2>
          <p style={{ color: '#888', marginBottom: '32px' }}><strong>Last updated:</strong> March 1, 2026</p>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>1. Acceptance of Terms</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              By accessing and using AppTuner, you accept and agree to be bound by these Terms of Service.
              AppTuner is operated by Rawvibe B.V., a company registered in the Netherlands.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>2. Use License</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              AppTuner grants you a personal, non-transferable licence to use the service for software
              development purposes. You may not resell, sublicense, or redistribute access to the service.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>3. Free Trial</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              New accounts receive a 14-day free trial with full access to all features.
              The trial ends after 14 days. You will be asked to subscribe to continue using the service.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>4. Payment &amp; Refunds</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              AppTuner is available as a monthly subscription ($29/month) or a one-time lifetime purchase ($499).
              Monthly subscriptions renew automatically and can be cancelled at any time from your account settings.
              We offer a 14-day money-back guarantee on all plans — contact us at{' '}
              <a href="mailto:support@apptuner.io" style={{ color: '#6366f1' }}>support@apptuner.io</a>.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>5. Service Availability</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              We aim for high availability but do not guarantee uninterrupted service.
              Planned maintenance will be communicated in advance where possible.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>6. Acceptable Use</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              You agree to use AppTuner only for lawful software development purposes.
              You may not use the service to develop malicious software, engage in harmful activities,
              or attempt to reverse-engineer the AppTuner infrastructure or native shell.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>7. Intellectual Property</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              Your source code remains entirely your own. AppTuner claims no ownership over any code
              you develop using the service. The AppTuner CLI, dashboard, relay infrastructure, and
              native shell are owned by Rawvibe B.V.
            </p>
          </section>

          <section>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>8. Contact</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              Questions about these Terms? Contact us at{' '}
              <a href="mailto:legal@apptuner.io" style={{ color: '#6366f1' }}>legal@apptuner.io</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
