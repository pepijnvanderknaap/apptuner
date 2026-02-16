import { loadStripe, Stripe } from '@stripe/stripe-js';

// Get Stripe publishable key from environment
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

// Price IDs from Stripe
export const STRIPE_PRICE_IDS = {
  monthly: import.meta.env.VITE_STRIPE_PRICE_MONTHLY || '',
  yearly: import.meta.env.VITE_STRIPE_PRICE_YEARLY || '',
  lifetime: import.meta.env.VITE_STRIPE_PRICE_LIFETIME || '',
} as const;

// Initialize Stripe
let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    if (!stripePublishableKey) {
      console.warn('⚠️  Stripe not configured - missing publishable key');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

// Check if Stripe is configured
export const isStripeConfigured = () => {
  return !!(
    stripePublishableKey &&
    STRIPE_PRICE_IDS.monthly &&
    STRIPE_PRICE_IDS.yearly &&
    STRIPE_PRICE_IDS.lifetime
  );
};

// Redirect to Stripe Checkout
export const redirectToCheckout = async (priceId: string, userEmail?: string) => {
  try {
    const stripe = await getStripe();

    if (!stripe) {
      console.error('Stripe not initialized');
      return { error: 'Stripe not configured' };
    }

    if (!priceId) {
      console.error('No price ID provided');
      return { error: 'Invalid price selected' };
    }

    // Redirect to Stripe Checkout using legacy method (requires type assertion)
    // @ts-ignore - redirectToCheckout exists but may not be in current type definitions
    const result = await stripe.redirectToCheckout({
      lineItems: [{ price: priceId, quantity: 1 }],
      mode: priceId === STRIPE_PRICE_IDS.lifetime ? 'payment' : 'subscription',
      successUrl: `${window.location.origin}/?checkout=success`,
      cancelUrl: `${window.location.origin}/?checkout=cancelled`,
      customerEmail: userEmail,
    });

    if (result && result.error) {
      console.error('Stripe checkout error:', result.error);
      return { error: result.error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error redirecting to checkout:', err);
    return { error: 'Failed to initialize checkout' };
  }
};
