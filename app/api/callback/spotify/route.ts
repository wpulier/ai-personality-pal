import { NextRequest, NextResponse } from 'next/server';
import { spotifyClient, type SpotifyError } from '@/lib/services/spotify';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  // Get the authorization code from the query parameters
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');
  
  // If there's an error or no code, redirect to the error page
  if (error || !code) {
    return NextResponse.redirect(new URL(`/?error=${error || 'No authorization code provided'}`, request.url));
  }
  
  try {
    // Exchange the authorization code for an access token
    const accessToken = await spotifyClient.getAccessToken(code);
    
    // Get the user's Spotify data using the access token
    const spotifyData = await spotifyClient.getUserData(accessToken);
    
    // Check if we're returning to the home page or updating an existing user
    if (state === 'home') {
      // We're creating a new twin - redirect to home with Spotify data
      if (spotifyData.status === 'success') {
        // Encode the Spotify data as a URL parameter
        const encodedData = encodeURIComponent(JSON.stringify(spotifyData));
        return NextResponse.redirect(new URL(`/?spotify=success&spotifyData=${encodedData}`, request.url));
      } else {
        const errorMessage = spotifyData.status === 'error' 
          ? (spotifyData as SpotifyError).error 
          : 'Failed to fetch Spotify data';
        return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(errorMessage)}`, request.url));
      }
    } else {
      // We're updating an existing user
      // Extract user ID from state if present
      const userId = state ? parseInt(state) : null;
      
      if (!userId || isNaN(userId)) {
        return NextResponse.redirect(new URL('/?error=Invalid user ID provided in state', request.url));
      }
      
      if (spotifyData.status === 'success') {
        // Get database connection
        const db = getDb();
        
        // Find the user by ID
        const existingUser = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });
        
        if (!existingUser) {
          return NextResponse.redirect(new URL('/?error=User not found', request.url));
        }
        
        // Update the user with their Spotify data
        await db.update(users)
          .set({ spotifyData })
          .where(eq(users.id, userId));
        
        // Redirect to the chat page with the user ID
        return NextResponse.redirect(new URL(`/chat/${userId}?spotify=success`, request.url));
      } else {
        // Handle case where Spotify data couldn't be fetched
        // Use type guard to check if error property exists
        const errorMessage = spotifyData.status === 'error' 
          ? (spotifyData as SpotifyError).error 
          : 'Failed to fetch Spotify data';
          
        return NextResponse.redirect(new URL(`/chat/${userId}?error=${encodeURIComponent(errorMessage)}`, request.url));
      }
    }
  } catch (error) {
    console.error('Spotify callback error:', error);
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error instanceof Error ? error.message : 'An unknown error occurred')}`, request.url));
  }
} 