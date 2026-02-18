import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Login } from './Login';
import { Signup } from './Signup';
import { ForgotPassword } from './ForgotPassword';
import { Paywall } from './Paywall';
import { Welcome } from './Welcome';

type AuthView = 'login' | 'signup' | 'forgot-password';

interface AuthWrapperProps {
  children: React.ReactNode;
  initialView?: AuthView;
  signupIntent?: 'trial' | 'paid';
  signupTier?: 'monthly' | 'yearly' | 'lifetime';
}

/**
 * AuthWrapper - Protects the main app with authentication
 *
 * This wrapper does NOT modify the hot reload code at all.
 * It simply wraps around BrowserApp and shows auth screens when needed.
 *
 * Flow:
 * 1. Loading: Show loading state while checking auth
 * 2. Not authenticated: Show Login/Signup/ForgotPassword
 * 3. Authenticated but no subscription: Show Paywall
 * 4. Authenticated with active subscription: Show children (BrowserApp)
 */
function isOnboardingDone(userId: string): boolean {
  try {
    return localStorage.getItem(`apptuner_onboarding_done_${userId}`) === 'true';
  } catch {
    return false;
  }
}

export function AuthWrapper({ children, initialView = 'login', signupIntent = 'trial', signupTier }: AuthWrapperProps) {
  const { user, loading, hasActiveSubscription } = useAuth();
  const [authView, setAuthView] = useState<AuthView>(initialView);
  const [onboardingDone, setOnboardingDone] = useState(() =>
    user ? isOnboardingDone(user.id) : false
  );

  // DEV MODE BYPASS: Automatically grant access during development
  // Remove this block before production launch!
  const BYPASS_AUTH = import.meta.env.DEV; // true in development, false in production
  if (BYPASS_AUTH) {
    console.log('🚀 DEV MODE: Bypassing authentication');
    return <>{children}</>;
  }

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '4px solid rgba(255, 255, 255, 0.3)',
              borderTopColor: 'white',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ fontSize: '16px', fontWeight: '600' }}>Loading...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Not authenticated - show auth screens
  if (!user) {
    if (authView === 'signup') {
      return <Signup onSwitchToLogin={() => setAuthView('login')} intent={signupIntent} />;
    }

    if (authView === 'forgot-password') {
      return <ForgotPassword onBackToLogin={() => setAuthView('login')} />;
    }

    return (
      <Login
        onSwitchToSignup={() => setAuthView('signup')}
        onForgotPassword={() => setAuthView('forgot-password')}
      />
    );
  }

  // Authenticated but no active subscription - show paywall
  if (!hasActiveSubscription) {
    return <Paywall />;
  }

  // Authenticated with active subscription - check onboarding
  if (!onboardingDone && !isOnboardingDone(user.id)) {
    return (
      <Welcome
        intent={signupIntent}
        selectedTier={signupTier}
        onComplete={() => setOnboardingDone(true)}
      />
    );
  }

  // Authenticated with active subscription - show the app!
  return <>{children}</>;
}
