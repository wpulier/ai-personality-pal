'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/auth-context';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();
  const { signUp } = useAuth();
  const searchParams = useSearchParams();
  const twinId = searchParams.get('twinId');

  // Store twinId in localStorage when it's present in URL
  useEffect(() => {
    if (twinId) {
      localStorage.setItem('pendingTwinId', twinId);
      console.log(`Stored pending twin ID: ${twinId}`);
    }
  }, [twinId]);

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
      // Store email in localStorage to associate twin after verification
      if (twinId) {
        localStorage.setItem('pendingTwinEmail', email);
      }
      
      // Sign up the user
      await signUp(email, password);
      
      // Get the pendingTwinId from localStorage
      const pendingTwinId = localStorage.getItem('pendingTwinId');
      
      // Show a brief success message
      setSuccessMessage('Sign up successful! Please check your email for verification.');
      
      // Immediately redirect to login
      if (pendingTwinId) {
        // If we have a pending twin, include it in the redirect
        router.push(`/auth/login?twinId=${pendingTwinId}`);
      } else {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign up');
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
                  Creating an account will save your twin and let you access it anytime in the future.
                </p>
                <div className="mt-4 p-3 bg-gray-800 rounded-lg text-sm">
                  <p className="font-medium text-gray-300 mb-1">Options:</p>
                  <ul className="text-left list-disc pl-5 space-y-1 text-gray-400">
                    <li>
                      <span className="font-medium">Create a new account below</span> to save this twin
                    </li>
                    <li>
                      <Link href={`/auth/login?twinId=${twinId}`} className="font-medium text-blue-400 hover:text-blue-300">
                        Sign in instead
                      </Link> if you already have an existing account
                    </li>
                  </ul>
                </div>
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