import React from 'react';

export function Affiliates({ onBack }: { onBack: () => void }) {
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
          <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Affiliate Program</h1>
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
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px' }}>
            Partner with AppTuner
          </h2>

          <p style={{ fontSize: '16px', lineHeight: '1.7', color: '#555', marginBottom: '24px' }}>
            Join our affiliate program and earn by promoting AppTuner to your audience.
          </p>

          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
              Coming Soon
            </h3>
            <p style={{ fontSize: '16px', lineHeight: '1.7', color: '#555' }}>
              Our affiliate program is currently being set up. Check back soon for details on how to become an AppTuner partner.
            </p>
          </div>

          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #eaeaea' }}>
            <p style={{ fontSize: '15px', color: '#666' }}>
              Interested in learning more?{' '}
              <a href="mailto:info@apptuner.io" style={{ color: '#667eea', textDecoration: 'none' }}>
                Contact us at info@apptuner.io
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
