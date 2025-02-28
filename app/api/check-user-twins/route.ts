import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Get user ID from query string
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }
    
    console.log(`Checking twins for user email: ${email}`);
    
    // Create admin client to bypass RLS
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
    
    // First find the auth user by email
    const { data: authUser, error: userError } = await adminClient
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    if (userError) {
      console.error('Error finding user:', userError);
      return NextResponse.json({ 
        error: 'Error finding user',
        details: userError.message
      }, { status: 500 });
    }
    
    if (!authUser) {
      console.log(`User not found for email: ${email}`);
      return NextResponse.json({ 
        found: false,
        message: 'No user found with this email'
      });
    }
    
    console.log(`Found user with ID: ${authUser.id}`);
    
    // Now find all twins linked to this user
    const { data: twins, error: twinsError } = await adminClient
      .from('twins')
      .select('id, name, created_at')
      .eq('auth_user_id', authUser.id);
    
    if (twinsError) {
      console.error('Error fetching twins:', twinsError);
      return NextResponse.json({ 
        error: 'Failed to fetch twins',
        details: twinsError.message
      }, { status: 500 });
    }
    
    // Log detailed result for debugging
    console.log(`Found ${twins?.length || 0} twins for user ${email} (${authUser.id})`);
    if (twins && twins.length > 0) {
      console.log('Twin IDs:', twins.map(t => t.id).join(', '));
    }
    
    return NextResponse.json({
      found: true,
      auth_user_id: authUser.id,
      twin_count: twins?.length || 0,
      twins: twins || []
    });
    
  } catch (error) {
    console.error('Error checking user twins:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 