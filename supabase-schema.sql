-- AppTuner Database Schema for Supabase
-- This file contains the complete database schema for user management and subscriptions

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Trial tracking
  trial_start_date TIMESTAMP WITH TIME ZONE,
  trial_end_date TIMESTAMP WITH TIME ZONE,

  -- Subscription status
  subscription_status TEXT CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')) DEFAULT 'trial',
  subscription_tier TEXT CHECK (subscription_tier IN ('monthly', 'yearly', 'lifetime')),

  -- Stripe integration
  stripe_customer_id TEXT UNIQUE,

  -- Metadata
  last_login_at TIMESTAMP WITH TIME ZONE,
  onboarding_completed BOOLEAN DEFAULT FALSE
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Subscription details
  tier TEXT NOT NULL CHECK (tier IN ('monthly', 'yearly', 'lifetime')),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')) DEFAULT 'active',

  -- Stripe data
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,

  -- Billing period
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Cancellation
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Ensure one active subscription per user
  CONSTRAINT one_active_subscription_per_user
    EXCLUDE USING gist (user_id WITH =)
    WHERE (status = 'active')
);

-- Payment history table (optional, for record keeping)
CREATE TABLE public.payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,

  -- Payment details
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending', 'refunded')),

  -- Stripe data
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_invoice_id TEXT,

  -- Metadata
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_stripe_customer_id ON public.users(stripe_customer_id);
CREATE INDEX idx_users_subscription_status ON public.users(subscription_status);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_payment_history_user_id ON public.payment_history(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can read their own data
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data (except sensitive fields)
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Subscriptions table policies
-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Payment history policies
-- Users can view their own payment history
CREATE POLICY "Users can view own payment history"
  ON public.payment_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for backend operations)
-- These policies allow the backend to manage all data
CREATE POLICY "Service role can manage all users"
  ON public.users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all payments"
  ON public.payment_history
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, trial_start_date, trial_end_date, subscription_status)
  VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW() + INTERVAL '14 days',
    'trial'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to check if trial has expired
CREATE OR REPLACE FUNCTION public.is_trial_expired(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  trial_end TIMESTAMP WITH TIME ZONE;
  sub_status TEXT;
BEGIN
  SELECT trial_end_date, subscription_status
  INTO trial_end, sub_status
  FROM public.users
  WHERE id = user_id;

  -- If no trial end date, consider it expired
  IF trial_end IS NULL THEN
    RETURN TRUE;
  END IF;

  -- If subscription is active, trial is not relevant
  IF sub_status = 'active' THEN
    RETURN FALSE;
  END IF;

  -- Check if trial end date has passed
  RETURN NOW() > trial_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's active subscription
CREATE OR REPLACE FUNCTION public.get_active_subscription(user_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  tier TEXT,
  current_period_end TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT id, subscriptions.tier, subscriptions.current_period_end
  FROM public.subscriptions
  WHERE subscriptions.user_id = $1
    AND status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Builds table (IPA re-signing jobs)
CREATE TABLE public.builds (
  id TEXT PRIMARY KEY, -- hex build ID from relay server
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  bundle_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('signing', 'done', 'error')) DEFAULT 'signing',
  error_message TEXT,
  filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_builds_user_id ON public.builds(user_id);
CREATE INDEX idx_builds_status ON public.builds(status);

ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own builds"
  ON public.builds FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all builds"
  ON public.builds FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Comments for documentation
COMMENT ON TABLE public.users IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE public.subscriptions IS 'User subscription records linked to Stripe';
COMMENT ON TABLE public.payment_history IS 'Historical record of all payments';
COMMENT ON COLUMN public.users.trial_start_date IS 'When the user started their 14-day free trial';
COMMENT ON COLUMN public.users.trial_end_date IS 'When the user''s 14-day free trial ends';
COMMENT ON COLUMN public.users.subscription_status IS 'Current subscription state: trial, active, expired, or cancelled';
COMMENT ON COLUMN public.users.subscription_tier IS 'Subscription plan: monthly, yearly, or lifetime';
COMMENT ON COLUMN public.users.stripe_customer_id IS 'Stripe customer ID for payment processing';
