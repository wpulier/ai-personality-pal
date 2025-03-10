import axios from 'axios';
import { cache } from 'react';

// Get credentials from environment variables - ensure we're using the correct variables for Next.js
// Server-side environment variables don't need NEXT_PUBLIC prefix
// Client-side environment variables need NEXT_PUBLIC prefix
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;

// Log environment variable status for debugging
console.log('Spotify environment variables status:', {
  SPOTIFY_CLIENT_ID: SPOTIFY_CLIENT_ID ? 'present' : 'missing',
  SPOTIFY_CLIENT_SECRET: SPOTIFY_CLIENT_SECRET ? 'present' : 'missing',
  SPOTIFY_REDIRECT_URI: SPOTIFY_REDIRECT_URI ? 'present' : 'missing',
  NODE_ENV: process.env.NODE_ENV
});

// Interface for Spotify data results
export interface SpotifyError {
  status: 'error';
  error: string;
}

export interface SpotifyNotProvided {
  status: 'not_provided';
}

export interface SpotifySuccess {
  status: 'success';
  topArtists: string[];
  topGenres: string[];
  recentTracks: Array<{
    name: string;
    artist: string;
    playedAt?: string;
  }>;
}

export type SpotifyResult = SpotifySuccess | SpotifyError | SpotifyNotProvided;

// Helper function to get the redirect URI
const getRedirectUri = () => {
  // ALWAYS return the exact URI from environment variable - no modifications whatsoever
  if (!SPOTIFY_REDIRECT_URI) {
    console.error('🚨 CRITICAL ERROR: SPOTIFY_REDIRECT_URI is not defined!');
    console.error('This will cause the "Invalid redirect URI" error in Spotify OAuth.');
    console.error('Make sure this exact URI is also configured in your Spotify Developer Dashboard.');
  }
  
  // Return the exact URI from environment variable - no modifications
  return SPOTIFY_REDIRECT_URI || '';
};

// Validate Spotify credentials exist
if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
  console.warn('Missing Spotify credentials. Spotify integration will be disabled.');
  console.warn('SPOTIFY_CLIENT_ID present:', !!SPOTIFY_CLIENT_ID);
  console.warn('SPOTIFY_CLIENT_SECRET present:', !!SPOTIFY_CLIENT_SECRET);
  console.warn('Check your .env file and environment variables.');
}

/**
 * Extract Spotify username from URL
 * Handles different Spotify URL formats
 */
