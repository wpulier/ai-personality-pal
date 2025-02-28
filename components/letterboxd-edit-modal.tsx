'use client';

import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { FaTimes } from 'react-icons/fa';

interface LetterboxdEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLetterboxdUrl: string;
  twinId: string;
  onUpdate: () => void;
}

export function LetterboxdEditModal({ 
  isOpen, 
  onClose, 
  currentLetterboxdUrl, 
  twinId, 
  onUpdate 
}: LetterboxdEditModalProps) {
  const [letterboxdUrl, setLetterboxdUrl] = useState(currentLetterboxdUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation - either empty or a valid Letterboxd URL
    if (letterboxdUrl && !letterboxdUrl.includes('letterboxd.com/')) {
      setError('Please enter a valid Letterboxd URL');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      console.log(`Updating Letterboxd URL for twin ${twinId} to: ${letterboxdUrl || 'empty'}`);
      
      const response = await fetch(`/api/twins/${twinId}/letterboxd`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ letterboxd_url: letterboxdUrl }),
      });
      
      // Log response status
      console.log(`Response status: ${response.status}`);
      
      // Get response data
      const data = await response.json();
      console.log('Response data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update Letterboxd URL');
      }
      
      console.log('Letterboxd URL updated successfully');
      onUpdate();
    } catch (err) {
      console.error('Error updating Letterboxd URL:', err);
      setError(err instanceof Error ? err.message : 'Failed to update Letterboxd URL. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[1000]">
      <div className="fixed inset-0 bg-black/30 z-[1000]" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4 z-[1001]">
        <Dialog.Panel className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-xl w-full z-[1002]">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-medium text-gray-900">
              Update Letterboxd Profile
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <FaTimes />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="letterboxdUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Letterboxd Profile URL
              </label>
              <input
                id="letterboxdUrl"
                type="text"
                value={letterboxdUrl}
                onChange={(e) => setLetterboxdUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              />
              {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              <p className="mt-1 text-xs text-gray-500">
                Enter your Letterboxd profile URL to enhance your twin with your movie preferences.
                Leave empty to remove your Letterboxd connection.
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 