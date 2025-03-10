import { supabase } from '@/lib/supabase/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Twin, Message, CreateTwin, CreateMessage } from '@/lib/db/supabase-schema';
import { generateTwinPersonality } from './streamChatResponse';
import { fetchLetterboxdData } from './letterboxd';
import { createClient } from '@supabase/supabase-js';
import { spotifyClient } from '@/lib/services/spotify';

// Flag to check if we're on the server
const isServer = typeof window === 'undefined';

/**
 * Utility function to normalize field names between database (snake_case) and frontend (camelCase)
 * This ensures consistent data structures throughout the application
 */
export function normalizeTwinData(twin: any): Twin {
  if (!twin) return twin;
  
  // Create a copy to avoid mutating the original object
  const normalizedTwin = { ...twin };
  
  // Handle the twin_personality field specifically
  if ('twin_personality' in twin && twin.twin_personality) {
    normalizedTwin.twinPersonality = twin.twin_personality;
  } else if ('twinPersonality' in twin && twin.twinPersonality) {
    normalizedTwin.twin_personality = twin.twinPersonality;
  }
  
  // Handle letterboxd_data/letterboxdData field
  if ('letterboxd_data' in twin && twin.letterboxd_data) {
    normalizedTwin.letterboxdData = twin.letterboxd_data;
  } else if ('letterboxdData' in twin && twin.letterboxdData) {
    normalizedTwin.letterboxd_data = twin.letterboxdData;
  }
  
  // Handle spotify_data/spotifyData field
  if ('spotify_data' in twin && twin.spotify_data) {
    normalizedTwin.spotifyData = twin.spotify_data;
  } else if ('spotifyData' in twin && twin.spotifyData) {
    normalizedTwin.spotify_data = twin.spotifyData;
  }
  
  // Handle letterboxd_url/letterboxdUrl field
  if ('letterboxd_url' in twin && twin.letterboxd_url !== undefined) {
    normalizedTwin.letterboxdUrl = twin.letterboxd_url;
  } else if ('letterboxdUrl' in twin && twin.letterboxdUrl !== undefined) {
    normalizedTwin.letterboxd_url = twin.letterboxdUrl;
  }
  
  // Handle spotify_url/spotifyUrl field
  if ('spotify_url' in twin && twin.spotify_url !== undefined) {
    normalizedTwin.spotifyUrl = twin.spotify_url;
  } else if ('spotifyUrl' in twin && twin.spotifyUrl !== undefined) {
    normalizedTwin.spotify_url = twin.spotifyUrl;
  }
  
  // Handle auth_user_id/authUserId field
  if ('auth_user_id' in twin && twin.auth_user_id !== undefined) {
    normalizedTwin.authUserId = twin.auth_user_id;
  } else if ('authUserId' in twin && twin.authUserId !== undefined) {
    normalizedTwin.auth_user_id = twin.authUserId;
  }
  
  // Handle created_at/createdAt field
  if ('created_at' in twin && twin.created_at !== undefined) {
    normalizedTwin.createdAt = twin.created_at;
  } else if ('createdAt' in twin && twin.createdAt !== undefined) {
    normalizedTwin.created_at = twin.createdAt;
  }
  
  // Handle updated_at/updatedAt field
  if ('updated_at' in twin && twin.updated_at !== undefined) {
    normalizedTwin.updatedAt = twin.updated_at;
  } else if ('updatedAt' in twin && twin.updatedAt !== undefined) {
    normalizedTwin.updated_at = twin.updatedAt;
  }
  
  return normalizedTwin as Twin;
}

/**
 * Get a twin by ID
 */
export async function getTwin(id: number): Promise<Twin | null> {
  const { data, error } = await supabase
    .from('twins')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching twin:', error);
    return null;
  }
  
  return normalizeTwinData(data);
}

/**
 * Get all twins for the authenticated user
 */
export async function getUserTwins(userId: string): Promise<Twin[]> {
  if (!userId) {
    console.error('Error fetching user twins: userId is undefined or null');
    return [];
  }

  try {
    console.log('Fetching twins from supabase for user ID:', userId);
    
    const { data, error } = await supabase
      .from('twins')
      .select('*')
      .eq('auth_user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user twins:', error.message);
      console.error('Error details:', error.details || 'No additional details available');
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No twins found for user ID:', userId);
      return [];
    }
    
    console.log(`Found ${data.length} twins for user ID:`, userId);
    // Normalize each twin in the array
    return data.map(twin => normalizeTwinData(twin));
  } catch (error) {
    console.error('Unexpected error fetching user twins:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Unknown error type:', typeof error);
    }
    return [];
  }
}

