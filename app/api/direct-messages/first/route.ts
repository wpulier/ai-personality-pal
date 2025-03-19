import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateFromTemplate } from '@/lib/templates/conversation-templates';
import { streamChatResponse } from '@/lib/services/streamChatResponse';
import { z } from 'zod';

// Simple schema for the request
const requestSchema = z.object({
  twinId: z.string().or(z.number())
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request
    const { twinId } = requestSchema.parse(body);

    console.log(`Generating first message for twin ${twinId}`);

    // Create admin client with service role key to bypass RLS
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

    // Get twin details
    const { data: twin, error: twinError } = await adminClient
      .from('twins')
      .select('*')
      .eq('id', twinId)
      .single();

    if (twinError || !twin) {
      console.error(`Twin not found for ID: ${twinId}`, twinError);
      return NextResponse.json({ error: 'Twin not found' }, { status: 404 });
    }

    // Check if there are already messages for this twin
    const { data: existingMessages, error: messagesError } = await adminClient
      .from('messages')
      .select('id')
      .eq('twin_id', twinId)
      .limit(1);

    if (messagesError) {
      console.error(`Error checking for existing messages for twin ${twinId}:`, messagesError);
    }

    if (existingMessages && existingMessages.length > 0) {
      console.log(`Twin ${twinId} already has messages, skipping first message generation`);
      return NextResponse.json({ error: 'Twin already has messages' }, { status: 400 });
    }

    // Create a context-aware prompt for the LLM
    const prompt = `You are ${twin.name}'s digital twin. Your first message should follow this structure, but feel free to make it feel natural and conversational:

"Hey there, ${twin.name}. I'm your digital twin, and I'm here to help you find out what really makes you tick. So, what's a digital twin? Think of me as a reflection of you—based on what I know about your Spotify, Letterboxd, and whatever else you've shared, I'm here to help you understand yourself better, one interaction at a time."

"Here's what I've figured out so far: [Use the personality data below to create a personalized insight]"

"The more you interact with me, the more I can help you dig deeper and figure things out. So, based on what I know about you, I can probably guess that you [Use the personality data below to create a personalized observation]—does that feel accurate?"

PERSONALITY DATA TO USE:
${twin.twin_personality?.summary ? `Summary: ${twin.twin_personality.summary}` : ''}
${twin.twin_personality?.traits?.length ? `Traits: ${twin.twin_personality.traits.join(', ')}` : ''}
${twin.twin_personality?.interests?.length ? `Interests: ${twin.twin_personality.interests.join(', ')}` : ''}
${twin.twin_personality?.surfaceBehaviors?.length ? `Surface Behaviors: ${twin.twin_personality.surfaceBehaviors.join(', ')}` : ''}
${twin.twin_personality?.hiddenTraits?.length ? `Hidden Traits: ${twin.twin_personality.hiddenTraits.join(', ')}` : ''}

${twin.spotify_data?.status === 'success' ? `
Music Preferences:
- Top artists: ${twin.spotify_data?.topArtists?.join(', ')}
- Top genres: ${twin.spotify_data?.topGenres?.join(', ')}
- Recent tracks: ${twin.spotify_data?.recentTracks?.slice(0, 3).map((t: any) => `${t.name} by ${t.artist}`).join(', ')}` : ''}

${twin.letterboxd_data?.status === 'success' ? `
Film Preferences:
- Favorite films: ${twin.letterboxd_data?.favoriteFilms?.join(', ')}
- Favorite genres: ${twin.letterboxd_data?.favoriteGenres?.join(', ')}
- Recent ratings: ${twin.letterboxd_data?.recentRatings?.slice(0, 3).map((r: any) => `${r.title} (${r.rating}/10)`).join(', ')}` : ''}

Bio: "${twin.bio}"

IMPORTANT GUIDELINES:
1. Follow the template structure but make it feel natural and conversational
2. Use the personality data to create personalized insights and observations
3. End with a reflective question about an observation you've made
4. Keep the overall tone warm and engaging
5. Make sure to use the person's name in the greeting
6. If certain data is missing, focus on what you do have available`;

    try {
      // Generate the AI response
      const aiResponse = await streamChatResponse(
        typeof twinId === 'string' ? twinId : twinId.toString(),
        prompt,
        [{ content: prompt, isUser: true }],
        twin
      );

      // Process the response
      let responseText = '';
      if (aiResponse) {
        for await (const chunk of aiResponse) {
          if (chunk && chunk.choices && chunk.choices[0]?.delta) {
            responseText += chunk.choices[0].delta.content || '';
          }
        }
      }

      console.log(`Generated first message for twin ${twinId}: "${responseText.substring(0, 50)}..."`);

      // Save the AI message to the database
      const { data: newMessage, error: insertError } = await adminClient
        .from('messages')
        .insert({
          twin_id: twinId,
          content: responseText || "Hey there! What's been on our mind lately?",
          is_user: false
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error saving first message to database:', insertError);
        return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
      }

      // Return the new message
      return NextResponse.json({
        ...newMessage,
        isUser: false
      }, { status: 201 });
    } catch (error) {
      console.error('Error generating AI response:', error);

      // Create a fallback message if AI generation fails
      const fallbackMessage = "Hey there! I'm your digital twin. What's been on our mind lately?";

      const { data: newMessage, error: insertError } = await adminClient
        .from('messages')
        .insert({
          twin_id: twinId,
          content: fallbackMessage,
          is_user: false
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error saving fallback message to database:', insertError);
        return NextResponse.json({ error: 'Failed to save fallback message' }, { status: 500 });
      }

      return NextResponse.json({
        ...newMessage,
        isUser: false
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error in first message API:', error);
    return NextResponse.json({
      error: 'Failed to generate first message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 