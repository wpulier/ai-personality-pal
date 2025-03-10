import { NextRequest, NextResponse } from 'next/server';
import { updateTwinSpotifyData } from '@/lib/services/twin-service';
import { createClient } from '@supabase/supabase-js';
import { spotifyClient } from '@/lib/services/spotify';

export async function GET(request: NextRequest) {
  // Extract query parameters from the request
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');
  
  console.log('Spotify callback received:', { 
    code: code ? 'present' : 'not present', 
    error: error ? error : 'none', 
    state,
    url: request.url,
    host: request.headers.get('host'),
    spotifyCredentialsConfigured: !!process.env.SPOTIFY_CLIENT_ID && !!process.env.SPOTIFY_CLIENT_SECRET
  });

  // Check if Spotify credentials are configured
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.error('Spotify credentials are not configured');
    return NextResponse.redirect(new URL('/', request.url) + '?error=Spotify%20credentials%20are%20not%20configured', {
      status: 302,
    });
  }

  // Check if there was an error during the authorization
  if (error) {
    console.error('Spotify auth error:', error);
    return NextResponse.redirect(new URL('/', request.url) + `?error=${encodeURIComponent(`Spotify auth error: ${error}`)}`, {
      status: 302,
    });
  }

  // Check if code and state are present
  if (!code || !state) {
    console.error('Missing code or state in Spotify callback');
    return NextResponse.redirect(new URL('/', request.url) + '?error=Invalid%20Spotify%20response', {
      status: 302,
    });
  }

  try {
    // Get the host for token exchange
    const host = request.headers.get('host') || request.nextUrl.hostname;
    
    // Log detailed host information for debugging
    console.log('Host information for callback:', {
      headerHost: request.headers.get('host'),
      urlHostname: request.nextUrl.hostname,
      fullUrl: request.url
    });
    
    // If state is 'home' or 'creation', this is part of twin creation flow
    if (state === 'home' || state === 'creation') {
      console.log(`This is part of the twin creation flow. State: ${state}`);
      
      // Get Spotify data directly
      const accessToken = await spotifyClient.getAccessToken(code, host);
      const spotifyData = await spotifyClient.getUserData(accessToken);
      
      // Encode this data to pass back to the creation form
      const encodedData = encodeURIComponent(JSON.stringify(spotifyData));
      
      // Redirect back to the form with the Spotify data
      return NextResponse.redirect(new URL('/', request.url) + `?spotify=success&spotifyData=${encodedData}`, {
        status: 302,
      });
    } 
    else {
      // This is updating an existing twin
      // Extract twin ID from state - it should be the twin's ID
      const twinId = state;
      console.log('Updating existing twin with ID:', twinId);
      
      // Create admin client to bypass RLS
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_KEY || '',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
      
      // Check if we have a valid twin
      const { data: twin, error: twinError } = await adminClient
        .from('twins')
        .select('*')
        .eq('id', twinId)
        .single();
      
      console.log('Twin query result:', { 
        found: !!twin, 
        error: twinError ? twinError.message : 'none',
        twinId
      });
      
      if (twinError || !twin) {
        console.error('No twin found for ID:', twinId);
        
        // Since we don't have a twin, treat this as part of the creation flow instead
        console.log('Falling back to creation flow to get Spotify data for new twin');
        
        // Get Spotify data
        const accessToken = await spotifyClient.getAccessToken(code, host);
        const spotifyData = await spotifyClient.getUserData(accessToken);
        
        // Encode this data to pass back to the creation form
        const encodedData = encodeURIComponent(JSON.stringify(spotifyData));
        
        // Redirect back to home with the Spotify data and a more helpful message
        return NextResponse.redirect(new URL('/', request.url) + `?spotify=success&spotifyData=${encodedData}&message=Your+Spotify+account+has+been+connected!+You+can+now+create+a+twin.`, {
          status: 302,
        });
      }
      
      // Update the twin with Spotify data
      console.log('Updating twin with Spotify data, ID:', twin.id);
      await updateTwinSpotifyData(twin.id, code, host);
      
      // Redirect to twin page
      console.log('Spotify data updated successfully, redirecting to twin page:', twin.id);
      return NextResponse.redirect(new URL(`/chat/${twin.id}`, request.url), {
        status: 302,
      });
    }
  } catch (error) {
    console.error('Error processing Spotify callback:', error);
    return NextResponse.redirect(new URL('/', request.url) + `?error=${encodeURIComponent('Error connecting Spotify: ' + (error instanceof Error ? error.message : 'Unknown error'))}`, {
      status: 302,
    });
  }
} 