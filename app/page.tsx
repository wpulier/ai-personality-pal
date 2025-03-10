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
      <div className="fixed top-0 right-0 bg-black/80 text-white p-2 m-2 rounded text-xs">
        <div className="flex items-center space-x-2">
          {user ? (
            <>
              <span>👤</span>
              <button 
                onClick={async () => {
                  await signOut();
                  setUser(null);
                  setTwins([]);
                  router.push('/');
                }}
                className="bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded"
              >
                Logout
              </button>
              {twins.length > 0 && (
                <Link 
                  href={`/chat/${twins[0].id}`} 
                  className="bg-green-600 hover:bg-green-700 px-2 py-0.5 rounded"
                >
                  Chat
                </Link>
              )}
            </>
          ) : (
            <>
              <span>👻</span>
              <Link 
                href="/auth/login" 
                className="bg-blue-600 hover:bg-blue-700 px-2 py-0.5 rounded"
              >
                Login
              </Link>
            </>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-4">
            AI Personality Pal
          </h1>
          <div className="flex justify-center space-x-3 mt-8">
            <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full animate-pulse" style={{ animationDuration: '0.9s' }}></div>
            <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full animate-pulse" style={{ animationDuration: '0.9s', animationDelay: '0.3s' }}></div>
            <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full animate-pulse" style={{ animationDuration: '0.9s', animationDelay: '0.6s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black p-4"
      style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23333' fill-opacity='0.2' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        backgroundSize: '400px',
      }}
    >
      <LoginControls />

      {/* Header section */}
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-4">
          Meet Your Twin
        </h1>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto">
          Your digital twin learns your style, interests, and personality—then chats like you do.
        </p>
      </header>

      {/* Main Content Card */}
      <div className="w-full max-w-lg bg-gray-900 rounded-xl shadow-2xl border border-gray-800 overflow-hidden">
        {/* Why Create a Twin Section */}
        <div className="p-6 md:p-8">
          <h2 className="text-xl font-bold text-white mb-4">Why Create a Twin?</h2>
          <div className="space-y-4">
            {/* Feature item */}
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-indigo-800 rounded-lg p-2 mr-4">
                <FaUser className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">Self-expression</h3>
                <p className="text-gray-400">Share your unique perspective through an AI that captures your style.</p>
              </div>
            </div>
            
            {/* Feature item */}
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-indigo-800 rounded-lg p-2 mr-4">
                <FaRobot className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">Creative AI</h3>
                <p className="text-gray-400">An AI that understands your taste in movies, music, and more.</p>
              </div>
            </div>
          </div>
          
          {/* CTA Button */}
          <div className="mt-8">
            <Link
              href={user ? "/create" : "/auth/signup"}
              className="w-full inline-flex justify-center items-center py-3 px-5 text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition duration-300 ease-in-out"
            >
              {user ? "Create Your Twin" : "Sign Up to Create"}
              <FaArrowRight className="ml-2" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
