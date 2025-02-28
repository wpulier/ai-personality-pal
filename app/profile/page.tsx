'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase } from '@/lib/supabase/client';
import { handleAuthError, resetAuthState } from '@/lib/supabase/client';
import { deleteTwin } from '@/lib/services/twin-service'; 

interface Twin {
  id: number;
  name: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { user, isLoading, signOut, refreshSession } = useAuth();
  const [twins, setTwins] = useState<Twin[]>([]);
  const [isLoadingTwins, setIsLoadingTwins] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // State for deletion confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [twinToDelete, setTwinToDelete] = useState<Twin | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Function to fetch twins data - wrapped in useCallback to prevent infinite loops
  const fetchTwins = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingTwins(true);
    setError(null); // Clear any previous errors
    
    try {
      if (!user.id) {
        console.error('User ID is missing');
        setError('User ID is missing. Please try logging in again.');
        setIsLoadingTwins(false);
        return;
      }
      
      // Check if Supabase is properly configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('Supabase configuration is missing');
        setError('Database configuration is missing. Please contact support.');
        setIsLoadingTwins(false);
        return;
      }
      
      console.log('Fetching twins for user:', user.id);
      
      // Query the twins table for the authenticated user
      console.log('Fetching twins for user ID:', user.id);
      const { data, error } = await supabase
        .from('twins')
        .select('id, name, created_at')
        .eq('auth_user_id', user.id);
        
      if (error) {
        console.error('Supabase query error:', error.message, error.details || 'No details available');
        
        // Check if this is an auth error
        const authErrorHandled = await handleAuthError(error);
        if (authErrorHandled) {
          setError('Your session has expired. Redirecting to login...');
          setTimeout(() => router.push('/auth/login'), 2000);
          return;
        }
        
        // Set an empty array instead of throwing
        setTwins([]);
        setError('Failed to load your twins. Please try again.');
        return;
      }
      
      if (!data || data.length === 0) {
        console.log('No twins found for user ID:', user.id);
        setTwins([]);
        return;
      }
      
      console.log('Found twins:', data.length);
      
      // Map the database fields to our Twin interface
      const formattedTwins: Twin[] = data.map(item => ({
        id: item.id,
        name: item.name,
        createdAt: item.created_at
      }));
      
      setTwins(formattedTwins);
    } catch (error) {
      console.error('Error fetching twins:', error instanceof Error ? error.message : JSON.stringify(error));
      // Set an empty array instead of fake placeholder data
      setTwins([]);
      setError('Failed to load your twins. Please try again.');
    } finally {
      setIsLoadingTwins(false);
    }
  }, [user, router]);

  // Redirect if not logged in or handle auth errors
  useEffect(() => {
    const handleAuthState = async () => {
      if (!isLoading) {
        if (!user) {
          router.push('/auth/login');
        }
      }
    };
    
    handleAuthState();
  }, [user, isLoading, router]);
  
  // Handle authentication errors and refresh tokens
  useEffect(() => {
    if (error) {
      const attemptRefresh = async () => {
        try {
          // Check for refresh token errors
          if (error && (
              error.toLowerCase().includes('refresh token') ||
              error.toLowerCase().includes('invalid token') ||
              error.toLowerCase().includes('jwt')
            )) {
            console.log('Detected auth token error, attempting to reset auth state');
            
            // First try to use the context's refresh method
            if (typeof refreshSession === 'function') {
              const refreshed = await refreshSession();
              
              if (refreshed) {
                console.log('Session refreshed successfully via context, clearing error');
                setError(null);
                // Re-fetch twins after successful refresh
                fetchTwins();
                return;
              }
            }
            
            // If context refresh failed or not available, use our helper
            const reset = await resetAuthState();
            if (reset) {
              console.log('Auth state reset successfully, redirecting to login');
              router.push('/auth/login?error=Your+session+has+expired');
            } else {
              console.error('Failed to reset auth state');
              router.push('/auth/login?error=Authentication+error');
            }
          }
        } catch (refreshError) {
          console.error('Error during refresh attempt:', refreshError);
          router.push('/auth/login');
        }
      };
      
      attemptRefresh();
    }
  }, [error, refreshSession, router, fetchTwins]);

  // Fetch user's twins
  useEffect(() => {
    fetchTwins();
  }, [user, fetchTwins]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  // Function to open the delete confirmation modal
  const confirmDelete = (twin: Twin) => {
    setTwinToDelete(twin);
    setShowDeleteModal(true);
  };
  
  // Function to cancel deletion
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setTwinToDelete(null);
  };
  
  // Function to handle twin deletion
  const handleDeleteTwin = async () => {
    if (!twinToDelete) return;
    
    setIsDeleting(true);
    try {
      const success = await deleteTwin(twinToDelete.id);
      
      if (success) {
        console.log(`Twin ${twinToDelete.id} deleted successfully`);
        // Close the modal
        setShowDeleteModal(false);
        setTwinToDelete(null);
        
        // Always redirect to home page after deletion
        router.push('/');
      } else {
        setError('Failed to delete twin. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting twin:', error);
      setError('Failed to delete twin. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black" 
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23333' fill-opacity='0.2' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: '400px',
        }}
      >
        <div className="text-center">
          <div className="mb-4 text-blue-400 font-bold text-lg">Loading profile...</div>
          <div className="flex justify-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-black p-4" 
      style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23333' fill-opacity='0.2' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        backgroundSize: '400px',
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden mb-6 border border-gray-800">
          <div className="p-6 border-b border-gray-800">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white">Your Profile</h1>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2 text-white">Account Information</h2>
              <p className="text-gray-300">
                <span className="font-medium">Email:</span> {user.email}
              </p>
              <p className="text-gray-300">
                <span className="font-medium">Account created:</span>{' '}
                {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold text-white">Your Digital Twins</h2>
              </div>

              {isLoadingTwins ? (
                <div className="text-center py-8">
                  <div className="mb-2 text-gray-300">Loading your twins...</div>
                  <div className="flex justify-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              ) : error ? (
                <div className="text-center py-8 bg-red-900/50 rounded-lg">
                  <p className="text-red-300 mb-4">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-md hover:from-blue-600 hover:to-indigo-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : twins.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {twins.map((twin) => (
                    <div key={twin.id} className="border border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-800/50">
                      <h3 className="font-semibold text-lg mb-1 text-white">{twin.name}</h3>
                      <p className="text-gray-400 text-sm mb-3">
                        Created {new Date(twin.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex space-x-2">
                        <Link
                          href={`/chat/${twin.id}`}
                          className="px-3 py-1 bg-blue-900/60 text-blue-300 rounded hover:bg-blue-800 transition-colors text-sm"
                        >
                          Chat
                        </Link>
                        <button
                          onClick={() => confirmDelete(twin)}
                          className="px-3 py-1 bg-red-900/60 text-red-300 rounded hover:bg-red-800 transition-colors text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-800/50 rounded-lg">
                  <p className="text-gray-300 mb-4">You haven't created any digital twins yet.</p>
                  <Link
                    href="/"
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-md hover:from-blue-600 hover:to-indigo-700 transition-colors"
                  >
                    Create Your First Twin
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && twinToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full shadow-xl border border-gray-800">
            <h3 className="text-xl font-bold mb-4 text-white">Delete Twin?</h3>
            <p className="mb-6 text-gray-300">
              Are you sure you want to delete "{twinToDelete.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-800 text-gray-200 rounded hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTwin}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete Twin'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 