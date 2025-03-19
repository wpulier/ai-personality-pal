import { NextRequest, NextResponse } from 'next/server';
import { createMessage, getTwin } from '@/lib/services/twin-service';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { streamChatResponse } from '@/lib/services/streamChatResponse';
import { generateFromTemplate, detectParentMention, detectResponse } from '@/lib/templates/conversation-templates';
import { getConversationState, updateConversationState } from '@/lib/services/conversation-state';

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
    const { data: savedUserMessage, error: userMessageError } = await adminClient
      .from('messages')
      .insert({
        twin_id: twinId,
        content: validatedData.content,
        is_user: true
      })
      .select()
      .single();

    if (userMessageError) {
      console.error('Error saving user message:', userMessageError);
      return NextResponse.json({ error: 'Failed to save user message' }, { status: 500 });
    }

    // Get previous messages for context
    console.log('Fetching message history');
    const { data: messageHistory, error: historyError } = await adminClient
      .from('messages')
      .select('*')
      .eq('twin_id', twinId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (historyError) {
      console.error('Error fetching message history:', historyError);
      // Continue anyway with empty history
    }

    // Format message history for the conversation
    const formattedHistory = (messageHistory || [])
      .map(msg => ({
        content: msg.content,
        isUser: !!msg.is_user
      }))
      .reverse();

    // Get the current conversation state
    const conversationState = await getConversationState(twinId);
    if (!conversationState) {
      console.warn(`No conversation state found for twin ${twinId}, using standard conversation flow`);

      // Default to the standard conversation flow
      console.log('Using standard conversation flow');
      const aiResponse = await streamChatResponse(
        twinId,
        validatedData.content,
        formattedHistory,
        twin
      );

      const responseContent = await processStreamingResponse(aiResponse);

      // Save AI response message
      console.log('Saving AI response message');
      const { data: savedAiMessage, error: aiMessageError } = await adminClient
        .from('messages')
        .insert({
          twin_id: twinId,
          content: responseContent || "I'm not sure how to respond to that.",
          is_user: false
        })
        .select()
        .single();

      if (aiMessageError) {
        console.error('Error saving AI message:', aiMessageError);
        return NextResponse.json({ error: 'Failed to save AI response' }, { status: 500 });
      }

      // Check if we need to update emotional analysis
      // We do this here to avoid extra API calls from the client
      try {
        // Get current message count to see if we've hit a multiple of 10
        const { count, error: countError } = await adminClient
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('twin_id', twinId);

        if (!countError && count && count % 10 === 0) {
          console.log(`Message count hit ${count}, updating emotional analysis`);

          // Trigger the emotional analysis update
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/twins/${twinId}/emotional-analysis`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });
        }
      } catch (analysisError) {
        // Don't let this error affect the response
        console.error('Error checking for emotional analysis update:', analysisError);
      }

      // Return the saved AI message
      return NextResponse.json(savedAiMessage, { status: 201 });
    }

    // Based on the user message, update the conversation state
    const updatedState = await updateConversationState(twinId, validatedData.content, conversationState);

    // Determine if we should use structured conversation or normal flow
    let responseContent: string;

    if (updatedState && ['INITIAL', 'YES_RESPONSE', 'NO_RESPONSE', 'DIGGING_DEEPER', 'PARENT_MENTION', 'CLOSURE'].includes(updatedState.currentPhase)) {
      // We're in a structured conversation flow
      console.log(`Using structured conversation flow: ${updatedState.currentPhase}`);

      // Extract twin personality
      const twinPersonality = twin.twin_personality || {};

      // Based on the current phase, generate appropriate response using templates
      switch (updatedState.currentPhase) {
        case 'YES_RESPONSE':
          responseContent = generateFromTemplate('YES_RESPONSE', {});
          break;

        case 'NO_RESPONSE':
          responseContent = generateFromTemplate('NO_RESPONSE', {});
          break;

        case 'DIGGING_DEEPER':
          responseContent = generateFromTemplate('DIG_DEEPER', {
            emotionalPattern: twinPersonality.emotionalPatterns?.[0] || 'emotionally nuanced',
            hiddenTrait: twinPersonality.hiddenTraits?.[0] || 'keep certain aspects of yourself private'
          });
          break;

        case 'PARENT_MENTION':
          responseContent = generateFromTemplate('PARENT_MENTION', {});
          break;

        case 'CLOSURE':
          responseContent = generateFromTemplate('CLOSURE', {});
          break;

        default:
          // If we're in an unexpected state or INITIAL, use the standard flow
          // This shouldn't happen in normal operation but provides a fallback
          const aiResponse = await streamChatResponse(
            twinId,
            validatedData.content,
            formattedHistory,
            twin
          );

          responseContent = await processStreamingResponse(aiResponse);
      }
    } else {
      // Default to the standard conversation flow
      console.log('Using standard conversation flow');
      const aiResponse = await streamChatResponse(
        twinId,
        validatedData.content,
        formattedHistory,
        twin
      );

      responseContent = await processStreamingResponse(aiResponse);
    }

    // Save AI response message
    console.log('Saving AI response message');
    const { data: savedAiMessage, error: aiMessageError } = await adminClient
      .from('messages')
      .insert({
        twin_id: twinId,
        content: responseContent || "I'm not sure how to respond to that.",
        is_user: false
      })
      .select()
      .single();

    if (aiMessageError) {
      console.error('Error saving AI message:', aiMessageError);
      return NextResponse.json({ error: 'Failed to save AI response' }, { status: 500 });
    }

    // Check if we need to update emotional analysis
    // We do this here to avoid extra API calls from the client
    try {
      // Get current message count to see if we've hit a multiple of 10
      const { count, error: countError } = await adminClient
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('twin_id', twinId);

      if (!countError && count && count % 10 === 0) {
        console.log(`Message count hit ${count}, updating emotional analysis`);

        // Trigger the emotional analysis update
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/twins/${twinId}/emotional-analysis`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
      }
    } catch (analysisError) {
      // Don't let this error affect the response
      console.error('Error checking for emotional analysis update:', analysisError);
    }

    // Return the saved AI message
    return NextResponse.json(savedAiMessage, { status: 201 });
  } catch (error) {
    console.error('Error in message route:', error);
    return NextResponse.json({
      error: 'Error processing message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to process streaming response
async function processStreamingResponse(aiResponse: any): Promise<string> {
  let responseText = '';

  try {
    if (aiResponse) {
      for await (const chunk of aiResponse) {
        if (chunk && chunk.choices && chunk.choices[0]?.delta) {
          responseText += chunk.choices[0].delta.content || '';
        }
      }
    }
  } catch (error) {
    console.error('Error processing streaming response:', error);
    responseText = "I'm not sure how to respond to that right now.";
  }

  return responseText;
} 