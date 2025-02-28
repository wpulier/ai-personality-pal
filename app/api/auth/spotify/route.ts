import { NextRequest, NextResponse } from 'next/server';
import { spotifyClient } from '@/lib/services/spotify';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const twinId = searchParams.get('twinId');
    const redirect = searchParams.get('redirect');
    const isCreation = searchParams.get('creation') === 'true';
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
      redirect,
      isCreation,
      headers: {
        host: request.headers.get('host'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer')
      },
      environment: process.env.NODE_ENV || 'unknown'
    });
    
    // Generate state parameter with additional information
    let state = 'home';
    
    // First priority: Check if we're in creation flow
    if (isCreation) {
      state = 'creation';
      console.log('Using creation state for twin creation flow');
    }
    // Second priority: Check for valid twin ID
    else if (twinId) {
      // Use the twin ID as the state to track it through the OAuth flow
      state = twinId;
      console.log(`Using twin ID ${twinId} as state`);
    } 
    // Fallback to home state
    else if (redirect === 'home') {
      state = 'home';
    }
    
    // Generate the authorization URL with state and host
    const authUrl = spotifyClient.getAuthUrl(state, host);
    console.log(`Redirecting to Spotify auth URL with state: ${state} and host: ${host}`);
    
    // Redirect to Spotify authorization
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error starting Spotify authorization:', error);
    // Use the request URL as base for the error redirect
    return NextResponse.redirect(
      new URL('/', request.url) + `?error=${encodeURIComponent(error instanceof Error ? error.message : 'Failed to start Spotify authorization')}`,
      { status: 302 }
    );
  }
} 