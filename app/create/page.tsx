'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateTwin() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    spotifyUrl: '',
    letterboxdUrl: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create digital twin');
      }

      const data = await response.json();
      router.push(`/chat/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-md p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">Create Your Digital Twin</h1>
          <p className="text-center text-gray-600">
            Fill in the details below to create your personalized AI twin.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
              Your Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              required
              value={formData.bio}
              onChange={handleChange}
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tell us about yourself, your interests, personality, and communication style..."
            />
            <p className="mt-1 text-xs text-gray-500">
              The more detailed you are, the more accurately your twin will reflect your personality.
            </p>
          </div>

          <div>
            <label htmlFor="spotifyUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Spotify Profile URL (Optional)
            </label>
            <input
              type="url"
              id="spotifyUrl"
              name="spotifyUrl"
              value={formData.spotifyUrl}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://open.spotify.com/user/yourusername"
            />
          </div>

          <div>
            <label htmlFor="letterboxdUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Letterboxd Profile URL (Optional)
            </label>
            <input
              type="url"
              id="letterboxdUrl"
              name="letterboxdUrl"
              value={formData.letterboxdUrl}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://letterboxd.com/yourusername"
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Creating...' : 'Create Digital Twin'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
} 