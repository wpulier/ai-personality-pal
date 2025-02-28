'use client';

import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { FaTimes, FaSpotify } from 'react-icons/fa';

interface SpotifyConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  twinId: string;
  onConnect: () => void;
}

export function SpotifyConnectModal({ 
  isOpen, 
  onClose, 
  twinId, 
  onConnect 
}: SpotifyConnectModalProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    setIsConnecting(true);
    setError('');
    
    try {
      // Add host as a parameter for better redirect handling
      const host = window.location.host;
      
      // Redirect to Spotify authorization with credentials
      window.location.href = `/api/auth/spotify?twinId=${twinId}&host=${encodeURIComponent(host)}`;
      // The onConnect callback will be handled after redirect from Spotify
    } catch (err) {
      console.error('Error connecting to Spotify:', err);
      setError('Failed to connect to Spotify. Please try again.');
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[1000]">
      <div className="fixed inset-0 bg-black/30 z-[1000]" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4 z-[1001]">
        <Dialog.Panel className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-xl w-full z-[1002]">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-medium text-gray-900">
              Connect Spotify
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <FaTimes />
            </button>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-700">
              Connect your Spotify account to enhance your twin with your music preferences.
              This will help your twin understand more about your musical taste.
            </p>
            
            {error && (
              <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isConnecting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 flex items-center"
            >
              <FaSpotify className="mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect Spotify'}
            </button>
          </div>
          
          <div className="mt-4 text-center text-xs text-gray-500">
            <p>We'll only access your listening history and preferences.</p>
            <p>You can disconnect at any time.</p>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 