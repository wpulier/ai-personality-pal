import { NextRequest, NextResponse } from 'next/server';
import { createMessage, getTwin } from '@/lib/services/twin-service';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { streamChatResponse } from '@/lib/services/streamChatResponse';

// Schema for message request
const messageSchema = z.object({
  content: z.string().min(1, "Message content is required"),
  is_user: z.boolean().default(true)
});

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Get twin ID from URL params - properly await the params object
    const { id } = await context.params;
    const twinId = parseInt(id);
    if (isNaN(twinId)) {
      return NextResponse.json({ error: 'Invalid twin ID' }, { status: 400 });
    }

    // Create an admin client to bypass RLS
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Parse request body
    const body = await request.json();
    const validatedData = messageSchema.parse(body);

    // Get twin data directly from the database using admin client
    console.log(`Fetching twin data for message response, ID: ${twinId}`);
    const { data: twin, error: twinError } = await adminClient
      .from('twins')
      .select('*')
      .eq('id', twinId)
      .single();

    if (twinError || !twin) {
      console.error('Twin not found:', twinError);
      return NextResponse.json({ error: 'Twin not found' }, { status: 404 });
    }

    // Log debug info about twin data
    console.log('Twin data for message generation:', {
      id: twin.id,
      name: twin.name,
      letterboxd_status: twin.letterboxd_data?.status,
      spotify_status: twin.spotify_data?.status,
      has_personality: !!twin.twin_personality
    });

    // Save user message
    console.log('Saving user message');
    const { data: userMessage, error: userMsgError } = await adminClient
      .from('messages')
      .insert({
        twin_id: twinId,
        content: validatedData.content,
        is_user: true
      })
      .select()
      .single();

    if (userMsgError) {
      console.error('Error saving user message:', userMsgError);
      return NextResponse.json({ error: 'Failed to save user message' }, { status: 500 });
    }

    // Get previous messages for context
    console.log('Fetching previous messages for context');
    const { data: previousMessages, error: msgHistoryError } = await adminClient
      .from('messages')
      .select('*')
      .eq('twin_id', twinId)
      .order('created_at', { ascending: true })
      .limit(10);

    if (msgHistoryError) {
      console.error('Error fetching message history:', msgHistoryError);
      // Continue with empty history if there's an error
    }

    // Format messages for OpenAI - make sure is_user field is correctly used
    const chatHistory = (previousMessages || []).map(msg => ({
      content: msg.content,
      isUser: !!msg.is_user // Convert to boolean
    }));

    // Add the current message
    chatHistory.push({
      content: validatedData.content,
      isUser: true
    });

    // Generate AI response using the new streamChatResponse function that handles twin data consistently
    console.log('Generating AI response');
    try {
      const aiResponse = await streamChatResponse(
        twinId,
        validatedData.content,
        chatHistory,
        twin // Pass the complete twin data object
      );

      // Process the response
      let responseText = '';
      for await (const chunk of aiResponse) {
        if (chunk && chunk.choices && chunk.choices[0]?.delta) {
          responseText += chunk.choices[0]?.delta?.content || '';
        }
      }

      // Save AI response
      console.log('Saving AI response');
      const { data: assistantMessage, error: aiMsgError } = await adminClient
        .from('messages')
        .insert({
          twin_id: twinId,
          content: responseText,
          is_user: false
        })
        .select()
        .single();

      if (aiMsgError) {
        console.error('Error saving AI response:', aiMsgError);
        return NextResponse.json({ error: 'Failed to save AI response' }, { status: 500 });
      }

      // Return both messages
      return NextResponse.json({
        userMessage,
        assistantMessage
      }, { status: 201 });
    } catch (aiError) {
      console.error('Error generating AI response:', aiError);
      return NextResponse.json({ 
        error: 'Failed to generate AI response',
        userMessage // Return the user message anyway
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing message:', error);
    
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