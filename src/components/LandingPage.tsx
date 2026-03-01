import React, { useState } from 'react';
import './LandingPage.css';
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsOfService } from './TermsOfService';
import { Documentation } from './Documentation';
import { Affiliates } from './Affiliates';

type PageView = 'landing' | 'privacy' | 'terms' | 'docs' | 'affiliates';

export function LandingPage({ onEnterApp }: { onEnterApp: (view?: 'login' | 'signup', intent?: 'trial' | 'paid', tier?: 'monthly' | 'yearly' | 'lifetime') => void }) {
  const [currentPage, setCurrentPage] = useState<PageView>('landing');
  const [showContactModal, setShowContactModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const handleCheckout = (tier: 'monthly' | 'yearly' | 'lifetime') => {
    onEnterApp('signup', 'paid', tier);
  };

  if (currentPage === 'privacy') return <PrivacyPolicy onBack={() => setCurrentPage('landing')} />;
  if (currentPage === 'terms') return <TermsOfService onBack={() => setCurrentPage('landing')} />;
  if (currentPage === 'docs') return <Documentation onBack={() => setCurrentPage('landing')} />;
  if (currentPage === 'affiliates') return <Affiliates onBack={() => setCurrentPage('landing')} />;

  return (
    <div className="landing-page">

      {/* Nav */}
      <nav className="nav">
        <div className="nav-content">
          <div className="logo">
            <span className="logo-text">AppTuner</span>
            <span className="logo-badge">BETA</span>
          </div>
          <div className="nav-links">
            <a href="#compare">Compare</a>
            <a href="#sdk">SDK</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <button className="btn-secondary" onClick={() => onEnterApp('login')}>Sign in</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero-eyebrow">React Native developer toolchain</div>
          <h1 className="hero-title">
            React Native development,<br />
            <span>from anywhere.</span>
          </h1>
          <ul className="hero-features">
            <li>Hot reload + client sharing over the internet — no USB, no local network</li>
            <li>Full native module stack pre-installed — no pod install, no EAS</li>
            <li>Signed .ipa in ~3 seconds — no Xcode, no Mac required</li>
            <li>$29 / month · everything included · cancel anytime</li>
          </ul>
          <div className="hero-cta">
            <button className="btn-primary btn-large" onClick={() => onEnterApp('signup')}>
              Start free trial
            </button>
            <span className="cta-subtext">14 days free · no credit card required</span>
          </div>
          <div className="hero-proof">
            <div className="proof-item">
              <div className="proof-value">Full SDK</div>
              <div className="proof-label">Expo-compatible native modules</div>
            </div>
            <div className="proof-item">
              <div className="proof-value">~3s</div>
              <div className="proof-label">signed .ipa, no Xcode needed</div>
            </div>
            <div className="proof-item">
              <div className="proof-value">$29</div>
              <div className="proof-label">per month, everything included</div>
            </div>
          </div>
        </div>
      </section>

      {/* Sharing — killer feature */}
      <section className="sharing-section">
        <div className="container">
          <div className="section-label">Live sharing</div>
          <h2 className="section-title">Show your app to anyone, anywhere.</h2>
          <p className="section-subtitle" style={{ margin: '0 auto 48px' }}>
            Share a 6-character project code. Anyone with the AppTuner app connects instantly —
            live, in sync with every save. No build, no TestFlight invite, no waiting.
          </p>

          <div className="sharing-screenshots">
            <div className="browser-mockup">
              <div className="browser-chrome">
                <div className="browser-dots"><span/><span/><span/></div>
                <div className="browser-url">app.apptuner.io</div>
              </div>
              <img src="/assets/Screenshot 2026-03-01 at 12.24.22.jpg" alt="AppTuner — Connect Your Mobile Device" className="screenshot-img" />
            </div>

            <div className="browser-mockup">
              <div className="browser-chrome">
                <div className="browser-dots"><span/><span/><span/></div>
                <div className="browser-url">app.apptuner.io</div>
              </div>
              <img src="/assets/Screenshot 2026-03-01 at 12.25.13.jpg" alt="AppTuner — Live Session" className="screenshot-img" />
            </div>
          </div>

          <div className="sharing-bullets">
            <div className="sharing-bullet">
              <span className="bullet-arrow">→</span>
              Scan QR or enter the 6-character code in the AppTuner app
            </div>
            <div className="sharing-bullet">
              <span className="bullet-arrow">→</span>
              Every file save hot-reloads on every connected device instantly
            </div>
            <div className="sharing-bullet">
              <span className="bullet-arrow">→</span>
              No build, no TestFlight, no local network required
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="compare" className="comparison-section">
        <div className="container">
          <div className="section-label">Side by side</div>
          <h2 className="section-title">AppTuner vs the traditional workflow</h2>
          <p className="section-subtitle">
            The standard React Native workflow ties you to USB cables, local networks, and slow build queues. AppTuner moves the whole thing to the cloud.
          </p>

          <div className="compare-grid">
            <div className="compare-cell compare-head">Feature</div>
            <div className="compare-cell compare-head compare-head-at">AppTuner</div>
            <div className="compare-cell compare-head">Standard workflow</div>

            <div className="compare-cell compare-feat">Hot reload on real device</div>
            <div className="compare-cell compare-good">✓ Over the internet</div>
            <div className="compare-cell compare-std">USB or local WiFi only</div>

            <div className="compare-cell compare-feat">Share with remote client</div>
            <div className="compare-cell compare-good">✓ 6-character code, instant</div>
            <div className="compare-cell compare-std">TestFlight invite + 15 min wait</div>

            <div className="compare-cell compare-feat">iOS build (IPA)</div>
            <div className="compare-cell compare-good">✓ ~3 seconds</div>
            <div className="compare-cell compare-std">Xcode required, 10–30 min</div>

            <div className="compare-cell compare-feat">Works on Windows / Linux</div>
            <div className="compare-cell compare-good">✓ Yes</div>
            <div className="compare-cell compare-std">iOS builds require a Mac</div>

            <div className="compare-cell compare-feat">Native modules pre-installed</div>
            <div className="compare-cell compare-good">✓ 38 modules, no pod install</div>
            <div className="compare-cell compare-std">Manual install per project</div>

            <div className="compare-cell compare-feat">Price</div>
            <div className="compare-cell compare-good">$29 / month</div>
            <div className="compare-cell compare-std">Mac + Apple dev account + time</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="container">
          <div className="section-label">What you get</div>
          <h2 className="section-title">Everything in one tool</h2>

          <div className="features-grid">
            <div className="feature-card">
              <h3>Instant hot reload</h3>
              <p>Save a file, see it on your device. Works over the internet — no local network needed.</p>
            </div>
            <div className="feature-card">
              <h3>IPA in 3 seconds</h3>
              <p>Upload your cert, get a signed .ipa back. No Xcode, no Mac farm, no queue.</p>
            </div>
            <div className="feature-card">
              <h3>38 native modules</h3>
              <p>Camera, maps, biometrics, storage — pre-compiled and ready. No pod install.</p>
            </div>
            <div className="feature-card">
              <h3>Real device testing</h3>
              <p>Actual hardware, real native APIs. No simulator limits or sandbox restrictions.</p>
            </div>
            <div className="feature-card">
              <h3>Remote sharing</h3>
              <p>6-character code. Anyone, anywhere sees your app live.</p>
            </div>
            <div className="feature-card">
              <h3>Live console</h3>
              <p>Logs, warnings, and errors stream to your browser in real time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SDK */}
      <section id="sdk" className="sdk-section">
        <div className="container">
          <div className="section-label">Pre-installed modules</div>
          <h2 className="section-title">No npm install. No pod install.</h2>
          <p className="section-subtitle">
            These modules are compiled into the AppTuner shell. Import them directly — they just work.
          </p>
          <div className="sdk-grid">
            {[
              { name: '@react-navigation/native', highlight: true },
              { name: '@react-navigation/native-stack', highlight: true },
              { name: '@react-navigation/bottom-tabs', highlight: true },
              { name: 'react-native-screens' },
              { name: 'react-native-safe-area-context' },
              { name: 'react-native-gesture-handler', highlight: true },
              { name: '@react-native-async-storage/async-storage', highlight: true },
              { name: 'expo-secure-store' },
              { name: 'expo-sqlite' },
              { name: 'expo-file-system' },
              { name: 'react-native-vision-camera', highlight: true },
              { name: 'expo-camera' },
              { name: 'react-native-image-picker' },
              { name: 'expo-image' },
              { name: 'expo-media-library' },
              { name: 'expo-av' },
              { name: 'react-native-maps', highlight: true },
              { name: 'expo-location' },
              { name: 'react-native-geolocation-service' },
              { name: 'react-native-svg', highlight: true },
              { name: 'expo-linear-gradient' },
              { name: 'expo-blur' },
              { name: 'react-native-reanimated', highlight: true },
              { name: 'react-native-webview' },
              { name: 'expo-web-browser' },
              { name: 'expo-auth-session' },
              { name: 'expo-local-authentication', highlight: true },
              { name: 'expo-haptics' },
              { name: 'expo-clipboard' },
              { name: 'expo-constants' },
              { name: 'expo-device' },
              { name: 'expo-network' },
              { name: 'expo-screen-orientation' },
              { name: 'expo-font' },
              { name: 'expo-sensors' },
              { name: 'expo-contacts' },
              { name: 'expo-speech' },
              { name: '@notifee/react-native', highlight: true },
            ].map(lib => (
              <span key={lib.name} className={`sdk-tag${lib.highlight ? ' highlight' : ''}`}>
                {lib.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how-section">
        <div className="container">
          <div className="section-label">Flow</div>
          <h2 className="section-title">Up and running in 60 seconds</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Install &amp; connect</h3>
              <p>Run <code style={{ fontSize: 12, color: '#4ade80' }}>npm install -g apptuner</code>, download AppTuner Mobile, and scan the QR code.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Scan &amp; code</h3>
              <p>Save a file. Your change appears on the device in milliseconds — over the internet, no USB needed.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Build &amp; ship</h3>
              <p>Upload your Apple cert. Get a signed .ipa in 3 seconds, ready for TestFlight or the App Store.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="pricing-section">
        <div className="container">
          <div className="section-label">Pricing</div>
          <h2 className="section-title">Simple, transparent pricing</h2>
          <p className="section-subtitle">All plans include every feature. No paywalled modules, no build limits.</p>

          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="plan-name">Monthly</div>
              <div className="plan-price">
                <span className="amount">$29</span>
                <span className="period">/ month</span>
              </div>
              <div className="plan-desc">Cancel anytime</div>
              <ul className="plan-features">
                <li>Hot reload on real devices</li>
                <li>38 pre-installed native modules</li>
                <li>SDK updates while subscribed</li>
                <li>Unlimited IPA builds</li>
                <li>Remote sharing with your team</li>
                <li>Live console logs</li>
              </ul>
              <button className="btn-secondary" style={{ width: '100%', padding: '10px' }} onClick={() => handleCheckout('monthly')}>
                Get started
              </button>
            </div>

            <div className="pricing-card featured">
              <div className="featured-badge">Best value</div>
              <div className="plan-name">Lifetime</div>
              <div className="plan-price">
                <span className="amount">$499</span>
                <span className="period">once</span>
              </div>
              <div className="plan-desc">Pay once, use forever. All future updates included.</div>
              <ul className="plan-features">
                <li>Everything in Monthly</li>
                <li>All future SDK updates</li>
                <li>Priority support</li>
                <li>Founding member pricing</li>
              </ul>
              <button className="btn-primary" style={{ width: '100%', padding: '10px' }} onClick={() => handleCheckout('lifetime')}>
                Get lifetime access
              </button>
            </div>
          </div>

          <p className="trial-note">Both plans start with a 14-day free trial · 14-day money-back guarantee</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="faq-section">
        <div className="container">
          <div className="section-label">FAQ</div>
          <h2 className="section-title">Common questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h3>How is this different from Expo Go?</h3>
              <p>Expo Go runs your app in a sandboxed environment and doesn't support custom native modules. AppTuner is a pre-built shell with 38 native modules compiled in — closer to a development build than Expo Go.</p>
            </div>
            <div className="faq-item">
              <h3>How are IPA builds so fast?</h3>
              <p>The AppTuner shell is already compiled. A "build" is just re-signing it with your Apple certificate — a process that takes seconds, not the 10–30 minutes a full Xcode build requires.</p>
            </div>
            <div className="faq-item">
              <h3>Does it work with my existing React Native project?</h3>
              <p>Yes, if you use bare React Native. Point AppTuner at your project folder and it bundles your JavaScript and sends it to the shell. You don't need to change your code structure.</p>
            </div>
            <div className="faq-item">
              <h3>What about Android?</h3>
              <p>iOS is fully supported now. Android support is in progress. The re-signing pipeline currently produces .ipa files for iOS App Store distribution.</p>
            </div>
            <div className="faq-item">
              <h3>Is my code secure?</h3>
              <p>Your source code is never stored on our servers. The relay only transfers compiled JavaScript bundles between your machine and your device. Certificates uploaded for IPA signing are deleted immediately after the build completes.</p>
            </div>
            <div className="faq-item">
              <h3>Do I need a Mac?</h3>
              <p>Not for development. The CLI and hot reload work on any OS. For IPA builds you need an Apple developer certificate — but the signing happens on our server, not your machine.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <div className="container">
          <h2>Your first live share is 60 seconds away.</h2>
          <p>14-day free trial. No credit card required. Cancel anytime.</p>
          <button className="btn-white btn-large" onClick={() => onEnterApp('signup')}>
            Start free trial
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-menu">
            <a onClick={() => setCurrentPage('docs')}>Docs</a>
            <a onClick={() => setCurrentPage('affiliates')}>Affiliates</a>
            <a onClick={() => setCurrentPage('terms')}>Terms</a>
            <a onClick={() => setCurrentPage('privacy')}>Privacy</a>
            <a onClick={() => setShowSupportModal(true)}>Support</a>
            <a onClick={() => setShowContactModal(true)}>Contact</a>
          </div>
          <div className="footer-copyright">© 2026 Rawvibe B.V. — AppTuner</div>
        </div>
      </footer>

      {showContactModal && <ContactModal initialType="contact" onClose={() => setShowContactModal(false)} />}
      {showSupportModal && <ContactModal initialType="support" onClose={() => setShowSupportModal(false)} />}
    </div>
  );
}

// ─── Contact Modal ─────────────────────────────────────────────────────────────

function ContactModal({ initialType, onClose }: { initialType: 'contact' | 'support'; onClose: () => void }) {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', supportArea: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupport = initialType === 'support';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const accessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;
    if (!accessKey) {
      setSubmitted(true);
      setSubmitting(false);
      setTimeout(() => { setSubmitted(false); onClose(); }, 2000);
      return;
    }

    try {
      const subject = isSupport ? `Support: ${formData.supportArea}` : formData.subject;
      const message = isSupport ? `[SUPPORT]\nArea: ${formData.supportArea}\n\n${formData.message}` : formData.message;
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_key: accessKey, name: formData.name, email: formData.email, subject, message }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setTimeout(() => { setSubmitted(false); onClose(); }, 2000);
      } else throw new Error(data.message);
    } catch {
      setError('Failed to send. Email us at info@apptuner.io');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
          {isSupport ? 'Get support' : 'Contact us'}
        </h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>
          {isSupport ? 'Describe your issue and we\'ll get back to you.' : 'Questions, feedback, partnership inquiries.'}
        </p>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {submitted ? (
          <div className="alert alert-success">Message sent — we'll be in touch shortly.</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {isSupport && (
              <div>
                <label className="form-label">Topic</label>
                <select required value={formData.supportArea} onChange={e => setFormData({ ...formData, supportArea: e.target.value })} className="form-input" style={{ cursor: 'pointer' }}>
                  <option value="">Select...</option>
                  <option>Connection</option>
                  <option>Hot Reload</option>
                  <option>IPA Build</option>
                  <option>Billing</option>
                  <option>Bug Report</option>
                  <option>Other</option>
                </select>
              </div>
            )}
            <div>
              <label className="form-label">Name</label>
              <input type="text" required className="form-input" placeholder="Your name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input type="email" required className="form-input" placeholder="your@email.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            {!isSupport && (
              <div>
                <label className="form-label">Subject</label>
                <input type="text" required className="form-input" placeholder="How can we help?" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} />
              </div>
            )}
            <div>
              <label className="form-label">Message</label>
              <textarea required className="form-input" rows={5} placeholder="Tell us more..." value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} style={{ resize: 'vertical' }} />
            </div>
            <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%', padding: 12, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Sending...' : 'Send message'}
            </button>
          </form>
        )}

        <p style={{ fontSize: 12, color: '#555', marginTop: 20, textAlign: 'center' }}>
          Or email <a href="mailto:info@apptuner.io" style={{ color: '#4ade80', textDecoration: 'none' }}>info@apptuner.io</a>
        </p>
      </div>
    </div>
  );
}
