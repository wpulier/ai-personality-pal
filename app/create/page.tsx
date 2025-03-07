'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserForm } from '@/components/user-form';
import { useAuth } from '@/lib/supabase/auth-context';
import { FaSignOutAlt } from 'react-icons/fa';

export default function Create() {
  const { user, signOut } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  // Redirect unauthenticated users to sign-up page
  useEffect(() => {
    if (!user) {
      router.push('/auth/signup');
    }
  }, [user, router]);

  // Check if user already has a twin and redirect them
  useEffect(() => {
    const checkExistingTwin = async () => {
      if (!user) return;
      
      try {
        const response = await fetch('/api/twins');
        if (response.ok) {
          const data = await response.json();
          
          // If user has at least one twin, redirect to their chat page
          if (data.length > 0) {
            console.log('User already has a twin, redirecting to chat page');
            router.push(`/chat/${data[0].id}`);
          }
        } else {
          console.error('Failed to check for existing twins');
        }
      } catch (error) {
        console.error('Error checking for existing twins:', error);
      }
    };

    checkExistingTwin();
  }, [user, router]);

  const handleTwinCreated = (twinId: number) => {
    // Immediately redirect to chat with the new twin
    router.push(`/chat/${twinId}`);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4 md:p-8" 
      style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23333' fill-opacity='0.2' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        backgroundSize: '400px',
      }}
    >
      {!user ? (
        <div className="w-full max-w-lg bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-indigo-100 p-6 md:p-8 text-center">
          <div className="flex justify-center space-x-3 mt-8">
            <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full animate-pulse" style={{ animationDuration: '0.9s' }}></div>
            <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full animate-pulse" style={{ animationDuration: '0.9s', animationDelay: '0.3s' }}></div>
            <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full animate-pulse" style={{ animationDuration: '0.9s', animationDelay: '0.6s' }}></div>
          </div>
          <p className="mt-4 text-gray-600">Redirecting to sign up...</p>
        </div>
      ) : (
        <div className="w-full max-w-lg">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-indigo-100 p-6 md:p-8">
            {errorMessage && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
                {errorMessage}
              </div>
            )}
            
            <UserForm 
              authUserId={user?.id}
              onError={(error) => setErrorMessage(error)}
              onTwinCreated={handleTwinCreated}
            />
            
            {/* Show a message for logged-in users */}
            <div className="text-center mt-6">
              <p className="text-sm text-gray-500 mb-3">
                Your twin will automatically be saved to your account.
              </p>
              <button 
                onClick={handleSignOut} 
                className="inline-flex items-center text-sm text-gray-600 hover:text-red-600 transition-colors"
              >
                <FaSignOutAlt className="mr-1" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 