'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { FaTimes } from 'react-icons/fa';

interface DescriptionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  twinId: string | number;
  currentBio: string;
  onUpdate: (updatedDescription: string) => void;
}

export function DescriptionEditModal({ isOpen, onClose, currentBio, twinId, onUpdate }: DescriptionEditModalProps) {
  const [description, setDescription] = useState(currentBio || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    // Update the description state when currentBio changes
    setDescription(currentBio || '');
  }, [currentBio]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (description.trim().length < 3) {
      setError('Description must be at least 3 characters long');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Call the API to update the summary 
      const response = await fetch(`/api/twins/${twinId}/summary`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ summary: description }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update description');
      }

      onUpdate(description);
      onClose();
    } catch (err) {
      console.error('Error updating description:', err);
      setError(err instanceof Error ? err.message : 'Failed to update description. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[1000]">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[1000]" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4 z-[1001]">
        <Dialog.Panel className="mx-auto max-w-lg rounded-lg bg-slate-900 border border-slate-800 p-6 shadow-xl w-full z-[1002]">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-medium text-white">
              Edit Twin Description
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300"
              aria-label="Close"
            >
              <FaTimes />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-200 mb-1">
                Personality Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-white"
                rows={6}
                placeholder="Describe your twin's personality in detail..."
              />
              {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
              <p className="mt-2 text-xs text-gray-400">
                This description defines how your twin sees themself and how they behave. 
                Be detailed about their personality, interests, and quirks.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-slate-800 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

// Backwards compatibility alias for existing code
export const BioEditModal = DescriptionEditModal; 