import { NextRequest, NextResponse } from 'next/server';
import { spotifyClient } from '@/lib/services/spotify';

export async function GET(request: NextRequest) {
  // Log environment variables status
  console.log('Spotify auth route - environment variables status:', {
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID ? 'present' : 'missing',
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET ? 'present' : 'missing',
    SPOTIFY_REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI ? 'present' : 'missing',
    NEXT_PUBLIC_SPOTIFY_CLIENT_ID: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ? 'present' : 'missing',
    NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET ? 'present' : 'missing',
    NEXT_PUBLIC_SPOTIFY_REDIRECT_URI: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI ? 'present' : 'missing',
    NODE_ENV: process.env.NODE_ENV
  });

  // Check if Spotify credentials are configured
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.error('Spotify auth route - Spotify credentials are not configured');
    return NextResponse.redirect(new URL('/', request.url) + '?error=Spotify%20credentials%20are%20not%20configured', {
      status: 302,
    });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const twinId = searchParams.get('twinId');
    const explicitState = searchParams.get('state');
    const explicitHost = searchParams.get('host'); // Get the explicitly passed host
    
    // Get the host from the request URL with more detailed logging
    // Prioritize the explicitly passed host parameter if available
    const host = explicitHost || request.headers.get('host') || request.nextUrl.hostname;
    const fullUrl = request.url;
    console.log('Spotify Auth Request Details:', {
      host,
      explicitHost: explicitHost || 'not provided',
      fullUrl,
      twinId,
      explicitState,
      headers: {
        host: request.headers.get('host'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer')
      },
      environment: process.env.NODE_ENV || 'unknown'
    });
    
    // Simplified state handling:
    // 1. If twinId is provided, use it as the state (for updating existing twin)
    // 2. If explicitState is provided, use it (for creation flow)
    // 3. Otherwise, default to 'home'
    let state = 'home';
    
    if (twinId) {
      state = twinId;
      console.log(`Spotify auth route - Using twin ID ${twinId} as state`);
    } else if (explicitState) {
      state = explicitState;
      console.log(`Spotify auth route - Using explicit state: ${explicitState}`);
    }
    
    // Generate the authorization URL with state and host
    const authUrl = spotifyClient.getAuthUrl(state, host);
    console.log(`Spotify auth route - Redirecting to Spotify auth URL with state: ${state} and host: ${host}`);
    
    // Redirect to Spotify authorization
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Spotify auth route - Error starting Spotify authorization:', error);
    // Use the request URL as base for the error redirect
    return NextResponse.redirect(
      new URL('/', request.url) + `?error=${encodeURIComponent(error instanceof Error ? error.message : 'Failed to start Spotify authorization')}`,
      { status: 302 }
    );
  }
} 