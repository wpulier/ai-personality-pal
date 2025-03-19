'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowLeft, FaInfoCircle, FaPaperPlane, FaFilm, FaStar, FaMusic, FaSpotify, FaUser, FaUserPlus, FaLink, FaTimes, FaTrash } from 'react-icons/fa';
import SpotifyConnectButton from '@/components/spotify-connect-button';
import { Button } from '@/components/ui/button';
import { DescriptionEditModal } from '@/components/description-edit-modal';
import { LetterboxdEditModal } from '@/components/letterboxd-edit-modal';
import { SpotifyConnectModal } from '@/components/spotify-connect-modal';
import { TwinPersonalitySection } from '@/components/twin-personality-section';
import { TwinMediaSection } from '@/components/twin-media-section';
import { createClient } from '@supabase/supabase-js';
import { TwinEmotionalAnalysis } from '@/components/twin-emotional-analysis';

// Create a Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface Message {
  id: number;
  content: string;
  isUser: boolean;
  createdAt: string;
}

interface Track {
  name: string;
  artist: string;
  playedAt?: string;
}

interface User {
  id: number;
  name: string;
  bio: string;
  letterboxd_url?: string;
  spotify_url?: string;
  auth_user_id?: string;
  letterboxd_data?: {
    status: 'success' | 'error' | 'not_provided';
    recentRatings?: {
      title: string;
      rating: string;
      url?: string;
    }[];
    favoriteGenres?: string[];
    favoriteFilms?: string[];
  };
  spotify_data?: {
    status: 'success' | 'error' | 'not_provided';
    topArtists?: string[];
    topGenres?: string[];
    recentTracks?: Track[];
    error?: string;
  };
  twinPersonality: {
    interests: string[];
    style: string;
    traits: string[];
    summary: string;
  };
}

function ProfileButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Check for authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setAuthUser(session?.user || null);
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Set up listener for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthUser(session?.user || null);
      }
    );

    // Cleanup on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const goToProfile = () => {
    setIsOpen(false);
    router.push('/profile');
  };

  const goToLogin = () => {
    setIsOpen(false);
    router.push('/auth/login');
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setAuthUser(null);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
    setIsOpen(false);
  };

  // Close the dropdown when clicking outside
  useEffect(() => {
    const closeDropdown = () => setIsOpen(false);

    if (isOpen) {
      document.addEventListener('click', closeDropdown);
    }

    return () => {
      document.removeEventListener('click', closeDropdown);
    };
  }, [isOpen]);

  // Stop propagation to prevent the dropdown from closing when clicking inside
  const handleDropdownClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="p-1 md:p-2.5 rounded-full hover:bg-gray-700 text-blue-400 transition-colors"
        aria-label="User profile"
      >
        <FaUser size={18} className="md:text-lg" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg z-20 border border-gray-700"
          onClick={handleDropdownClick}
        >
          <div className="py-1">
            {authUser ? (
              <>
                <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-700">
                  Signed in as<br />
                  <span className="font-semibold text-gray-300 truncate block">{authUser.email}</span>
                </div>
                <button
                  onClick={goToProfile}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                >
                  Profile
                </button>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={goToLogin}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                >
                  Sign In
                </button>
                <Link
                  href="/auth/signup"
                  className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showLetterboxd, setShowLetterboxd] = useState(false);
  const [showSpotify, setShowSpotify] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAssociatingTwin, setIsAssociatingTwin] = useState(false);
  const [hasClaimedTwin, setHasClaimedTwin] = useState(false);
  const [showEditBio, setShowEditBio] = useState(false);
  const [showLetterboxdModal, setShowLetterboxdModal] = useState(false);
  const [showSpotifyConnect, setShowSpotifyConnect] = useState(false);
  const [showBioModal, setShowBioModal] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Check for authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setAuthUser(session?.user || null);
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkAuth();

    // Set up listener for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthUser(session?.user || null);
      }
    );

    // Cleanup on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Function to claim the current twin for the logged-in user
  const claimCurrentTwin = useCallback(async () => {
    if (!authUser || !user || isAssociatingTwin || hasClaimedTwin) {
      return;
    }

    setIsAssociatingTwin(true);

    try {
      console.log(`Attempting to claim twin ${user.id} for user ${authUser.id}`);

      // First check if the twin still exists
      const checkResponse = await fetch(`/api/direct-twin/${user.id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!checkResponse.ok) {
        console.error('Twin no longer exists or cannot be accessed');
        setError('This twin cannot be accessed. It may have been deleted.');
        setTimeout(() => router.push('/'), 3000); // Redirect to home after showing error
        return;
      }

      // Twin exists, proceed with claiming it
      const response = await fetch('/api/twins/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          twinId: user.id,
          userId: authUser.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        // Special handling for the case where user already has a twin
        if (response.status === 409 && result.existingTwinId) {
          console.log(`User already has a twin (ID: ${result.existingTwinId})`);
          setError(`You already have a twin named "${result.existingTwinName || 'Unknown'}". Redirecting to your existing twin...`);

          // Redirect to the existing twin after a short delay
          setTimeout(() => {
            router.push(`/chat/${result.existingTwinId}`);
          }, 3000);
          return;
        }

        throw new Error(result.error || 'Failed to claim twin');
      }

      // Mark as claimed to prevent infinite loop
      setHasClaimedTwin(true);

      // Update the user data with the claimed status to prevent future claim attempts
      if (result.twin) {
        setUser({ ...user, auth_user_id: authUser.id });
      }

      // Show a success message
      setError('✅ This twin has been connected to your account!');
      setTimeout(() => setError(null), 5000);

    } catch (err) {
      console.error('Failed to claim twin:', err);
      // Don't show an error to user
    } finally {
      setIsAssociatingTwin(false);
    }
  }, [authUser, user, isAssociatingTwin, hasClaimedTwin, router]);

  // Add enhanced mobile detection that also detects iOS devices
  useEffect(() => {
    const checkIfMobile = () => {
      const isMobileDevice = window.innerWidth < 768;
      // Safer iOS detection without MSStream property
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !/CriOS/.test(navigator.userAgent);

      setIsMobile(isMobileDevice);

      // Apply iOS-specific fixes if needed
      if (isIOSDevice) {
        // Add iOS-specific class to body for potential CSS fixes
        document.body.classList.add('ios-device');

        // Listen for virtual keyboard events on iOS
        window.addEventListener('resize', handleIOSKeyboard);
      }

      return () => {
        if (isIOSDevice) {
          document.body.classList.remove('ios-device');
          window.removeEventListener('resize', handleIOSKeyboard);
        }
      };
    };

    // Handler for iOS keyboard appearance
    const handleIOSKeyboard = () => {
      // When keyboard opens, scroll to bottom after a short delay
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };

    // Initial check
    const cleanup = checkIfMobile();

    // Add event listener for orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(checkIfMobile, 100);
    });

    // Clean up
    return () => {
      window.removeEventListener('orientationchange', checkIfMobile);
      if (cleanup) cleanup();
    };
  }, []);

  // Add meta viewport tag to prevent unwanted zooming on iOS and ensure proper dimensions
  useEffect(() => {
    // Find existing viewport meta tag or create a new one
    let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;

    if (!viewportMeta) {
      viewportMeta = document.createElement('meta') as HTMLMetaElement;
      viewportMeta.name = 'viewport';
      document.head.appendChild(viewportMeta);
    }

    // Set viewport properties that help with fixed position elements
    viewportMeta.content = 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, height=device-height';

    // Use CSS variables for dynamic viewport height on mobile
    const updateViewportHeight = () => {
      // Set CSS variable for viewport height that adjusts to mobile chrome
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Initial update and add event listeners
    updateViewportHeight();
    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', () => {
      setTimeout(updateViewportHeight, 100);
    });

    // Reset viewport on unmount to not affect other pages
    return () => {
      if (viewportMeta) {
        viewportMeta.content = 'width=device-width, initial-scale=1';
      }
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
      document.documentElement.style.removeProperty('--vh');
    };
  }, []);

  // Auto-claim current twin if user is logged in and twin isn't already claimed
  useEffect(() => {
    // Only proceed if the user is authenticated, we have twin data, and the twin exists
    if (authUser && user && !isAssociatingTwin && !hasClaimedTwin) {
      // Check if twin is unclaimed or claimed by someone else
      if (!user.auth_user_id) {
        console.log('Twin is unclaimed, attempting to claim it');
        claimCurrentTwin();
      } else if (user.auth_user_id !== authUser.id) {
        console.log('Twin is claimed by another user, cannot claim');
      } else {
        console.log('Twin is already claimed by current user');
        // Mark as claimed to prevent further attempts
        setHasClaimedTwin(true);
      }
    }
  }, [authUser, user, isAssociatingTwin, claimCurrentTwin, hasClaimedTwin]);

  // Helper to render rating stars based on numeric rating
  const getRatingStars = (rating: number) => {
    if (!rating) return 'Not rated';

    // Normalize rating to a 0-5 scale if it's on a 0-10 scale
    const normalizedRating = rating > 5 ? rating / 2 : rating;

    // Make sure we don't get negative values for repeat
    const fullStars = Math.max(0, Math.floor(normalizedRating));
    const emptyStars = Math.max(0, 5 - fullStars);

    // Convert rating to number of stars (out of 5)
    return "★".repeat(fullStars) + "☆".repeat(emptyStars);
  };

  // Fetch user and messages on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (!params.id) {
          throw new Error('No user ID provided');
        }

        // Fetch twin data from the direct endpoint that bypasses RLS
        console.log(`Fetching twin data for ID: ${params.id}`);
        const userResponse = await fetch(`/api/direct-twin/${params.id}`);
        if (!userResponse.ok) {
          const errorData = await userResponse.json();
          throw new Error(errorData.error || 'Failed to fetch twin data');
        }
        const userData = await userResponse.json();

        if (!userData) {
          throw new Error('Twin not found');
        }

        // Debug log for twin data fields - useful to verify data normalization is working
        console.log('DEBUG: Twin data structure:', {
          id: userData.id,
          name: userData.name,
          hasTwinPersonality: !!(userData.twinPersonality || userData.twin_personality),
          hasSnakeCaseField: 'twin_personality' in userData,
          hasCamelCaseField: 'twinPersonality' in userData
        });

        // Data received should already be normalized from the API endpoint
        // But we'll add defensive code here to handle any edge cases

        // Ensure both field naming conventions are supported for backward compatibility
        if (!userData.twinPersonality && userData.twin_personality) {
          userData.twinPersonality = userData.twin_personality;
          console.log('DEBUG: Using twin_personality data for UI rendering');
        }

        // Create a placeholder structure if no personality data exists
        // This ensures the UI doesn't break when rendering
        if (!userData.twinPersonality) {
          console.log('DEBUG: No personality data found, creating empty structure for UI');
          userData.twinPersonality = {
            interests: [],
            traits: [],
            summary: "", // Empty string instead of fake message
            style: ""
          };
        }

        // Similarly handle letterboxd data fields for backward compatibility
        if (!userData.letterboxd_data && userData.letterboxd_data) {
          userData.letterboxd_data = userData.letterboxd_data;
        }

        // Ensure spotify data is accessible to the UI
        if (!userData.spotify_data && userData.spotify_data) {
          userData.spotify_data = userData.spotify_data;
        }

        // Log personality summary for debugging
        console.log('DEBUG: Twin personality summary:',
          userData.twinPersonality?.summary || 'No summary available',
          'Length:', (userData.twinPersonality?.summary?.length || 0)
        );

        // Set user data in state
        setUser(userData);

        // Fetch messages using the direct-messages endpoint that bypasses RLS
        console.log(`Fetching messages for twin ID ${params.id}`);
        const messagesResponse = await fetch(`/api/direct-messages/${params.id}`);
        if (!messagesResponse.ok) {
          console.error('Error fetching messages:', await messagesResponse.text());
          // Don't throw here - we can still show the chat without messages
        } else {
          const messagesData = await messagesResponse.json();
          setMessages(messagesData);

          // If there are no messages, we'll generate a first message
          if (messagesData.length === 0) {
            generateFirstMessage(userData.id);
          }
        }
      } catch (err) {
        console.error('Error in chat page:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  // Function to generate the first message
  const generateFirstMessage = async (userId: number) => {
    // Show typing indicator
    setIsTyping(true);

    try {
      console.log(`Generating first message for twin ID ${userId}`);
      // POST request to generate a first message using the direct endpoint
      const response = await fetch('/api/direct-messages/first', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          twinId: String(userId) // Convert to string to ensure proper format
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Add the message to the UI
        setMessages([{
          id: data.id,
          content: data.content,
          isUser: false,
          createdAt: data.createdAt || data.created_at || new Date().toISOString()
        }]);
      } else {
        // Handle non-OK responses
        const contentType = response.headers.get('content-type');
        console.error('Error generating first message - Status:', response.status, 'Content-Type:', contentType);

        try {
          // Try to get error details from response
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            console.error('First message error details:', errorData);
          } else {
            const rawText = await response.text();
            console.error('Raw error response:', rawText.substring(0, 200));
          }
        } catch (readError) {
          console.error('Error reading error response:', readError);
        }

        // Add a fallback message anyway to ensure the chat is usable
        setMessages([{
          id: Date.now(),
          content: "Hello! I'm your digital twin. What would you like to talk about today?",
          isUser: false,
          createdAt: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Error generating first message:', error);

      // Add a fallback message on error
      setMessages([{
        id: Date.now(),
        content: "Hello! I'm your digital twin. Let's have a conversation!",
        isUser: false,
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Focus input field when page loads
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      // Use a small timeout to ensure content has rendered
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [messages]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) {
      console.error("Cannot submit message: user data is missing");
      return;
    }

    const messageToSend = message;
    setMessage('');
    setIsTyping(true);
    setIsSending(true);

    // Optimistically add user message to the UI
    const tempUserMessage = {
      id: Date.now(),
      content: messageToSend,
      isUser: true,
      createdAt: new Date().toISOString()
    };

    setMessages(prevMessages => [...prevMessages, tempUserMessage]);

    try {
      // Log user data for debugging
      console.log("Sending message with user data:", {
        userId: user.id,
        userName: user.name,
        hasPersonality: !!user.twinPersonality
      });

      // Simple solution: Use a single API endpoint that handles both user message and AI response
      console.log(`Using single API endpoint for twin ID ${user.id}`);

      // Create a simple object to send to the API
      const requestData = {
        twinId: user.id,
        content: messageToSend
      };

      console.log("Request data:", requestData);

      // Make the request with more detailed error handling
      let response;
      try {
        response = await fetch('/api/chat/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });
      } catch (fetchError) {
        console.error("Network error during fetch:", fetchError);
        throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : "Failed to connect to the server"}`);
      }

      // Check if the response is OK
      if (!response.ok) {
        // Capture the raw response for debugging
        const contentType = response.headers.get('content-type');
        console.error('API error - Status:', response.status, 'Content-Type:', contentType);

        let errorMessage;
        let rawText = '';

        try {
          // Try to get the response as text to see what's wrong
          rawText = await response.text();
          console.error('Raw error response:', rawText.substring(0, 500) + (rawText.length > 500 ? '...' : ''));

          // Check if it's an HTML response (commonly indicates server error)
          if (rawText.trim().startsWith('<!DOCTYPE') || rawText.trim().startsWith('<html')) {
            // Extract error message from HTML if possible
            const titleMatch = rawText.match(/<title>(.*?)<\/title>/i);
            const errorTitle = titleMatch ? titleMatch[1] : 'Server Error';

            // Log more details about the HTML response
            console.error('Received HTML error page instead of JSON. Title:', errorTitle);
            errorMessage = `Server error: ${errorTitle} (received HTML instead of JSON)`;

            // Try to extract more detailed error message
            const h1Match = rawText.match(/<h1>(.*?)<\/h1>/i);
            const pMatch = rawText.match(/<p>(.*?)<\/p>/i);

            if (h1Match || pMatch) {
              errorMessage += ` - ${h1Match ? h1Match[1] : ''} ${pMatch ? pMatch[1] : ''}`;
            }
          }
          // If it looks like JSON, try to parse it
          else if (rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
            try {
              const errorData = JSON.parse(rawText);
              errorMessage = errorData.error || 'API request failed';

              // If there are details, include them
              if (errorData.details) {
                errorMessage += `: ${typeof errorData.details === 'string' ? errorData.details : JSON.stringify(errorData.details)}`;
              }
            } catch (parseError) {
              errorMessage = `Failed to parse JSON error: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`;
            }
          } else {
            errorMessage = `Server responded with non-JSON content (${contentType || 'unknown content type'})`;
          }
        } catch (textError) {
          errorMessage = `Failed to read error response: ${textError instanceof Error ? textError.message : 'Unknown error reading response'}`;
        }

        // Include status code in error message
        errorMessage = `API error (${response.status}): ${errorMessage}`;
        throw new Error(errorMessage);
      }

      // Try to get the JSON response
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        throw new Error('Invalid JSON response from server');
      }

      // Log successful data
      console.log('Message API response:', data);

      setIsTyping(false);

      // Update the UI with both messages
      setMessages(prevMessages => [
        ...prevMessages.filter(msg => msg.id !== tempUserMessage.id),
        {
          id: data.userMessage.id,
          content: data.userMessage.content,
          isUser: true,
          createdAt: data.userMessage.created_at || new Date().toISOString()
        },
        {
          id: data.aiMessage.id,
          content: data.aiMessage.content,
          isUser: false,
          createdAt: data.aiMessage.created_at || new Date().toISOString()
        }
      ]);

      // After successful message, refresh the user data to get any updated analysis
      // This happens automatically in the backend every 10 messages
      try {
        // We'll refresh user data to get any updated emotional analysis
        // that might have been generated on the server
        const updatedUserResponse = await fetch(`/api/twins/${user.id}`);
        if (updatedUserResponse.ok) {
          const updatedUserData = await updatedUserResponse.json();
          setUser(updatedUserData);
        }
      } catch (updateError) {
        console.error('Error refreshing user data:', updateError);
      }

    } catch (err) {
      console.error('Error sending message:', err);
      setIsTyping(false);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      // Remove the temporary message if there was an error
      setMessages(prevMessages =>
        prevMessages.filter(msg => msg.id !== tempUserMessage.id)
      );
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  // Format message content with paragraphs
  const formatMessageContent = (content: string) => {
    return content.split('\n').map((line, i) => (
      <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
    ));
  };

  // Function to clear chat history
  const handleClearChat = async () => {
    // Show confirmation dialog
    if (!confirm('Are you sure you want to clear all messages? This cannot be undone.')) {
      return;
    }

    // Set loading state
    setIsSending(true);

    try {
      // Clear messages from state only (front-end only approach)
      setMessages([]);

      // Add a locally generated first message instead of calling the API
      // (This avoids the 400 error since the API won't generate a first message
      // if there are already messages in the database)
      setTimeout(() => {
        if (user) {
          // Create a personalized greeting using the twin's name if available
          const greeting = user.name
            ? `Hey there! I'm ${user.name}'s digital twin. What would you like to chat about today?`
            : `Hey there! I'm your digital twin. What would you like to chat about today?`;

          // Create a local first message that mimics what the API would return
          const localFirstMessage = {
            id: Date.now(),
            content: greeting,
            isUser: false,
            createdAt: new Date().toISOString()
          };

          // Add this message to the UI
          setMessages([localFirstMessage]);
        }
        setIsSending(false);
      }, 500);

    } catch (error) {
      console.error('Error clearing chat:', error);
      alert('Failed to clear messages. Please try again.');
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-gray-950"
        style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, rgba(75, 85, 99, 0.1) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(75, 85, 99, 0.15) 2%, transparent 0%)`,
          backgroundSize: '100px 100px',
        }}
      >
        {/* Fixed header */}
        <header className="bg-gray-900 shadow-md py-3 px-4 md:px-6 flex items-center border-b border-gray-800">
          <Link href="/" className="text-gray-400 hover:text-white mr-3">
            <FaArrowLeft />
          </Link>
          <h1 className="text-lg font-semibold text-white">Loading Chat</h1>
        </header>

        {/* Content area with left-aligned chat bubble */}
        <div className="flex-1 px-4 md:px-8 py-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-start">
              <div className="flex items-start gap-2 md:gap-3">
                <div className="w-7 h-7 md:w-9 md:h-9 mt-1 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white text-sm font-medium shadow-md ring-2 ring-gray-900">
                  T
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 md:px-5 md:py-3.5 shadow-md">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDuration: "0.8s" }}></div>
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{ animationDuration: "0.8s", animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{ animationDuration: "0.8s", animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Empty input */}
        <div className="bg-gray-900 border-t border-gray-800 p-3 md:p-4">
          <div className="max-w-3xl mx-auto">
            <div className="h-10 bg-gray-800 border border-gray-700 rounded-xl opacity-50"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950"
      style={{
        backgroundImage: `radial-gradient(circle at 25px 25px, rgba(75, 85, 99, 0.1) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(75, 85, 99, 0.15) 2%, transparent 0%)`,
        backgroundSize: '100px 100px',
      }}
    >
      {/* Header section */}
      <header className="bg-gray-900 backdrop-blur-sm shadow-md py-2 md:py-4 px-4 md:px-8 flex items-center z-10 border-b border-gray-800 flex-shrink-0">
        <div className="flex-1 flex items-center">
          <Link href="/" className="text-blue-400 hover:text-blue-300 flex items-center mr-4 transition-colors">
            <FaArrowLeft size={20} className="md:text-lg" />
          </Link>
          <div className="font-semibold text-lg md:text-xl text-white">{user?.name || 'My Twin'}</div>
        </div>
        <div className="flex items-center space-x-1 md:space-x-2">
          {/* Action buttons */}
          <button
            onClick={() => setShowInfo(true)}
            className="p-2 md:p-2.5 rounded-full hover:bg-gray-800 text-blue-400 transition-colors"
            aria-label="Twin information"
          >
            <FaInfoCircle size={18} className="md:text-lg" />
          </button>
          <ProfileButton />
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sign-up banner for users who are not logged in and have an unclaimed twin */}
        {!authUser && user && !user.auth_user_id && (
          <div className="bg-gradient-to-r from-blue-700/90 to-indigo-700/90 backdrop-blur-sm text-white py-3 px-4 flex items-center justify-between border-b border-blue-900">
            <div className="flex-1">
              <p className="text-sm md:text-base"><FaUserPlus className="inline-block mr-2" /> Sign up to save your twin and access it anytime!</p>
            </div>
            <div className="ml-2">
              <Link
                href={`/auth/signup?twinId=${user.id}`}
                className="bg-white text-blue-700 hover:bg-blue-50 px-4 py-1.5 rounded text-sm font-medium transition-colors shadow-sm flex items-center"
              >
                <FaUserPlus className="mr-1.5" size={14} /> Sign Up
              </Link>
            </div>
          </div>
        )}

        {/* Main chat container */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-950"
          style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(75, 85, 99, 0.1) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(75, 85, 99, 0.15) 2%, transparent 0%)`,
            backgroundSize: '100px 100px',
          }}
        >
          <div
            className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5 md:space-y-7 md:mx-auto md:max-w-3xl lg:max-w-4xl"
            style={{
              scrollbarWidth: 'none',  // Firefox
              msOverflowStyle: 'none',  // IE/Edge
              WebkitOverflowScrolling: 'touch' // iOS smooth scrolling
            }}
          >
            <style jsx global>{`
              /* Hide scrollbar for Chrome, Safari and Opera */
              .flex-1::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? "justify-end" : "justify-start"
                  } animate-fadeIn`}
                style={{ animationDuration: "0.3s" }}
              >
                <div className={`max-w-[85%] md:max-w-[70%] flex items-start gap-2 md:gap-3 ${message.isUser ? "flex-row-reverse" : "flex-row"
                  }`}>
                  {!message.isUser && (
                    <div className="w-7 h-7 md:w-9 md:h-9 mt-1 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white text-sm font-medium shadow-md ring-2 ring-gray-900">
                      {user?.name ? user.name.charAt(0).toUpperCase() : "T"}
                    </div>
                  )}

                  <div
                    className={`rounded-2xl ${message.isUser
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg border border-indigo-900/30'
                      : 'bg-gray-800 border border-gray-700 text-white shadow-md'
                      } px-4 py-3 md:px-5 md:py-3.5`}
                  >
                    <div className="text-white leading-relaxed text-sm md:text-base">
                      {message.content.split("\n").map((line, i) => (
                        <p key={i} className={i > 0 ? "mt-3" : ""}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>

                  {message.isUser && (
                    <div className="w-7 h-7 md:w-9 md:h-9 mt-1 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex-shrink-0 flex items-center justify-center text-white text-sm font-medium shadow-md ring-2 ring-gray-900">
                      {authUser ? authUser.name?.charAt(0).toUpperCase() : "Y"}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start animate-fadeIn" style={{ animationDuration: "0.3s" }}>
                <div className="flex items-start max-w-[70%] gap-2 md:gap-3">
                  <div className="w-7 h-7 md:w-9 md:h-9 mt-1 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white text-sm font-medium shadow-md ring-2 ring-gray-900">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "T"}
                  </div>
                  <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 md:px-5 md:py-3.5 shadow-md">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDuration: "0.8s" }}></div>
                      <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{ animationDuration: "0.8s", animationDelay: "0.2s" }}></div>
                      <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{ animationDuration: "0.8s", animationDelay: "0.4s" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Scroll to bottom anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input - fixed at bottom */}
          <div className="bg-gray-900 backdrop-blur-sm border-t border-gray-800 p-3 md:p-4 flex-shrink-0 pb-safe">
            <form
              onSubmit={onSubmit}
              className="relative max-w-5xl mx-auto w-full flex items-center space-x-2 md:space-x-4"
            >
              <input
                ref={inputRef}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 md:px-4 md:py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-500 text-sm md:text-base text-white shadow-inner"
                placeholder="Type a message..."
                value={message}
                onChange={handleMessageChange}
                disabled={isTyping || isSending}
              />
              <button
                type="submit"
                disabled={isTyping || !message.trim() || isSending}
                className={`p-2 md:p-3 rounded-xl focus:outline-none transition-all ${isTyping || !message.trim() || isSending
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:shadow-md"
                  }`}
              >
                <FaPaperPlane size={16} className="md:text-lg" />
              </button>
            </form>
          </div>
        </div>

        {/* Info overlay */}
        {showInfo && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 overflow-hidden animate-fadeIn backdrop-blur-sm"
            onClick={() => setShowInfo(false)}
          >
            <div
              className="bg-gray-900 rounded-xl shadow-xl p-6 md:p-8 m-4 max-w-4xl w-[90%] max-h-[80vh] overflow-y-auto animate-slideIn custom-scrollbar border border-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                <h3 className="text-xl font-semibold text-white">
                  About This Twin
                </h3>
                <button
                  onClick={() => setShowInfo(false)}
                  className="p-1 w-8 h-8 rounded-full bg-gray-800 text-gray-300 flex items-center justify-center hover:bg-gray-700 transition-all duration-200 shadow-sm"
                >
                  ✕
                </button>
              </div>

              {/* Edit Bio Button - don't close the info panel */}
              {authUser && authUser.id === user?.auth_user_id && (
                <div className="mb-4 flex">
                  <button
                    onClick={() => {
                      setShowBioModal(true);
                      // Don't close the info panel
                    }}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center transition-all duration-200 hover:underline"
                  >
                    Edit Description
                  </button>
                </div>
              )}

              {/* Twin Personality Section */}
              <div className="space-y-6">
                <div className="mb-6 bg-gray-800 p-5 rounded-xl shadow-md border border-gray-700">
                  <h4 className="text-lg font-semibold text-blue-300 mb-4">
                    Personality Profile
                  </h4>

                  <div className="flex flex-col gap-4">
                    <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
                      <div className="grid gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">About {user?.name}</h3>
                          <div className="mt-3 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                            {user?.twinPersonality?.summary || "No description available"}
                          </div>
                          {authUser && authUser.id === user?.auth_user_id && (
                            <button
                              onClick={() => setShowBioModal(true)}
                              className="mt-3 text-sm text-blue-400 hover:text-blue-300 font-medium"
                            >
                              Edit Description
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Add Emotional Analysis Component */}
                    <TwinEmotionalAnalysis
                      twinPersonality={user?.twinPersonality}
                      messageCount={messages.length}
                    />
                  </div>
                </div>

                {/* Letterboxd Section */}
                <div className="mb-6 bg-gray-800 p-5 rounded-xl shadow-md border border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-amber-300">
                      Film Preferences
                    </h4>
                    {authUser && authUser.id === user?.auth_user_id && (
                      <button
                        onClick={() => {
                          setShowLetterboxdModal(true);
                          // Don't close the info panel
                        }}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-all duration-200 hover:underline flex items-center"
                      >
                        Update
                      </button>
                    )}
                  </div>

                  {user.letterboxd_data?.status === 'success' && user.letterboxd_data.recentRatings && user.letterboxd_data.recentRatings.length > 0 ? (
                    <div>
                      <div className="mb-5">
                        <h5 className="font-medium text-gray-300 mb-2">Recent Ratings</h5>
                        <div className="space-y-3">
                          {user.letterboxd_data.recentRatings.slice(0, 5).map((rating, i) => (
                            <div key={i} className="bg-gray-700/80 p-3 rounded-lg border border-gray-600 flex justify-between items-center hover:bg-gray-700 transition-colors">
                              <span className="text-white flex-1 font-medium">{rating.title}</span>
                              <span className="text-amber-400 font-medium flex-shrink-0 ml-2">{getRatingStars(parseFloat(rating.rating))}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {user.letterboxd_data.favoriteGenres && user.letterboxd_data.favoriteGenres.length > 0 && (
                        <div className="mb-5">
                          <h5 className="font-medium text-gray-300 mb-2">Favorite Genres</h5>
                          <div className="flex flex-wrap gap-2">
                            {user.letterboxd_data.favoriteGenres.map((genre, i) => (
                              <span key={i} className="bg-gray-700/80 px-3 py-1.5 rounded-full border border-gray-600 text-amber-300 text-sm font-medium shadow-sm">
                                {genre}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {user.letterboxd_data.favoriteFilms && user.letterboxd_data.favoriteFilms.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-300 mb-2">Favorite Films</h5>
                          <div className="space-y-2">
                            {user.letterboxd_data.favoriteFilms.map((film, i) => (
                              <div key={i} className="bg-gray-700/80 p-3 rounded-lg border border-gray-600 text-white flex items-center">
                                <span className="text-amber-400 mr-2">★</span> {film}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-700/80 p-6 rounded-lg border border-gray-600 text-center">
                      {authUser && authUser.id === user?.auth_user_id ? (
                        <div className="text-center">
                          <p className="text-gray-300 mb-3">No Letterboxd data available.</p>
                          <button
                            onClick={() => {
                              setShowLetterboxdModal(true);
                              // Don't close the info panel
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            Connect Letterboxd
                          </button>
                        </div>
                      ) : (
                        <p className="text-gray-300">No film preferences available for this twin.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Spotify Section */}
                <div className="mb-6 bg-gray-800 p-5 rounded-xl shadow-md border border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-green-300">
                      Music Preferences
                    </h4>
                    {authUser && authUser.id === user?.auth_user_id && (
                      <button
                        onClick={() => {
                          setShowSpotifyConnect(true);
                          // Don't close the info panel
                        }}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-all duration-200 hover:underline flex items-center"
                      >
                        Reconnect
                      </button>
                    )}
                  </div>

                  {user.spotify_data?.status === 'success' && user.spotify_data.topArtists && user.spotify_data.topArtists.length > 0 ? (
                    <div>
                      <div className="mb-5">
                        <h5 className="font-medium text-gray-300 mb-2">Top Artists</h5>
                        <div className="space-y-2">
                          {user.spotify_data.topArtists.slice(0, 5).map((artist, i) => (
                            <div key={i} className="bg-gray-700/80 p-3 rounded-lg border border-gray-600 text-white">
                              {artist}
                            </div>
                          ))}
                        </div>
                      </div>

                      {user.spotify_data.topGenres && user.spotify_data.topGenres.length > 0 && (
                        <div className="mb-5">
                          <h5 className="font-medium text-gray-300 mb-2">Top Genres</h5>
                          <div className="flex flex-wrap gap-2">
                            {user.spotify_data.topGenres.map((genre, i) => (
                              <span key={i} className="bg-gray-700/80 px-3 py-1 rounded-full border border-gray-600 text-green-300 text-sm">
                                {genre}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {user.spotify_data.recentTracks && user.spotify_data.recentTracks.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-300 mb-2">Recent Tracks</h5>
                          <div className="space-y-2">
                            {user.spotify_data.recentTracks.slice(0, 5).map((track, i) => (
                              <div key={i} className="bg-gray-700/80 p-3 rounded-lg border border-gray-600 text-white">
                                <div className="font-medium">{track.name}</div>
                                <div className="text-sm text-gray-400">{track.artist}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-700/80 p-4 rounded-lg border border-gray-600 text-gray-300">
                      {authUser && authUser.id === user?.auth_user_id ? (
                        <div className="text-center">
                          <p>No Spotify data available.</p>
                          <button
                            onClick={() => {
                              setShowSpotifyConnect(true);
                              // Don't close the info panel
                            }}
                            className="mt-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-md text-sm font-medium transition-all duration-200"
                          >
                            Connect Spotify
                          </button>
                        </div>
                      ) : (
                        <p>No music preferences available for this twin.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modals with increased z-index */}
        {showEditBio && user && (
          <DescriptionEditModal
            isOpen={showEditBio}
            onClose={() => setShowEditBio(false)}
            currentBio={user.twinPersonality?.summary || ''}
            twinId={String(user.id)}
            onUpdate={(updatedBio) => {
              setShowEditBio(false);
              router.refresh();
            }}
          />
        )}

        {showLetterboxdModal && user && (
          <LetterboxdEditModal
            isOpen={showLetterboxdModal}
            onClose={() => setShowLetterboxdModal(false)}
            currentLetterboxdUrl={user.letterboxd_url || ''}
            twinId={String(user.id)}
            onUpdate={() => {
              setShowLetterboxdModal(false);
              router.refresh();
            }}
          />
        )}

        {showSpotifyConnect && user && (
          <SpotifyConnectModal
            isOpen={showSpotifyConnect}
            onClose={() => setShowSpotifyConnect(false)}
            twinId={String(user.id)}
            onConnect={() => {
              setShowSpotifyConnect(false);
              router.refresh();
            }}
          />
        )}

        {showBioModal && user && params.id && (
          <DescriptionEditModal
            isOpen={showBioModal}
            onClose={() => setShowBioModal(false)}
            currentBio={user.twinPersonality?.summary || ''}
            twinId={typeof params.id === 'string' ? params.id : params.id[0]}
            onUpdate={(updatedBio) => {
              // Update the local state with the new description
              const updatedUser = { ...user };
              if (updatedUser.twinPersonality) {
                updatedUser.twinPersonality.summary = updatedBio;
              } else {
                // Create a complete personality object with the required properties
                updatedUser.twinPersonality = {
                  summary: updatedBio,
                  traits: [],
                  interests: [],
                  style: ''
                };
              }
              setUser(updatedUser);
            }}
          />
        )}
      </div>
    </div>
  );
} 