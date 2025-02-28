import { NextRequest, NextResponse } from 'next/server';
import { createTwin } from '@/lib/services/twin-service';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Schema for twin creation
const twinSchema = z.object({
  name: z.string().default('Anonymous'),
  bio: z.string().min(3, "Bio must be at least 3 characters"),
  letterboxd_url: z.string().url("Invalid URL").optional().nullable(),
  spotify_url: z.string().url("Invalid URL").optional().nullable(),
  auth_user_id: z.string().uuid("Invalid user ID").optional().nullable(),
  spotify_data: z.any().optional(),
  letterboxd_data: z.any().optional(),
  twin_personality: z.any().optional()
});

// GET method to fetch all twins or a specific twin by ID
export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/twins - Fetching twins');
    
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
    
    // Create a client to get the session from cookies
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        // @ts-ignore - Supabase JS v2 has cookies support
        cookies: {
          get(name: string) {
            const cookie = request.cookies.get(name);
            return cookie?.value;
          }
        }
      }
    );
    
    // Get the authenticated user from the session
    const { data: { session } } = await supabase.auth.getSession();
    
    // Get filters from search params
    const searchParams = request.nextUrl.searchParams;
    const twinIdParam = searchParams.get('id');

    if (twinIdParam) {
      console.log(`Fetching specific twin with ID: ${twinIdParam}`);
      // Fetch a specific twin by ID
      const { data: twin, error } = await adminClient
        .from('twins')
        .select('*')
        .eq('id', twinIdParam)
        .single();

      if (error) {
        console.error('Error fetching twin:', error);
        return NextResponse.json({ error: "Twin not found or database error" }, { status: 404 });
      }

      return NextResponse.json(twin || { error: "Twin not found" });
    } else {
      // Get current authenticated user ID
      const authUserId = session?.user?.id;
      
      if (!authUserId) {
        console.log('No authenticated user found, returning empty array');
        return NextResponse.json([]);
      }
      
      console.log(`Fetching twins for authenticated user: ${authUserId}`);
      
      // Fetch twins for the authenticated user
      const { data: twins, error } = await adminClient
        .from('twins')
        .select('*')
        .eq('auth_user_id', authUserId)  // Filter by auth_user_id
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching twins:', error);
        return NextResponse.json({ error: "Failed to fetch twins" }, { status: 500 });
      }

      console.log(`Found ${twins?.length || 0} twins for user ${authUserId}`);
      return NextResponse.json(twins || []);
    }
  } catch (error) {
    console.error("Error fetching twins:", error);
    return NextResponse.json(
      { error: "Failed to fetch twins" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const validatedData = twinSchema.parse(body);
    
    console.log('Creating twin with data:', validatedData);
    
    // Create the twin
    let twin = await createTwin({
      name: validatedData.name,
      bio: validatedData.bio,
      letterboxd_url: validatedData.letterboxd_url === null ? undefined : validatedData.letterboxd_url,
      spotify_url: validatedData.spotify_url === null ? undefined : validatedData.spotify_url,
      auth_user_id: validatedData.auth_user_id,
      spotify_data: validatedData.spotify_data
    });
    
    // If the twin creation failed with the regular method, try a direct client
    if (!twin) {
      console.log('Twin creation failed with service, trying direct API client...');
      
      // Create a direct admin client
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
      
      // Prepare the spotify data for insertion
      const spotifyData = validatedData.spotify_data || { status: 'not_provided' };
      
      // Make sure the twin personality has the bio as the summary
      let twinPersonality = body.twin_personality || {
        interests: [],
        style: 'conversational',
        traits: [],
        summary: validatedData.bio
      };
      
      // Ensure summary is set to bio if it's missing
      if (!twinPersonality.summary || twinPersonality.summary.trim() === '') {
        twinPersonality.summary = validatedData.bio;
      }
      
      // Insert the twin directly
      const { data, error } = await adminClient
        .from('twins')
        .insert({
          auth_user_id: validatedData.auth_user_id || null,
          name: validatedData.name,
          bio: validatedData.bio,
          letterboxd_url: validatedData.letterboxd_url || null,
          spotify_url: validatedData.spotify_url || null,
          letterboxd_data: body.letterboxd_data || { status: 'not_provided' },
          spotify_data: spotifyData,
          twin_personality: twinPersonality
        })
        .select()
        .single();
      
      if (error) {
        console.error('Direct twin creation also failed:', error);
        return NextResponse.json({ 
          error: 'Failed to create twin - direct creation failed',
          details: error.message
        }, { status: 500 });
      }
      
      if (data) {
        twin = data;
        console.log('Twin created successfully with direct API, ID:', twin.id);
      }
    }
    
    if (!twin) {
      console.error('Failed to create twin - all methods failed');
      return NextResponse.json({ error: 'Failed to create twin' }, { status: 500 });
    }
    
    console.log('Twin created successfully:', twin.id);
    
    // Return the created twin
    return NextResponse.json(twin, { status: 201 });
  } catch (error) {
    console.error('Error creating twin:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to create twin',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 