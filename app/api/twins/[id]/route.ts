import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeTwinData } from '@/lib/services/twin-service';

// GET handler to retrieve a specific twin
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Get the twin ID from params
    const { id } = context.params;
    
    if (!id) {
      return NextResponse.json({ error: 'Twin ID is required' }, { status: 400 });
    }
    
    console.log(`Fetching twin with ID ${id} from API`);
    
    // Create an admin client with service role key to bypass RLS
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
    
    // Get the twin
    const { data: twin, error } = await adminClient
      .from('twins')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching twin:', error);
      return NextResponse.json({ error: 'Twin not found' }, { status: 404 });
    }
    
    // Return the normalized twin data
    return NextResponse.json(normalizeTwinData(twin));
  } catch (error) {
    console.error('Error in twins API:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE handler to delete a twin
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Get the twin ID from params
    const { id } = context.params;
    
    if (!id) {
      return NextResponse.json({ error: 'Twin ID is required' }, { status: 400 });
    }
    
    console.log(`Deleting twin with ID ${id} from API`);
    
    // Create an admin client with service role key to bypass RLS
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
    
    // First check if the twin exists
    const { data: existingTwin, error: checkError } = await adminClient
      .from('twins')
      .select('id')
      .eq('id', id)
      .single();
    
    if (checkError || !existingTwin) {
      console.error('Twin not found for deletion:', checkError?.message || 'Twin not found');
      return NextResponse.json({ 
        error: 'Twin not found',
        details: checkError?.message || 'The twin you are trying to delete does not exist.'
      }, { status: 404 });
    }
    
    // Delete the twin
    const { error } = await adminClient
      .from('twins')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting twin:', error);
      return NextResponse.json({ 
        error: 'Failed to delete twin', 
        details: error.message 
      }, { status: 500 });
    }
    
    console.log(`Successfully deleted twin with ID ${id}`);
    
    // Return success message
    return NextResponse.json({ 
      success: true, 
      message: 'Twin deleted successfully' 
    });
  } catch (error) {
    console.error('Error in twins deletion API:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 