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
    <div className="min-h-screen flex items-center justify-center bg-black p-4"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23333' fill-opacity='0.2' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        backgroundSize: '400px',
      }}
    >
      <div className="w-full max-w-3xl mx-auto my-8">
        <div className="bg-gray-900 rounded-lg shadow-lg overflow-hidden border border-gray-800">
          <header className="bg-gradient-to-r from-blue-500 to-indigo-600 py-4 px-6 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-white">Create Your Twin</h1>
            {user && (
              <button
                onClick={handleSignOut}
                className="text-sm text-white hover:text-gray-100 flex items-center gap-1 transition-colors duration-200"
              >
                <FaSignOutAlt /> Sign out
              </button>
            )}
          </header>
          <main className="p-6">
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
      </div>
    </div>
  );
} 