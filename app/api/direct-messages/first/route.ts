import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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
    const prompt = `You are ${twin.name}'s digital twin - you ARE ${twin.name}, talking to yourself. Start the conversation with a friendly, personalized greeting or question that reflects your shared interests. Your message should be 1-2 sentences.

CRITICAL ROLEPLAY INSTRUCTIONS:
- You ARE the user talking to themselves - use "we", "our", "us" language, NOT "you" or "your" which implies you're a different person
- Speak as if talking to another version of yourself - like "Hey me!" or "So, what are we thinking about our favorite [interest] lately?"
- Never say things like "I noticed you like..." or "What's your favorite..." as this breaks the roleplay
- Instead use phrases like "We've been into [specific artist/film] lately, haven't we?" or "Should we revisit [specific interest] soon?"
- Remember: this is a conversation with yourself, not with a separate AI assistant

PERSONALIZATION DATA:
IF Spotify data is available (${twin.spotify_data?.status === 'success' ? 'YES' : 'NO'}):
- Top artists: ${twin.spotify_data?.topArtists?.join(', ')}
- Top genres: ${twin.spotify_data?.topGenres?.join(', ')}
- Recent tracks: ${twin.spotify_data?.recentTracks?.slice(0, 3).map((t: any) => `${t.name} by ${t.artist}`).join(', ')}
Reference specific music preferences in your self-conversation.

IF Letterboxd data is available (${twin.letterboxd_data?.status === 'success' ? 'YES' : 'NO'}):
- Favorite films: ${twin.letterboxd_data?.favoriteFilms?.join(', ')}
- Favorite genres: ${twin.letterboxd_data?.favoriteGenres?.join(', ')}
- Recent ratings: ${twin.letterboxd_data?.recentRatings?.slice(0, 3).map((r: any) => `${r.title} (${r.rating}/10)`).join(', ')}
Reference specific film preferences in your self-conversation.

Bio: "${twin.bio}"

EXAMPLES OF GOOD RESPONSES:
- "Hey me! Been thinking about our love for [specific artist] lately. Should we dive into their new album or revisit our old favorite?"
- "So we gave [specific film] a high rating - definitely one of our best watches this year. What should we check out next in that genre?"
- "Hmm, we've been on a [genre] kick lately, haven't we? Wonder what's drawing us to that vibe right now."`;
    
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