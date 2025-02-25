import { NextRequest, NextResponse } from 'next/server';
import { spotifyClient } from '@/lib/services/spotify';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const redirect = searchParams.get('redirect');
    
    // Generate state parameter with additional information
    const state = userId 
      ? userId 
      : redirect === 'home' 
        ? 'home'
        : 'unknown';
    
    // Generate the authorization URL with state
    const authUrl = spotifyClient.getAuthUrl(state);
    
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