import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '../hooks/useAuth';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

type PlanTier = 'monthly' | 'yearly' | 'lifetime';

const PLANS: Record<PlanTier, { label: string; price: string; sub: string; priceIdKey: string }> = {
  monthly:  { label: 'Monthly',  price: '$29',  sub: '/month',   priceIdKey: 'VITE_STRIPE_PRICE_MONTHLY' },
  yearly:   { label: 'Yearly',   price: '$99',  sub: '/year',    priceIdKey: 'VITE_STRIPE_PRICE_YEARLY' },
  lifetime: { label: 'Lifetime', price: '$199', sub: ' one-time', priceIdKey: 'VITE_STRIPE_PRICE_LIFETIME' },
};

interface WelcomeProps {
  onComplete: () => void;
  intent?: 'trial' | 'paid';
  selectedTier?: PlanTier;
}

export function Welcome({ onComplete, intent = 'trial', selectedTier }: WelcomeProps) {
  const { user, isInTrial, trialDaysRemaining, signOut } = useAuth();
  const isPaidIntent = intent === 'paid';
  const isPaid = user?.subscription_status === 'active';

  const storageKey = `apptuner_welcome_steps_${user?.id}`;

  const [steps, setSteps] = useState<{ cli: boolean }>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : { cli: false };
    } catch {
      return { cli: false };
    }
  });

  const [activeTier, setActiveTier] = useState<PlanTier>(selectedTier || 'yearly');
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(steps));
    } catch {
      // localStorage not available
    }
  }, [steps, storageKey]);

  const handleCopyCommand = () => {
    navigator.clipboard.writeText('npm install -g apptuner').then(() => {
      setCopiedCommand(true);
      setTimeout(() => setCopiedCommand(false), 2000);
    });
  };

  const getPriceId = (tier: PlanTier): string => {
    const keys: Record<PlanTier, string> = {
      monthly:  import.meta.env.VITE_STRIPE_PRICE_MONTHLY  || '',
      yearly:   import.meta.env.VITE_STRIPE_PRICE_YEARLY   || '',
      lifetime: import.meta.env.VITE_STRIPE_PRICE_LIFETIME || '',
    };
    return keys[tier];
  };

  const handleCheckout = async () => {
    setCheckoutLoading(activeTier);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: getPriceId(activeTier), userId: user?.id, tier: activeTier }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Server error');
      }
      if (!data.url) throw new Error('No checkout URL returned');
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert(`Unable to start checkout: ${error.message || 'Please try again.'}`);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleComplete = () => {
    try {
      localStorage.setItem(`apptuner_onboarding_done_${user?.id}`, 'true');
    } catch {
      // localStorage not available
    }
    onComplete();
  };

  // For paid-intent: require CLI (payment is strongly encouraged but not blocking)
  // For trial-intent: require CLI
  const canComplete = steps.cli;

  const userEmail = user?.email || '';

  // Step number offset — paid intent adds payment as step 1
  const cliStep = isPaidIntent ? 2 : 1;
  const mobileStep = isPaidIntent ? 3 : 2;
  const planStep = 3;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#fafafa',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Nav */}
      <nav style={{ background: 'white', borderBottom: '1px solid #eaeaea', padding: '16px 24px' }}>
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>AppTuner</h1>
          <button
            onClick={signOut}
            style={{
              background: 'none',
              border: 'none',
              color: '#667eea',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '64px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
              border: '1px solid rgba(102, 126, 234, 0.2)',
              borderRadius: '24px',
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#667eea',
              marginBottom: '20px',
              letterSpacing: '0.02em',
            }}
          >
            {isPaid ? 'Subscription active' : isInTrial ? `${trialDaysRemaining} days free trial` : 'Account created'}
          </div>
          <h1
            style={{
              fontSize: '36px',
              fontWeight: '800',
              letterSpacing: '-0.02em',
              marginBottom: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Welcome to AppTuner
          </h1>
          <p style={{ color: '#666', fontSize: '16px', lineHeight: '1.6' }}>
            {isPaidIntent && !isPaid
              ? `Let's complete your purchase and get you set up, ${userEmail}.`
              : `Let's get you set up, ${userEmail}.`}
          </p>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>

          {/* PAID INTENT ONLY — Step 1: Complete Your Purchase */}
          {isPaidIntent && (
            <div
              style={{
                background: isPaid ? 'white' : 'linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%)',
                border: isPaid ? '2px solid #10b981' : '2px solid #667eea',
                borderRadius: '12px',
                padding: '28px 32px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isPaid ? '#10b981' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '700',
                    flexShrink: 0,
                  }}
                >
                  {isPaid ? '✓' : '1'}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '6px' }}>
                    Complete Your Purchase
                  </h3>

                  {isPaid ? (
                    <p style={{ color: '#10b981', fontSize: '14px', fontWeight: '600' }}>
                      Subscription active — you're all set
                    </p>
                  ) : (
                    <>
                      <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
                        Your trial is active for {trialDaysRemaining} days. Choose a plan to keep access after your trial.
                      </p>

                      {/* Plan selector — tabs */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        {(Object.keys(PLANS) as PlanTier[]).map(tier => (
                          <button
                            key={tier}
                            onClick={() => setActiveTier(tier)}
                            style={{
                              flex: 1,
                              padding: '8px 4px',
                              borderRadius: '8px',
                              border: activeTier === tier ? '2px solid #667eea' : '2px solid #e5e7eb',
                              background: activeTier === tier
                                ? 'linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(118,75,162,0.08) 100%)'
                                : 'white',
                              color: activeTier === tier ? '#667eea' : '#666',
                              fontSize: '13px',
                              fontWeight: activeTier === tier ? '700' : '500',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {PLANS[tier].label}
                          </button>
                        ))}
                      </div>

                      {/* Selected plan detail */}
                      <div
                        style={{
                          background: 'white',
                          border: '2px solid #667eea',
                          borderRadius: '10px',
                          padding: '18px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          marginBottom: '12px',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '28px', fontWeight: '800', color: '#1a1a2e' }}>
                            {PLANS[activeTier].price}
                          </span>
                          <span style={{ color: '#666', fontSize: '14px' }}>{PLANS[activeTier].sub}</span>
                          {activeTier === 'yearly' && (
                            <span style={{ color: '#10b981', fontSize: '12px', fontWeight: '600', marginLeft: '8px' }}>
                              Save $249
                            </span>
                          )}
                        </div>
                        <button
                          onClick={handleCheckout}
                          disabled={!!checkoutLoading}
                          style={{
                            background: checkoutLoading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '12px 28px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '700',
                            cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {checkoutLoading ? 'Loading...' : activeTier === 'lifetime' ? 'Buy now' : 'Subscribe'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Install CLI */}
          <div
            style={{
              background: 'white',
              border: steps.cli ? '2px solid #10b981' : '2px solid #eaeaea',
              borderRadius: '12px',
              padding: '28px 32px',
              transition: 'border-color 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: steps.cli
                    ? '#10b981'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '700',
                  flexShrink: 0,
                }}
              >
                {steps.cli ? '✓' : cliStep}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '6px' }}>
                  Install the CLI
                </h3>
                <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>
                  The AppTuner CLI connects your project to your phone. Run this in your terminal:
                </p>
                <div
                  style={{
                    background: '#1a1a2e',
                    borderRadius: '8px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    gap: '12px',
                  }}
                >
                  <code style={{ color: '#a5f3fc', fontSize: '14px', fontFamily: 'monospace' }}>
                    npm install -g apptuner
                  </code>
                  <button
                    onClick={handleCopyCommand}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      color: 'white',
                      padding: '4px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {copiedCommand ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                {!steps.cli ? (
                  <button
                    onClick={() => setSteps(prev => ({ ...prev, cli: true }))}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    I've installed it ✓
                  </button>
                ) : (
                  <p style={{ color: '#10b981', fontSize: '14px', fontWeight: '600' }}>
                    CLI installed
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Mobile App (Coming Soon) */}
          <div
            style={{
              background: 'white',
              border: '2px solid #eaeaea',
              borderRadius: '12px',
              padding: '28px 32px',
              opacity: 0.8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9ca3af',
                  fontSize: '16px',
                  fontWeight: '700',
                  flexShrink: 0,
                }}
              >
                {mobileStep}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: '700' }}>Install the Mobile App</h3>
                  <span
                    style={{
                      background: '#f3f4f6',
                      color: '#6b7280',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      letterSpacing: '0.05em',
                    }}
                  >
                    COMING SOON
                  </span>
                </div>
                <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
                  The AppTuner Viewer app is coming to the App Store and Google Play. We'll email you when it's ready.
                </p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  {['App Store', 'Google Play'].map(store => (
                    <div
                      key={store}
                      style={{
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '10px 18px',
                        color: '#9ca3af',
                        fontSize: '13px',
                        fontWeight: '600',
                      }}
                    >
                      {store}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* TRIAL ONLY — soft plan nudge at the bottom */}
          {!isPaidIntent && isInTrial && (
            <div
              style={{
                background: 'white',
                border: '2px solid #eaeaea',
                borderRadius: '12px',
                padding: '28px 32px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    fontSize: '16px',
                    fontWeight: '700',
                    flexShrink: 0,
                  }}
                >
                  {planStep}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: '700' }}>Choose a Plan</h3>
                    <span
                      style={{
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                        color: '#667eea',
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        letterSpacing: '0.05em',
                      }}
                    >
                      OPTIONAL DURING TRIAL
                    </span>
                  </div>
                  <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>
                    {trialDaysRemaining} days left in your trial. Plans start from $99/year.
                  </p>
                  <a
                    href="/#pricing"
                    style={{
                      display: 'inline-block',
                      border: '2px solid #667eea',
                      color: '#667eea',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      textDecoration: 'none',
                    }}
                  >
                    View Pricing
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleComplete}
            disabled={!canComplete}
            style={{
              background: canComplete
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : '#e5e7eb',
              color: canComplete ? 'white' : '#9ca3af',
              border: 'none',
              padding: '16px 48px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: canComplete ? 'pointer' : 'not-allowed',
              boxShadow: canComplete ? '0 4px 20px rgba(102, 126, 234, 0.4)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            Open Dashboard →
          </button>
          {!canComplete && (
            <p style={{ color: '#9ca3af', fontSize: '13px', marginTop: '12px' }}>
              Install the CLI first to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
