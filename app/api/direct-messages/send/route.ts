import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Schema for the message request
const messageSchema = z.object({
  twinId: z.number().int().positive(),
  content: z.string().min(1, "Message content is required"),
  isUser: z.boolean().default(true)
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    const { twinId, content, isUser } = messageSchema.parse(body);
    
    console.log(`Saving message for twin ID ${twinId}`, { isUser });
    
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
    
    // Save the message to the messages table
    const { data, error } = await adminClient
      .from('messages')
      .insert({
        twin_id: twinId,
        content: content,
        is_user: isUser
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving message:', error);
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }
    
    // Return the saved message
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in direct-messages/send endpoint:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to save message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 