import React from 'react';

export function Documentation({ onBack }: { onBack: () => void }) {
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
          <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Documentation</h1>
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
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px' }}>Getting Started with AppTuner</h2>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Quick Start</h3>
            <ol style={{ color: '#666', lineHeight: '1.7', marginLeft: '20px' }}>
              <li>Download and install the AppTuner mobile app on your iOS device</li>
              <li>Open the desktop app at localhost:1420</li>
              <li>Scan the QR code with your mobile device</li>
              <li>Click "START" to enable auto-reload</li>
              <li>Edit your code and watch changes appear instantly</li>
            </ol>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Requirements</h3>
            <ul style={{ color: '#666', lineHeight: '1.7', marginLeft: '20px' }}>
              <li><strong>Desktop:</strong> Node.js 16+ and a React Native project</li>
              <li><strong>Mobile:</strong> iOS 13+ (Android coming soon)</li>
              <li><strong>Network:</strong> Desktop and mobile on the same network (or use relay)</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Project Setup</h3>
            <p style={{ color: '#666', lineHeight: '1.7', marginBottom: '12px' }}>
              AppTuner works with any React Native project using the bare workflow:
            </p>
            <pre style={{
              background: '#f5f5f5',
              padding: '16px',
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '14px',
              fontFamily: 'Monaco, monospace',
            }}>
{`# Set your project path in the desktop app
# Default is 'public' for quick testing

# For Metro bundler projects:
# 1. Ensure metro.config.js exists
# 2. Point AppTuner to your project root
# 3. Enable "Use Metro" if needed`}
            </pre>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Console Logs</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              All console.log, console.warn, and console.error calls from your mobile device
              stream directly to the desktop console. Use keyboard shortcuts:
            </p>
            <ul style={{ color: '#666', lineHeight: '1.7', marginLeft: '20px' }}>
              <li><strong>⌘R:</strong> Reload the bundle on device</li>
              <li><strong>⌘K:</strong> Clear console logs</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Troubleshooting</h3>
            <p style={{ color: '#666', lineHeight: '1.7', marginBottom: '12px' }}>
              <strong>Connection Issues:</strong>
            </p>
            <ul style={{ color: '#666', lineHeight: '1.7', marginLeft: '20px' }}>
              <li>Ensure both devices are on the same WiFi network</li>
              <li>Check firewall settings aren't blocking ports 3030-3031</li>
              <li>Try using the manual code entry instead of QR scan</li>
            </ul>
            <p style={{ color: '#666', lineHeight: '1.7', marginTop: '16px', marginBottom: '12px' }}>
              <strong>Auto-reload not working:</strong>
            </p>
            <ul style={{ color: '#666', lineHeight: '1.7', marginLeft: '20px' }}>
              <li>Verify file watching is enabled in your editor</li>
              <li>Check the project path is correct</li>
              <li>Look for errors in the desktop console</li>
            </ul>
          </section>

          <section>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Need Help?</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              Contact support at support@apptuner.dev or check our GitHub repository for updates.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
