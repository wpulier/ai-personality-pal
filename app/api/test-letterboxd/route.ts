import { NextRequest, NextResponse } from 'next/server';
import { fetchLetterboxdData } from '@/lib/services/letterboxd';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const username = url.searchParams.get('username');
    
    console.log(`Test Letterboxd API called with username: ${username}`);
    
    if (!username) {
      return NextResponse.json({ 
        error: 'Username parameter is required',
        usage: 'Use ?username=letterboxd_username or ?username=https://letterboxd.com/username/'
      }, { status: 400 });
    }
    
    // Try to fetch Letterboxd data with additional info
    console.log(`Fetching Letterboxd data for: ${username}`);
    const startTime = Date.now();
    
    const result = await fetchLetterboxdData(username);
    
    const duration = Date.now() - startTime;
    console.log(`Letterboxd fetch completed in ${duration}ms with status: ${result.status}`);
    
    // Add some extra debugging info to the response
    const response = {
      ...result,
      _debug: {
        timeToFetch: `${duration}ms`,
        username,
        timestamp: new Date().toISOString()
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error testing Letterboxd:', error);
    
    // Enhanced error response
    return NextResponse.json({ 
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to test Letterboxd',
      stack: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.stack : undefined) : undefined
    }, { status: 500 });
  }
} 