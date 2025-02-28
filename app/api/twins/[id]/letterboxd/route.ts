import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { fetchLetterboxdData } from '@/lib/services/letterboxd';
import { normalizeTwinData, updateTwinPersonality } from '@/lib/services/twin-service';

// Schema for validating the request body
const updateLetterboxdSchema = z.object({
  letterboxd_url: z.string().url('Invalid URL format').optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Get the twin ID from context params - properly awaited
    const params = await context.params;
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Twin ID is required' },
        { status: 400 }
      );
    }

    // Create an admin client that bypasses RLS
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Parse the request body
    const body = await request.json();
    
    // Validate the request body
    const validationResult = updateLetterboxdSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }
    
    // Get the validated data
    const { letterboxd_url } = validationResult.data;

    console.log(`Updating letterboxd URL for twin ID: ${id}`);
    
    // First, verify the twin exists and get its current data
    const { data: twin, error: twinError } = await adminClient
      .from('twins')
      .select('*')
      .eq('id', id)
      .single();
      
    if (twinError) {
      console.error('Error fetching twin:', twinError);
      return NextResponse.json(
        { error: 'Twin not found', details: twinError.message },
        { status: 404 }
      );
    }
    
    if (!twin) {
      return NextResponse.json(
        { error: 'Twin not found' },
        { status: 404 }
      );
    }
    
    try {
      // STEP 1: Update letterboxd URL initially
      console.log(`Setting letterboxd_url to: ${letterboxd_url || 'empty'}`);
      const { error: updateUrlError } = await adminClient
        .from('twins')
        .update({ 
          letterboxd_url: letterboxd_url || '',
          // Use a consistent field name that matches the database schema
          letterboxd_data: letterboxd_url ? { status: 'refresh_pending' } : { status: 'not_provided' }
        })
        .eq('id', id);
      
      if (updateUrlError) {
        console.error('Error updating Letterboxd URL:', updateUrlError);
        throw updateUrlError;
      }
      
      // STEP 2: If URL provided, fetch Letterboxd data
      let letterboxdData = null;
      if (letterboxd_url) {
        console.log(`Fetching Letterboxd data for URL: ${letterboxd_url}`);
        letterboxdData = await fetchLetterboxdData(letterboxd_url);
        console.log('Letterboxd data fetched:', JSON.stringify(letterboxdData, null, 2));
        console.log('Data type check:', {
          status: letterboxdData.status,
          statusType: typeof letterboxdData.status,
          hasFavoriteFilms: !!letterboxdData.favoriteFilms,
          favoriteFilmsType: letterboxdData.favoriteFilms ? 
            (Array.isArray(letterboxdData.favoriteFilms) ? 'array' : typeof letterboxdData.favoriteFilms) : 
            'undefined',
          favoriteFilmsLength: letterboxdData.favoriteFilms?.length || 0,
          favoriteFilms: letterboxdData.favoriteFilms || []
        });
        
        // STEP 3: Update twin with Letterboxd data
        if (letterboxdData.status === 'success') {
          console.log('Updating twin with successful Letterboxd data');
          
          // CRITICAL: Use the exact field name from the schema - letterboxd_data
          const { error: updateDataError } = await adminClient
            .from('twins')
            .update({ letterboxd_data: letterboxdData })
            .eq('id', id);
          
          if (updateDataError) {
            console.error('Error updating twin with Letterboxd data:', updateDataError);
            throw updateDataError;
          }
          
          console.log('Successfully updated twin with Letterboxd data');
          
          // STEP 4: Update twin personality based on new Letterboxd data
          console.log('Regenerating twin personality with new Letterboxd data');
          try {
            // Use the centralized personality update function
            const personalityUpdated = await updateTwinPersonality(id);
            
            if (!personalityUpdated) {
              console.warn('Letterboxd data was updated but personality update failed');
            } else {
              console.log('Twin personality updated successfully with new Letterboxd data');
            }
          } catch (personalityError) {
            console.error('Error regenerating twin personality:', personalityError);
            // Don't throw here - we still want to return what we have so far
          }
        } else {
          console.warn(`Letterboxd data fetch was not successful: ${letterboxdData.status}`);
        }
      } else {
        // If URL is empty, reset the letterboxd data
        console.log('Clearing Letterboxd data due to empty URL');
        const { error: resetError } = await adminClient
          .from('twins')
          .update({
            letterboxd_data: { status: 'not_provided' }
          })
          .eq('id', id);
        
        if (resetError) {
          console.error('Error resetting letterboxd data:', resetError);
        }
      }
      
      // STEP 5: Verify and fetch the final updated twin
      console.log('Fetching final updated twin data');
      const { data: updatedTwin, error: fetchError } = await adminClient
        .from('twins')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('Error fetching updated twin:', fetchError);
        throw fetchError;
      }
      
      // Normalize the twin data
      const normalizedTwin = normalizeTwinData(updatedTwin);
      
      // Log the final state for debugging
      console.log('Final letterboxd_data state:', JSON.stringify(normalizedTwin.letterboxd_data, null, 2));
      
      // STEP 6: Return comprehensive data for the client
      return NextResponse.json({
        success: true,
        message: 'Letterboxd URL updated successfully',
        twin: normalizedTwin,
        letterboxd_data: normalizedTwin.letterboxd_data, // Explicitly include this for the client
        letterboxd_url: normalizedTwin.letterboxd_url 
      }, { status: 200 });
    } catch (error) {
      console.error('Error in Letterboxd update process:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error updating twin Letterboxd URL:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update Letterboxd URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 