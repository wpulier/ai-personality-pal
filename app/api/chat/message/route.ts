import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { streamChatResponse } from '@/lib/services/streamChatResponse';
import { getRecentMessages, createConversationSummary } from '@/lib/services/memory-service';

// Schema for the chat message request
const messageSchema = z.object({
  twinId: z.number().int().positive(),
  content: z.string().min(1, "Message content is required")
});

// Define a message type to help with type checking
interface ChatMessage {
  id: number;
  twin_id: number; // This is the key field name we found in the database
  content: string;
  is_user: boolean;
  created_at: string;
  metadata?: any;
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    const { twinId, content } = messageSchema.parse(body);
    
    console.log(`Processing message for twin ID ${twinId}`);
    
    // Verify Supabase environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('Missing Supabase configuration');
      return NextResponse.json(
        { error: 'Server configuration error. Missing database credentials.' },
        { status: 500 }
      );
    }
    
    // Create a direct admin client with service role key to bypass RLS
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Step 1: Get twin data
    const { data: twin, error: twinError } = await adminClient
      .from('twins')
      .select('*')
      .eq('id', twinId)
      .single();
    
    if (twinError) {
      console.error('Twin fetch error:', twinError);
      return NextResponse.json({ 
        error: 'Twin not found', 
        details: twinError.message 
      }, { status: 404 });
    }
    
    if (!twin) {
      console.error(`No twin found with ID: ${twinId}`);
      return NextResponse.json({ error: 'Twin not found' }, { status: 404 });
    }
    
    // Step 2: Save user message
    const { data: userMessage, error: userMessageError } = await adminClient
      .from('messages')
      .insert({
        twin_id: twinId,
        content: content,
        is_user: true,
        // No metadata for now to simplify
      })
      .select()
      .single();
    
    if (userMessageError) {
      console.error('Error saving user message:', userMessageError);
      return NextResponse.json({ 
        error: 'Failed to save user message', 
        details: userMessageError.message 
      }, { status: 500 });
    }
    
    // Step 3: Get messages for context
    const { data: previousMessages, error: messagesError } = await adminClient
      .from('messages')
      .select('*')
      .eq('twin_id', twinId)
      .order('created_at', { ascending: true })
      .limit(10);
    
    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      // Continue with an empty array
    }
    
    // Format messages for OpenAI
    const chatHistory = (previousMessages || []).map(msg => ({
      content: msg.content,
      isUser: !!msg.is_user
    }));
    
    console.log(`Generating AI response with ${chatHistory.length} messages in context`);
    
    // Step 4: Generate AI response
    let responseText = '';
    try {
      const numericTwinId = typeof twinId === 'string' ? parseInt(twinId) : twinId;
      
      const aiResponse = await streamChatResponse(
        numericTwinId,
        content,
        chatHistory,
        twin
      );
      
      if (!aiResponse) {
        throw new Error('No AI response returned');
      }
      
      for await (const chunk of aiResponse) {
        if (chunk && chunk.choices && chunk.choices[0]?.delta) {
          responseText += chunk.choices[0].delta.content || '';
        }
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      // Use a fallback message
      responseText = "I apologize, but I'm having trouble generating a response right now. Could we try again?";
    }
    
    // Ensure we have some text
    if (!responseText.trim()) {
      responseText = "I apologize, but I'm having trouble generating a response right now. Could we try again?";
    }
    
    // Step 5: Save AI response
    const { data: aiMessage, error: aiMessageError } = await adminClient
      .from('messages')
      .insert({
        twin_id: twinId,
        content: responseText,
        is_user: false,
        // No metadata for now to simplify
      })
      .select()
      .single();
    
    if (aiMessageError) {
      console.error('Error saving AI response:', aiMessageError);
      return NextResponse.json({ 
        error: 'Failed to save AI response',
        userMessage,
        aiMessageContent: responseText,
        details: aiMessageError.message 
      }, { status: 500 });
    }
    
    // Step 6: Trigger background summarization if we're getting a lot of messages
    // Don't await this - let it run in the background
    createConversationSummary(twinId).catch(error => {
      console.error('Background summarization error:', error);
    });
    
    // Return both messages
    return NextResponse.json({
      userMessage,
      aiMessage
    });
  } catch (error) {
    console.error('Error in chat/message endpoint:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to process message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 