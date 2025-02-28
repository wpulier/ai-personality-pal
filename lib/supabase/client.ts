import { createClient } from '@supabase/supabase-js';
import { AuthError } from '@supabase/supabase-js';

// Note: These environment variables are exposed to the browser
// They are safe to expose as they only allow public operations
// with row-level security controlling access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables are missing:', {
    url: supabaseUrl ? 'set' : 'missing',
    anonKey: supabaseAnonKey ? 'set' : 'missing'
  });
}

// Create a single supabase client for browser usage
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storageKey: 'supabase-auth',
    detectSessionInUrl: true,
    flowType: 'pkce',
  }
});

/**
 * Safely resets the auth state when experiencing token-related errors
 * Can be called from anywhere in the app when an auth error is detected
 */
export async function resetAuthState() {
  console.log('Resetting auth state due to token issues');
  try {
    // Clear all auth state from local storage
    await supabase.auth.signOut({ scope: 'local' });
    
    // Clear any cookies (if using cookie-based auth)
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      if (name.includes('supabase') || name.includes('auth')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });
    
    console.log('Auth state reset successfully');
    return true;
  } catch (error) {
    console.error('Failed to reset auth state:', error);
    return false;
  }
}

/**
 * Handles auth errors, especially refresh token errors
 * @param error The error to handle
 * @returns true if the error was handled, false otherwise
 */
export async function handleAuthError(error: unknown): Promise<boolean> {
  if (error instanceof AuthError) {
    // Check for refresh token errors
    if (
      error.message.includes('Refresh Token Not Found') ||
      error.message.includes('Invalid Refresh Token') ||
      error.message.includes('JWT expired')
    ) {
      console.warn('Auth token error detected, resetting auth state');
      return await resetAuthState();
    }
  }
  return false;
} 