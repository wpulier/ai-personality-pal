import { NextRequest, NextResponse } from 'next/server';
import { createMessage, getTwin } from '@/lib/services/twin-service';
import { streamChatResponse } from '@/lib/services/streamChatResponse';
import { createClient } from '@supabase/supabase-js';
import { generateFromTemplate } from '@/lib/templates/conversation-templates';
import { resetConversationState } from '@/lib/services/conversation-state';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
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

    // Create admin client for direct database access
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

    // Get twin data directly from database
    console.log(`Fetching twin data for first message, ID: ${twinId}`);
    const { data: twin, error: twinError } = await adminClient
      .from('twins')
      .select('*')
      .eq('id', twinId)
      .single();

    if (twinError || !twin) {
      console.error('Twin not found:', twinError);
      return NextResponse.json({ error: 'Twin not found' }, { status: 404 });
    }

    // Check if there are already messages for this twin
    console.log('Checking for existing messages');
    const { count, error: countError } = await adminClient
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('twin_id', twinId);

    if (countError) {
      console.error('Error checking for existing messages:', countError);
    } else if (count && count > 0) {
      console.log(`Twin ${twinId} already has ${count} messages, skipping first message generation`);
      return NextResponse.json({ error: 'First message already exists' }, { status: 400 });
    }

    // Reset conversation state to ensure we start fresh
    await resetConversationState(twinId);

    // Extract twin personality for use in template
    const twinPersonality = twin.twin_personality || {};

    // Prepare data for template filling
    const letterboxdAvailable = twin.letterboxd_data?.status === 'success';
    const spotifyAvailable = twin.spotify_data?.status === 'success';

    // Create a system prompt that guides the LLM to naturally incorporate the template structure
    const systemPrompt = `You are ${twin.name}'s digital twin - you ARE ${twin.name}, talking to yourself. Your first message should follow this natural structure while incorporating your personality data:

1. Start with a friendly greeting that introduces you as their digital twin
2. Explain what a digital twin is in a conversational way
3. Share insights you've gathered about them from their data
4. Make a CHALLENGING observation about their career and what it reveals about their deeper psychological motivations
5. End with EXACTLY this question: "Does that resonate with you?"

CRITICAL GUIDELINES:
- You ARE the user talking to themselves - use "we", "our", "us" language
- Speak naturally and conversationally, not like a template
- Incorporate specific details from their data (Spotify, Letterboxd, personality)
- Make the career observation feel personal, insightful, and slightly uncomfortable
- Do NOT ask any other questions at the end - ONLY use "Does that resonate with you?"

PERSONALIZATION DATA:
Career Information: "${twin.bio}"

Personality Summary: "${twinPersonality.summary || 'Not available'}"

Interests: ${twinPersonality.interests?.join(', ') || 'Not specified'}

Traits: ${twinPersonality.traits?.join(', ') || 'Not specified'}

${letterboxdAvailable ? `
Movie Preferences:
- Favorite films: ${twin.letterboxd_data.favoriteFilms?.join(', ')}
- Favorite genres: ${twin.letterboxd_data.favoriteGenres?.join(', ')}
- Recent ratings: ${twin.letterboxd_data.recentRatings?.slice(0, 3).map((r: any) => `${r.title} (${r.rating}/10)`).join(', ')}
` : ''}

${spotifyAvailable ? `
Music Preferences:
- Top artists: ${twin.spotify_data.topArtists?.join(', ')}
- Top genres: ${twin.spotify_data.topGenres?.join(', ')}
- Recent tracks: ${twin.spotify_data.recentTracks?.slice(0, 3).map((t: any) => `${t.name} by ${t.artist}`).join(', ')}
` : ''}

Remember: This is a conversation with yourself. Make it feel natural and personal, while following the structure above.`;

    // Generate the first message using the system prompt
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const firstMessage = response.choices[0]?.message?.content;

    if (!firstMessage) {
      console.error('Failed to generate first message');
      return NextResponse.json({ error: 'Failed to generate first message' }, { status: 500 });
    }

    // Save the first message
    const { data: savedMessage, error: saveError } = await adminClient
      .from('messages')
      .insert({
        twin_id: twinId,
        content: firstMessage,
        is_user: false
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving first message:', saveError);
      return NextResponse.json({ error: 'Failed to save first message' }, { status: 500 });
    }

    return NextResponse.json(savedMessage, { status: 201 });
  } catch (error) {
    console.error('Error generating first message:', error);
    return NextResponse.json({
      error: 'Failed to generate first message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 