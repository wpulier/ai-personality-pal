'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaSpotify } from 'react-icons/fa';
import { TwinCreationLoading } from './twin-creation-loading';

interface UserFormProps {
  onError?: (error: string | null) => void;
}

export function UserForm({ onError }: UserFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [letterboxdUrl, setLetterboxdUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingTwin, setIsCreatingTwin] = useState(false);
  const [spotifyStatus, setSpotifyStatus] = useState<'not_connected' | 'connected' | 'error'>('not_connected');
  const [spotifyData, setSpotifyData] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    bio?: string;
    letterboxdUrl?: string;
  }>({});

  // Load saved form data from localStorage on initial render
  useEffect(() => {
    const savedName = localStorage.getItem('twin_form_name');
    const savedBio = localStorage.getItem('twin_form_bio');
    const savedLetterboxdUrl = localStorage.getItem('twin_form_letterboxd');
    
    if (savedName) setName(savedName);
    if (savedBio) setBio(savedBio);
    if (savedLetterboxdUrl) setLetterboxdUrl(savedLetterboxdUrl);
  }, []);

  // Save form data to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('twin_form_name', name);
    localStorage.setItem('twin_form_bio', bio);
    localStorage.setItem('twin_form_letterboxd', letterboxdUrl);
  }, [name, bio, letterboxdUrl]);

  // Check URL parameters on component mount to see if returning from Spotify auth
  useEffect(() => {
    const spotifySuccess = searchParams.get('spotify');
    const spotifyError = searchParams.get('error');
    const spotifyDataParam = searchParams.get('spotifyData');
    
    if (spotifySuccess === 'success' && spotifyDataParam) {
      try {
        // Decode and parse the Spotify data from URL
        const decodedData = JSON.parse(decodeURIComponent(spotifyDataParam));
        setSpotifyData(decodedData);
        setSpotifyStatus('connected');
        onError?.('Spotify connected successfully!');
      } catch (e) {
        console.error('Error parsing Spotify data:', e);
        setSpotifyStatus('error');
        onError?.('Error connecting Spotify: Invalid data format');
      }
    } else if (spotifyError) {
      setSpotifyStatus('error');
      onError?.(`Error connecting Spotify: ${spotifyError}`);
    }
  }, [searchParams, onError]);

  const validateForm = () => {
    const errors: {
      name?: string;
      bio?: string;
      letterboxdUrl?: string;
    } = {};
    let isValid = true;

    // Only validate bio as it's the most important field
    if (!bio.trim()) {
      errors.bio = 'Bio is required';
      isValid = false;
    } else if (bio.trim().length < 3) {
      errors.bio = 'Bio must be at least 3 characters';
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setValidationErrors({});
    onError?.(null);
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      setIsCreatingTwin(true);
      // Don't show error message text when starting creation
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name || 'Anonymous',
          bio,
          letterboxdUrl: letterboxdUrl || undefined,
          spotifyData: spotifyData || undefined
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Don't show success message text, the animation will indicate progress
        
        // Clear form data from localStorage on successful submission
        localStorage.removeItem('twin_form_name');
        localStorage.removeItem('twin_form_bio');
        localStorage.removeItem('twin_form_letterboxd');
        
        // Short delay to allow the animation to complete its progress
        setTimeout(() => {
          router.push(`/chat/${data.id}`);
        }, 1500);
      } else {
        // Generic error handling
        const errorData = await response.json();
        
        if (errorData.details && Array.isArray(errorData.details)) {
          // Simple validation error handling
          const errors: Record<string, string> = {};
          
          errorData.details.forEach((error: any) => {
            if (error.path && error.path[0] && error.message) {
              errors[error.path[0]] = error.message;
            }
          });
          
          if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
          } else {
            onError?.('Please check the form for errors');
          }
        } else {
          onError?.(errorData.error || 'Failed to create digital twin');
        }
      }
    } catch (error) {
      console.error('Error creating digital twin:', error);
      onError?.('Network error. Please try again later.');
    } finally {
      setIsSubmitting(false);
      // Keep isCreatingTwin true if we're successful and waiting for redirect
    }
  };
  
  return (
    <>
      {isCreatingTwin && <TwinCreationLoading />}
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Your Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className={`w-full rounded-md border ${validationErrors.name ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-black placeholder:text-gray-400`}
            disabled={isSubmitting}
          />
          {validationErrors.name && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
            About You
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Share a brief description about yourself (at least 3 characters)..."
            className={`w-full rounded-md border ${validationErrors.bio ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-black placeholder:text-gray-400 min-h-[120px]`}
            disabled={isSubmitting}
          />
          {validationErrors.bio && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.bio}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <label htmlFor="letterboxdUrl" className="block text-sm font-medium text-gray-700">
            Letterboxd Profile URL (Optional)
          </label>
          <input
            id="letterboxdUrl"
            type="text"
            value={letterboxdUrl}
            onChange={(e) => setLetterboxdUrl(e.target.value)}
            placeholder="https://letterboxd.com/yourusername"
            className={`w-full rounded-md border ${validationErrors.letterboxdUrl ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-black placeholder:text-gray-400`}
            disabled={isSubmitting}
          />
          {validationErrors.letterboxdUrl && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.letterboxdUrl}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Spotify Music Preferences (Optional)
          </label>
          <div className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-md bg-gray-50">
            {spotifyStatus === 'connected' ? (
              <div className="flex items-center text-green-700">
                <FaSpotify className="mr-2" size={20} />
                <span className="font-medium">Spotify Connected</span>
                <span className="ml-2 text-xs text-gray-500">
                  ({spotifyData?.topArtists?.length || 0} artists, {spotifyData?.recentTracks?.length || 0} tracks)
                </span>
              </div>
            ) : (
              <div className="w-full flex items-center justify-between">
                <span className="text-gray-500 text-sm">Connect your Spotify account to enhance your twin's music preferences</span>
                <a 
                  href="/api/auth/spotify?redirect=home"
                  onClick={() => {
                    // Ensure form data is saved before redirecting
                    localStorage.setItem('twin_form_name', name);
                    localStorage.setItem('twin_form_bio', bio);
                    localStorage.setItem('twin_form_letterboxd', letterboxdUrl);
                  }}
                  className="flex-shrink-0 flex items-center justify-center py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors text-sm font-medium"
                >
                  <FaSpotify className="mr-2" size={16} />
                  {spotifyStatus === 'error' ? 'Retry Connection' : 'Connect Spotify'}
                </a>
              </div>
            )}
          </div>
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md font-medium text-base"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create My Digital Twin'}
        </button>
      </form>
    </>
  );
} 