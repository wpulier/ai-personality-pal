import { NextRequest, NextResponse } from 'next/server';
import { updateTwinPersonality } from '@/lib/services/twin-service';

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Get the twin ID from context params
    const params = await context.params;
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Twin ID is required' },
        { status: 400 }
      );
    }

    console.log(`Received request to update personality for twin ID: ${id}`);
    
    // Call our centralized function to update the twin's personality
    const success = await updateTwinPersonality(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update twin personality' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Twin personality updated successfully'
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error updating twin personality:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update twin personality',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 