/**
 * Create a new twin
 */
export async function createTwin(twinData: {
  name: string;
  bio: string;
  letterboxd_url?: string | null;
  spotify_url?: string | null;
  auth_user_id?: string;
  spotify_data?: any;
}): Promise<Twin | null> {
  try {
    console.log('Starting twin creation process with data:', {
      name: twinData.name,
      bio: twinData.bio?.substring(0, 20) + '...',
      letterboxd_url: twinData.letterboxd_url,
      auth_user_id: twinData.auth_user_id,
      spotify_data: twinData.spotify_data ? 'provided' : 'not provided'
    });
    
    // If auth_user_id is provided, check if the user already has a twin
    if (twinData.auth_user_id) {
      console.log('Checking if user already has a twin:', twinData.auth_user_id);
      
      // Create a client to check for existing twins
      const checkClient = isServer 
        ? createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_KEY || '',
            { auth: { autoRefreshToken: false, persistSession: false } }
          )
        : supabase;
      
      const { data: existingTwins, error: checkError } = await checkClient
        .from('twins')
        .select('id')
        .eq('auth_user_id', twinData.auth_user_id)
        .limit(1);
      
      if (checkError) {
        console.error('Error checking for existing twins:', checkError);
        // Continue anyway, but log the error
      } else if (existingTwins && existingTwins.length > 0) {
        console.log('User already has a twin with ID:', existingTwins[0].id);
        
        // Fetch the complete twin data
        const { data: existingTwin, error: fetchError } = await checkClient
          .from('twins')
          .select('*')
          .eq('id', existingTwins[0].id)
          .single();
        
        if (fetchError) {
          console.error('Error fetching existing twin:', fetchError);
          throw new Error('You already have a twin, but we could not retrieve it. Please try again.');
        } else {
          console.log('Returning existing twin instead of creating a new one');
          return normalizeTwinData(existingTwin);
        }
      }
    }
    
    // Process Letterboxd data if URL is provided, using API endpoint for client-side safety
    let letterboxdData: any = { status: 'not_provided' };
    if (twinData.letterboxd_url) {
      console.log('Fetching Letterboxd data for URL:', twinData.letterboxd_url);

      if (isServer) {
        // On server, call the function directly
        letterboxdData = await fetchLetterboxdData(twinData.letterboxd_url);
      } else {
        // On client, use the API endpoint
        try {
          const response = await fetch('/api/letterboxd', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: twinData.letterboxd_url }),
          });
          
          if (!response.ok) {
            console.error('Error fetching Letterboxd data from API:', response.statusText);
            // Continue with not_provided status
          } else {
            letterboxdData = await response.json();
          }
        } catch (fetchError) {
          console.error('Error fetching Letterboxd data from API:', fetchError);
          // Continue with not_provided status
        }
      }
      
      console.log('Letterboxd data fetch result:', letterboxdData.status);
    }
    
    // Use provided Spotify data or set to not_provided
    const spotifyData = twinData.spotify_data || { status: 'not_provided' };
    
    // Generate twin personality - this will only work on the server
    // On the client, it will return a minimal personality
    console.log('Generating twin personality...');
    const twinPersonality = await generateTwinPersonality(
      twinData.bio,
      letterboxdData,
      spotifyData
    );
    
    // Ensure that the summary always contains at least the bio content
    // This ensures consistency between bio and summary
    if (!twinPersonality.summary || twinPersonality.summary.trim() === '') {
      twinPersonality.summary = twinData.bio;
    }
    
    console.log('Twin personality generated successfully');
    
    // If we're on the client side, use the API endpoint instead of creating an admin client
    if (!isServer) {
      console.log('Running on client-side, using API endpoint to create twin');
      try {
        // Set a longer timeout for the fetch request (30 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch('/api/twins', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: twinData.name,
            bio: twinData.bio, // Keep bio for backward compatibility
            letterboxd_url: twinData.letterboxd_url,
            spotify_url: twinData.spotify_url,
            auth_user_id: twinData.auth_user_id,
            letterboxd_data: letterboxdData,
            spotify_data: spotifyData,
            twin_personality: twinPersonality
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.error('Error creating twin from API:', response.statusText);
          
          // If we get a timeout or server error, try a simplified approach
          if (response.status === 504 || response.status === 500) {
            console.log('API timeout or server error, trying simplified twin creation');
            
            // Create a simplified twin personality if the API times out
            const simplifiedPersonality = {
              interests: ['movies', 'music', 'art'],
              style: 'casual and friendly',
              traits: ['creative', 'thoughtful', 'curious'],
              summary: twinData.bio
            };
            
            // Try again with a simplified request
            const retryResponse = await fetch('/api/twins/simplified', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: twinData.name,
                bio: twinData.bio,
                letterboxd_url: twinData.letterboxd_url,
                spotify_url: twinData.spotify_url,
                auth_user_id: twinData.auth_user_id,
                letterboxd_data: letterboxdData,
                spotify_data: spotifyData,
                twin_personality: simplifiedPersonality
              })
            });
            
            if (!retryResponse.ok) {
              console.error('Error with simplified twin creation:', retryResponse.statusText);
              return null;
            }
            
            const retryData = await retryResponse.json();
            console.log('Twin created successfully via simplified API, ID:', retryData.id);
            return retryData;
          }
          
          return null;
        }
        
        const data = await response.json();
        console.log('Twin created successfully via API, ID:', data.id);
        return data;
      } catch (error) {
        console.error('Error calling twin creation API:', error);
        
        // If we get an abort error (timeout), try a simplified approach
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('API request timed out, trying simplified twin creation');
          
          try {
            // Create a simplified twin personality if the API times out
            const simplifiedPersonality = {
              interests: ['movies', 'music', 'art'],
              style: 'casual and friendly',
              traits: ['creative', 'thoughtful', 'curious'],
              summary: twinData.bio
            };
            
            // Try again with a simplified request
            const retryResponse = await fetch('/api/twins/simplified', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: twinData.name,
                bio: twinData.bio,
                letterboxd_url: twinData.letterboxd_url,
                spotify_url: twinData.spotify_url,
                auth_user_id: twinData.auth_user_id,
                letterboxd_data: letterboxdData,
                spotify_data: spotifyData,
                twin_personality: simplifiedPersonality
              })
            });
            
            if (!retryResponse.ok) {
              console.error('Error with simplified twin creation:', retryResponse.statusText);
              return null;
            }
            
            const retryData = await retryResponse.json();
            console.log('Twin created successfully via simplified API, ID:', retryData.id);
            return retryData;
          } catch (retryError) {
            console.error('Error with simplified twin creation:', retryError);
            return null;
          }
        }
        
        return null;
      }
    }
    
    // Server-side only code from here - create admin client
    console.log('Creating service role client with URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service key available:', !!process.env.SUPABASE_SERVICE_KEY);
    
    // Create a direct admin client with direct SQL access to bypass RLS completely
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
    
    // First, check if the auth_user_id is valid if provided
    if (twinData.auth_user_id) {
      console.log('Checking if auth_user_id exists:', twinData.auth_user_id);
      const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(
        twinData.auth_user_id
      );
      
      if (authError || !authUser.user) {
        console.error('Invalid auth_user_id or error checking user:', authError);
        // Continue anyway, but log the error
      } else {
        console.log('Valid auth_user_id confirmed');
      }
    }
    
    // Insert the twin using the admin client
    console.log('Inserting twin with admin service role client...');
    
    const { data, error } = await adminClient
      .from('twins')
      .insert({
        auth_user_id: twinData.auth_user_id,
        name: twinData.name,
        bio: twinData.bio,
        letterboxd_url: twinData.letterboxd_url,
        spotify_url: twinData.spotify_url,
        letterboxd_data: letterboxdData,
        spotify_data: spotifyData,
        twin_personality: twinPersonality
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating twin with service role client:', error);
      
      // As a fallback, try creating the twin with direct SQL
      console.log('Trying fallback with direct SQL insert...');
      
      const insertResult = await adminClient.rpc('create_twin', {
        p_auth_user_id: twinData.auth_user_id,
        p_name: twinData.name,
        p_bio: twinData.bio,
        p_letterboxd_url: twinData.letterboxd_url,
        p_spotify_url: twinData.spotify_url,
        p_letterboxd_data: letterboxdData,
        p_spotify_data: spotifyData,
        p_twin_personality: twinPersonality
      });
      
      if (insertResult.error) {
        console.error('Fallback insert also failed:', insertResult.error);
        return null;
      }
      
      // If the fallback worked, get the created twin
      const { data: createdTwin, error: fetchError } = await adminClient
        .from('twins')
        .select('*')
        .eq('auth_user_id', twinData.auth_user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (fetchError || !createdTwin) {
        console.error('Failed to fetch created twin:', fetchError);
        return null;
      }
      
      console.log('Twin created successfully with fallback, ID:', createdTwin.id);
      return createdTwin;
    }
    
    console.log('Twin created successfully with service role client, ID:', data.id);
    return data;
  } catch (error) {
    console.error('Error in createTwin:', error);
    return null;
  }
}

