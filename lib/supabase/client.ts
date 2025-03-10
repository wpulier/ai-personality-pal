import { createClient } from '@supabase/supabase-js';
import { AuthError } from '@supabase/supabase-js';

// Note: These environment variables are exposed to the browser
// They are safe to expose as they only allow public operations
// with row-level security controlling access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables are missing:', {
    url: supabaseUrl ? 'set' : 'missing',
    anonKey: supabaseAnonKey ? 'set' : 'missing'
  });
}

// Create a single Supabase client for the browser
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

/**
 * Helper function to check if user is authenticated
 * @returns The current session and user, or null if not authenticated
 */
export async function getAuthSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    session,
    user: session?.user || null
  };
}

/**
 * Helper function to sign in with email/password
 * @param email User's email
 * @param password User's password
 * @returns The session data or error
 */
export async function signInWithEmail(email: string, password: string) {
  return await supabase.auth.signInWithPassword({ email, password });
}

/**
 * Helper function to sign up with email/password
 * @param email User's email
 * @param password User's password
 * @param metadata Optional metadata to store with the user
 * @returns The session data or error
 */
export async function signUpWithEmail(email: string, password: string, metadata?: any) {
  return await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata }
  });
}

/**
 * Helper function to sign out
 * @returns Promise<void>
 */
export async function signOut() {
  return await supabase.auth.signOut();
}

/**
 * Helper function to set up an auth state change listener
 * @param callback Function to call when auth state changes
 * @returns Subscription object with unsubscribe method
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

export default supabase; 