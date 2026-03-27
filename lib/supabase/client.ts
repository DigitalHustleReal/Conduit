import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;
let _initialized = false;

/**
 * Lazy-initialized Supabase client.
 * Returns null when env vars are missing so the app degrades gracefully
 * to localStorage-only mode. Lazy init prevents SSG build errors.
 */
export function getSupabase(): SupabaseClient | null {
  if (_initialized) return _supabase;
  _initialized = true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (url && key && !url.includes('%%') && url.startsWith('http')) {
    try {
      _supabase = createClient(url, key);
    } catch {
      _supabase = null;
    }
  }
  return _supabase;
}

/** Convenience getter — same as getSupabase() */
export const supabase: SupabaseClient | null = typeof window !== 'undefined' ? getSupabase() : null;

/** Whether Supabase is properly configured (only check client-side) */
export const isSupabaseConfigured = typeof window !== 'undefined' ? !!getSupabase() : false;