/**
 * Update an existing twin
 */
export async function updateTwin(id: number, twinData: Partial<Twin>): Promise<Twin | null> {
  const { data, error } = await supabase
    .from('twins')
    .update(twinData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating twin:', error);
    return null;
  }
  
  return data;
}

/**
 * Delete a twin
 */
export async function deleteTwin(id: number): Promise<boolean> {
  try {
    console.log(`Attempting to delete twin with ID: ${id}`);
    
    // Use the dedicated API endpoint for twin deletion
    const response = await fetch(`/api/twins/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for auth cookies
    });
    
    // Get the response data for detailed error logging
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error deleting twin:', data);
      
      // If the twin was not found (404), we consider the deletion "successful"
      // since the twin is already gone
      if (response.status === 404) {
        console.log(`Twin ${id} already deleted or not found`);
        return true;
      }
      
      return false;
    }
    
    // Verify the success field in the response
    if (!data.success) {
      console.error('Unexpected response format when deleting twin:', data);
      return false;
    }
    
    console.log(`Successfully deleted twin with ID: ${id}`);
    return true;
  } catch (error) {
    console.error('Exception when deleting twin:', error);
    return false;
  }
}

/**
 * Get messages for a twin
 */
export async function getTwinMessages(twinId: number): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('twin_id', twinId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching twin messages:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Create a new message
 */
export async function createMessage(messageData: CreateMessage): Promise<Message | null> {
  const { data, error } = await supabase
    .from('messages')
    .insert(messageData)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating message:', error);
    return null;
  }
  
  return data;
}

/**
 * Subscribe to new messages for a twin
 * Returns an unsubscribe function
 */
export function subscribeToMessages(twinId: number, callback: (message: Message) => void): () => void {
  const subscription = supabase
    .channel(`messages:twin_id=eq.${twinId}`)
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `twin_id=eq.${twinId}`
      }, 
      (payload) => {
        callback(payload.new as Message);
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Claim an existing twin for an authenticated user
 */
export async function claimTwin(twinId: number, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('twins')
    .update({ auth_user_id: userId })
    .eq('id', twinId)
    .is('auth_user_id', null);
  
  if (error) {
    console.error('Error claiming twin:', error);
    return false;
  }
  
  return true;
}

/**
 * Updates a twin's Spotify data using an authorization code
 * @param twinId The ID of the twin to update
 * @param code The Spotify authorization code
 * @param explicitHost Optional host to use for the redirect URI
 */
export async function updateTwinSpotifyData(twinId: string, code: string, explicitHost?: string): Promise<boolean> {
  try {
    console.log(`Updating twin ${twinId} with Spotify data using code`);
    
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
    
    // Exchange the code for an access token
    // Use explicit host if provided, otherwise fall back to environment variables
    const host = explicitHost || process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL || 'localhost:3000';
    console.log(`Using host for Spotify token exchange: ${host}`);
    const accessToken = await spotifyClient.getAccessToken(code, host);
    console.log('Successfully obtained Spotify access token');
    
    // Get user's Spotify data
    const spotifyData = await spotifyClient.getUserData(accessToken);
    console.log('Retrieved Spotify user data');
    
    if (spotifyData.status !== 'success') {
      console.error('Failed to get Spotify data:', spotifyData);
      return false;
    }
    
    // Update the twin with the Spotify data
    const { error } = await adminClient
      .from('twins')
      .update({ 
        spotify_data: spotifyData,
        updated_at: new Date().toISOString()
      })
      .eq('id', twinId);
    
    if (error) {
      console.error('Error updating twin with Spotify data:', error);
      return false;
    }
    
    console.log(`Successfully updated twin ${twinId} with Spotify data, now updating personality`);
    
    // Update the twin's personality based on new Spotify data
    const personalityUpdated = await updateTwinPersonality(twinId);
    
    if (!personalityUpdated) {
      console.warn('Spotify data was updated but personality update failed');
    }
    
    return true;
  } catch (error) {
    console.error('Error updating twin with Spotify data:', error);
    return false;
  }
}

// Function to update a twin's bio
export async function updateTwinBio(twinId: string | number, bio: string) {
  const numericId = typeof twinId === 'string' ? parseInt(twinId) : twinId;
  
  try {
    // Create a direct admin client with service role key to bypass RLS
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
    
    // Update the twin's bio
    const { error } = await adminClient
      .from('twins')
      .update({ bio })
      .eq('id', numericId);
    
    if (error) {
      console.error('Error updating twin bio:', error);
      throw error;
    }
    
    console.log('Bio updated successfully, now updating personality');
    
    // Update the twin's personality based on new bio
    const personalityUpdated = await updateTwinPersonality(numericId);
    
    if (!personalityUpdated) {
      console.warn('Bio was updated but personality update failed');
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateTwinBio:', error);
    throw error;
  }
}

// Function to update a twin's Letterboxd URL
export async function updateTwinLetterboxd(twinId: string | number, letterboxdUrl: string) {
  const numericId = typeof twinId === 'string' ? parseInt(twinId) : twinId;
  
  try {
    // Create a direct admin client with service role key to bypass RLS
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
    
    // Update letterboxd URL and mark it for refreshing the data
    const { error } = await adminClient
      .from('twins')
      .update({ 
        letterboxd_url: letterboxdUrl,
        letterboxd_data: { status: 'refresh_pending' }
      })
      .eq('id', numericId);
    
    if (error) {
      console.error('Error updating twin letterboxd:', error);
      throw error;
    }
    
    // If there's a URL, fetch the Letterboxd data
    if (letterboxdUrl.trim()) {
      try {
        const letterboxdData = await fetchLetterboxdData(letterboxdUrl);
        
        // If successful, update the twin with the new data
        if (letterboxdData.status === 'success') {
          const { error: updateError } = await adminClient
            .from('twins')
            .update({ letterboxd_data: letterboxdData })
            .eq('id', numericId);
          
          if (updateError) {
            console.error('Error updating twin with letterboxd data:', updateError);
          }
        } else {
          console.warn(`Letterboxd data fetch was not successful: ${letterboxdData.status}`);
        }
      } catch (letterboxdError) {
        console.error('Error fetching letterboxd data:', letterboxdError);
      }
    } else {
      // If URL is empty, reset the letterboxd data
      const { error: resetError } = await adminClient
        .from('twins')
        .update({
          letterboxd_data: { status: 'not_provided' }
        })
        .eq('id', numericId);
      
      if (resetError) {
        console.error('Error resetting letterboxd data:', resetError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateTwinLetterboxd:', error);
    throw error;
  }
}

/**
 * Updates a twin's personality based on current data
 * This function centralizes personality updates to ensure consistency
 */
export async function updateTwinPersonality(twinId: string | number): Promise<boolean> {
  const numericId = typeof twinId === 'string' ? parseInt(twinId) : twinId;
  
  try {
    console.log(`Updating personality for twin ID: ${numericId}`);
    
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
    
    // Get current twin data with all necessary fields
    const { data: twinData, error: fetchError } = await adminClient
      .from('twins')
      .select('*')
      .eq('id', numericId)
      .single();
      
    if (fetchError || !twinData) {
      console.error('Error fetching twin data for personality update:', fetchError);
      throw fetchError || new Error('Twin not found');
    }
    
    // Generate new personality based on current data
    console.log('Generating new twin personality');
    const twinPersonality = await generateTwinPersonality(
      twinData.bio,
      twinData.letterboxd_data,
      twinData.spotify_data
    );
    
    // Update the twin's personality
    const { error: updateError } = await adminClient
      .from('twins')
      .update({ twin_personality: twinPersonality })
      .eq('id', numericId);
      
    if (updateError) {
      console.error('Error updating twin personality:', updateError);
      return false;
    }
    
    console.log('Twin personality updated successfully');
    return true;
  } catch (error) {
    console.error('Error in updateTwinPersonality:', error);
    return false;
  }
} 