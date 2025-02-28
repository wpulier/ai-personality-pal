import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { normalizeTwinData } from '@/lib/services/twin-service';

// Schema for validating the request body
const summarySchema = z.object({
  summary: z.string().min(3, 'Summary must be at least 3 characters long')
});

// PATCH handler for updating a twin's summary
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Await params before accessing properties
  const resolvedParams = await params;
  
  if (!resolvedParams.id) {
    return NextResponse.json({ error: 'Missing twin ID' }, { status: 400 });
  }

  const id = parseInt(resolvedParams.id);

  try {
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

    // Get the twin to verify it exists
    const { data: twin, error: fetchError } = await adminClient
      .from('twins')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !twin) {
      console.error('Error fetching twin:', fetchError?.message);
      return NextResponse.json(
        { error: 'Twin not found' },
        { status: 404 }
      );
    }

    // Parse and validate the request body
    const body = await request.json();
    const validationResult = summarySchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.format();
      return NextResponse.json({ errors }, { status: 400 });
    }

    // Get the validated summary
    const { summary } = validationResult.data;

    // Update the twin's personality summary directly
    const currentPersonality = twin.twin_personality || {};
    const updatedPersonality = {
      ...currentPersonality,
      summary: summary
    };

    // Update the twin's personality
    const { error: updateError } = await adminClient
      .from('twins')
      .update({ twin_personality: updatedPersonality })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating twin summary:', updateError.message);
      return NextResponse.json(
        { error: 'Failed to update summary' },
        { status: 500 }
      );
    }

    // Get the updated twin data
    const { data: updatedTwin, error: refetchError } = await adminClient
      .from('twins')
      .select('*')
      .eq('id', id)
      .single();

    if (refetchError) {
      console.error('Error fetching updated twin:', refetchError.message);
      return NextResponse.json(
        { message: 'Summary updated but could not fetch the updated twin data' },
        { status: 200 }
      );
    }

    // Return success with the normalized twin data
    return NextResponse.json({
      message: 'Summary updated successfully',
      twin: normalizeTwinData(updatedTwin)
    });
  } catch (error) {
    console.error('Error updating twin summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 