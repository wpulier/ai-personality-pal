import { NextRequest, NextResponse } from 'next/server';
import { spotifyClient } from '@/lib/services/spotify';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const redirect = searchParams.get('redirect');
    
    // Get the host from the request URL with more detailed logging
    const host = request.headers.get('host') || request.nextUrl.hostname;
    const fullUrl = request.url;
    console.log('Spotify Auth Request Details:', {
      host,
      fullUrl,
      headers: {
        host: request.headers.get('host'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer')
      },
      environment: process.env.NODE_ENV || 'unknown'
    });
    
    // Generate state parameter with additional information
    const state = userId 
      ? userId 
      : redirect === 'home' 
        ? 'home'
        : 'unknown';
    
    // Generate the authorization URL with state and host
    const authUrl = spotifyClient.getAuthUrl(state, host);
    
    // Redirect to Spotify authorization
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error starting Spotify authorization:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start Spotify authorization' },
      { status: 500 }
    );
  }
} 