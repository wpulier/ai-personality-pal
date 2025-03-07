import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Validate request schema
const claimTwinSchema = z.object({
  twinId: z.number().positive().or(z.string().regex(/^\d+$/).transform(Number)),
  userId: z.string().uuid()
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { twinId, userId } = claimTwinSchema.parse(body);
    
    console.log(`Attempting to claim twin ${twinId} for user ${userId}`);
    
    // Create a supabase admin client to bypass RLS
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // First check if twin exists and isn't already claimed
    const { data: existingTwin, error: fetchError } = await supabase
      .from('twins')
      .select('id, auth_user_id')
      .eq('id', twinId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching twin:', fetchError);
      return NextResponse.json(
        { error: 'Twin not found', details: fetchError.message },
        { status: 404 }
      );
    }
    
    if (!existingTwin) {
      return NextResponse.json(
        { error: 'Twin not found' },
        { status: 404 }
      );
    }
    
    // Check if twin is already claimed by another user
    if (existingTwin.auth_user_id && existingTwin.auth_user_id !== userId) {
      return NextResponse.json(
        { error: 'This twin is already claimed by another user' },
        { status: 403 }
      );
    }
    
    // Check if the user already has a twin
    const { data: existingUserTwins, error: userTwinsError } = await supabase
      .from('twins')
      .select('id, name')
      .eq('auth_user_id', userId)
      .limit(1);
    
    if (userTwinsError) {
      console.error('Error checking for existing user twins:', userTwinsError);
      return NextResponse.json(
        { error: 'Failed to check for existing twins', details: userTwinsError.message },
        { status: 500 }
      );
    }
    
    if (existingUserTwins && existingUserTwins.length > 0) {
      console.log(`User ${userId} already has a twin (ID: ${existingUserTwins[0].id})`);
      
      // If the user is trying to claim the twin they already own, just return success
      if (existingUserTwins[0].id === twinId) {
        return NextResponse.json({
          success: true,
          message: 'Twin is already claimed by you',
          twin: existingTwin
        });
      }
      
      return NextResponse.json(
        { 
          error: 'You already have a twin', 
          details: 'Each user can only have one twin',
          existingTwinId: existingUserTwins[0].id,
          existingTwinName: existingUserTwins[0].name
        },
        { status: 409 }
      );
    }
    
    // Update the twin with the user ID
    const { data, error } = await supabase
      .from('twins')
      .update({ auth_user_id: userId })
      .eq('id', twinId)
      .select()
      .single();
    
    if (error) {
      console.error('Error claiming twin:', error);
      return NextResponse.json(
        { error: 'Failed to claim twin', details: error.message },
        { status: 500 }
      );
    }
    
    console.log(`Successfully claimed twin ${twinId} for user ${userId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Twin successfully claimed',
      twin: data
    });
  } catch (error) {
    console.error('Error in /api/twins/claim:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to claim twin', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 