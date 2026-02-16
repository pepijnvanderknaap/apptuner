/**
 * AppTuner Landing Page
 *
 * A stunning, conversion-focused landing page showcasing AppTuner's value proposition
 */

import React, { useState } from 'react';
import './LandingPage.css';
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsOfService } from './TermsOfService';
import { Documentation } from './Documentation';
import { Affiliates } from './Affiliates';
import { redirectToCheckout, STRIPE_PRICE_IDS, isStripeConfigured } from '../services/stripe';

type PageView = 'landing' | 'privacy' | 'terms' | 'docs' | 'affiliates';

export function LandingPage({ onEnterApp }: { onEnterApp: () => void }) {
  const [currentPage, setCurrentPage] = useState<PageView>('landing');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Handle Stripe checkout
  const handleCheckout = async (tier: 'monthly' | 'yearly' | 'lifetime') => {
    if (!isStripeConfigured()) {
      console.warn('Stripe not configured - entering app directly');
      onEnterApp();
      return;
    }

    setCheckoutLoading(tier);
    const priceId = STRIPE_PRICE_IDS[tier];
    const result = await redirectToCheckout(priceId);

    if (result.error) {
      console.error('Checkout error:', result.error);
      alert(`Failed to start checkout: ${result.error}`);
      setCheckoutLoading(null);
    }
    // If successful, user will be redirected to Stripe
  };

  // Show different pages based on navigation
  if (currentPage === 'privacy') {
    return <PrivacyPolicy onBack={() => setCurrentPage('landing')} />;
  }
  if (currentPage === 'terms') {
    return <TermsOfService onBack={() => setCurrentPage('landing')} />;
  }
  if (currentPage === 'docs') {
    return <Documentation onBack={() => setCurrentPage('landing')} />;
  }
  if (currentPage === 'affiliates') {
    return <Affiliates onBack={() => setCurrentPage('landing')} />;
  }

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="nav">
        <div className="nav-content">
          <div className="logo">
            <span className="logo-text">AppTuner</span>
            <span className="logo-badge">BETA</span>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <button className="btn-secondary" onClick={onEnterApp}>
              Launch App
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            The React Native developer experience you've been waiting for
          </div>
          <h1 className="hero-title">
            Instant Hot Reload.
            <br />
            <span className="gradient-text">Real Devices.</span>
          </h1>
          <p className="hero-subtitle">
            Professional-grade hot reload for React Native developers who demand rock-solid
            connections, zero configuration, and blazing-fast iteration on real devices.
          </p>
          <div className="hero-cta">
            <button className="btn-primary btn-large" onClick={onEnterApp}>
              Start Free Trial
              <span className="btn-arrow">→</span>
            </button>
            <p className="cta-subtext">14 days free • No credit card required</p>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <div className="stat-value">&lt;100ms</div>
              <div className="stat-label">Hot Reload</div>
            </div>
            <div className="stat">
              <div className="stat-value">100%</div>
              <div className="stat-label">Uptime</div>
            </div>
            <div className="stat">
              <div className="stat-value">Zero</div>
              <div className="stat-label">Version Conflicts</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="problem-section">
        <div className="container">
          <h2 className="section-title">Built for Professional Developers</h2>
          <p className="section-subtitle">
            The development experience you deserve. Fast, reliable, and built to stay out of your way.
          </p>

          <div className="problem-grid">
            <div className="problem-card">
              <div className="card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </div>
              <h3>Rock-Solid Connections</h3>
              <p>Development doesn't stop when you lock your phone or switch apps. Automatic
              reconnection keeps you in flow. Connection stability you can rely on.</p>
            </div>

            <div className="problem-card">
              <div className="card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </div>
              <h3>Sub-100ms Hot Reload</h3>
              <p>See your changes instantly. Not in seconds, not "eventually" — in milliseconds.
              The feedback loop is so fast, it feels native.</p>
            </div>

            <div className="problem-card">
              <div className="card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h3>Zero Setup Required</h3>
              <p>Scan a QR code and start coding. No configuration files, no environment
              variables, no npm installations. Your team is productive in 30 seconds.</p>
            </div>

            <div className="problem-card">
              <div className="card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                  <line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
              </div>
              <h3>Real Production Builds</h3>
              <p>Test your actual app with full native modules on real devices. No sandboxing,
              no runtime restrictions. Just your app, updating live.</p>
            </div>
          </div>

          <div className="story-box">
            <p className="story-text">
              <strong>Why I built AppTuner:</strong> Watching React Native developers battle the same
              issues over and over — connections dropping mid-session, version conflicts that even AI
              can't untangle, setup nightmares that waste entire afternoons — I realized these problems
              are solvable. Instead of accepting it as "just how React Native is," I built the solution
              that should have existed all along. Clean, fast, reliable hot reload that actually works.
            </p>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="solution-section">
        <div className="container">
          <h2 className="section-title">
            The Features That Make <span className="gradient-text">All The Difference</span>
          </h2>

          <div className="features-grid">
            <div className="feature-card feature-highlight">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </div>
              <h3>Instant Hot Reload</h3>
              <p>
                See your changes in <strong>&lt;100ms</strong>. Not seconds. Not "eventually."
                Milliseconds. Save a file, boom—it's on your device. That's the speed your brain works at.
              </p>
              <div className="feature-visual">
                <div className="speed-indicator">
                  <div className="speed-bar"></div>
                  <span>95ms average</span>
                </div>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </div>
              <h3>Rock-Solid Connection</h3>
              <p>
                Lock your phone. Unlock it. Switch apps. Take a call. Your connection stays alive.
                Auto-reconnect just works. Focus on coding, not reconnecting.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                  <line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
              </div>
              <h3>Real Device Testing</h3>
              <p>
                Test your actual app with your actual native modules on your actual device.
                No simulators. No compromises. Just your real app, updating in real-time.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                  <polyline points="13 2 13 9 20 9"/>
                </svg>
              </div>
              <h3>Multiple Projects, Zero Hassle</h3>
              <p>
                Switch between projects instantly. Different React Native versions? No problem.
                Each project gets bundled independently—no version conflicts, ever.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 17 10 11 4 5"/>
                  <line x1="12" y1="19" x2="20" y2="19"/>
                </svg>
              </div>
              <h3>Live Console Logs</h3>
              <p>
                Every console.log, warning, and error from your device streams to your desktop in real-time.
                No more squinting at tiny phone screens or hunting through Xcode.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="9" x2="9.01" y2="9"/>
                  <line x1="15" y1="9" x2="15.01" y2="9"/>
                  <line x1="9" y1="15" x2="9.01" y2="15"/>
                  <line x1="15" y1="15" x2="15.01" y2="15"/>
                </svg>
              </div>
              <h3>One QR Code. That's It.</h3>
              <p>
                Scan once, you're connected. No npm installs. No CLI commands. No config files.
                Just scan and start coding. Your whole team can be up and running in 30 seconds.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3>Demo to Anyone, Anywhere</h3>
              <p>
                Client not in the room? QA team working remote? Just share your session code via text, Slack, or email.
                They enter it in AppTuner and see your app live. Perfect for demos, stakeholder reviews, and remote testing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">Three-Step Setup</h2>
          <p className="section-subtitle">From zero to coding in under 60 seconds</p>

          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Scan QR Code</h3>
                <p>Open the AppTuner mobile app and scan the QR code from your desktop</p>
              </div>
            </div>

            <div className="step-arrow">→</div>

            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Start Auto-Reload</h3>
                <p>Click "START" to enable instant hot reload for your project</p>
              </div>
            </div>

            <div className="step-arrow">→</div>

            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Code Away</h3>
                <p>Edit files, save, watch changes appear instantly on your device</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section">
        <div className="container">
          <h2 className="section-title">Simple, Honest Pricing</h2>
          <p className="section-subtitle">Start free. Scale when you're ready. No hidden fees.</p>

          {/* Free Trial Banner */}
          <div className="trial-banner">
            <div className="trial-content">
              <div className="trial-badge">FREE TRIAL</div>
              <h3>Try AppTuner Free for 14 Days</h3>
              <p>Full access to all features. No credit card required. Cancel anytime.</p>
              <button className="btn-primary" onClick={onEnterApp}>
                Start Free Trial
              </button>
            </div>
          </div>

          {/* Paid Plans */}
          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="plan-header">
                <h3>Monthly</h3>
                <p className="plan-desc">Pay as you go</p>
              </div>
              <div className="plan-price">
                <span className="price">$29</span>
                <span className="period">/month</span>
              </div>
              <ul className="plan-features">
                <li>✓ All features included</li>
                <li>✓ Unlimited projects</li>
                <li>✓ Unlimited devices</li>
                <li>✓ Priority support</li>
                <li>✓ Cancel anytime</li>
              </ul>
              <button
                className="btn-outline"
                onClick={() => handleCheckout('monthly')}
                disabled={checkoutLoading !== null}
              >
                {checkoutLoading === 'monthly' ? 'Loading...' : 'Get Started'}
              </button>
            </div>

            <div className="pricing-card pricing-card-popular">
              <div className="popular-badge">BEST VALUE</div>
              <div className="plan-header">
                <h3>Yearly</h3>
                <p className="plan-desc">Save 71%</p>
              </div>
              <div className="plan-price">
                <span className="price">$99</span>
                <span className="period">/year</span>
                <div className="price-compare">
                  <span className="save-amount">Save $249/year vs monthly</span>
                </div>
              </div>
              <ul className="plan-features">
                <li>✓ All features included</li>
                <li>✓ Unlimited projects</li>
                <li>✓ Unlimited devices</li>
                <li>✓ Priority support</li>
                <li>✓ Lock in this price forever</li>
              </ul>
              <button
                className="btn-primary"
                onClick={() => handleCheckout('yearly')}
                disabled={checkoutLoading !== null}
              >
                {checkoutLoading === 'yearly' ? 'Loading...' : 'Get Started'}
              </button>
            </div>

            <div className="pricing-card">
              <div className="plan-header">
                <h3>Lifetime</h3>
                <p className="plan-desc">Pay once, use forever</p>
              </div>
              <div className="plan-price">
                <span className="price">$199</span>
                <span className="period">once</span>
                <div className="price-compare">
                  <span className="save-amount">Pays for itself in 2 years</span>
                </div>
              </div>
              <ul className="plan-features">
                <li>✓ All features forever</li>
                <li>✓ All future updates</li>
                <li>✓ Lifetime priority support</li>
                <li>✓ Best deal ever</li>
                <li>✓ One-time payment</li>
              </ul>
              <button
                className="btn-primary"
                onClick={() => handleCheckout('lifetime')}
                disabled={checkoutLoading !== null}
              >
                {checkoutLoading === 'lifetime' ? 'Loading...' : 'Get Lifetime Access'}
              </button>
            </div>
          </div>

          <div className="pricing-note">
            <p>All plans include 14-day money-back guarantee • Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="container">
          <h2 className="section-title">Frequently Asked Questions</h2>

          <div className="faq-grid">
            <div className="faq-item">
              <h3>How does AppTuner compare to other development tools?</h3>
              <p>
                AppTuner focuses on three core strengths: instant hot reload (under 100ms), rock-solid
                connections that survive phone locks and app switches, and zero configuration setup.
                It works with your real React Native app – full native modules, custom code, production
                builds – without sandboxing or runtime restrictions.
              </p>
            </div>

            <div className="faq-item">
              <h3>Does it work with my existing React Native project?</h3>
              <p>
                Yes! AppTuner works with any React Native project using the bare workflow. Just point
                it at your project folder and start coding. Works alongside your existing development
                setup without requiring changes to your codebase.
              </p>
            </div>

            <div className="faq-item">
              <h3>What about iOS and Android?</h3>
              <p>
                Currently iOS is fully supported. Android support is coming soon. The mobile app needs
                to be installed once on your device, then you get instant updates via AppTuner.
              </p>
            </div>

            <div className="faq-item">
              <h3>Is my code secure?</h3>
              <p>
                Absolutely. Your code never leaves your local network. AppTuner uses a secure WebSocket
                relay that only transfers bundle updates—no source code, no credentials, nothing sensitive.
              </p>
            </div>

            <div className="faq-item">
              <h3>Can my whole team use one license?</h3>
              <p>
                Each developer needs their own license. But you can connect unlimited devices per license,
                so you can test on multiple phones/tablets with one subscription.
              </p>
            </div>

            <div className="faq-item">
              <h3>What if I don't like it?</h3>
              <p>
                Try it free for 14 days—no credit card required. If you subscribe and change your mind,
                we offer a 14-day money-back guarantee. No questions asked.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <div className="container">
          <h2 className="cta-title">Ready for Professional React Native Development?</h2>
          <p className="cta-subtitle">
            Join developers who demand instant hot reload, rock-solid connections, and zero configuration
          </p>
          <button className="btn-primary btn-large" onClick={onEnterApp}>
            Start Your Free Trial
            <span className="btn-arrow">→</span>
          </button>
          <p className="cta-subtext">14 days free • No credit card required • Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-menu">
            <a onClick={() => setCurrentPage('docs')} style={{ cursor: 'pointer' }}>Docs</a>
            <span className="footer-separator">|</span>
            <a onClick={() => setCurrentPage('terms')} style={{ cursor: 'pointer' }}>Terms</a>
            <span className="footer-separator">|</span>
            <a onClick={() => setCurrentPage('privacy')} style={{ cursor: 'pointer' }}>Privacy</a>
            <span className="footer-separator">|</span>
            <a href="#faq" onClick={(e) => { e.preventDefault(); document.querySelector('.faq-section')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ cursor: 'pointer' }}>FAQ</a>
            <span className="footer-separator">|</span>
            <a onClick={() => setCurrentPage('affiliates')} style={{ cursor: 'pointer' }}>Affiliates</a>
            <span className="footer-separator">|</span>
            <a onClick={() => setShowSupportModal(true)} style={{ cursor: 'pointer' }}>Support</a>
            <span className="footer-separator">|</span>
            <a onClick={() => setShowContactModal(true)} style={{ cursor: 'pointer' }}>Contact</a>
          </div>
          <div className="footer-copyright">
            &copy; 2025 AppTuner
          </div>
        </div>
      </footer>

      {/* Contact/Support Modal */}
      {showContactModal && <UnifiedContactModal initialType="contact" onClose={() => setShowContactModal(false)} />}
      {showSupportModal && <UnifiedContactModal initialType="support" onClose={() => setShowSupportModal(false)} />}
    </div>
  );
}

