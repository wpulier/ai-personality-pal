import axios from 'axios';
import { cache } from 'react';

// Get credentials from environment variables
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

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

// Helper function to get the redirect URI based on the request host
const getRedirectUri = (requestHost?: string) => {
  try {
    // Handle local development environment specifically
    if (process.env.NODE_ENV === 'development' || requestHost?.includes('localhost')) {
      if (requestHost) {
        // Preserve the port from the actual running server
        const matches = requestHost.match(/localhost:([0-9]+)/);
        const port = matches ? matches[1] : '3000';
        console.log(`Using dynamic localhost redirect URI with port ${port}`);
        return `http://localhost:${port}/api/callback/spotify`;
      } else {
        console.log('Using default localhost redirect URI for development');
        return "http://localhost:3000/api/callback/spotify";
      }
    }
    
    // For production environment with the specific deployment URL
    if (requestHost?.includes('ai-personality-pal-tnoy.vercel.app')) {
      console.log('Using tnoy.vercel.app redirect URI');
      return "https://ai-personality-pal-tnoy.vercel.app/api/callback/spotify";
    }
    
    // Fallback for any other hosts in production (not likely to be used but kept for safety)
    if (requestHost) {
      // For localhost, preserve the port number
      if (requestHost.includes('localhost')) {
        const matches = requestHost.match(/localhost:([0-9]+)/);
        const port = matches ? matches[1] : '3000';
        console.log(`Using dynamic localhost redirect URI with port ${port}`);
        return `http://localhost:${port}/api/callback/spotify`;
      }
      
      // For other hosts, sanitize and use https
      const sanitizedHost = requestHost
        .replace(/^https?:\/\//, ''); // Remove protocol if present

      const protocol = 'https'; // Always use HTTPS for production
      const redirectUri = `${protocol}://${sanitizedHost}/api/callback/spotify`;
      console.log('Generating dynamic Spotify redirect URI:', redirectUri);
      return redirectUri;
    }
    
    // Ultimate fallback - should not reach here if requestHost is provided
    console.log('No host detected, using default production redirect URI');
    return "https://ai-personality-pal-tnoy.vercel.app/api/callback/spotify";
  } catch (error) {
    console.error('Error generating redirect URI:', error);
    throw error;
  }
};

// Validate Spotify credentials exist
if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
  console.warn('Missing Spotify credentials. Spotify integration will be disabled.');
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
  getAuthUrl(state?: string, requestHost?: string): string {
    if (!SPOTIFY_CLIENT_ID) {
      throw new Error('SPOTIFY_CLIENT_ID is not configured');
    }

    try {
      // Use request host if provided
      const redirectUri = getRedirectUri(requestHost);
      console.log('Generating Spotify auth URL with redirect URI:', redirectUri);
      
      const scopes = [
        'user-read-recently-played',
        'user-top-read',
        'playlist-read-private'
      ];

      const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: scopes.join(' '),
        ...(state && { state })
      });

      return `https://accounts.spotify.com/authorize?${params.toString()}`;
    } catch (error) {
      console.error('Error generating Spotify auth URL:', error);
      throw new Error('Failed to generate Spotify authorization URL');
    }
  }

  /**
   * Get access token from authorization code
   * Caches tokens to avoid unnecessary requests
   */
  async getAccessToken(code: string, requestHost?: string): Promise<string> {
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      throw new Error('Spotify credentials are not configured');
    }
    
    const redirectUri = getRedirectUri(requestHost);
    console.log('Getting access token with redirect URI:', redirectUri);

    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      });

      const response = await axios.post('https://accounts.spotify.com/api/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(
              SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET
            ).toString('base64')
          },
          timeout: 10000 // 10 second timeout
        }
      );

      // Cache the token with expiration
      const expiresIn = response.data.expires_in || 3600;
      this.tokenCache.set(code, {
        token: response.data.access_token,
        expires: Date.now() + (expiresIn * 1000)
      });

      return response.data.access_token;
    } catch (error) {
      console.error('Failed to get Spotify access token:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Spotify authentication failed: ${error.response.data.error_description || error.response.data.error}`);
      }
      throw new Error('Failed to authenticate with Spotify');
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