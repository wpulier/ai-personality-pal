'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaSpotify } from 'react-icons/fa';
import { TwinCreationLoading } from './twin-creation-loading';
import { createTwin } from '@/lib/services/twin-service';

interface UserFormProps {
  onTwinCreated?: (twinId: number) => void;
  authUserId?: string;
  onError?: (error: string) => void;
}

// Loading component for Suspense fallback
function FormLoading() {
  return (
    <div className="flex justify-center items-center py-10">
      <div className="animate-pulse space-y-4 w-full">
        <div className="h-10 bg-gray-300 rounded w-1/2 mx-auto"></div>
        <div className="h-32 bg-gray-300 rounded"></div>
        <div className="h-10 bg-gray-300 rounded"></div>
        <div className="h-10 bg-gray-300 rounded w-1/2 mx-auto"></div>
      </div>
    </div>
  );
}

// The actual form component that uses useSearchParams
function UserFormContent({ onTwinCreated, authUserId, onError }: UserFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreatingTwin, setIsCreatingTwin] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [letterboxdUrl, setLetterboxdUrl] = useState('');
  const [spotifyStatus, setSpotifyStatus] = useState<'none' | 'connected' | 'error'>('none');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Define a proper type for Spotify data
  interface SpotifyData {
    status: string;
    topArtists?: string[];
    topGenres?: string[];
    recentTracks?: Array<{
      name: string;
      artist: string;
      playedAt: string;
    }>;
  }

  const [spotifyData, setSpotifyData] = useState<SpotifyData | null>(null);

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

        // Clean the URL to remove Spotify parameters
        // This prevents issues with page refreshes and makes the URL cleaner
        if (window.history.replaceState) {
          const url = new URL(window.location.href);
          url.searchParams.delete('spotify');
          url.searchParams.delete('spotifyData');
          window.history.replaceState({}, document.title, url.toString());
        }
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

      // Set a timeout for the twin creation process
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Twin creation timed out')), 60000); // 60 second timeout
      });

      // Race the twin creation against the timeout
      const twin = await Promise.race([
        createTwin({
          name: name || 'Anonymous',
          bio,
          letterboxd_url: letterboxdUrl || null,
          auth_user_id: authUserId,
          spotify_data: spotifyData // Include the Spotify data if available
        }),
        timeoutPromise
      ]) as any;

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

      // Check if this is a timeout error
      if (error instanceof Error && error.message === 'Twin creation timed out') {
        setErrorMessage('Creating your twin is taking longer than expected. Please try again with a simpler bio or try again later.');
        if (onError) onError('Creating your twin is taking longer than expected. Please try again with a simpler bio or try again later.');
        setIsCreatingTwin(false);
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

    // Use a simple state parameter for the creation flow
    // This ensures consistent handling in the callback
    window.location.href = `/api/auth/spotify?state=home&host=${encodeURIComponent(currentHost)}`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center mb-4 text-white">Create Your Digital Twin</h2>

      {errorMessage && (
        <div className={`p-4 rounded-lg shadow-sm ${errorMessage.includes('Error') ? 'bg-red-900/30 text-red-300 border border-red-700' : 'bg-green-900/30 text-green-300 border border-green-700'} animate-fadeIn`}>
          {errorMessage}
        </div>
      )}

      {isCreatingTwin ? (
        <TwinCreationLoading />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label htmlFor="name" className="block text-sm font-medium text-gray-200">
              Name (optional)
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call you? (Optional)"
              className="mt-1 block w-full rounded-lg border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border transition-all duration-200 bg-gray-800 text-white focus:shadow-md"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="bio" className="block text-sm font-medium text-gray-200">
              Bio <span className="text-red-400">*</span>
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Tell us about yourself - hobbies, interests, personality, music taste, etc."
              className={`mt-1 block w-full rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border transition-all duration-200 bg-gray-800 text-white focus:shadow-md ${validationErrors.bio ? 'border-red-500 bg-red-900/20' : 'border-gray-700'
                }`}
            ></textarea>
            {validationErrors.bio && (
              <p className="mt-1 text-sm text-red-400">{validationErrors.bio}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="letterboxdUrl" className="block text-sm font-medium text-gray-200">
              Letterboxd Profile URL (optional)
            </label>
            <input
              type="text"
              id="letterboxdUrl"
              value={letterboxdUrl}
              onChange={(e) => setLetterboxdUrl(e.target.value)}
              placeholder="https://letterboxd.com/yourusername/"
              className={`mt-1 block w-full rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border transition-all duration-200 bg-gray-800 text-white focus:shadow-md ${validationErrors.letterboxdUrl ? 'border-red-500 bg-red-900/20' : 'border-gray-700'
                }`}
            />
            {validationErrors.letterboxdUrl && (
              <p className="mt-1 text-sm text-red-400">{validationErrors.letterboxdUrl}</p>
            )}
            <p className="mt-1 text-sm text-gray-400">
              Your Letterboxd profile will be used to enhance your twin with your movie preferences.
            </p>
          </div>

          <div className="border border-gray-700 rounded-lg p-5 bg-gray-800/50 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h3 className="font-medium text-white">Connect Spotify</h3>
                <span className="text-gray-300 text-sm">Connect your Spotify account to enhance your twin's music preferences</span>
              </div>
              <button
                type="button"
                onClick={handleSpotifyConnect}
                className={`flex items-center justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium w-auto 
                  ${spotifyStatus === 'connected'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-[#1DB954] hover:bg-[#1aa34b] text-white'}`}
              >
                {spotifyStatus === 'connected' ? (
                  <>
                    <span className="mr-2">✓</span>
                    Spotify Connected
                  </>
                ) : (
                  <>
                    <FaSpotify className="mr-2 text-lg" />
                    Connect Spotify
                  </>
                )}
              </button>
            </div>
            {spotifyStatus === 'connected' && spotifyData && (
              <div className="mt-4 p-3 bg-green-900/30 border border-green-800 rounded-md animate-fadeIn">
                <p className="text-sm text-green-400 font-medium">Spotify connected! We found:</p>
                {spotifyData.topArtists && spotifyData.topArtists.length > 0 && (
                  <div className="mt-1">
                    <p className="text-xs text-green-300">Top Artists: {spotifyData.topArtists.slice(0, 3).join(', ')}</p>
                  </div>
                )}
                {spotifyData.topGenres && spotifyData.topGenres.length > 0 && (
                  <div className="mt-1">
                    <p className="text-xs text-green-300">Top Genres: {spotifyData.topGenres.slice(0, 3).join(', ')}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover:shadow-md"
          >
            Create Your Digital Twin
          </button>
        </form>
      )}
    </div>
  );
}

// Main exported component with Suspense
export function UserForm(props: UserFormProps) {
  return (
    <Suspense fallback={<FormLoading />}>
      <UserFormContent {...props} />
    </Suspense>
  );
} 