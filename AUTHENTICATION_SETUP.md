# AppTuner Authentication Setup Guide

This guide will walk you through setting up authentication and payments for AppTuner using Supabase and Stripe.

## Overview

The authentication system provides:
- ✅ User signup with email/password
- ✅ User login and session management
- ✅ 14-day free trial for all new users
- ✅ Password reset functionality
- ✅ Subscription management (Monthly/Yearly/Lifetime)
- ✅ Stripe payment integration
- ✅ Protected routes (app only accessible with active subscription)

## Architecture

```
┌─────────────────┐
│  Landing Page   │ (Public)
└────────┬────────┘
         │ Click "Enter App"
         ▼
┌─────────────────┐
│  Login/Signup   │ (Public)
└────────┬────────┘
         │ Sign up → 14-day trial starts
         ▼
┌─────────────────┐
│   Main App      │ (Protected - requires auth)
└────────┬────────┘
         │ Trial expires
         ▼
┌─────────────────┐
│    Paywall      │ (Protected - choose plan)
└────────┬────────┘
         │ Subscribe
         ▼
┌─────────────────┐
│   Main App      │ (Full access)
└─────────────────┘
```

## Step 1: Set Up Supabase

### 1.1 Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign up with your business email: `info@pepijnvanderknaap.com`
3. Click "New Project"
4. Name it: `apptuner`
5. Set a strong database password (save it securely!)
6. Choose region closest to your users
7. Click "Create new project"

### 1.2 Run Database Schema

1. In your Supabase project, go to "SQL Editor"
2. Click "New query"
3. Copy the entire contents of `supabase-schema.sql` from this repo
4. Paste it into the SQL editor
5. Click "Run" to execute the schema
6. You should see success messages for all tables and functions

### 1.3 Get Your Supabase Keys

1. In Supabase, go to "Project Settings" → "API"
2. Copy these values:
   - **Project URL**: Looks like `https://xxxxxxxxxxxxx.supabase.co`
   - **Anon/Public Key**: Starts with `eyJ...` (this is safe to expose)
3. Add them to your `.env` file (see Step 4)

### 1.4 Configure Email Templates (Optional)

1. Go to "Authentication" → "Email Templates"
2. Customize the confirmation and password reset emails
3. Add your branding and links

## Step 2: Set Up Stripe

### 2.1 Create Stripe Account

1. Go to [https://stripe.com](https://stripe.com)
2. Sign up (use the same business email)
3. Complete verification (you'll need business details)
4. Enable "Test mode" (toggle in top right)

### 2.2 Create Products and Prices

Create three products in Stripe:

#### Product 1: Monthly Subscription

1. Go to "Products" → "Add product"
2. Name: `AppTuner Monthly`
3. Description: `Monthly subscription to AppTuner`
4. Pricing:
   - Type: Recurring
   - Amount: $29
   - Billing period: Monthly
5. Click "Save product"
6. Copy the **Price ID** (starts with `price_`)

#### Product 2: Yearly Subscription

1. Create another product
2. Name: `AppTuner Yearly`
3. Description: `Yearly subscription to AppTuner`
4. Pricing:
   - Type: Recurring
   - Amount: $99
   - Billing period: Yearly
5. Copy the **Price ID**

#### Product 3: Lifetime Access

1. Create another product
2. Name: `AppTuner Lifetime`
3. Description: `Lifetime access to AppTuner`
4. Pricing:
   - Type: One-time
   - Amount: $199
5. Copy the **Price ID**

### 2.3 Get Your Stripe Keys

1. Go to "Developers" → "API keys"
2. Copy these values:
   - **Publishable key** (starts with `pk_test_` in test mode)
   - **Secret key** (starts with `sk_test_` - keep this secret!)
3. Add them to your `.env` file

### 2.4 Set Up Webhooks (Important!)

Stripe webhooks notify your backend when payments succeed/fail.

1. Go to "Developers" → "Webhooks"
2. Click "Add endpoint"
3. Endpoint URL: `https://your-domain.com/api/stripe-webhook`
4. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the **Webhook signing secret** (starts with `whsec_`)

## Step 3: Create Backend API for Stripe Checkout

You need a backend API to create Stripe Checkout sessions. Here's a simple example using Node.js/Express:

### 3.1 Install Stripe SDK (Backend)

```bash
npm install stripe
```

### 3.2 Create API Endpoint

Create a file `api/create-checkout-session.js`:

```javascript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { priceId, userId } = req.body;

  try {
    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: priceId.includes('lifetime') ? 'payment' : 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/paywall`,
      client_reference_id: userId,
      metadata: {
        userId: userId,
      },
    });

    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: error.message });
  }
}
```

### 3.3 Handle Webhook Events

Create a file `api/stripe-webhook.js`:

```javascript
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await handleCheckoutComplete(session);
      break;

    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      await handleSubscriptionCancelled(subscription);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
}

