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
    const db = getDb();
    const body = await request.json();
    
    // Validate the request body against the schema
    const validatedData = insertUserSchema.parse(body);
    
    // Process Letterboxd data if provided
    const letterboxdData = body.letterboxdUrl 
      ? { status: 'success', recentRatings: [] } // This would be replaced with actual API call
      : { status: 'not_provided' };
    
    // Process Spotify data if provided
    const spotifyData = body.spotifyUrl
      ? { status: 'success', topArtists: [] } // This would be replaced with actual API call
      : { status: 'not_provided' };
    
    // Generate twin personality
    const twinPersonality = await generateTwinPersonality(
      validatedData.bio,
      letterboxdData,
      spotifyData
    );
    
    // Create the user with the generated personality
    const newUser = await db.insert(users).values({
      ...validatedData,
      letterboxdData,
      spotifyData,
      twinPersonality
    }).returning();
    
    return NextResponse.json(newUser[0], { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error instanceof ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
} 