import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Check if required environment variables are available
const hasSupabaseCredentials = () => {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_KEY;
  
  if (!hasUrl || !hasAnonKey) {
    console.warn('⚠️ Missing Supabase credentials for client:', {
      url: hasUrl ? 'present' : 'missing',
      anonKey: hasAnonKey ? 'present' : 'missing'
    });
  }
  
  if (!hasServiceKey) {
    console.warn('⚠️ Missing Supabase service key for admin operations');
  }
  
  return { hasUrl, hasAnonKey, hasServiceKey };
};

// Create a mock client for when credentials are missing
const createMockClient = () => {
  return {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      getUser: async () => ({ data: { user: null } })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          limit: async () => ({ data: [], error: null })
        }),
        order: () => ({
          limit: async () => ({ data: [], error: null })
        })
      }),
      insert: async () => ({ data: null, error: new Error('Mock client - environment variables missing') }),
      update: async () => ({ data: null, error: new Error('Mock client - environment variables missing') }),
      delete: async () => ({ error: new Error('Mock client - environment variables missing') }),
    })
  };
};

// Create a server-side Supabase client with proper cookie handling
export function createServerSupabaseClient() {
  const { hasUrl, hasAnonKey } = hasSupabaseCredentials();
  
  if (!hasUrl || !hasAnonKey) {
    console.warn('⚠️ Using mock Supabase client due to missing credentials');
    return createMockClient();
  }
  
  // @ts-ignore - Using @ts-ignore to bypass type issues with cookies
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      auth: {
        persistSession: true,
      },
      // Provide a safe cookie handler that won't cause build failures
      cookies: {
        get(name: string) {
          try {
            // In a server component/route handler, cookies() should work
            if (typeof cookies === 'function') {
              const cookie = cookies().get?.(name);
              return cookie?.value;
            }
            return undefined;
          } catch (e) {
            console.error('Error accessing cookies:', e);
            return undefined;
          }
        }
      }
    }
  );
}

// Create an admin client for operations that need to bypass RLS
export function createAdminClient() {
  const { hasUrl, hasServiceKey } = hasSupabaseCredentials();
  
  if (!hasUrl || !hasServiceKey) {
    console.warn('⚠️ Using mock admin client due to missing credentials');
    return createMockClient();
  }
  
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