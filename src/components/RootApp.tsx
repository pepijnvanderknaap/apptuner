import React, { useState } from 'react';
import { LandingPage } from './LandingPage';
import { AuthWrapper } from './AuthWrapper';
import BrowserApp from '../BrowserApp';

/**
 * RootApp - Handles the flow between Landing Page and Authenticated App
 *
 * Flow:
 * 1. Show LandingPage initially (public, no auth required)
 * 2. When user clicks "Enter App" or "Start Free Trial":
 *    - Show AuthWrapper which handles Login/Signup/Paywall
 * 3. After successful auth with active subscription:
 *    - Show BrowserApp (the actual hot reload tool)
 */
export function RootApp() {
  // Check if URL has session parameter (from CLI) - if so, skip landing page
  const urlParams = new URLSearchParams(window.location.search);
  const hasSession = urlParams.has('session');

  const [showLanding, setShowLanding] = useState(!hasSession);
  const [initialAuthView, setInitialAuthView] = useState<'login' | 'signup'>('login');
  const [signupIntent, setSignupIntent] = useState<'trial' | 'paid'>('trial');
  const [signupTier, setSignupTier] = useState<'monthly' | 'yearly' | 'lifetime' | undefined>(undefined);

  // If URL has session, go directly to BrowserApp (dashboard mode)
  if (hasSession) {
    return <BrowserApp />;
  }

  // Landing page is shown for normal web visitors
  if (showLanding) {
    return (
      <LandingPage
        onEnterApp={(view?: 'login' | 'signup', intent?: 'trial' | 'paid', tier?: 'monthly' | 'yearly' | 'lifetime') => {
          setInitialAuthView(view || 'login');
          setSignupIntent(intent || 'trial');
          setSignupTier(tier);
          setShowLanding(false);
        }}
      />
    );
  }

  // After clicking "Enter App", show auth wrapper
  // AuthWrapper will handle Login/Signup/Paywall and only show BrowserApp when authenticated
  return (
    <AuthWrapper initialView={initialAuthView} signupIntent={signupIntent} signupTier={signupTier}>
      <BrowserApp />
    </AuthWrapper>
  );
}
