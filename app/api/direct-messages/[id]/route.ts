import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface MessageWithRole {
  id: number;
  twin_id: number;
  content: string;
  created_at: Date | string;
  is_user: boolean;
}

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Get the twin ID from context params - properly awaited
    const params = await context.params;
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Twin ID is required' }, { status: 400 });
    }
    
    console.log(`Fetching messages for twin ID ${id} using service role key`);
    
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
    
    // Get messages for the twin
    const { data: messages, error } = await adminClient
      .from('messages')
      .select('*')
      .eq('twin_id', id)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
    
    // Convert to MessageWithRole format to match what the client expects
    const messagesWithRole: MessageWithRole[] = messages ? 
      messages.map((msg, index) => ({
        ...msg,
        isUser: !!msg.is_user // Ensure boolean type
      })) : [];
    
    return NextResponse.json(messagesWithRole);
  } catch (error) {
    console.error('Error in direct-messages endpoint:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 