'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft, FaInfoCircle, FaPaperPlane, FaFilm, FaStar, FaMusic, FaSpotify } from 'react-icons/fa';
import SpotifyConnectButton from '@/components/spotify-connect-button';

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
  letterboxdUrl?: string;
  spotifyUrl?: string;
  letterboxdData?: {
    status: 'success' | 'error' | 'not_provided';
    recentRatings?: {
      title: string;
      rating: string;
      url?: string;
    }[];
    favoriteGenres?: string[];
    favoriteFilms?: string[];
  };
  spotifyData?: {
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

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showInfo, setShowInfo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

        // Fetch user data
        const userResponse = await fetch(`/api/users?id=${params.id}`);
        if (!userResponse.ok) {
          const errorData = await userResponse.json();
          throw new Error(errorData.error || 'Failed to fetch user data');
        }
        const userData = await userResponse.json();
        
        if (!userData) {
          throw new Error('User not found');
        }
        
        // Ensure all required data is present
        if (!userData.twinPersonality) {
          userData.twinPersonality = {
            interests: [],
            traits: [],
            summary: "This digital twin was created with minimal information.",
            style: "conversational"
          };
        }
        
        // Enhanced logging for Letterboxd data
        if (userData.letterboxdData) {
          if (userData.letterboxdData.status === 'success') {
            console.log('Letterboxd data loaded successfully:', {
              ratings: userData.letterboxdData.recentRatings?.length || 0,
              genres: userData.letterboxdData.favoriteGenres?.length || 0,
              favoriteFilms: userData.letterboxdData.favoriteFilms?.length || 0
            });
            
            // Log the actual data for debugging
            if (userData.letterboxdData.recentRatings && userData.letterboxdData.recentRatings.length > 0) {
              console.log('Sample ratings:', userData.letterboxdData.recentRatings.slice(0, 3));
            }
            if (userData.letterboxdData.favoriteGenres && userData.letterboxdData.favoriteGenres.length > 0) {
              console.log('Favorite genres:', userData.letterboxdData.favoriteGenres);
            }
            if (userData.letterboxdData.favoriteFilms && userData.letterboxdData.favoriteFilms.length > 0) {
              console.log('Favorite films:', userData.letterboxdData.favoriteFilms);
            }
          } else if (userData.letterboxdData.status === 'error') {
            console.error('Letterboxd data error:', userData.letterboxdData.error);
          } else {
            console.log('No Letterboxd data provided');
          }
        } else {
          console.log('Letterboxd data property missing entirely');
        }
        
        setUser(userData);

        // Fetch messages
        const messagesResponse = await fetch(`/api/messages?userId=${params.id}`);
        if (!messagesResponse.ok) {
          console.error('Error fetching messages:', await messagesResponse.text());
          // Don't throw here - we can still show the chat without messages
        } else {
          const messagesData = await messagesResponse.json();
          setMessages(messagesData);
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

  // Focus input field when page loads
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messageToSend = newMessage;
    setNewMessage('');
    setIsTyping(true);

    // Optimistically add user message to the UI
    const tempUserMessage = {
      id: Date.now(),
      content: messageToSend,
      isUser: true,
      createdAt: new Date().toISOString()
    };
    
    setMessages(prevMessages => [...prevMessages, tempUserMessage]);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          content: messageToSend,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      setIsTyping(false);
      
      // Replace the temp message with the real one and add AI response
      setMessages(prevMessages => [
        ...prevMessages.filter(msg => msg.id !== tempUserMessage.id),
        data.userMessage,
        data.assistantMessage
      ]);
    } catch (err) {
      setIsTyping(false);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      // Remove the temporary message if there was an error
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== tempUserMessage.id)
      );
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

  if (error) {
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

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="text-amber-600 font-bold mb-4 text-xl">Twin Not Found</div>
          <div className="text-gray-800 mb-6">
            We couldn&apos;t find the digital twin you&apos;re looking for.
          </div>
          <Link href="/" 
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Create a Twin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-r from-purple-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-md py-4 px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center">
          <Link href="/" className="mr-4 text-gray-600 hover:text-blue-600 transition-colors">
            <FaArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{user.name}&apos;s Digital Twin</h1>
            <p className="text-sm text-gray-500">AI personality based on your preferences</p>
          </div>
        </div>
        <div className="hidden md:block text-center font-medium text-gray-700">
          Start a Conversation
        </div>
        <button 
          className="p-2 rounded-full hover:bg-blue-50 text-blue-600 transition-colors"
          onClick={() => setShowInfo(!showInfo)}
          aria-label="Toggle twin information"
        >
          <FaInfoCircle size={20} />
        </button>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-6">
        {showInfo && (
          <div className="bg-white p-5 rounded-xl shadow-md mb-6 border-l-4 border-blue-500 animate-fadeIn">
            <h3 className="font-bold text-gray-800 mb-3 text-lg">About This Twin</h3>
            {user.twinPersonality ? (
              <>
                <p className="text-gray-700 mb-4">{user.twinPersonality.summary}</p>
                
                {/* Display letterboxd data if available */}
                {user.letterboxdData && user.letterboxdData.status === 'success' && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                    <div className="flex items-center mb-3">
                      <FaFilm className="text-indigo-600 mr-2" />
                      <h4 className="font-semibold text-gray-700">Letterboxd Movie Preferences</h4>
                    </div>
                    
                    {/* Favorite films */}
                    {user.letterboxdData.favoriteFilms && user.letterboxdData.favoriteFilms.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-sm font-medium text-gray-600 mb-2">Top Films</h5>
                        <div className="flex flex-wrap gap-1.5">
                          {user.letterboxdData.favoriteFilms.map((film, i) => (
                            <span key={i} className="bg-indigo-100 text-indigo-800 text-xs px-2.5 py-1 rounded-full flex items-center">
                              <FaStar className="text-yellow-500 mr-1 text-xs" /> {film}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Favorite genres */}
                    {user.letterboxdData.favoriteGenres && user.letterboxdData.favoriteGenres.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-sm font-medium text-gray-600 mb-2">Favorite Genres</h5>
                        <div className="flex flex-wrap gap-1.5">
                          {user.letterboxdData.favoriteGenres.map((genre, i) => (
                            <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full">
                              {genre}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Recent ratings */}
                    {user.letterboxdData.recentRatings && user.letterboxdData.recentRatings.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-600 mb-2">Recent Ratings</h5>
                        <div className="text-xs grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-2 rounded-md">
                          {user.letterboxdData.recentRatings.slice(0, 6).map((rating, i) => (
                            <div key={i} className="flex items-center justify-between border-b border-gray-100 pb-1.5 pt-1">
                              <span className="truncate mr-2">{rating.title}</span>
                              <span className="flex-shrink-0 bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                                {getRatingStars(parseFloat(rating.rating))}
                              </span>
                            </div>
                          ))}
                        </div>
                        {user.letterboxdUrl && (
                          <div className="mt-3 text-center">
                            <a 
                              href={user.letterboxdUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-block text-xs text-white bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded-full transition-colors"
                            >
                              View full profile on Letterboxd
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Add Spotify connect button if data is not available */}
                {user.spotifyData && user.spotifyData.status !== 'success' && (
                  <div className="mt-4 flex justify-center">
                    <SpotifyConnectButton userId={user.id} spotifyData={user.spotifyData} />
                  </div>
                )}
                
                {/* Display Spotify data if available */}
                {user.spotifyData && user.spotifyData.status === 'success' && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                    <div className="flex items-center mb-3">
                      <FaMusic className="text-green-600 mr-2" />
                      <h4 className="font-semibold text-gray-700">Spotify Music Preferences</h4>
                    </div>
                    
                    {/* Top Artists */}
                    {user.spotifyData.topArtists && user.spotifyData.topArtists.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-sm font-medium text-gray-600 mb-2">Top Artists</h5>
                        <div className="flex flex-wrap gap-1.5">
                          {user.spotifyData.topArtists.map((artist, i) => (
                            <span key={i} className="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full flex items-center">
                              <FaStar className="text-yellow-500 mr-1 text-xs" /> {artist}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Favorite Genres */}
                    {user.spotifyData.topGenres && user.spotifyData.topGenres.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-sm font-medium text-gray-600 mb-2">Music Genres</h5>
                        <div className="flex flex-wrap gap-1.5">
                          {user.spotifyData.topGenres.map((genre, i) => (
                            <span key={i} className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full">
                              {genre}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Recent Tracks */}
                    {user.spotifyData.recentTracks && user.spotifyData.recentTracks.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-600 mb-2">Recently Played</h5>
                        <div className="text-xs grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-2 rounded-md">
                          {user.spotifyData.recentTracks.slice(0, 6).map((track, i) => (
                            <div key={i} className="flex items-center justify-between border-b border-gray-100 pb-1.5 pt-1">
                              <div className="truncate mr-2">
                                <div className="font-medium">{track.name}</div>
                                <div className="text-gray-500 text-xs">{track.artist}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {user.spotifyUrl && (
                          <div className="mt-3 text-center">
                            <a 
                              href={user.spotifyUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-block text-xs text-white bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded-full transition-colors"
                            >
                              <div className="flex items-center">
                                <FaSpotify className="mr-1" /> View Spotify Profile
                              </div>
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-700">This digital twin was created with minimal information. Not enough data was available to create a detailed personality profile.</p>
            )}
          </div>
        )}

        <div className="space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.isUser ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-xl p-4 shadow-sm ${
                  message.isUser 
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
              <div className="max-w-[80%] bg-white rounded-xl p-4 shadow-sm">
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
      <div className="p-4 bg-white border-t shadow-md">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2 max-w-4xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-gray-400"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim() || isTyping}
            className="bg-blue-600 text-white p-3 rounded-full disabled:opacity-50 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="Send message"
          >
            <FaPaperPlane />
          </button>
        </form>
      </div>
    </div>
  );
} 