import { createClient } from '@supabase/supabase-js';

// Environment variables - will be set in .env file
// For now, these will be undefined until you configure your Supabase project
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '');
};

// Create Supabase client with placeholder if not configured
// This prevents errors when env vars are missing in development
const createSupabaseClient = () => {
  if (isSupabaseConfigured()) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  } else {
    // Return a dummy client with placeholder credentials to prevent errors
    console.warn('⚠️  Supabase not configured - using placeholder client');
    return createClient('https://placeholder.supabase.co', 'placeholder-anon-key', {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
};

export const supabase = createSupabaseClient();

// Database types (will be generated from your Supabase schema)
export interface User {
  id: string;
  email: string;
  created_at: string;
  trial_start_date?: string;
  trial_end_date?: string;
  subscription_status?: 'trial' | 'active' | 'expired' | 'cancelled';
  subscription_tier?: 'monthly' | 'yearly' | 'lifetime';
  stripe_customer_id?: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier: 'monthly' | 'yearly' | 'lifetime';
  status: 'active' | 'cancelled' | 'expired';
  stripe_subscription_id?: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
}

