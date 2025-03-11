"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaUser, FaRobot, FaArrowRight } from "react-icons/fa";
import { getAuthSession, signOut } from '@/lib/supabase/client';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [twins, setTwins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);

        // Check for current session
        const { user: authUser } = await getAuthSession();

        if (authUser) {
          setUser(authUser);

          // Fetch user's twins
          const response = await fetch(`/api/twins?userId=${authUser.id}`);
          if (response.ok) {
            const data = await response.json();
            setTwins(data);

            // If user has at least one twin, redirect to their chat page
            if (data.length > 0) {
              router.push(`/chat/${data[0].id}`);
              return;
            }
          }
        }
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Simple login controls
  const LoginControls = () => {
    return (
      <div className="fixed top-0 right-0 m-4 z-50">
        <div className="flex items-center">
          {user ? (
            <>
              <Link
                href={`/profile`}
                className="bg-gray-800 text-gray-300 hover:bg-gray-700 px-3 py-1.5 rounded-md text-sm font-medium shadow-sm border border-gray-700 transition-all duration-200 flex items-center"
              >
                <FaUser className="mr-2 text-blue-400" size={14} />
                Profile
              </Link>
              {twins.length > 0 && (
                <Link
                  href={`/chat/${twins[0].id}`}
                  className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:opacity-90 px-3 py-1.5 rounded-md text-sm font-medium shadow-sm transition-all duration-200 ml-3"
                >
                  Start Chat
                </Link>
              )}
              <button
                onClick={async () => {
                  await signOut();
                  setUser(null);
                  setTwins([]);
                  router.push('/');
                }}
                className="bg-gray-800 text-gray-300 hover:bg-gray-700 px-3 py-1.5 rounded-md text-sm font-medium shadow-sm border border-gray-700 transition-all duration-200 ml-3"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:opacity-90 px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-all duration-200"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950"
        style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, rgba(75, 85, 99, 0.1) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(75, 85, 99, 0.15) 2%, transparent 0%)`,
          backgroundSize: '100px 100px',
        }}>
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent mb-4">
            AI Personality Pal
          </h1>
          <div className="flex justify-center space-x-3 mt-8">
            <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full animate-pulse" style={{ animationDuration: '0.9s' }}></div>
            <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full animate-pulse" style={{ animationDuration: '0.9s', animationDelay: '0.3s' }}></div>
            <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full animate-pulse" style={{ animationDuration: '0.9s', animationDelay: '0.6s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-950 p-4"
      style={{
        backgroundImage: `radial-gradient(circle at 25px 25px, rgba(75, 85, 99, 0.1) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(75, 85, 99, 0.15) 2%, transparent 0%)`,
        backgroundSize: '100px 100px',
      }}
    >
      <LoginControls />

      {/* Header section */}
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent mb-6">
          Create Your Digital Twin
        </h1>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto">
          An AI companion that talks, thinks, and interacts just like you.
        </p>
      </header>

      {/* Main Content Card */}
      <div className="w-full max-w-lg bg-gray-900 rounded-xl shadow-2xl border border-gray-800 overflow-hidden">
        {/* Why Create a Twin Section */}
        <div className="p-6 md:p-8">
          <h2 className="text-xl font-bold text-white mb-6 text-center">Why Build a Twin?</h2>
          <div className="space-y-6">
            {/* Feature item */}
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg p-2 mr-4 shadow-md">
                <FaUser className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">Explore Your Inner Self</h3>
                <p className="text-gray-300">Your AI twin helps you reflect on life's challenges, bringing clarity and insight to your personal journey.</p>
              </div>
            </div>

            {/* Feature item */}
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg p-2 mr-4 shadow-md">
                <FaRobot className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">Soul-Aligned Growth</h3>
                <p className="text-gray-300">Guided by your unique experiences and inner wisdom, your twin evolves alongside you, fostering deeper understanding and self-discovery.</p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="mt-8">
            <Link
              href={user ? "/create" : "/auth/signup"}
              className="w-full inline-flex justify-center items-center py-3 px-5 text-base font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 rounded-lg transition duration-300 ease-in-out shadow-md"
            >
              Get Started
              <FaArrowRight className="ml-2" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
