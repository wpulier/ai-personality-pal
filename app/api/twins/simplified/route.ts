import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Schema for simplified twin creation
const simplifiedTwinSchema = z.object({
  name: z.string().default('Anonymous'),
  bio: z.string().min(3, "Bio must be at least 3 characters"),
  letterboxd_url: z.string().url("Invalid URL").optional().nullable(),
  spotify_url: z.string().url("Invalid URL").optional().nullable(),
  auth_user_id: z.string().uuid("Invalid user ID").optional().nullable(),
  letterboxd_data: z.any().optional(),
  spotify_data: z.any().optional(),
  twin_personality: z.any().optional()
});

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/twins/simplified - Creating twin with simplified approach');
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = simplifiedTwinSchema.parse(body);
    
    console.log('Simplified twin creation with data:', {
      name: validatedData.name,
      bio: validatedData.bio?.substring(0, 20) + '...',
      auth_user_id: validatedData.auth_user_id,
    });
    
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
    
    // Check if user already has a twin
    if (validatedData.auth_user_id) {
      console.log('Checking if user already has a twin:', validatedData.auth_user_id);
      
      const { data: existingTwins, error: checkError } = await adminClient
        .from('twins')
        .select('id')
        .eq('auth_user_id', validatedData.auth_user_id)
        .limit(1);
      
      if (checkError) {
        console.error('Error checking for existing twins:', checkError);
      } else if (existingTwins && existingTwins.length > 0) {
        console.log('User already has a twin with ID:', existingTwins[0].id);
        
        // Fetch the complete twin data
        const { data: existingTwin, error: fetchError } = await adminClient
          .from('twins')
          .select('*')
          .eq('id', existingTwins[0].id)
          .single();
        
        if (fetchError) {
          console.error('Error fetching existing twin:', fetchError);
        } else {
          console.log('Returning existing twin instead of creating a new one');
          return NextResponse.json(existingTwin);
        }
      }
    }
    
    // Insert the twin using the admin client
    console.log('Inserting twin with simplified approach...');
    
    const { data, error } = await adminClient
      .from('twins')
      .insert({
        name: validatedData.name,
        bio: validatedData.bio,
        auth_user_id: validatedData.auth_user_id,
        letterboxd_url: validatedData.letterboxd_url,
        spotify_url: validatedData.spotify_url,
        letterboxd_data: validatedData.letterboxd_data || { status: 'not_provided' },
        spotify_data: validatedData.spotify_data || { status: 'not_provided' },
        twin_personality: validatedData.twin_personality || {
          interests: ['movies', 'music', 'art'],
          style: 'casual and friendly',
          traits: ['creative', 'thoughtful', 'curious'],
          summary: validatedData.bio
        }
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating twin:', error);
      return NextResponse.json(
        { error: 'Failed to create twin', details: error.message },
        { status: 500 }
      );
    }
    
    console.log('Twin created successfully with ID:', data.id);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in /api/twins/simplified:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create twin', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 