import { NextRequest, NextResponse } from 'next/server';
import { fetchLetterboxdData } from '@/lib/services/letterboxd';
import { z } from 'zod';

// Schema for request validation
const requestSchema = z.object({
  url: z.string().url('Invalid Letterboxd URL').optional().nullable()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = requestSchema.parse(body);
    
    console.log(`Processing Letterboxd data fetch for URL: ${url || 'none'}`);
    
    // If no URL is provided, return empty data
    if (!url) {
      return NextResponse.json({ 
        status: 'not_provided' 
      });
    }
    
    // Fetch Letterboxd data server-side
    const letterboxdData = await fetchLetterboxdData(url);
    
    console.log(`Letterboxd data fetch completed with status: ${letterboxdData.status}`);
    
    // Return the data
    return NextResponse.json(letterboxdData);
  } catch (error) {
    console.error('Error fetching Letterboxd data:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        status: 'error',
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error fetching Letterboxd data'
    }, { status: 500 });
  }
} 