'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserForm } from '@/components/user-form';
import { FaSignOutAlt } from 'react-icons/fa';
import { getAuthSession, signOut } from '@/lib/supabase/client';

export default function Create() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  
  // Check for authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { user: authUser } = await getAuthSession();
        if (!authUser) {
          // Redirect to login if not authenticated
          console.log('User not authenticated, redirecting to login');
          router.push('/auth/login');
          return;
        }
        
        setUser(authUser);
      } catch (error) {
        console.error('Error checking auth:', error);
        setErrorMessage('Authentication error. Please try logging in again.');
        router.push('/auth/login');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleTwinCreated = (twinId: number) => {
    // Immediately redirect to chat with the new twin
    router.push(`/chat/${twinId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Loading...</h1>
          <div className="flex justify-center space-x-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-800">Create Your Twin</h1>
        {user && (
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <FaSignOutAlt /> Sign out
          </button>
        )}
      </header>
      <main className="flex-1 p-4 md:p-8">
        {errorMessage && (
          <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
            {errorMessage}
          </div>
        )}
        <UserForm 
          onTwinCreated={handleTwinCreated} 
          authUserId={user?.id}
          onError={(error) => setErrorMessage(error)}
        />
      </main>
    </div>
  );
} 