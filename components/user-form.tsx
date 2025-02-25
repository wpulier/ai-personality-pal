'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserFormProps {
  onError?: (error: string | null) => void;
}

export function UserForm({ onError }: UserFormProps) {
  const router = useRouter();
  const [name, setName] = useState('Anonymous');
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
      onError?.("Creating your digital twin... This may take a moment.");
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name || 'Anonymous',
          bio,
          letterboxdUrl: letterboxdUrl || undefined
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        onError?.("Twin created successfully! Redirecting to chat...");
        
        // Short delay to show success message before redirect
        setTimeout(() => {
          router.push(`/chat/${data.id}`);
        }, 1000);
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
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Your Name (Optional)
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name or leave as Anonymous"
          className={`w-full rounded-md border ${validationErrors.name ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-sm`}
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
          className={`w-full rounded-md border ${validationErrors.bio ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-sm min-h-[120px]`}
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
          className={`w-full rounded-md border ${validationErrors.letterboxdUrl ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-sm`}
          disabled={isSubmitting}
        />
        {validationErrors.letterboxdUrl && (
          <p className="text-red-500 text-xs mt-1">{validationErrors.letterboxdUrl}</p>
        )}
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