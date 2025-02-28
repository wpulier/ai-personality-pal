import { NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for validating the request body
const bioSchema = z.object({
  bio: z.string().min(3, 'Bio must be at least 3 characters long')
});

// PATCH handler for updating a twin's bio
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Await params before accessing properties
  const resolvedParams = await params;
  
  if (!resolvedParams.id) {
    return NextResponse.json({ error: 'Missing twin ID' }, { status: 400 });
  }

  try {
    // Parse and validate the request body
    const body = await request.json();
    const validationResult = bioSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.format();
      return NextResponse.json({ errors }, { status: 400 });
    }

    // Get the validated bio
    const { bio } = validationResult.data;

    // Create a formatted summary
    const summary = bio;

    // Call the internal API to update the twin summary
    const summaryUrl = new URL(`/api/twins/${resolvedParams.id}/summary`, request.url).toString();
    const summaryResponse = await fetch(summaryUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ summary }),
    });

    if (!summaryResponse.ok) {
      const errorData = await summaryResponse.json();
      console.error('Error updating twin summary:', errorData);
      return NextResponse.json(
        { error: 'Failed to update twin summary' },
        { status: 500 }
      );
    }

    // Return success
    return NextResponse.json({
      message: 'Bio updated successfully',
    });
  } catch (error) {
    console.error('Error updating twin bio:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 