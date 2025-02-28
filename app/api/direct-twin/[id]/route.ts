import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeTwinData } from '@/lib/services/twin-service';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Check for force refresh parameter
    const forceRefresh = request.nextUrl.searchParams.get('forceRefresh') === 'true';
    
    // Get the twin ID from context params - properly awaited
    const params = await context.params;
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Twin ID is required' }, { status: 400 });
    }
    
    console.log(`Fetching twin with ID ${id} using service role key${forceRefresh ? ' (force refresh)' : ''}`);
    
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
    
    // Get the twin directly
    const { data: twin, error } = await adminClient
      .from('twins')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching twin:', error);
      return NextResponse.json({ error: 'Twin not found or database error' }, { status: 404 });
    }
    
    if (!twin) {
      return NextResponse.json({ error: 'Twin not found' }, { status: 404 });
    }
    
    // Normalize the twin data to ensure consistent field names
    const normalizedTwin = normalizeTwinData(twin);
    
    return NextResponse.json(normalizedTwin);
  } catch (error) {
    console.error('Error in direct-twin endpoint:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 