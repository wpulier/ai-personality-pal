import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    console.log('Creating a test twin in Supabase...');
    
    // Create a simple test twin
    const testTwin = {
      name: 'Test Twin',
      bio: 'This is a test twin created to verify the database connection.',
      letterboxd_data: { status: 'not_provided' },
      spotify_data: { status: 'not_provided' },
      twin_personality: {
        interests: ['testing', 'debugging'],
        style: 'helpful',
        traits: ['friendly', 'analytical'],
        summary: 'A test twin created to verify the Supabase database connection.'
      }
    };
    
    // Create a direct admin client with service role key to bypass RLS
    console.log('Creating admin client with Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
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
    
    console.log('Admin client created, inserting twin with service role...');
    
    // Insert using the admin client
    const { data, error } = await adminClient
      .from('twins')
      .insert(testTwin)
      .select();
    
    if (error) {
      console.error('Error creating test twin:', error);
      return NextResponse.json({ 
        error: 'Failed to create test twin',
        details: error
      }, { status: 500 });
    }
    
    return NextResponse.json({
      message: 'Test twin created successfully',
      twin: data[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error in test twin endpoint:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 