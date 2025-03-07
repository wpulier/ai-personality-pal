'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft, FaInfoCircle, FaPaperPlane, FaUser } from 'react-icons/fa';
import { useAuth } from '@/lib/supabase/auth-context';
import { getTwin, getTwinMessages, createMessage, subscribeToMessages } from '@/lib/services/twin-service';
import { Twin, Message } from '@/lib/db/supabase-schema';

interface ChatInterfaceProps {
  twinId: number;
}

export default function ChatInterface({ twinId }: ChatInterfaceProps) {
  const [twin, setTwin] = useState<Twin | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [isRefreshingTwin, setIsRefreshingTwin] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user } = useAuth();

  // Fetch twin and messages
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch twin data
        const twinData = await getTwin(twinId);
        if (!twinData) {
          throw new Error('Twin not found');
        }
        setTwin(twinData);

        // Fetch messages
        const messagesData = await getTwinMessages(twinId);
        setMessages(messagesData);
        
        // If there are no messages, generate the first message
        if (messagesData.length === 0) {
          generateFirstMessage(twinId);
        }
      } catch (err) {
        console.error('Error loading chat data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chat data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [twinId]);

  // Function to generate the first message
  const generateFirstMessage = async (twinId: number) => {
    setIsTyping(true);
    
    try {
      const response = await fetch(`/api/twins/${twinId}/first-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate first message');
      }
      
      // The real-time subscription will handle adding the message to the UI
    } catch (error) {
      console.error('Error generating first message:', error);
      setIsTyping(false);
      setError(error instanceof Error ? error.message : 'Failed to generate first message');
    }
  };

  // Function to refresh twin data from the database
  const refreshTwinData = async () => {
    if (!twinId) return;
    
    setIsRefreshingTwin(true);
    try {
      // Clear browser cache for this specific request to ensure fresh data
      const cacheBreaker = new Date().getTime();
      
      // Use the direct-twin endpoint which bypasses RLS for guaranteed access
      console.log(`Fetching fresh twin data for ID ${twinId} from the database...`);
      const response = await fetch(`/api/direct-twin/${twinId}?cache=${cacheBreaker}`, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to refresh twin data: ${response.status} ${response.statusText}`);
      }
      
      const freshTwinData = await response.json();
      console.log('FRESH TWIN DATA FROM DATABASE:', freshTwinData);
      
      // Specifically log the letterboxd data for debugging
      if (freshTwinData.letterboxd_data) {
        console.log('LETTERBOXD DATA FROM DATABASE:', {
          status: freshTwinData.letterboxd_data.status,
          url: freshTwinData.letterboxd_url,
          favoriteFilms: freshTwinData.letterboxd_data.favoriteFilms,
          hasFavoriteFilms: freshTwinData.letterboxd_data.favoriteFilms && 
                          freshTwinData.letterboxd_data.favoriteFilms.length > 0,
          favoriteFilmsLength: freshTwinData.letterboxd_data.favoriteFilms?.length || 0
        });
      } else {
        console.log('NO LETTERBOXD DATA FOUND IN RESPONSE');
      }
      
      // Force a complete state update with the fresh data
      setTwin(null); // First clear the state to force a complete re-render
      setTimeout(() => setTwin(freshTwinData), 50); // Then set it with a small delay
    } catch (err) {
      console.error('Error refreshing twin data:', err);
    } finally {
      setIsRefreshingTwin(false);
    }
  };
  
  // Refresh twin data when info panel is opened
  useEffect(() => {
    if (showInfo) {
      refreshTwinData();
    }
  }, [showInfo, twinId]);

  // Open Letterboxd edit modal
  const handleEditLetterboxd = () => {
    // For now, we'll use a simple prompt to update the Letterboxd URL
    const currentUrl = twin?.letterboxd_url || '';
    const newUrl = window.prompt('Enter your Letterboxd profile URL:', currentUrl);
    
    if (newUrl !== null && newUrl !== currentUrl) {
      updateLetterboxdUrl(newUrl);
    }
  };

  // Update Letterboxd URL
  const updateLetterboxdUrl = async (url: string) => {
    try {
      setIsRefreshingTwin(true);
      console.log(`Sending Letterboxd update request for URL: ${url}`);
      
      const response = await fetch(`/api/twins/${twinId}/letterboxd`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ letterboxd_url: url }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update Letterboxd URL');
      }
      
      // Parse the response data which contains the updated twin
      const responseData = await response.json();
      console.log('LETTERBOXD UPDATE RESPONSE:', responseData);
      
      // Log specific data for debugging
      if (responseData.twin?.letterboxd_data) {
        console.log('LETTERBOXD DATA IN RESPONSE:', {
          status: responseData.twin.letterboxd_data.status,
          favoriteFilms: responseData.twin.letterboxd_data.favoriteFilms,
          hasFavoriteFilms: responseData.twin.letterboxd_data.favoriteFilms && 
                          responseData.twin.letterboxd_data.favoriteFilms.length > 0,
          favoriteFilmsLength: responseData.twin.letterboxd_data.favoriteFilms?.length || 0
        });
      }
      
      // Force state update with the new data
      if (responseData.twin) {
        console.log('Updating local twin state with data from API response');
        setTwin(responseData.twin);
      }
      
      // Force a complete database refresh after a short delay
      setTimeout(() => {
        console.log('Performing forced refresh after Letterboxd update');
        refreshTwinData();
      }, 500);
      
      // Show success message
      alert('Letterboxd profile updated successfully! Your twin now knows about your film preferences.');
    } catch (err) {
      console.error('Error updating Letterboxd URL:', err);
      alert('Failed to update Letterboxd URL. Please try again.');
    } finally {
      setIsRefreshingTwin(false);
    }
  };

  // Connect Spotify
  const handleConnectSpotify = async () => {
    try {
      // Add host as a parameter for better redirect handling
      const host = window.location.host;
      
      // Redirect to Spotify authorization with credentials
      window.location.href = `/api/auth/spotify?twinId=${twinId}&host=${encodeURIComponent(host)}`;
    } catch (err) {
      console.error('Error connecting to Spotify:', err);
      alert('Failed to connect to Spotify. Please try again.');
    }
  };

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!twinId) return;

    // Set up real-time subscription
    const unsubscribe = subscribeToMessages(twinId, (newMessage) => {
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      
      // If this is an AI message, stop the typing indicator
      if (!newMessage.is_user) {
        setIsTyping(false);
      }
    });

    // Clean up subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [twinId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input field when page loads
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !twin) return;

    const messageToSend = newMessage;
    setNewMessage('');
    setIsTyping(true);

    try {
      // Call the API to process the message
      const response = await fetch(`/api/twins/${twinId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageToSend,
          is_user: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      // The real-time subscription will handle adding the messages to the UI
      // No need to manually update the messages state here
    } catch (err) {
      console.error('Error sending message:', err);
      setIsTyping(false);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  // Format message content with paragraphs
  const formatMessageContent = (content: string) => {
    return content.split('\n').map((line, i) => (
      <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
    ));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <div className="mb-4 text-blue-600 font-bold text-lg">Loading your chat...</div>
          <div className="flex justify-center space-x-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !messages.length) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="text-red-600 font-bold mb-4 text-xl">Something went wrong</div>
          <div className="text-gray-800 mb-6 p-4 bg-red-50 rounded-lg border border-red-200">{error}</div>
          <Link href="/" 
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!twin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="text-amber-600 font-bold mb-4 text-xl">Twin Not Found</div>
          <div className="text-gray-800 mb-6">
            We couldn&apos;t find the digital twin you&apos;re looking for.
          </div>
          <Link href="/auth/signup" 
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Sign Up to Create a Twin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-r from-purple-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-md py-3 px-6 flex items-center sticky top-0 z-10">
        <div className="flex items-center flex-shrink-0 w-1/4">
          {!user && (
            <Link href="/" className="mr-4 text-gray-600 hover:text-blue-600 transition-colors">
              <FaArrowLeft size={16} />
            </Link>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-800 truncate">{twin.name}&apos;s Twin</h1>
            <p className="text-sm text-gray-500 hidden sm:block">AI personality based on your preferences</p>
          </div>
        </div>
        <div className="flex-1 w-2/4 flex justify-center">
          <span className="font-bold text-gray-800 text-xl">Chat</span>
        </div>
        <div className="flex-shrink-0 w-1/4 flex justify-end space-x-2">
          <button 
            className="p-2 rounded-full hover:bg-blue-50 text-blue-600 transition-colors"
            onClick={() => setShowInfo(!showInfo)}
            aria-label="Toggle twin information"
          >
            <FaInfoCircle size={18} />
          </button>
          {user && (
            <Link 
              href="/profile"
              className="p-2 rounded-full hover:bg-blue-50 text-blue-600 transition-colors"
              aria-label="Go to profile"
            >
              <FaUser size={18} />
            </Link>
          )}
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className={`bg-white p-4 rounded-xl shadow-md mb-4 border-l-4 border-red-500 animate-fadeIn`}>
            <p className={`text-sm text-red-700`}>
              {error}
            </p>
          </div>
        )}
        
        {showInfo && twin && (
          <div className="bg-white p-4 rounded-xl shadow-md mb-4 border-l-4 border-blue-500 animate-fadeIn">
            {/* Debug info at top of panel - only visible during development */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mb-2 text-xs">
                <summary className="cursor-pointer text-gray-500 font-medium">Debug Info</summary>
                <div className="mt-2 p-2 bg-gray-50 rounded text-gray-600">
                  <p><b>Twin ID:</b> {twinId}</p>
                  <p><b>Letterboxd URL:</b> {twin.letterboxd_url ? twin.letterboxd_url : 'Not set'}</p>
                  <p><b>Letterboxd Data Status:</b> {twin.letterboxd_data?.status || 'No status'}</p>
                  <p>
                    <b>Favorite Films:</b> {
                      twin.letterboxd_data?.favoriteFilms ? 
                        (twin.letterboxd_data.favoriteFilms.length > 0 ? 
                          `Found ${twin.letterboxd_data.favoriteFilms.length} films` : 
                          'Array exists but empty'
                        ) : 
                        'No favoriteFilms array'
                    }
                  </p>
                  <p><b>Raw letterboxd_data:</b></p>
                  <pre className="text-xs overflow-auto max-h-40 mt-1 p-1 bg-gray-100 rounded">
                    {JSON.stringify(twin.letterboxd_data, null, 2)}
                  </pre>
                </div>
              </details>
            )}
            
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-gray-800 text-lg">Twin Information</h3>
              <div className="flex gap-2 items-center">
                <button 
                  onClick={refreshTwinData}
                  disabled={isRefreshingTwin}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                  aria-label="Refresh twin data"
                >
                  {isRefreshingTwin ? 'Refreshing...' : 'Refresh'}
                </button>
                <button 
                  className="p-1 rounded-full text-gray-500 hover:bg-gray-100"
                  onClick={() => setShowInfo(false)}
                  aria-label="Close info"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="mb-3 text-sm text-gray-500 italic">
              This information comes directly from the database and represents what your twin knows about itself.
            </div>

            <div className="mb-4">
              <h4 className="text-md font-semibold text-gray-700 mb-1">Basic Info</h4>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="mb-1"><span className="font-medium">Name:</span> {twin.name}</p>
                {twin.bio && <p className="mb-1"><span className="font-medium">Bio:</span> {twin.bio}</p>}
                
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200">
                  <div>
                    <span className="font-medium">Letterboxd:</span>{' '}
                    {twin.letterboxd_url ? (
                      <a 
                        href={twin.letterboxd_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {twin.letterboxd_url.replace('https://letterboxd.com/', '')}
                      </a>
                    ) : (
                      <span className="text-gray-500 italic">Not connected</span>
                    )}
                  </div>
                  <button
                    onClick={handleEditLetterboxd}
                    className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 py-1 px-2 rounded"
                  >
                    {twin.letterboxd_url ? 'Edit' : 'Connect'}
                  </button>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <span className="font-medium">Spotify:</span>{' '}
                    {twin.spotify_data?.status === 'success' ? (
                      <span className="text-green-600">Connected</span>
                    ) : (
                      <span className="text-gray-500 italic">Not connected</span>
                    )}
                  </div>
                  <button
                    onClick={handleConnectSpotify}
                    className="text-sm bg-green-100 hover:bg-green-200 text-green-800 py-1 px-2 rounded"
                  >
                    {twin.spotify_data?.status === 'success' ? 'Reconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Letterboxd Data Section - with improved error handling */}
            {twin.letterboxd_url ? (
              <div className="mb-4">
                <h4 className="text-md font-semibold text-gray-700 mb-1">Letterboxd Profile</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  {/* Detailed Letterboxd Data Status */}
                  {twin.letterboxd_data?.status !== 'success' && (
                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                      <p><span className="font-medium">Status:</span> {twin.letterboxd_data?.status || 'Unknown'}</p>
                      <p className="mt-1 text-xs">
                        {typeof twin.letterboxd_data?.status === 'string' && twin.letterboxd_data.status.includes('pending') 
                          ? 'Your Letterboxd data is being processed. Please refresh in a moment.'
                          : 'There was an issue loading your Letterboxd data. Try refreshing or reconnecting.'
                        }
                      </p>
                      <button 
                        onClick={refreshTwinData}
                        className="mt-2 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 py-1 px-2 rounded"
                      >
                        Refresh Now
                      </button>
                    </div>
                  )}
                  
                  {/* Display raw Letterboxd data for debugging */}
                  <details className="text-xs mb-2">
                    <summary className="cursor-pointer text-gray-500">Debug raw data</summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                      {JSON.stringify(twin.letterboxd_data, null, 2)}
                    </pre>
                  </details>
                
                  {/* Favorite Films - with robust null/empty checks */}
                  {twin.letterboxd_data?.favoriteFilms && Array.isArray(twin.letterboxd_data.favoriteFilms) && twin.letterboxd_data.favoriteFilms.length > 0 ? (
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Favorite Films</h5>
                      <div className="flex flex-wrap gap-1.5">
                        {twin.letterboxd_data.favoriteFilms.map((film: string, i: number) => (
                          <span key={i} className="bg-amber-100 text-amber-900 text-xs px-2.5 py-1 rounded-full">
                            {film}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : twin.letterboxd_data?.status === 'success' ? (
                    <div className="mb-3 text-gray-500 italic text-sm">
                      No favorite films found in your Letterboxd profile.
                    </div>
                  ) : null}
                  
                  {/* Recent Ratings - with robust null/empty checks */}
                  {twin.letterboxd_data?.recentRatings && Array.isArray(twin.letterboxd_data.recentRatings) && twin.letterboxd_data.recentRatings.length > 0 ? (
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Recent Ratings</h5>
                      <div className="flex flex-col gap-1">
                        {twin.letterboxd_data.recentRatings.slice(0, 5).map((rating: any, i: number) => (
                          <div key={i} className="text-xs flex items-center">
                            <span className="font-medium">{rating.title}</span>
                            <span className="mx-1">-</span>
                            <span className="text-amber-600">{rating.rating}/10</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
            
            {/* Spotify Data Section */}
            {twin.spotify_data && twin.spotify_data.status === 'success' && (
              <div className="mb-4">
                <h4 className="text-md font-semibold text-gray-700 mb-1">Spotify Profile</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  {/* Top Artists */}
                  {twin.spotify_data.topArtists && twin.spotify_data.topArtists.length > 0 && (
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Top Artists</h5>
                      <div className="flex flex-wrap gap-1.5">
                        {twin.spotify_data.topArtists.slice(0, 5).map((artist: string, i: number) => (
                          <span key={i} className="bg-green-100 text-green-900 text-xs px-2.5 py-1 rounded-full">
                            {artist}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Top Genres */}
                  {twin.spotify_data.topGenres && twin.spotify_data.topGenres.length > 0 && (
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Top Genres</h5>
                      <div className="flex flex-wrap gap-1.5">
                        {twin.spotify_data.topGenres.slice(0, 5).map((genre: string, i: number) => (
                          <span key={i} className="bg-purple-100 text-purple-900 text-xs px-2.5 py-1 rounded-full">
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Add defensive check for twin_personality */}
            {twin.twin_personality ? (
              <div className="mb-4">
                <h4 className="text-md font-semibold text-gray-700 mb-1">Personality</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-700 mb-3">{twin.twin_personality.summary || 'No summary available.'}</p>
                  
                  {/* Display personality traits */}
                  <div className="mb-3">
                    {twin.twin_personality.interests && twin.twin_personality.interests.length > 0 && (
                      <div className="mb-2">
                        <h5 className="text-sm font-medium text-gray-700 mb-1">Interests</h5>
                        <div className="flex flex-wrap gap-1.5">
                          {twin.twin_personality.interests.map((interest, i) => (
                            <span key={i} className="bg-indigo-100 text-indigo-900 text-xs px-2.5 py-1 rounded-full">
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {twin.twin_personality.traits && twin.twin_personality.traits.length > 0 && (
                      <div className="mb-2">
                        <h5 className="text-sm font-medium text-gray-700 mb-1">Personality Traits</h5>
                        <div className="flex flex-wrap gap-1.5">
                          {twin.twin_personality.traits.map((trait, i) => (
                            <span key={i} className="bg-purple-100 text-purple-900 text-xs px-2.5 py-1 rounded-full">
                              {trait}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {twin.twin_personality.style && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-1">Communication Style</h5>
                        <p className="text-gray-700 text-sm">{twin.twin_personality.style}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-600 italic">Twin personality information is not available.</p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {messages.length === 0 && !isTyping && (
            <div className="text-center py-10">
              <p className="text-gray-500">No messages yet. Start a conversation!</p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.is_user ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-xl p-3 shadow-sm ${
                  message.is_user 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-800'
                }`}
              >
                <div className="text-sm">{formatMessageContent(message.content)}</div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-[80%] bg-white rounded-xl p-3 shadow-sm">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-3 bg-white border-t shadow-md">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2 max-w-4xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim() || isTyping}
            className="bg-blue-600 text-white p-3 rounded-full disabled:opacity-50 hover:bg-blue-700 transition-colors"
            aria-label="Send message"
          >
            <FaPaperPlane size={16} />
          </button>
        </form>
      </div>
    </div>
  );
} 