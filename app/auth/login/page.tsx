'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/auth-context';
import { createClient } from '@supabase/supabase-js';

// Create a client component that uses useSearchParams
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssociatingTwin, setIsAssociatingTwin] = useState(false);
  const router = useRouter();
  const { signIn, user } = useAuth();
  const searchParams = useSearchParams();
  const twinId = searchParams.get('twinId');

  // Store twinId in localStorage when it's present in URL
  useEffect(() => {
    if (twinId) {
      localStorage.setItem('pendingTwinId', twinId);
      console.log(`Stored pending twin ID for login: ${twinId}`);
    }
    
    // Initialize email from localStorage if available
    const savedEmail = localStorage.getItem('pendingTwinEmail');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, [twinId]);

  // Associate twin with user once logged in
  useEffect(() => {
    const associateTwinWithUser = async () => {
      // Only proceed if user is logged in and we have a pending twin
      if (user && !isAssociatingTwin) {
        const pendingTwinId = localStorage.getItem('pendingTwinId');
        if (!pendingTwinId) return;
        
        setIsAssociatingTwin(true);
        console.log(`Attempting to associate twin ${pendingTwinId} with user ${user.id}`);

        try {
          // Create a supabase client
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!, 
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );

          // Update the twin to be associated with the user
          const { error } = await supabase
            .from('twins')
            .update({ auth_user_id: user.id })
            .eq('id', pendingTwinId);

          if (error) {
            console.error('Error associating twin with user:', error);
            throw error;
          }

          console.log(`Successfully associated twin ${pendingTwinId} with user ${user.id}`);
          
          // Clear the pending twin ID from localStorage
          localStorage.removeItem('pendingTwinId');
          localStorage.removeItem('pendingTwinEmail');
          
          // Redirect to the twin's chat page
          router.push(`/chat/${pendingTwinId}`);
        } catch (error) {
          console.error('Failed to associate twin with user:', error);
          setError('Failed to link your twin with your account. You can try again later.');
          setIsAssociatingTwin(false);
        }
      }
    };

    associateTwinWithUser();
  }, [user, router, isAssociatingTwin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signIn(email, password);
      // Check for pending twin first
      const pendingTwinId = localStorage.getItem('pendingTwinId');
      if (pendingTwinId) {
        // The useEffect will handle redirecting to the twin's chat
      } else {
        // No pending twin - fetch twins and redirect to the first one or create page
        try {
          const response = await fetch('/api/twins');
          if (response.ok) {
            const twins = await response.json();
            if (twins && twins.length > 0) {
              // User has at least one twin, redirect to that twin's chat
              router.push(`/chat/${twins[0].id}`);
            } else {
              // User has no twins, redirect to create page
              router.push('/create');
            }
          } else {
            // API error, just go to home as fallback
            router.push('/');
          }
        } catch (error) {
          console.error('Error fetching twins after login:', error);
          router.push('/');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Failed to sign in');
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
            <h1 className="text-2xl font-bold text-white">Sign In</h1>
            {twinId && (
              <div className="mt-2">
                <p className="text-blue-400 font-medium mb-2">
                  Connect with Your Digital Twin
                </p>
                <p className="text-sm text-gray-300">
                  To keep your digital twin and access it in the future, you need an account.
                </p>
                <div className="mt-4 p-3 bg-gray-800 rounded-lg text-sm">
                  <p className="font-medium text-gray-300 mb-1">Options:</p>
                  <ul className="text-left list-disc pl-5 space-y-1 text-gray-400">
                    <li>
                      <span className="font-medium">Sign in below</span> if you already have an account
                    </li>
                    <li>
                      <Link href={`/auth/signup?twinId=${twinId}`} className="font-medium text-blue-400 hover:text-blue-300">
                        Create a new account
                      </Link> to save this new twin
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
            {isAssociatingTwin && (
              <div className="mb-4 p-3 bg-blue-900/30 text-blue-400 rounded-md text-sm border border-blue-800/50">
                Connecting your twin with your account...
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
              <button
                type="submit"
                disabled={isLoading || isAssociatingTwin}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : isAssociatingTwin ? 'Connecting twin...' : 'Sign In'}
              </button>
            </form>
            <div className="mt-4 text-center text-sm">
              <p className="text-gray-400">
                Don&apos;t have an account?{' '}
                <Link href={twinId ? `/auth/signup?twinId=${twinId}` : "/auth/signup"} className="text-blue-400 hover:text-blue-300">
                  Sign up
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
function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-800 overflow-hidden p-6">
          <div className="flex justify-center">
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-6 py-1">
                <div className="h-4 bg-gray-700 rounded w-3/4 mx-auto"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
} 