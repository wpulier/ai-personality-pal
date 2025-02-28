'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from './client';
import { useRouter } from 'next/navigation';

// Define the context type
type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
};

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component that wraps your app and makes auth object available to any child component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();

  // Function to handle refresh token errors
  const refreshSession = async (): Promise<boolean> => {
    try {
      setAuthError(null);
      console.log('Attempting to refresh session...');
      
      // Try to refresh the session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error refreshing session:', error.message);
        
        // Check specifically for refresh token errors
        if (error.message.includes('Refresh Token Not Found') || 
            error.message.includes('Invalid Refresh Token')) {
          console.log('Invalid refresh token detected, clearing session');
          
          // Clear any invalid session state
          setSession(null);
          setUser(null);
          
          // Force clear browser storage
          try {
            await supabase.auth.signOut({ scope: 'local' });
            console.log('Successfully cleared invalid session data');
          } catch (clearError) {
            console.error('Error clearing session:', clearError);
          }
          
          setAuthError('Your session has expired. Please sign in again.');
          return false;
        }
        
        setAuthError(`Session refresh failed: ${error.message}`);
        return false;
      }
      
      if (data.session) {
        console.log('Session refreshed successfully');
        setSession(data.session);
        setUser(data.session.user);
        return true;
      } else {
        console.log('No session after refresh attempt');
        setSession(null);
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('Exception during session refresh:', error);
      
      // Clear session on any unexpected errors
      setSession(null);
      setUser(null);
      
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (clearError) {
        console.error('Error clearing session after exception:', clearError);
      }
      
      setAuthError('An unexpected error occurred during session refresh. Please sign in again.');
      return false;
    }
  };

  useEffect(() => {
    // Get session from local storage
    const initializeAuth = async () => {
      setIsLoading(true);
      setAuthError(null);
      
      try {
        // Check for active session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          
          // Check for refresh token errors specifically
          if (error.message.includes('Refresh Token Not Found') || 
              error.message.includes('Invalid Refresh Token')) {
            console.log('Invalid token detected during initialization');
            setAuthError('Your session has expired. Please sign in again.');
            
            // Force clear any invalid session data
            try {
              await supabase.auth.signOut({ scope: 'local' });
              console.log('Successfully cleared invalid session data during initialization');
            } catch (clearError) {
              console.error('Error clearing session during initialization:', clearError);
            }
          } else {
            setAuthError(`Session error: ${error.message}`);
            
            // Try to recover from the error
            const refreshSuccessful = await refreshSession();
            if (!refreshSuccessful) {
              // If refresh fails, clear any invalid session data
              console.log('Clearing invalid session data');
              await supabase.auth.signOut();
            }
          }
        } else if (session) {
          setSession(session);
          setUser(session.user);
        }
      } catch (error) {
        console.error('Exception during auth initialization:', error);
        setAuthError('Failed to initialize authentication');
        
        // Clear any potentially corrupted session state
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch (clearError) {
          console.error('Error clearing session after initialization exception:', clearError);
        }
      } finally {
        setIsLoading(false);
      }
      
      // Listen for auth changes
      const { data: { subscription } } = await supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          console.log('Auth state change:', event);
          
          if (event === 'TOKEN_REFRESHED') {
            console.log('Token was refreshed successfully');
          } else if (event === 'SIGNED_OUT') {
            // Clear state on sign out
            setSession(null);
            setUser(null);
            // Redirect to home on sign out
            router.push('/');
          } else if (newSession) {
            setSession(newSession);
            setUser(newSession.user);
          } else {
            setSession(null);
            setUser(null);
          }
          
          setIsLoading(false);
        }
      );
      
      // Cleanup subscription on unmount
      return () => {
        subscription.unsubscribe();
      };
    };
    
    initializeAuth();
  }, [router]);

  // Sign in function
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('Sign in error:', error.message);
        setAuthError(`Sign in failed: ${error.message}`);
        throw error;
      }
      
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      } else {
        console.error('Unexpected sign in error:', error);
        throw new Error('An unexpected error occurred during sign in');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      
      if (error) {
        console.error('Sign up error:', error.message);
        setAuthError(`Sign up failed: ${error.message}`);
        throw error;
      }
      
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      } else {
        console.error('Unexpected sign up error:', error);
        throw new Error('An unexpected error occurred during sign up');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      // Clear state immediately - this ensures the UI updates
      setSession(null);
      setUser(null);

      // Sign out with local scope only (doesn't require active session)
      // This avoids any session verification and just clears local storage/cookies
      const { error } = await supabase.auth.signOut({ 
        scope: 'local' 
      });
      
      if (error) {
        console.error('Sign out local storage cleanup error:', error.message);
        // Just log, don't throw or set error state since we've already cleared UI state
      }
    } catch (error) {
      // Just log any errors - the important part is we've already cleared the UI state
      console.error('Exception during sign out:', error);
    } finally {
      // Confirm state is cleared and loading is finished
      setSession(null);
      setUser(null);
      setIsLoading(false);
    }
  };

  // Create the value object that will be provided by the context
  const value = {
    user,
    session,
    isLoading,
    authError,
    signIn,
    signUp,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
} 