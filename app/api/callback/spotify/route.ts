import { NextRequest, NextResponse } from 'next/server';
import { updateTwinSpotifyData } from '@/lib/services/twin-service';
import { createClient } from '@supabase/supabase-js';
import { spotifyClient } from '@/lib/services/spotify';

// Check for required environment variables and log if they're missing
const supabaseEnvCheck = () => {
  const missingVars: Record<string, string> = {};
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingVars['url'] = 'missing';
  if (!process.env.SUPABASE_SERVICE_KEY) missingVars['serviceKey'] = 'missing';
  
  if (Object.keys(missingVars).length > 0) {
    console.log('Supabase environment variables are missing:', missingVars);
  }
  
  return Object.keys(missingVars).length === 0;
};

export async function GET(request: NextRequest) {
  // Log environment variables status
  console.log('Spotify callback route - environment variables status:', {
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID ? 'present' : 'missing',
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET ? 'present' : 'missing',
    SPOTIFY_REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI ? 'present' : 'missing',
    NEXT_PUBLIC_SPOTIFY_CLIENT_ID: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ? 'present' : 'missing',
    NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET ? 'present' : 'missing',
    NEXT_PUBLIC_SPOTIFY_REDIRECT_URI: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI ? 'present' : 'missing',
    NODE_ENV: process.env.NODE_ENV
  });

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
    console.error('Spotify callback route - Spotify credentials are not configured');
    return NextResponse.redirect(new URL('/', request.url) + '?error=Spotify%20credentials%20are%20not%20configured', {
      status: 302,
    });
  }

  // Check if there was an error during the authorization
  if (error) {
    console.error('Spotify callback route - Spotify auth error:', error);
    return NextResponse.redirect(new URL('/', request.url) + `?error=${encodeURIComponent(`Spotify auth error: ${error}`)}`, {
      status: 302,
    });
  }

  // Check if code and state are present
  if (!code || !state) {
    console.error('Spotify callback route - Missing code or state in Spotify callback');
    return NextResponse.redirect(new URL('/', request.url) + '?error=Invalid%20Spotify%20response', {
      status: 302,
    });
  }

  try {
    // Get the host for token exchange
    const host = request.headers.get('host') || request.nextUrl.hostname;
    
    // Log detailed host information for debugging
    console.log('Spotify callback route - Host information for callback:', {
      headerHost: request.headers.get('host'),
      urlHostname: request.nextUrl.hostname,
      fullUrl: request.url
    });
    
    // Simplified flow:
    // 1. If state is 'home', this is part of twin creation flow
    // 2. Otherwise, try to update the twin with the given ID
    
    if (state === 'home') {
      console.log('Spotify callback route - This is part of the twin creation flow');
      
      // Get Spotify data directly - don't pass host parameter anymore
      const accessToken = await spotifyClient.getAccessToken(code);
      const spotifyData = await spotifyClient.getUserData(accessToken);
      
      // Encode this data to pass back to the creation form
      const encodedData = encodeURIComponent(JSON.stringify(spotifyData));
      
      // Redirect back to the create page with the Spotify data instead of the home page
      return NextResponse.redirect(new URL('/create', request.url) + `?spotify=success&spotifyData=${encodedData}`, {
        status: 302,
      });
    } 
    else {
      // This is updating an existing twin
      // Extract twin ID from state - it should be the twin's ID
      const twinId = state;
      console.log('Spotify callback route - Updating existing twin with ID:', twinId);
      
      // Check if required environment variables are available
      if (!supabaseEnvCheck()) {
        console.error('Spotify callback route - Supabase environment variables missing, cannot update twin');
        return NextResponse.redirect(new URL('/', request.url) + '?error=Server%20configuration%20error', {
          status: 302,
        });
      }
      
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
      
      console.log('Spotify callback route - Twin query result:', { 
        found: !!twin, 
        error: twinError ? twinError.message : 'none',
        twinId
      });
      
      if (twinError || !twin) {
        console.error('Spotify callback route - No twin found for ID:', twinId);
        
        // Since we don't have a twin, treat this as part of the creation flow instead
        console.log('Spotify callback route - Falling back to creation flow to get Spotify data for new twin');
        
        // Get Spotify data
        const accessToken = await spotifyClient.getAccessToken(code);
        const spotifyData = await spotifyClient.getUserData(accessToken);
        
        // Encode this data to pass back to the creation form
        const encodedData = encodeURIComponent(JSON.stringify(spotifyData));
        
        // Redirect back to home with the Spotify data and a more helpful message
        return NextResponse.redirect(new URL('/', request.url) + `?spotify=success&spotifyData=${encodedData}&message=Your+Spotify+account+has+been+connected!+You+can+now+create+a+twin.`, {
          status: 302,
        });
      }
      
      // Update the twin with Spotify data
      console.log('Spotify callback route - Updating twin with Spotify data, ID:', twin.id);
      try {
        console.log(`Updating twin ${twinId} with Spotify data - connecting to Spotify...`);
        
        // Get Spotify data using the code
        const accessToken = await spotifyClient.getAccessToken(code);
        const spotifyData = await spotifyClient.getUserData(accessToken);
        
        if (spotifyData.status !== 'success') {
          console.error('Failed to get Spotify data:', spotifyData);
          return NextResponse.redirect(new URL('/', request.url) + `?error=${encodeURIComponent(`Failed to get Spotify data: ${spotifyData.status}`)}`);
        }
        
        // Update the twin with Spotify data
        await updateTwinSpotifyData(twin.id, code);
        
        // Redirect to the twin's chat page with a success message
        console.log('Spotify callback route - Successfully updated twin with Spotify data, redirecting to twin page');
        return NextResponse.redirect(new URL(`/chat/${twin.id}`, request.url) + `?message=Your+Spotify+account+has+been+successfully+connected!`, {
          status: 302,
        });
      } catch (error) {
        console.error('Spotify callback route - Error processing Spotify callback:', error);
        return NextResponse.redirect(new URL('/', request.url) + `?error=${encodeURIComponent('Error connecting Spotify: ' + (error instanceof Error ? error.message : 'Unknown error'))}`, {
          status: 302,
        });
      }
    }
  } catch (error) {
    console.error('Spotify callback route - Error processing Spotify callback:', error);
    return NextResponse.redirect(new URL('/', request.url) + `?error=${encodeURIComponent('Error connecting Spotify: ' + (error instanceof Error ? error.message : 'Unknown error'))}`, {
      status: 302,
    });
  }
} 