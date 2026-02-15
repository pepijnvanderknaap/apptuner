import React from 'react';

export function PrivacyPolicy({ onBack }: { onBack: () => void }) {
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
          <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Privacy Policy</h1>
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
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px' }}>Privacy Policy</h2>

          <p style={{ color: '#666', marginBottom: '24px' }}>
            <strong>Last updated:</strong> February 14, 2024
          </p>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>1. Information We Collect</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              AppTuner collects minimal information necessary to provide our service. We collect:
            </p>
            <ul style={{ color: '#666', lineHeight: '1.7', marginLeft: '20px' }}>
              <li>Email address and payment information for billing purposes</li>
              <li>Usage data to improve our service</li>
              <li>Device information for connection purposes</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>2. How We Use Your Information</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              We use your information to provide and improve AppTuner services, process payments,
              and communicate important updates about the service.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>3. Data Security</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              Your code never leaves your local network. We use secure WebSocket connections and
              industry-standard encryption to protect your data.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>4. Third-Party Services</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              We use Cloudflare for relay services. We do not sell or share your personal information
              with third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>5. Contact</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              If you have questions about this Privacy Policy, please contact us at privacy@apptuner.dev
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
