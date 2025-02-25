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
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      
      // Replace the temp message with the real one and add AI response
      setMessages(prevMessages => [
        ...prevMessages.filter(msg => msg.id !== tempUserMessage.id),
        data.userMessage,
        data.assistantMessage
      ]);
    } catch (err) {
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
            We couldn't find the digital twin you're looking for.
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
      <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center">
        <div className="flex items-center">
          <div className="ml-2">
            <h1 className="text-xl font-semibold">{user.name}'s Digital Twin</h1>
            <p className="text-sm text-gray-500">Based on your personality and preferences</p>
          </div>
        </div>
        <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
          Home
        </Link>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-xl font-semibold mb-2">Welcome to Your Digital Twin!</h2>
            <p className="text-gray-600 max-w-md mb-6">
              This AI twin is based on your personality. Start a conversation to see it in action!
            </p>
            <div className="bg-blue-50 p-4 rounded-lg max-w-lg">
              <h3 className="font-medium mb-2">About Your Twin</h3>
              <p className="text-sm">{user.twinPersonality.summary}</p>
              <div className="mt-3">
                <span className="text-xs font-medium">Interests: </span>
                <span className="text-xs">{user.twinPersonality.interests.join(', ')}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 ${
                  message.isUser ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block max-w-md px-4 py-2 rounded-lg ${
                    message.isUser
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  {message.content}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type your message here..."
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 transition duration-200"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
} 