async function handleCheckoutComplete(session) {
  const userId = session.client_reference_id;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  // Update user with Stripe customer ID
  await supabase
    .from('users')
    .update({
      stripe_customer_id: customerId,
      subscription_status: 'active',
    })
    .eq('id', userId);

  // Create subscription record if applicable
  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    await supabase.from('subscriptions').insert({
      user_id: userId,
      stripe_subscription_id: subscriptionId,
      tier: getPlanTier(subscription.items.data[0].price.id),
      status: 'active',
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
    });
  }
}

async function handleSubscriptionCancelled(subscription) {
  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('stripe_subscription_id', subscription.id);

  // Also update user status
  await supabase
    .from('users')
    .update({ subscription_status: 'cancelled' })
    .eq('stripe_customer_id', subscription.customer);
}

function getPlanTier(priceId) {
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return 'monthly';
  if (priceId === process.env.STRIPE_PRICE_YEARLY) return 'yearly';
  if (priceId === process.env.STRIPE_PRICE_LIFETIME) return 'lifetime';
  return 'monthly';
}
```

## Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in all the values you collected:
   ```env
   # Supabase
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...

   # Stripe
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
   VITE_STRIPE_PRICE_MONTHLY=price_xxxxx
   VITE_STRIPE_PRICE_YEARLY=price_xxxxx
   VITE_STRIPE_PRICE_LIFETIME=price_xxxxx
   ```

3. **NEVER** commit the `.env` file to git!

## Step 5: Test the Flow

### 5.1 Local Development

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open `http://localhost:1420` in your browser

3. You should see the landing page

### 5.2 Test Signup Flow

1. Click "Start Free Trial" or "Enter App"
2. You should see the signup form
3. Create a test account with any email
4. Check your email for the confirmation link (Supabase sends this)
5. Click the confirmation link
6. You should be redirected to the app

### 5.3 Test Trial Period

1. In Supabase, go to "Table Editor" → "users"
2. Find your test user
3. Check the `trial_end_date` - it should be 14 days from `trial_start_date`
4. The app should show "X days remaining in trial"

### 5.4 Test Payment Flow

1. To test immediately, manually set `trial_end_date` to yesterday in Supabase
2. Refresh the app
3. You should see the paywall
4. Click any "Choose" button
5. You'll be redirected to Stripe Checkout
6. Use Stripe test card: `4242 4242 4242 4242`
7. Any future date, any CVC
8. Complete checkout
9. You should be redirected back to the app with full access

## Step 6: Deploy to Production

### 6.1 Coolify Deployment

1. Push your code to GitHub
2. In Coolify, create a new service
3. Connect your GitHub repo
4. Set environment variables (same as `.env` but with production values)
5. Deploy!

### 6.2 Switch to Production Stripe

1. In Stripe dashboard, toggle "Live mode"
2. Create new products (same as test mode)
3. Get new API keys (will start with `pk_live_` and `sk_live_`)
4. Update environment variables in Coolify
5. Redeploy

### 6.3 Configure Domain

1. Point your domain to Coolify server
2. Update Stripe webhook URL to your production domain
3. Update Supabase redirect URLs

## Troubleshooting

### "Supabase not configured" Error

- Check that `.env` file exists and has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart the dev server after adding env variables

### Email Confirmation Not Received

- Check Supabase → Authentication → Email Templates
- Check your spam folder
- For testing, you can manually confirm users in Supabase dashboard

### Stripe Checkout Not Working

- Verify price IDs in `.env` match those in Stripe dashboard
- Check that API endpoint is running and accessible
- Look for errors in browser console and server logs

### Trial Not Expiring

- Check `trial_end_date` in Supabase users table
- The app checks trial status on every page load
- Make sure system clocks are correct

### Payments Not Updating Database

- Verify webhook endpoint is accessible from internet
- Check webhook events are being sent in Stripe dashboard
- Look for errors in webhook endpoint logs
- Verify `STRIPE_WEBHOOK_SECRET` is correct

## Security Checklist

- ✅ Never commit `.env` file
- ✅ Use Stripe test mode during development
- ✅ Use HTTPS in production
- ✅ Validate webhook signatures
- ✅ Use Supabase Row Level Security (RLS) policies
- ✅ Keep secret keys secure
- ✅ Regularly rotate API keys
- ✅ Monitor for suspicious activity

## Support

If you encounter issues:

1. Check browser console for errors
2. Check Supabase logs: Project → Logs
3. Check Stripe dashboard for failed events
4. Review this guide again
5. Contact support: support@apptuner.dev

## Next Steps

Once authentication is working:

1. ✅ Test all user flows thoroughly
2. ✅ Set up monitoring and alerts
3. ✅ Create customer support documentation
4. ✅ Plan marketing campaigns
5. ✅ Launch! 🚀
