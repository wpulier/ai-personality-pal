import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Create a server-side Supabase client with proper cookie handling
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      auth: {
        persistSession: true,
      },
      // @ts-ignore - Supabase JS v2 has cookies support
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value;
        }
      }
    }
  );
}

// Create an admin client for operations that need to bypass RLS
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
} 