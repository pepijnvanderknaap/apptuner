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
  const [showLanding, setShowLanding] = useState(true);

  // Landing page is always shown first
  if (showLanding) {
    return <LandingPage onEnterApp={() => setShowLanding(false)} />;
  }

  // After clicking "Enter App", show auth wrapper
  // AuthWrapper will handle Login/Signup/Paywall and only show BrowserApp when authenticated
  return (
    <AuthWrapper>
      <BrowserApp />
    </AuthWrapper>
  );
}
