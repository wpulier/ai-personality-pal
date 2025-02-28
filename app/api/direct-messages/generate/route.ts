import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { streamChatResponse } from '@/lib/services/streamChatResponse';

// Schema for the AI generation request
const generateSchema = z.object({
  twinId: z.number().int().positive(),
  userMessageId: z.number().int().positive(),
  prompt: z.string().min(1, "Prompt is required")
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    const { twinId, userMessageId, prompt } = generateSchema.parse(body);
    
    console.log(`Generating AI response for twin ID ${twinId}`);
    
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
    
    // Get twin data
    const { data: twin, error: twinError } = await adminClient
      .from('twins')
      .select('*')
      .eq('id', twinId)
      .single();
    
    if (twinError || !twin) {
      console.error('Twin not found:', twinError);
      return NextResponse.json({ error: 'Twin not found' }, { status: 404 });
    }
    
    // Get previous messages for context (limited to last 10)
    const { data: previousMessages, error: messagesError } = await adminClient
      .from('messages')
      .select('*')
      .eq('twin_id', twinId)
      .order('created_at', { ascending: true })
      .limit(10);
    
    if (messagesError) {
      console.error('Error fetching previous messages:', messagesError);
      // We'll continue even if we can't get previous messages
    }
    
    // Format messages for OpenAI - ensure correct user/AI alternation
    const chatHistory = (previousMessages || []).map(msg => ({
      content: msg.content,
      isUser: !!msg.is_user
    }));
    
    // Add the current message if it's not already in the history
    if (!chatHistory.some(msg => msg.isUser && msg.content === prompt)) {
      chatHistory.push({
        content: prompt,
        isUser: true
      });
    }
    
    console.log(`Generating AI response with ${chatHistory.length} messages in context`);
    
    // Generate AI response
    let aiResponse;
    try {
      // Convert twinId to number to match the expected parameter type
      const numericTwinId = typeof twinId === 'string' ? parseInt(twinId) : twinId;
      
      aiResponse = await streamChatResponse(
        numericTwinId, 
        prompt, 
        chatHistory,
        twin
      );
    } catch (streamError) {
      console.error('Error generating AI response:', streamError);
      return NextResponse.json({ 
        error: 'Failed to generate AI response',
        details: streamError instanceof Error ? streamError.message : 'Unknown error'
      }, { status: 500 });
    }
    
    // Process the response
    let responseText = '';
    try {
      if (aiResponse) {
        for await (const chunk of aiResponse) {
          if (chunk && chunk.choices && chunk.choices[0]?.delta) {
            responseText += chunk.choices[0].delta.content || '';
          }
        }
      }
    } catch (streamProcessError) {
      console.error('Error processing stream response:', streamProcessError);
      responseText = "I apologize, but I'm having trouble generating a response right now. Could we try again?"
    }
    
    // Default message if somehow we end up with empty text
    if (!responseText.trim()) {
      responseText = "I apologize, but I'm having trouble generating a response right now. Could we try again?";
    }
    
    // Save the AI response to the messages table
    const { data: savedMessage, error: saveError } = await adminClient
      .from('messages')
      .insert({
        twin_id: twinId,
        content: responseText,
        is_user: false
      })
      .select()
      .single();
    
    if (saveError) {
      console.error('Error saving AI response:', saveError);
      return NextResponse.json({ error: 'Failed to save AI response' }, { status: 500 });
    }
    
    // Return the saved AI message
    return NextResponse.json(savedMessage);
  } catch (error) {
    console.error('Error in direct-messages/generate endpoint:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to generate AI response',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 