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
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
            ← Back
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Documentation</h1>
        </div>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ background: 'white', borderRadius: '8px', padding: '40px', border: '1px solid #eaeaea' }}>

          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Getting Started</h2>
          <p style={{ color: '#888', marginBottom: '32px', fontSize: '14px' }}>From install to live hot reload in under 60 seconds.</p>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>1. Install the CLI</h3>
            <pre style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px', fontSize: '14px', fontFamily: 'Monaco, "Fira Code", monospace', overflowX: 'auto' }}>
{`npm install -g apptuner`}
            </pre>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>2. Download AppTuner Mobile</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              Install <strong>AppTuner Mobile</strong> on your iOS device from TestFlight (App Store submission in progress).
              The app is the pre-built native shell that runs your code.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>3. Start your project</h3>
            <pre style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px', fontSize: '14px', fontFamily: 'Monaco, "Fira Code", monospace', overflowX: 'auto' }}>
{`cd my-rn-project
apptuner start .`}
            </pre>
            <p style={{ color: '#666', lineHeight: '1.7', marginTop: '12px' }}>
              This opens <strong>app.apptuner.io</strong> in your browser with a 6-character sharing code and QR code.
              No local network required — the relay works over the internet.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>4. Scan &amp; code</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              Open AppTuner Mobile, tap the camera icon, and scan the QR code. Your app loads immediately.
              Save any file — the change appears on your device in milliseconds.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Requirements</h3>
            <ul style={{ color: '#666', lineHeight: '1.7', marginLeft: '20px' }}>
              <li><strong>CLI:</strong> Node.js 18+ on any OS (macOS, Windows, Linux)</li>
              <li><strong>Mobile:</strong> iOS 15+ — Android coming soon</li>
              <li><strong>Network:</strong> Internet connection. No USB, no same-network requirement.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Available SDK modules</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              The following modules are compiled into the AppTuner shell and can be imported directly —
              no <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px' }}>pod install</code> needed:
            </p>
            <p style={{ color: '#666', lineHeight: '1.7', marginTop: '12px' }}>
              Navigation (react-navigation), AsyncStorage, VisionCamera, ImagePicker, Maps, expo-location,
              expo-local-authentication, Reanimated, SVG, Notifee, expo-sqlite, expo-secure-store,
              expo-file-system, expo-av, expo-blur, expo-haptics, expo-clipboard, expo-sensors,
              react-native-webview, expo-web-browser, and 18 more.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Build an IPA</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              Go to the <strong>Build</strong> tab in the dashboard, upload your Apple distribution certificate (.p12)
              and provisioning profile. AppTuner re-signs the shell with your certificate and returns a
              signed .ipa in ~3 seconds. No Xcode or Mac required.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Troubleshooting</h3>
            <p style={{ color: '#666', lineHeight: '1.7', marginBottom: '8px' }}><strong>Device not connecting:</strong></p>
            <ul style={{ color: '#666', lineHeight: '1.7', marginLeft: '20px', marginBottom: '16px' }}>
              <li>Make sure the CLI is running (<code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px' }}>apptuner start .</code>)</li>
              <li>Try entering the 6-character code manually instead of scanning the QR</li>
              <li>Check you have an active internet connection on both devices</li>
            </ul>
            <p style={{ color: '#666', lineHeight: '1.7', marginBottom: '8px' }}><strong>Hot reload not firing:</strong></p>
            <ul style={{ color: '#666', lineHeight: '1.7', marginLeft: '20px' }}>
              <li>Confirm your editor saves files on change (not just on focus loss)</li>
              <li>Check the CLI output for bundle errors</li>
            </ul>
          </section>

          <section>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Need help?</h3>
            <p style={{ color: '#666', lineHeight: '1.7' }}>
              Email us at <a href="mailto:support@apptuner.io" style={{ color: '#6366f1' }}>support@apptuner.io</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
