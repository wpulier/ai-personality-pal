'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getAuthSession, signUpWithEmail } from '@/lib/supabase/client';

// Separate component that uses useSearchParams
function SignUpContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const twinId = searchParams.get('twinId');

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { user } = await getAuthSession();
      if (user) {
        console.log('User already logged in:', user.id);
        
        // If this is about associating a twin, go to login
        if (twinId) {
          router.push(`/auth/login?twinId=${twinId}`);
        } else {
          // Check if user has twins
          const response = await fetch(`/api/twins?userId=${user.id}`);
          if (response.ok) {
            const twins = await response.json();
            if (twins && twins.length > 0) {
              router.push(`/chat/${twins[0].id}`);
            } else {
              router.push('/create');
            }
          }
        }
      }
    };
    
    checkSession();
  }, [router, twinId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);

    try {
      // Sign up with Supabase
      const { data, error } = await signUpWithEmail(
        email, 
        password, 
        twinId ? { pendingTwinId: twinId } : undefined
      );
      
      if (error) {
        setError(error.message);
        return;
      }
      
      // Show success message
      setSuccessMessage('Sign up successful! Please check your email for verification.');
      
      // Redirect to login
      setTimeout(() => {
        router.push(twinId ? `/auth/login?twinId=${twinId}` : '/auth/login');
      }, 2000);
    } catch (error) {
      console.error('Sign up error:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black"
      style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23333' fill-opacity='0.2' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        backgroundSize: '400px',
      }}
    >
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-800 overflow-hidden">
          <div className="p-6 text-center border-b border-gray-800">
            <h1 className="text-2xl font-bold text-white">Create Account</h1>
            {twinId && (
              <div className="mt-2">
                <p className="text-blue-400 font-medium mb-2">
                  Save Your Digital Twin
                </p>
                <p className="text-sm text-gray-300">
                  Create an account to save this twin.
                </p>
              </div>
            )}
          </div>
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 text-red-400 rounded-md text-sm border border-red-800/50">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-900/30 text-green-400 rounded-md text-sm border border-green-800/50">
                {successMessage}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-700 px-3 py-2 bg-gray-800 text-black placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-700 px-3 py-2 bg-gray-800 text-black placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-700 px-3 py-2 bg-gray-800 text-black placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </form>
            <div className="mt-4 text-center text-sm">
              <p className="text-gray-400">
                Already have an account?{' '}
                <Link href={twinId ? `/auth/login?twinId=${twinId}` : "/auth/login"} className="text-blue-400 hover:text-blue-300">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading fallback component
function SignUpLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <div className="flex justify-center">
          <div className="animate-pulse flex space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpLoading />}>
      <SignUpContent />
    </Suspense>
  );
} 