import React from 'react';

export function TermsOfService({ onBack }: { onBack: () => void }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#fafafa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <nav style={{
        background: 'white',
        borderBottom: '1px solid #eaeaea',
        padding: '16px 24px',
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: '#667eea',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Terms of Service</h1>
        </div>
      </nav>

      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '48px 24px',
      }}>
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '40px',
          border: '1px solid #eaeaea',
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px' }}>Terms of Service</h2>

          <p style={{ color: '#666', marginBottom: '24px' }}>
            <strong>Last updated:</strong> February 14, 2024
          </p>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>1. Acceptance of Terms</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              By accessing and using AppTuner, you accept and agree to be bound by these Terms of Service.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>2. Use License</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              AppTuner grants you a personal, non-transferable license to use the service for development
              purposes. You may not resell or redistribute access to the service.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>3. Free Trial</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              The 14-day free trial provides full access to all features. No credit card is required
              to start your trial. The trial automatically ends after 14 days unless you subscribe.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>4. Payment & Refunds</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              Subscriptions are billed monthly or yearly. We offer a 14-day money-back guarantee.
              Cancel anytime through your account settings.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>5. Service Availability</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              We strive for 100% uptime but do not guarantee uninterrupted service. We may perform
              maintenance with advance notice when possible.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>6. Acceptable Use</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              You agree to use AppTuner only for lawful purposes and in accordance with these Terms.
              You may not use the service to develop malicious software or engage in harmful activities.
            </p>
          </section>

          <section>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>7. Contact</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              Questions about these Terms? Contact us at legal@apptuner.dev
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
