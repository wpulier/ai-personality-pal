"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth-context";
import { FaPlus, FaUser, FaRobot, FaArrowRight } from "react-icons/fa";

export default function Home() {
  const [twins, setTwins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  // Fetch twins for this user if logged in
  useEffect(() => {
    const fetchTwins = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const response = await fetch('/api/twins');
        if (response.ok) {
          const data = await response.json();
          setTwins(data);
          
          // If user has at least one twin, redirect to their chat page
          if (data.length > 0) {
            router.push(`/chat/${data[0].id}`);
          } else {
            // User is logged in but has no twins, redirect to create page
            console.log('User has no twins, redirecting to create page');
            router.push('/create');
          }
        } else {
          console.error('Failed to fetch twins');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching twins:', error);
        setLoading(false);
      }
    };

    fetchTwins();
  }, [user, router]);

  // If user is logged in and we're loading, show loading state
  if (user && loading) {
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
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center text-blue-400 flex-shrink-0">
                <FaUser size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-blue-400 mb-1">Knows You Best</h3>
                <p className="text-gray-300">Learns your tastes, style, and voice to chat authentically.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-900 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <FaRobot size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-indigo-400 mb-1">Powered by You</h3>
                <p className="text-gray-300">Connect Spotify, Letterboxd, and more to keep your twin real and relevant.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-900 flex items-center justify-center text-purple-400 flex-shrink-0">
                <FaPlus size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-purple-400 mb-1">Always in Sync</h3>
                <p className="text-gray-300">Update your twin's bio and preferences anytime—it grows alongside you.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <Link href="/create" className="inline-flex items-center justify-center w-full py-3 px-6 rounded-lg shadow-md text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-medium transition-all">
              Create Your Twin <FaArrowRight className="ml-2" />
            </Link>
          </div>
          
          {/* Save Your Twins Section as footer */}
          {!user && (
            <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-gray-700">
              <div className="text-center text-xs md:text-sm">
                <p className="text-gray-400 mb-2 md:mb-3">
                  Create an account to save your twins and access them anytime
                </p>
                <div className="flex space-x-2 md:space-x-3 px-[5%] md:px-0">
                  <Link href="/auth/signup" className="flex-1 py-1.5 md:py-2 px-2 md:px-3 rounded text-xs md:text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors text-center">
                    Create Account
                  </Link>
                  <Link href="/auth/login" className="flex-1 py-1.5 md:py-2 px-2 md:px-3 rounded text-xs md:text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors text-center">
                    Sign In
                  </Link>
                </div>
                <p className="mt-2 md:mt-3 text-xs text-gray-500">
                  Don't want to sign up? You can still <Link href="/create" className="text-blue-400 hover:text-blue-300">create a twin</Link> without an account.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
