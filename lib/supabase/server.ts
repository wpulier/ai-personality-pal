import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Helper function to create a Supabase client for server-side API routes
// that properly passes along authentication cookies
export function createServerSupabaseClient() {
  const cookieStore = cookies();
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // @ts-ignore - Supabase JS v2 has cookies support for server-side
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        }
      }
    }
  );
}

// Create a Supabase client with admin privileges for data access
// that bypasses RLS policies
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
} 