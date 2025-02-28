'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaSpotify } from 'react-icons/fa';
import { TwinCreationLoading } from './twin-creation-loading';
import { createTwin } from '@/lib/services/twin-service';
import { handleAuthError } from '@/lib/supabase/client';

interface UserFormProps {
  onTwinCreated?: (twinId: number) => void;
  authUserId?: string;
  onError?: (error: string) => void;
}

export function UserForm({ onTwinCreated, authUserId, onError }: UserFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreatingTwin, setIsCreatingTwin] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [letterboxdUrl, setLetterboxdUrl] = useState('');
  const [spotifyStatus, setSpotifyStatus] = useState<'none' | 'connected' | 'error'>('none');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [spotifyData, setSpotifyData] = useState(null);

  // Load saved form data from localStorage on initial render
  useEffect(() => {
    const savedName = localStorage.getItem('twin_form_name');
    const savedBio = localStorage.getItem('twin_form_bio');
    const savedLetterboxd = localStorage.getItem('twin_form_letterboxd');
    
    if (savedName) setName(savedName);
    if (savedBio) setBio(savedBio);
    if (savedLetterboxd) setLetterboxdUrl(savedLetterboxd);
  }, []);

  // Check for Spotify authorization response
  useEffect(() => {
    const spotifyStatus = searchParams.get('spotify');
    const spotifyError = searchParams.get('error');
    const spotifyDataParam = searchParams.get('spotifyData');
    
    // Handle returned Spotify data
    if (spotifyStatus === 'success' && spotifyDataParam) {
      try {
        // Decode and parse the Spotify data from URL
        const decodedData = JSON.parse(decodeURIComponent(spotifyDataParam));
        console.log('Spotify data received:', decodedData);
        setSpotifyData(decodedData);
        setSpotifyStatus('connected');
        setErrorMessage('Spotify connected successfully!');
      } catch (e) {
        console.error('Error parsing Spotify data:', e);
        setSpotifyStatus('error');
        setErrorMessage('Error connecting Spotify: Invalid data format');
      }
    } else if (spotifyError) {
      setSpotifyStatus('error');
      setErrorMessage(spotifyError);
    }
  }, [searchParams]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!bio || bio.trim().length < 3) {
      errors.bio = 'Bio is required and must be at least 3 characters';
    }
    
    if (letterboxdUrl && !letterboxdUrl.includes('letterboxd.com/')) {
      errors.letterboxdUrl = 'Invalid Letterboxd URL';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setValidationErrors({});
    setErrorMessage(null);
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsCreatingTwin(true);

    try {
      // Create the twin with Spotify data if available
      console.log('Creating twin with auth_user_id:', authUserId);
      console.log('Including Spotify data:', spotifyData ? 'Yes' : 'No');
      
      const twin = await createTwin({
        name: name || 'Anonymous',
        bio,
        letterboxd_url: letterboxdUrl || null,
        auth_user_id: authUserId,
        spotify_data: spotifyData // Include the Spotify data if available
      });

      if (!twin) {
        throw new Error('Failed to create twin');
      }

      // Clear saved form data
      localStorage.removeItem('twin_form_name');
      localStorage.removeItem('twin_form_bio');
      localStorage.removeItem('twin_form_letterboxd');

      // Show success message
      setErrorMessage('Twin created successfully!');

      // Redirect or call the callback
      if (onTwinCreated) {
        onTwinCreated(twin.id);
      } else {
        router.push(`/chat/${twin.id}`);
      }
    } catch (error) {
      console.error('Error creating twin:', error);
      
      // Check if this is an auth error (like invalid refresh token)
      const isAuthError = await handleAuthError(error);
      if (isAuthError) {
        // If auth error was handled, show a specific message and redirect to login
        setErrorMessage('Your session has expired. Please sign in again.');
        if (onError) onError('Your session has expired. Please sign in again.');
        setIsCreatingTwin(false);
        
        // Save form data before redirecting
        localStorage.setItem('twin_form_name', name);
        localStorage.setItem('twin_form_bio', bio);
        localStorage.setItem('twin_form_letterboxd', letterboxdUrl);
        
        // Redirect after a short delay
        setTimeout(() => {
          const currentUrl = window.location.href;
          const returnPath = encodeURIComponent(currentUrl);
          router.push(`/auth/login?returnTo=${returnPath}`);
        }, 2000);
        return;
      }
      
      const errorMsg = error instanceof Error ? error.message : 'Failed to create twin';
      setErrorMessage(errorMsg);
      if (onError) onError(errorMsg);
      setIsCreatingTwin(false);
    }
  };

  const handleSpotifyConnect = () => {
    console.log('Connecting to Spotify with user ID:', authUserId);
    
    // Store form data in localStorage to prevent loss during redirect
    localStorage.setItem('twin_form_name', name);
    localStorage.setItem('twin_form_bio', bio);
    localStorage.setItem('twin_form_letterboxd', letterboxdUrl);
    console.log('Saved form data to localStorage before Spotify redirect');
    
    // Get the current hostname and port for proper callback
    const currentHost = window.location.host;
    console.log('Current host for Spotify redirect:', currentHost);
    
    // Redirect to Spotify auth with user ID in state if available,
    // otherwise use creation=true for the twin creation flow
    if (authUserId) {
      console.log('Redirecting to Spotify auth with user ID:', authUserId);
      window.location.href = `/api/auth/spotify?userId=${authUserId}&host=${encodeURIComponent(currentHost)}`;
    } else {
      console.log('No user ID available, using creation=true state for twin creation flow');
      window.location.href = `/api/auth/spotify?creation=true&host=${encodeURIComponent(currentHost)}`;
    }
  };

  return (
    <div className="space-y-6 py-6">
      <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">Create Your Digital Twin</h2>
      
      {errorMessage && (
        <div className={`p-4 rounded-lg shadow-sm ${errorMessage.includes('Error') ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'} animate-fadeIn`}>
          {errorMessage}
        </div>
      )}
      
      {isCreatingTwin ? (
        <TwinCreationLoading />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name (optional)
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call you? (Optional)"
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border transition-colors bg-white text-black"
            />
          </div>
          
          <div className="space-y-1">
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
              Bio <span className="text-red-500">*</span>
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Tell us about yourself - hobbies, interests, personality, music taste, etc."
              className={`mt-1 block w-full rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border transition-colors bg-white text-black ${
                validationErrors.bio ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            ></textarea>
            {validationErrors.bio && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.bio}</p>
            )}
          </div>
          
          <div className="space-y-1">
            <label htmlFor="letterboxdUrl" className="block text-sm font-medium text-gray-700">
              Letterboxd Profile URL (optional)
            </label>
            <input
              type="text"
              id="letterboxdUrl"
              value={letterboxdUrl}
              onChange={(e) => setLetterboxdUrl(e.target.value)}
              placeholder="https://letterboxd.com/yourusername/"
              className={`mt-1 block w-full rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border transition-colors bg-white text-black ${
                validationErrors.letterboxdUrl ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            />
            {validationErrors.letterboxdUrl && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.letterboxdUrl}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Your Letterboxd profile will be used to enhance your twin with your movie preferences.
            </p>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-5 bg-gradient-to-r from-gray-50 to-white shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="font-medium text-gray-800">Connect Spotify</h3>
                <span className="text-gray-500 text-sm">Connect your Spotify account to enhance your twin's music preferences</span>
              </div>
              <button
                type="button"
                onClick={handleSpotifyConnect}
                className={`flex-shrink-0 flex items-center justify-center py-2 px-4 rounded-lg transition-colors text-sm font-medium shadow-sm ${
                  spotifyStatus === 'connected' 
                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <FaSpotify className="mr-2" />
                {spotifyStatus === 'connected' ? 'Connected!' : 'Connect'}
              </button>
            </div>
            {spotifyStatus === 'connected' && (
              <p className="text-sm text-green-600 bg-green-50 p-2 rounded-lg mt-2">
                Your Spotify account is connected! Your twin will reflect your music preferences.
              </p>
            )}
            {spotifyStatus === 'error' && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg mt-2">
                Failed to connect Spotify. Please try again.
              </p>
            )}
          </div>
          
          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Create Your Digital Twin
          </button>
        </form>
      )}
    </div>
  );
} 