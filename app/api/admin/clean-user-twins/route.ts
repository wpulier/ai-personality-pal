import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(request: NextRequest) {
  try {
    // Get email from query string
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }
    
    console.log(`Cleaning up twins for user with email: ${email}`);
    
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
    
    // First get the auth user ID from the email
    const { data: authUser, error: userError } = await adminClient
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    if (userError) {
      console.error('Error finding user:', userError);
      return NextResponse.json({ 
        success: false,
        error: 'Database error finding user',
        details: userError.message
      }, { status: 500 });
    }
    
    if (!authUser) {
      console.log(`No auth user found with email: ${email}`);
      return NextResponse.json({ 
        success: false,
        message: 'No user found with this email'
      }, { status: 404 });
    }
    
    const authUserId = authUser.id;
    console.log(`Found auth user with ID: ${authUserId}`);
    
    // Find all twins linked to this user
    const { data: twins, error: findError } = await adminClient
      .from('twins')
      .select('id')
      .eq('auth_user_id', authUserId);
    
    if (findError) {
      console.error('Error finding twins:', findError);
      return NextResponse.json({ 
        success: false,
        error: 'Database error finding twins',
        details: findError.message
      }, { status: 500 });
    }
    
    // If no twins found, return success
    if (!twins || twins.length === 0) {
      console.log(`No twins found for user ${email}`);
      return NextResponse.json({ 
        success: true,
        message: 'No twins found to delete',
        deleted_count: 0
      });
    }
    
    console.log(`Found ${twins.length} twins to delete for user ${email}`);
    
    // Delete all twins linked to this user
    const { error: deleteError } = await adminClient
      .from('twins')
      .delete()
      .eq('auth_user_id', authUserId);
    
    if (deleteError) {
      console.error('Error deleting twins:', deleteError);
      return NextResponse.json({ 
        success: false,
        error: 'Database error deleting twins',
        details: deleteError.message
      }, { status: 500 });
    }
    
    console.log(`Successfully deleted ${twins.length} twins for user ${email}`);
    
    return NextResponse.json({ 
      success: true,
      message: `Successfully deleted ${twins.length} twins`,
      deleted_count: twins.length,
      twin_ids: twins.map(t => t.id)
    });
    
  } catch (error) {
    console.error('Error cleaning up user twins:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 