import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getDb } from '@/lib/db';
import { insertUserSchema, users, Rating, messages } from '@/lib/db/schema';
import { generateTwinPersonality } from '@/lib/services/streamChatResponse';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import { fetchLetterboxdData } from "@/lib/services/letterboxd";
import { z } from "zod";
import { createClient } from '@supabase/supabase-js';

// Schema for validating user creation
const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  bio: z.string().min(1, "Bio is required"),
  letterboxdUrl: z.string().optional(),
  spotifyData: z.any().optional(),
});

export async function GET(req: NextRequest) {
  try {
    // Create a direct admin client with service role key to bypass RLS
    console.log('Creating admin client with URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
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

    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId') || searchParams.get('id');

    if (userId) {
      // Convert to number and validate
      const id = parseInt(userId);
      if (isNaN(id)) {
        return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
      }

      console.log(`Fetching twin with ID ${id} using admin client`);
      
      // Get a specific twin from Supabase using admin client
      const { data: twin, error } = await adminClient
        .from('twins')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching twin:', error);
        return NextResponse.json({ error: "Twin not found or database error" }, { status: 404 });
      }

      if (!twin) {
        return NextResponse.json({ error: "Twin not found" }, { status: 404 });
      }

      return NextResponse.json(twin);
    } else {
      // Get all twins using admin client
      const { data: twins, error } = await adminClient
        .from('twins')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching twins:', error);
        return NextResponse.json({ error: "Failed to fetch twins" }, { status: 500 });
      }

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate request body
    const validation = userSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { name, bio, letterboxdUrl, spotifyData } = validation.data;
    console.log(`Creating user with name: ${name}, letterboxdUrl: ${letterboxdUrl || 'none'}, spotifyData: ${spotifyData ? 'provided' : 'none'}`);
    
    // Fetch Letterboxd data if provided
    let letterboxdData: {
      status: 'success' | 'error' | 'not_provided';
      recentRatings?: Rating[];
      favoriteGenres?: string[];
      favoriteFilms?: string[];
      error?: string;
    } = { status: 'not_provided' };
    
    if (letterboxdUrl && letterboxdUrl.trim() !== '') {
      console.log(`Fetching Letterboxd data for URL: ${letterboxdUrl}`);
      letterboxdData = await fetchLetterboxdData(letterboxdUrl);
      console.log(`Letterboxd data fetch result: ${letterboxdData.status}`);
      
      // Log detailed info if in error state
      if (letterboxdData.status === 'error') {
        console.error(`Letterboxd data error: ${letterboxdData.error}`);
      }
    }
    
    // Use provided Spotify data or set to not_provided
    const userData = {
      name,
      bio,
      letterboxdUrl,
      letterboxdData,
      spotifyData: spotifyData || { status: 'not_provided' as const },
    };
    
    // Ensure letterboxdData has all required fields even in error state
    if (letterboxdData.status === 'error' && (!letterboxdData.recentRatings || !letterboxdData.favoriteGenres || !letterboxdData.favoriteFilms)) {
      letterboxdData = {
        ...letterboxdData,
        recentRatings: letterboxdData.recentRatings || [],
        favoriteGenres: letterboxdData.favoriteGenres || [],
        favoriteFilms: letterboxdData.favoriteFilms || []
      };
    }
    
    console.log('Generating twin personality...');
    // Generate the twin personality
    const twinPersonality = await generateTwinPersonality(
      bio,
      letterboxdData,
      userData.spotifyData
    );
    
    console.log('Twin personality generated:', JSON.stringify(twinPersonality, null, 2));
    
    // Insert the new user into the database
    const db = getDb();
    const [newUser] = await db
      .insert(users)
      .values({
        ...userData,
        twinPersonality,
      })
      .returning();
    
    // We no longer create an initial message here
    // The first message will be generated on-demand when the chat page loads
    
    return NextResponse.json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
} 