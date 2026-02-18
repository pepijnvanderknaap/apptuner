/**
 * Cloudflare Pages Function: POST /api/stripe-webhook
 *
 * Handles Stripe webhook events to keep the database in sync with payment state.
 * Stripe calls this endpoint when payments succeed, subscriptions change, etc.
 *
 * Environment variables required (set in Cloudflare Pages dashboard):
 *   STRIPE_SECRET_KEY       - Stripe secret key
 *   STRIPE_WEBHOOK_SECRET   - Webhook signing secret from Stripe dashboard
 *   SUPABASE_URL            - Supabase project URL (same as VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (NOT the anon key)
 */

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

// Verify Stripe webhook signature using Web Crypto API (Cloudflare Workers compatible)
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = signature.split(',');
    const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
    const sig = parts.find(p => p.startsWith('v1='))?.split('=')[1];

    if (!timestamp || !sig) return false;

    // Check timestamp is within 5 minutes (replay attack protection)
    const tolerance = 300;
    if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > tolerance) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const computedSig = Array.from(new Uint8Array(sigBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return computedSig === sig;
  } catch {
    return false;
  }
}

// Update user subscription status in Supabase
async function updateUserSubscription(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  updates: {
    subscription_status?: string;
    subscription_tier?: string;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
  }
) {
  const response = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      ...updates,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase update failed: ${text}`);
  }
}

// Record payment in payment_history table
async function recordPayment(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  payment: {
    stripe_payment_intent_id: string;
    amount: number;
    currency: string;
    status: string;
    tier: string;
  }
) {
  await fetch(`${supabaseUrl}/rest/v1/payment_history`, {
    method: 'POST',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      user_id: userId,
      ...payment,
      created_at: new Date().toISOString(),
    }),
  });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') || '';

  // Verify the webhook came from Stripe
  if (env.STRIPE_WEBHOOK_SECRET) {
    const isValid = await verifyStripeSignature(payload, signature, env.STRIPE_WEBHOOK_SECRET);
    if (!isValid) {
      return new Response('Invalid signature', { status: 400 });
    }
  } else {
    console.warn('STRIPE_WEBHOOK_SECRET not set - skipping signature verification');
  }

  let event: any;
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  console.log(`Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      // One-time payment completed (lifetime plan)
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId || session.client_reference_id;
        const priceId = session.metadata?.priceId;

        if (!userId) {
          console.error('No userId in checkout session metadata');
          break;
        }

        // Determine tier from session metadata or mode
        const tier = session.mode === 'payment' ? 'lifetime' :
                     session.metadata?.tier || 'monthly';

        await updateUserSubscription(
          env.SUPABASE_URL,
          env.SUPABASE_SERVICE_ROLE_KEY,
          userId,
          {
            subscription_status: 'active',
            subscription_tier: tier,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
          }
        );

        // Record in payment history
        if (session.payment_intent) {
          await recordPayment(
            env.SUPABASE_URL,
            env.SUPABASE_SERVICE_ROLE_KEY,
            userId,
            {
              stripe_payment_intent_id: session.payment_intent,
              amount: session.amount_total || 0,
              currency: session.currency || 'usd',
              status: 'succeeded',
              tier,
            }
          );
        }

        console.log(`✅ Payment successful for user ${userId}, tier: ${tier}`);
        break;
      }

      // Subscription renewed (monthly/yearly)
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        if (!customerId) break;

        // Find user by stripe_customer_id
        const userResponse = await fetch(
          `${env.SUPABASE_URL}/rest/v1/users?stripe_customer_id=eq.${customerId}&select=id`,
          {
            headers: {
              'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
          }
        );
        const users = await userResponse.json() as any[];

        if (users.length === 0) {
          console.error(`No user found for Stripe customer ${customerId}`);
          break;
        }

        await updateUserSubscription(
          env.SUPABASE_URL,
          env.SUPABASE_SERVICE_ROLE_KEY,
          users[0].id,
          { subscription_status: 'active' }
        );

        console.log(`✅ Subscription renewed for customer ${customerId}`);
        break;
      }

      // Subscription cancelled or payment failed
      case 'customer.subscription.deleted':
      case 'invoice.payment_failed': {
        const obj = event.data.object;
        const customerId = obj.customer;

        if (!customerId) break;

        const userResponse = await fetch(
          `${env.SUPABASE_URL}/rest/v1/users?stripe_customer_id=eq.${customerId}&select=id`,
          {
            headers: {
              'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
          }
        );
        const users = await userResponse.json() as any[];

        if (users.length > 0) {
          await updateUserSubscription(
            env.SUPABASE_URL,
            env.SUPABASE_SERVICE_ROLE_KEY,
            users[0].id,
            { subscription_status: 'cancelled' }
          );
          console.log(`⚠️  Subscription cancelled for customer ${customerId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error: any) {
    console.error('Webhook handler error:', error.message);
    // Still return 200 so Stripe doesn't keep retrying for processing errors
    return new Response(JSON.stringify({ received: true, error: error.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
