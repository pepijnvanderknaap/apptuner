import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { loadStripe } from '@stripe/stripe-js';

// Stripe publishable key from environment variables
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
);

export function Paywall() {
  const { user, trialDaysRemaining, signOut } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (
    tier: 'monthly' | 'yearly' | 'lifetime',
    priceId: string
  ) => {
    setLoading(tier);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${apiBase}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId: user?.id,
          tier,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Server error');
      }

      // Redirect to Stripe Checkout
      if (!data.url) throw new Error('No checkout URL returned');
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert(`Unable to start checkout: ${error.message || 'Please try again.'}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#fafafa',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <nav
        style={{
          background: 'white',
          borderBottom: '1px solid #eaeaea',
          padding: '16px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
            AppTuner
          </h1>
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

      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '64px 24px',
        }}
      >
        {/* Trial Status Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.06) 0%, rgba(90, 115, 217, 0.06) 100%)',
            border: '2px solid #eaeaea',
            borderRadius: '8px',
            padding: '24px 32px',
            marginBottom: '48px',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
            {trialDaysRemaining > 0
              ? `${trialDaysRemaining} Days Left in Your Free Trial`
              : 'Your Free Trial Has Ended'}
          </h2>
          <p style={{ color: '#666', fontSize: '15px' }}>
            {trialDaysRemaining > 0
              ? 'Choose a plan to continue using AppTuner after your trial ends.'
              : 'Choose a plan to continue using AppTuner.'}
          </p>
        </div>

        {/* Pricing Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
            maxWidth: '1100px',
            margin: '0 auto',
          }}
        >
          {/* Monthly Plan */}
          <div
            style={{
              background: 'white',
              border: '2px solid #eaeaea',
              borderRadius: '8px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
              Monthly
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '40px', fontWeight: '700' }}>$29</span>
              <span style={{ color: '#666', fontSize: '16px' }}>/month</span>
            </div>
            <p style={{ color: '#666', lineHeight: '1.7', marginBottom: '24px', flexGrow: 1 }}>
              Perfect for ongoing projects. Cancel anytime.
            </p>
            <button
              onClick={() =>
                handleCheckout('monthly', import.meta.env.VITE_STRIPE_PRICE_MONTHLY || '')
              }
              disabled={loading === 'monthly'}
              style={{
                background: loading === 'monthly' ? '#9ca3af' : '#667eea',
                color: 'white',
                border: 'none',
                padding: '14px 32px',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading === 'monthly' ? 'not-allowed' : 'pointer',
              }}
            >
              {loading === 'monthly' ? 'Processing...' : 'Choose Monthly'}
            </button>
          </div>

          {/* Yearly Plan */}
          <div
            style={{
              background: 'white',
              border: '2px solid #667eea',
              borderRadius: '8px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#667eea',
                color: 'white',
                padding: '4px 16px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '700',
              }}
            >
              BEST VALUE
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
              Yearly
            </h3>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '40px', fontWeight: '700' }}>$99</span>
              <span style={{ color: '#666', fontSize: '16px' }}>/year</span>
            </div>
            <p style={{ color: '#10b981', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
              Save $249/year
            </p>
            <p style={{ color: '#666', lineHeight: '1.7', marginBottom: '24px', flexGrow: 1 }}>
              Best for serious developers. 2+ months free.
            </p>
            <button
              onClick={() =>
                handleCheckout('yearly', import.meta.env.VITE_STRIPE_PRICE_YEARLY || '')
              }
              disabled={loading === 'yearly'}
              style={{
                background: loading === 'yearly' ? '#9ca3af' : '#667eea',
                color: 'white',
                border: 'none',
                padding: '14px 32px',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading === 'yearly' ? 'not-allowed' : 'pointer',
              }}
            >
              {loading === 'yearly' ? 'Processing...' : 'Choose Yearly'}
            </button>
          </div>

          {/* Lifetime Plan */}
          <div
            style={{
              background: 'white',
              border: '2px solid #eaeaea',
              borderRadius: '8px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
              Lifetime
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '40px', fontWeight: '700' }}>$199</span>
              <span style={{ color: '#666', fontSize: '16px' }}> once</span>
            </div>
            <p style={{ color: '#666', lineHeight: '1.7', marginBottom: '24px', flexGrow: 1 }}>
              Pay once, use forever. All future updates included.
            </p>
            <button
              onClick={() =>
                handleCheckout('lifetime', import.meta.env.VITE_STRIPE_PRICE_LIFETIME || '')
              }
              disabled={loading === 'lifetime'}
              style={{
                background: loading === 'lifetime' ? '#9ca3af' : 'white',
                color: loading === 'lifetime' ? 'white' : '#667eea',
                border: '2px solid #667eea',
                padding: '14px 32px',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading === 'lifetime' ? 'not-allowed' : 'pointer',
              }}
            >
              {loading === 'lifetime' ? 'Processing...' : 'Choose Lifetime'}
            </button>
          </div>
        </div>

        {/* Features List */}
        <div
          style={{
            maxWidth: '800px',
            margin: '64px auto 0',
            padding: '32px',
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #eaeaea',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px', textAlign: 'center' }}>
            All Plans Include
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: '#10b981', fontSize: '20px' }}>✓</div>
              <span style={{ color: '#333' }}>Instant hot reload</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: '#10b981', fontSize: '20px' }}>✓</div>
              <span style={{ color: '#333' }}>Metro bundler support</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: '#10b981', fontSize: '20px' }}>✓</div>
              <span style={{ color: '#333' }}>Real-time console logs</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: '#10b981', fontSize: '20px' }}>✓</div>
              <span style={{ color: '#333' }}>QR code pairing</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: '#10b981', fontSize: '20px' }}>✓</div>
              <span style={{ color: '#333' }}>Cloud relay service</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: '#10b981', fontSize: '20px' }}>✓</div>
              <span style={{ color: '#333' }}>Priority support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
