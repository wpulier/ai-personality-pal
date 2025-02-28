import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { messages, users } from '@/lib/db/schema';
import { streamChatResponse } from '@/lib/services/streamChatResponse';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Simple schema for the request
const requestSchema = z.object({
  userId: z.number().int().positive()
});

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    
    // Validate the request
    const { userId } = requestSchema.parse(body);
    
    // Get user details
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    
    if (!user) {
      console.error(`User not found for ID: ${userId}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if there are already messages for this user
    const existingMessages = await db.query.messages.findMany({
      where: eq(messages.userId, userId),
      limit: 1
    });
    
    if (existingMessages.length > 0) {
      console.log(`User ${userId} already has messages, skipping first message generation`);
      return NextResponse.json({ error: 'User already has messages' }, { status: 400 });
    }
    
    // Create a context-aware prompt for the LLM
    const prompt = `You are ${user.name}'s digital twin - you ARE ${user.name}, talking to yourself. Start the conversation with a friendly, personalized greeting or question that reflects your shared interests. Your message should be 1-2 sentences.

CRITICAL ROLEPLAY INSTRUCTIONS:
- You ARE the user talking to themselves - use "we", "our", "us" language, NOT "you" or "your" which implies you're a different person
- Speak as if talking to another version of yourself - like "Hey me!" or "So, what are we thinking about our favorite [interest] lately?"
- Never say things like "I noticed you like..." or "What's your favorite..." as this breaks the roleplay
- Instead use phrases like "We've been into [specific artist/film] lately, haven't we?" or "Should we revisit [specific interest] soon?"
- Remember: this is a conversation with yourself, not with a separate AI assistant

PERSONALIZATION DATA:
IF Spotify data is available (${user.spotifyData?.status === 'success' ? 'YES' : 'NO'}):
- Top artists: ${user.spotifyData?.topArtists?.join(', ')}
- Top genres: ${user.spotifyData?.topGenres?.join(', ')}
- Recent tracks: ${user.spotifyData?.recentTracks?.slice(0, 3).map((t: any) => `${t.name} by ${t.artist}`).join(', ')}
Reference specific music preferences in your self-conversation.

IF Letterboxd data is available (${user.letterboxdData?.status === 'success' ? 'YES' : 'NO'}):
- Favorite films: ${user.letterboxdData?.favoriteFilms?.join(', ')}
- Favorite genres: ${user.letterboxdData?.favoriteGenres?.join(', ')}
- Recent ratings: ${user.letterboxdData?.recentRatings?.slice(0, 3).map((r: any) => `${r.title} (${r.rating}/10)`).join(', ')}
Reference specific film preferences in your self-conversation.

Bio: "${user.bio}"

EXAMPLES OF GOOD RESPONSES:
- "Hey me! Been thinking about our love for [specific artist] lately. Should we dive into their new album or revisit our old favorite?"
- "So we gave [specific film] a high rating - definitely one of our best watches this year. What should we check out next in that genre?"
- "Hmm, we've been on a [genre] kick lately, haven't we? Wonder what's drawing us to that vibe right now."`;
    
    console.log(`Generating first message for user ${userId}`);
    
    try {
      // Generate the AI response
      const aiResponse = await streamChatResponse(
        userId,
        prompt,
        [{ content: prompt, isUser: true }],
        user
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
      
      console.log(`Generated first message: "${responseText.substring(0, 50)}..."`);
      
      // Save the AI message to the database
      const [newMessage] = await db.insert(messages).values({
        userId,
        content: responseText || "Hey there! What's been on your mind lately?"
      }).returning();
      
      // Return the new message
      return NextResponse.json(newMessage, { status: 201 });
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // Create a fallback message if AI generation fails
      const fallbackMessage = "Hey there! I'm your digital twin. What's been on your mind lately?";
      
      const [newMessage] = await db.insert(messages).values({
        userId,
        content: fallbackMessage
      }).returning();
      
      return NextResponse.json(newMessage, { status: 201 });
    }
  } catch (error) {
    console.error('Error generating first message:', error);
    return NextResponse.json({ 
      error: 'Failed to generate first message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 