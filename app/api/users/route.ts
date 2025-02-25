import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { insertUserSchema, users } from '@/lib/db/schema';
import { generateTwinPersonality } from '@/lib/services/openai';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    
    // Get query parameters
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
      // Get a specific user
      const userId = parseInt(id);
      if (isNaN(userId)) {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json(user);
    } else {
      // Get all users
      const allUsers = await db.query.users.findMany();
      return NextResponse.json(allUsers);
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    try {
      // Validate the request body against the schema
      const validatedData = insertUserSchema.parse(body);
      
      // Simplified data for integration services
      const letterboxdData = { 
        status: 'success' as const, 
        recentRatings: [{ title: 'Inception', rating: '5/5', year: '2010' }], 
        favoriteGenres: ['Drama', 'Sci-Fi'], 
        favoriteFilms: ['Inception', 'The Godfather'] 
      };
      
      const spotifyData = { 
        status: 'success' as const, 
        topArtists: ['The Beatles', 'Queen'], 
        topGenres: ['Rock', 'Pop'], 
        recentTracks: [{ name: 'Let It Be', artist: 'The Beatles' }] 
      };
      
      console.log('Generating twin personality with bio:', validatedData.bio);
      
      // Generate twin personality with minimal data
      let twinPersonality;
      try {
        twinPersonality = await generateTwinPersonality(
          validatedData.bio,
          letterboxdData,
          spotifyData
        );
        
        console.log('Generated twin personality:', twinPersonality);
      } catch (aiError) {
        console.error('Error generating twin personality, using fallback:', aiError);
        twinPersonality = {
          interests: ["movies", "music", "storytelling", "arts", "entertainment"],
          style: "friendly, conversational, and thoughtful",
          traits: ["creative", "analytical", "curious", "adaptable", "reflective"],
          summary: `A thoughtful individual who enjoys movies and music. ${validatedData.bio.length > 20 ? 'Their bio suggests they value self-expression and meaningful connections.' : 'They seem to value concise communication.'}`
        };
      }
      
      // Connect to database - get this connection after the personality generation
      // to minimize connection time
      const db = getDb();
      
      // Create the user with the generated personality
      const newUser = await db.insert(users).values({
        name: validatedData.name || 'Anonymous',
        bio: validatedData.bio,
        letterboxdUrl: validatedData.letterboxdUrl || null,
        spotifyUrl: validatedData.spotifyUrl || null,
        letterboxdData,
        spotifyData,
        twinPersonality
      }).returning();
      
      return NextResponse.json(newUser[0], { status: 201 });
    } catch (validationError) {
      if (validationError instanceof ZodError) {
        console.log('Validation error:', validationError.errors);
        return NextResponse.json({ 
          error: 'Validation error', 
          details: validationError.errors 
        }, { status: 400 });
      }
      throw validationError; // Re-throw if it's not a ZodError
    }
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create user'
    }, { status: 500 });
  }
} 