'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Message {
  id: number;
  content: string;
  isUser: boolean;
  createdAt: string;
}

interface User {
  id: number;
  name: string;
  bio: string;
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

  // Fetch user and messages on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch user data
        const userResponse = await fetch(`/api/users?id=${params.id}`);
        if (!userResponse.ok) {
          throw new Error('Failed to fetch user data');
        }
        const userData = await userResponse.json();
        setUser(userData);

        // Fetch messages
        const messagesResponse = await fetch(`/api/messages?userId=${params.id}`);
        if (!messagesResponse.ok) {
          throw new Error('Failed to fetch messages');
        }
        const messagesData = await messagesResponse.json();
        setMessages(messagesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-blue-600 font-bold">Loading...</div>
          <div className="text-gray-600">Please wait while we load your conversation</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md w-full bg-red-50 p-6 rounded-lg text-center">
          <div className="text-red-600 font-bold mb-2">Error</div>
          <div className="text-red-800 mb-4">{error}</div>
          <Link href="/" className="text-blue-600 hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md w-full bg-yellow-50 p-6 rounded-lg text-center">
          <div className="text-yellow-600 font-bold mb-2">Twin Not Found</div>
          <div className="text-gray-800 mb-4">
            We couldn&apos;t find the digital twin you&apos;re looking for.
          </div>
          <Link href="/" className="text-blue-600 hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm py-3 px-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="mr-3">
            <span className="text-gray-600">←</span>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">{user.name}&apos;s Digital Twin</h1>
            <p className="text-sm text-gray-500">Based on your personality and preferences</p>
          </div>
        </div>
        <button 
          className="p-2 rounded-full hover:bg-gray-100"
          onClick={() => setShowInfo(!showInfo)}
        >
          <span className="text-gray-600">ℹ️</span>
        </button>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-4">
        {showInfo && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h3 className="font-semibold mb-2">About This Twin</h3>
            <p className="text-sm mb-2">{user.twinPersonality.summary}</p>
            <div className="mb-2">
              <span className="text-xs font-medium">Interests: </span>
              <span className="text-xs">{user.twinPersonality.interests.join(', ')}</span>
            </div>
            <div>
              <span className="text-xs font-medium">Traits: </span>
              <span className="text-xs">{user.twinPersonality.traits.join(', ')}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <h2 className="text-xl font-semibold mb-2">Start a Conversation</h2>
              <p className="text-gray-600 max-w-md mb-6">
                This AI twin is based on your personality. Start chatting to see it in action!
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.isUser ? 'bg-blue-600 text-white' : 'bg-white shadow-sm'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))
          )}

          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-[80%] bg-gray-100 rounded-lg p-3">
                <div className="flex space-x-1">
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
      <div className="p-4 bg-white border-t">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim() || isTyping}
            className="bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
} 