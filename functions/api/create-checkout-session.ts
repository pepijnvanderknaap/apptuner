/**
 * Cloudflare Pages Function: POST /api/create-checkout-session
 *
 * Creates a Stripe Checkout session and returns the session ID.
 * The frontend then redirects to Stripe's hosted checkout page.
 *
 * Environment variables required (set in Cloudflare Pages dashboard):
 *   STRIPE_SECRET_KEY - Stripe secret key (sk_live_... or sk_test_...)
 */

interface Env {
  STRIPE_SECRET_KEY: string;
}

interface RequestBody {
  priceId: string;
  userId: string;
  tier: 'monthly' | 'yearly' | 'lifetime';
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // CORS headers - allow the dashboard origin
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await request.json();
    const { priceId, userId, tier } = body;

    if (!priceId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing priceId or userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!env.STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine success/cancel URLs based on the request origin
    const origin = request.headers.get('Origin') || 'https://apptuner-dashboard.pages.dev';
    const successUrl = `${origin}/?session_id={CHECKOUT_SESSION_ID}&payment=success`;
    const cancelUrl = `${origin}/?payment=cancelled`;

    // Create Stripe Checkout session via Stripe API
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        // Subscriptions for recurring plans, one-time payment for lifetime
        'mode': tier === 'lifetime' ? 'payment' : 'subscription',
        'success_url': successUrl,
        'cancel_url': cancelUrl,
        'client_reference_id': userId,
        'metadata[userId]': userId,
        'metadata[priceId]': priceId,
        'metadata[tier]': tier,
        // Allow promotion codes
        'allow_promotion_codes': 'true',
      }),
    });

    const session = await stripeResponse.json() as any;

    if (!stripeResponse.ok) {
      console.error('Stripe error:', session);
      return new Response(JSON.stringify({ error: session.error?.message || 'Stripe error' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};
