'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserForm } from '@/components/user-form';
import { useAuth } from '@/lib/supabase/auth-context';
import { FaSignOutAlt } from 'react-icons/fa';

export default function Create() {
  const { user, signOut } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

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
      <div className="w-full max-w-lg">
        <header className="mb-6 text-center">
          <Link href="/" className="block mb-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
              AI Personality Pal
            </h1>
          </Link>
          <p className="text-white">
            Create your digital twin powered by AI
          </p>
        </header>

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
          
          {/* Only show sign in/sign up prompt if user is not logged in */}
          {!user && (
            <div className="text-center mt-6 text-sm text-gray-500">
              <p>
                Want to save your twins? <Link href="/auth/login" className="text-blue-600 hover:text-blue-800 font-medium">Sign in</Link> or <Link href="/auth/signup" className="text-blue-600 hover:text-blue-800 font-medium">Create an account</Link>
              </p>
            </div>
          )}
          
          {/* Show a different message for logged-in users */}
          {user && (
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
          )}
        </div>
      </div>
    </div>
  );
} 