// Unified Contact/Support Modal Component
function UnifiedContactModal({ initialType, onClose }: { initialType: 'contact' | 'support'; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    supportArea: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const accessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;

    if (!accessKey) {
      console.warn('Web3Forms not configured - form submission logged only');
      console.log(`${initialType} form submitted:`, formData);
      setSubmitting(false);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ name: '', email: '', subject: '', supportArea: '', message: '' });
        onClose();
      }, 2000);
      return;
    }

    try {
      // Build subject line based on form type
      const subject = initialType === 'support'
        ? `Support Request: ${formData.supportArea}`
        : formData.subject;

      // Build message with form type indicator
      const message = initialType === 'support'
        ? `[SUPPORT REQUEST]\n\nSupport Area: ${formData.supportArea}\n\n${formData.message}`
        : `[CONTACT]\n\n${formData.message}`;

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_key: accessKey,
          name: formData.name,
          email: formData.email,
          subject: subject,
          message: message,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
        setFormData({ name: '', email: '', subject: '', supportArea: '', message: '' });
        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 2000);
      } else {
        throw new Error(data.message || 'Failed to send message');
      }
    } catch (err) {
      console.error('Form submission error:', err);
      setError('Failed to send message. Please try emailing us directly at info@apptuner.io');
    } finally {
      setSubmitting(false);
    }
  };

  const isSupport = initialType === 'support';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '12px' }}>
          {isSupport ? 'Get Support' : 'Get in Touch'}
        </h2>
        <p style={{ color: '#666', fontSize: '16px', lineHeight: '1.7', marginBottom: '28px' }}>
          {isSupport
            ? "Having trouble? Let us know and we'll help you get back on track."
            : "Have questions, feedback, or need to reach us? We'd love to hear from you."}
        </p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {submitted ? (
          <div className="alert alert-success">
            {isSupport
              ? "Support ticket received! We'll get back to you shortly."
              : "Thank you for your message! We'll get back to you soon."}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {isSupport ? (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <label className="form-label">Support Area</label>
                  <select
                    required
                    value={formData.supportArea}
                    onChange={(e) => setFormData({ ...formData, supportArea: e.target.value })}
                    className="form-input"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="">Select a topic...</option>
                    <option value="Connection">Connection</option>
                    <option value="Hot Reload">Hot Reload</option>
                    <option value="Installation Help">Installation Help</option>
                    <option value="Billing Question">Billing Question</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Bug Report">Bug Report</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input"
                    placeholder="Your name"
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-input"
                    placeholder="your@email.com"
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label className="form-label">Description</label>
                  <textarea
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={6}
                    className="form-input"
                    placeholder="Please describe in detail..."
                    style={{ resize: 'vertical', minHeight: '140px' }}
                  />
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input"
                    placeholder="Your name"
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-input"
                    placeholder="your@email.com"
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label className="form-label">Subject</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="form-input"
                    placeholder="How can we help?"
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label className="form-label">Message</label>
                  <textarea
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={6}
                    className="form-input"
                    placeholder="Tell us more..."
                    style={{ resize: 'vertical', minHeight: '140px' }}
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{ width: '100%', padding: '16px', fontSize: '16px', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Sending...' : (isSupport ? 'Submit Support Request' : 'Send Message')}
            </button>
          </form>
        )}

        <div style={{
          marginTop: '28px',
          paddingTop: '28px',
          borderTop: '1px solid #eaeaea',
          fontSize: '15px',
          color: '#888'
        }}>
          <p>
            Prefer email? Reach us at{' '}
            <a href="mailto:info@apptuner.io" style={{ color: '#667eea', textDecoration: 'none' }}>
              info@apptuner.io
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