export function extractSpotifyUsername(url: string): string | null {
  if (!url) return null;
  
  try {
    // Try to parse the URL
    const parsedUrl = new URL(url);
    
    // Check if it's a Spotify domain
    if (!parsedUrl.hostname.includes('spotify.com')) {
      return null;
    }
    
    // Extract username from path
    // Formats: 
    // - https://open.spotify.com/user/username
    // - https://spotify.com/user/username
    const pathParts = parsedUrl.pathname.split('/');
    const userIndex = pathParts.findIndex(part => part === 'user');
    
    if (userIndex !== -1 && pathParts.length > userIndex + 1) {
      return pathParts[userIndex + 1];
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting Spotify username:', error);
    return null;
  }
}

/**
 * Parse Spotify profile URL to extract username
 * If the URL is not a valid Spotify URL, returns null
 */
export function parseSpotifyUrl(url: string): string | null {
  if (!url) return null;
  
  try {
    const username = extractSpotifyUsername(url);
    return username;
  } catch (error) {
    console.error('Error parsing Spotify URL:', error);
    return null;
  }
}

// Singleton class for Spotify API client
export class SpotifyClient {
  private static instance: SpotifyClient;
  private tokenCache: Map<string, { token: string, expires: number }> = new Map();
  
  private constructor() {}

  static getInstance(): SpotifyClient {
    if (!SpotifyClient.instance) {
      SpotifyClient.instance = new SpotifyClient();
    }
    return SpotifyClient.instance;
  }

  /**
   * Generate Spotify authorization URL
   */
  getAuthUrl(state?: string): string {
    try {
      // Use the exact redirect URI from environment variable
      const redirectUri = getRedirectUri();
      console.log('Generating Spotify auth URL with redirect URI:', redirectUri);
      
      // Define the scopes we need
      const scopes = [
        'user-read-private',
        'user-read-email',
        'user-top-read',
        'user-read-recently-played'
      ].join(' ');
      
      // Create the authorization URL with the exact redirect URI
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: SPOTIFY_CLIENT_ID || '',
        scope: scopes,
        redirect_uri: redirectUri,
        state: state || 'spotify-auth'
      });
      
      return `https://accounts.spotify.com/authorize?${params.toString()}`;
    } catch (error) {
      console.error('Error generating Spotify auth URL:', error);
      throw error;
    }
  }

  /**
   * Get access token from authorization code
   * Caches tokens to avoid unnecessary requests
   */
  async getAccessToken(code: string): Promise<string> {
    try {
      // Always use the exact redirect URI from environment variable
      const redirectUri = getRedirectUri();
      console.log('Getting access token with redirect URI:', redirectUri);
      
      // Check the token cache first
      const cacheKey = `token:${code}`;
      const cachedToken = this.tokenCache.get(cacheKey);
      
      if (cachedToken && cachedToken.expires > Date.now()) {
        console.log('Using cached Spotify access token');
        return cachedToken.token;
      }
      
      // Exchange the code for an access token
      const tokenResponse = await axios({
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        params: {
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
        }
      });
      
      // Cache the token
      const accessToken = tokenResponse.data.access_token;
      const expiresIn = tokenResponse.data.expires_in;
      this.tokenCache.set(cacheKey, {
        token: accessToken,
        expires: Date.now() + (expiresIn * 1000)
      });
      
      return accessToken;
    } catch (error) {
      console.error('Error getting Spotify access token:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Spotify token exchange error details:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Get user data from Spotify API
   * Fetches top artists, genres, and recently played tracks
   */
  async getUserData(accessToken: string): Promise<SpotifyResult> {
    try {
      // Make concurrent API requests
      const [topArtists, recentTracks] = await Promise.all([
        this.getTopArtists(accessToken),
        this.getRecentlyPlayed(accessToken)
      ]);

      // Extract unique genres from top artists
      const genres = new Set<string>();
      topArtists.items.forEach((artist: any) => {
        artist.genres.forEach((genre: string) => genres.add(genre));
      });

      return {
        status: 'success',
        topArtists: topArtists.items.slice(0, 5).map((artist: any) => artist.name),
        topGenres: Array.from(genres).slice(0, 5),
        recentTracks: recentTracks.items.slice(0, 10).map((item: any) => ({
          name: item.track.name,
          artist: item.track.artists[0].name,
          playedAt: item.played_at
        }))
      };
    } catch (error) {
      console.error('Failed to fetch Spotify user data:', error);
      if (axios.isAxiosError(error)) {
        // Handle rate limiting
        if (error.response?.status === 429) {
          return {
            status: 'error',
            error: 'Spotify API rate limit exceeded. Please try again later.'
          };
        }
        
        // Handle expired tokens
        if (error.response?.status === 401) {
          return {
            status: 'error',
            error: 'Spotify authentication expired. Please reconnect your Spotify account.'
          };
        }
        
        if (error.response) {
          return {
            status: 'error',
            error: `Spotify API error: ${error.response.data.error?.message || error.response.data.error}`
          };
        }
      }
      
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to fetch Spotify data'
      };
    }
  }

  /**
   * Fetch user's top artists from Spotify
   */
  private async getTopArtists(accessToken: string) {
    try {
      const response = await axios.get('https://api.spotify.com/v1/me/top/artists', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          limit: 20,
          time_range: 'medium_term'
        },
        timeout: 8000 // 8 second timeout
      });
      
      return response.data;
    } catch (error) {
      // If this fails but we can still get recently played, we want to continue
      console.error('Error fetching top artists:', error);
      return { items: [] };
    }
  }

  /**
   * Fetch user's recently played tracks from Spotify
   */
  private async getRecentlyPlayed(accessToken: string) {
    try {
      const response = await axios.get('https://api.spotify.com/v1/me/player/recently-played', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          limit: 50
        },
        timeout: 8000 // 8 second timeout
      });
      
      return response.data;
    } catch (error) {
      // If this fails but we can still get top artists, we want to continue
      console.error('Error fetching recently played tracks:', error);
      return { items: [] };
    }
  }

  /**
   * Fetch Spotify data for a given profile URL
   * This is the main method to be used by the application
   */
  public async fetchSpotifyData(spotifyUrl: string | null, requestHost?: string): Promise<SpotifyResult> {
    // If no URL provided, return not_provided status
    if (!spotifyUrl) {
      return {
        status: 'not_provided'
      };
    }
    
    // If Spotify credentials not configured, return error
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      return {
        status: 'error',
        error: 'Spotify API credentials not configured'
      };
    }

    try {
      // Get username from URL
      const username = parseSpotifyUrl(spotifyUrl);
      
      if (!username) {
        return {
          status: 'error',
          error: 'Invalid Spotify profile URL'
        };
      }

      // Since we don't have direct profile access without user authorization,
      // we would need the user to authenticate with Spotify OAuth
      // For now, return a not_provided status with an explanation
      return {
        status: 'error',
        error: 'Spotify data requires user authorization. Please use the Spotify authentication flow.'
      };
    } catch (error) {
      console.error('Error fetching Spotify data:', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  }
}

export const spotifyClient = SpotifyClient.getInstance();

/**
 * Main function to fetch Spotify data (cacheable version)
 */
export const fetchSpotifyData = cache(async (spotifyUrl: string | null, requestHost?: string): Promise<SpotifyResult> => {
  if (!spotifyUrl) {
    return { status: 'not_provided' };
  }

  try {
    return await spotifyClient.fetchSpotifyData(spotifyUrl, requestHost);
  } catch (error) {
    console.error('Error in fetchSpotifyData:', error);
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to fetch Spotify data'
    };
  }
}); 