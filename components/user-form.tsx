'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserFormProps {
  onError?: (error: string | null) => void;
}

interface ValidationError {
  path: string[];
  message: string;
}

export function UserForm({ onError }: UserFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [letterboxdUrl, setLetterboxdUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    bio?: string;
    letterboxdUrl?: string;
  }>({});

  const validateForm = () => {
    const errors: {
      name?: string;
      bio?: string;
      letterboxdUrl?: string;
    } = {};
    let isValid = true;

    // Validate name
    if (!name.trim()) {
      errors.name = 'Name is required';
      isValid = false;
    }

    // Validate bio - must be at least 3 characters
    if (!bio.trim()) {
      errors.bio = 'Bio is required';
      isValid = false;
    } else if (bio.trim().length < 3) {
      errors.bio = 'Bio must be at least 3 characters';
      isValid = false;
    }

    // Validate letterboxdUrl if provided
    if (letterboxdUrl && !letterboxdUrl.startsWith('https://letterboxd.com/')) {
      errors.letterboxdUrl = 'Must be a valid Letterboxd URL';
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
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          bio,
          letterboxdUrl: letterboxdUrl || undefined
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.details) {
          // Handle validation errors from the server
          const serverErrors = errorData.details.reduce((acc: Record<string, string>, error: ValidationError) => {
            acc[error.path[0]] = error.message;
            return acc;
          }, {});
          setValidationErrors(serverErrors);
          throw new Error('Please fix the validation errors');
        } else {
          throw new Error(errorData.error || 'Failed to create digital twin');
        }
      }
      
      const data = await response.json();
      router.push(`/chat/${data.id}`);
    } catch (error) {
      console.error('Error creating digital twin:', error);
      onError?.(error instanceof Error ? error.message : 'An error occurred while creating your digital twin');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
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
          className={`w-full rounded-md border ${validationErrors.name ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-sm`}
          disabled={isSubmitting}
        />
        {validationErrors.name && (
          <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
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
          className={`w-full rounded-md border ${validationErrors.letterboxdUrl ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-sm`}
          disabled={isSubmitting}
        />
        {validationErrors.letterboxdUrl && (
          <p className="text-red-500 text-xs mt-1">{validationErrors.letterboxdUrl}</p>
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
          placeholder="Share a brief description about yourself, your interests, personality traits, or anything that defines you..."
          className={`w-full rounded-md border ${validationErrors.bio ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-sm min-h-[120px]`}
          disabled={isSubmitting}
        />
        {validationErrors.bio && (
          <p className="text-red-500 text-xs mt-1">{validationErrors.bio}</p>
        )}
      </div>
      
      <div className="p-4 bg-gray-100 rounded-lg mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Spotify Integration</h4>
            <p className="text-sm text-gray-600">
              Connect your Spotify account to enhance your twin with your music preferences.
            </p>
          </div>
          <button
            type="button"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm flex items-center gap-2"
            onClick={() => {}}
          >
            Connect Spotify
          </button>
        </div>
      </div>
      
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Creating Your Digital Twin...' : 'Create My Digital Twin'}
      </button>
    </form>
  );
} 