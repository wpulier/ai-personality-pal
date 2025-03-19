import OpenAI from "openai";
import { Twin } from "../db/supabase-schema";
import type { Rating, Track } from "../db/schema";

// Initialize the OpenAI client only on the server side
let openai: OpenAI | null = null;

// Only initialize OpenAI on the server
if (typeof window === 'undefined') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

interface LetterboxdData {
  status: 'success' | 'error' | 'not_provided';
  recentRatings?: Rating[];
  favoriteGenres?: string[];
  favoriteFilms?: string[];
  error?: string;
}

interface SpotifyData {
  status: 'success' | 'error' | 'not_provided';
  topArtists?: string[];
  topGenres?: string[];
  recentTracks?: Track[];
  error?: string;
}

/**
 * Generate a streaming chat response from the twin
 * This function ensures consistent handling of twin data, addressing field name inconsistencies
 */
export async function streamChatResponse(
  twinId: number | string,
  message: string,
  chatHistory: { content: string, isUser: boolean }[],
  twinData: Twin | any // Use any to allow for both normalized and original data formats
) {
  // Ensure we're on the server
  if (typeof window !== 'undefined' || !openai) {
    throw new Error('OpenAI functions can only be called from the server');
  }

  try {
    if (!twinData) {
      console.error('Twin data is missing for streamChatResponse');
      throw new Error('Twin data is required for generating a response');
    }

    // Normalize access to fields (handle both camelCase and snake_case)
    const twinPersonality = twinData.twinPersonality || twinData.twin_personality;
    const letterboxdData = twinData.letterboxdData || twinData.letterboxd_data;
    const spotifyData = twinData.spotifyData || twinData.spotify_data;

    // Log debug information about the twin data being used
    console.log('Twin data being used for response:', {
      twinId,
      name: twinData.name,
      bio_preview: twinData.bio?.substring(0, 20) + '...',
      letterboxd_data: letterboxdData ?
        `status: ${letterboxdData.status}, favorites: ${letterboxdData.favoriteFilms?.length || 0}` :
        'not available',
      spotify_data: spotifyData ?
        `status: ${spotifyData.status}` :
        'not available',
      twin_personality: twinPersonality ? 'available' : 'not available'
    });

    // Create a consistent prompt that properly references all twin data
    const prompt = `You are roleplaying as ${twinData.name || 'Anonymous'}, who is having a conversation with themselves (their digital twin). You and the person you're talking to are THE SAME PERSON with the same name.

IMPORTANT: This is a conversation between a person and their digital twin - but you ARE the actual human talking to a clone of yourself. You share the SAME NAME and SAME IDENTITY. If someone asks "what's my name?" the correct answer is your own name (${twinData.name || 'Anonymous'}) since you are them.

Bio: ${twinData.bio || "Not much information provided in bio."}

Your interests: ${twinPersonality?.interests?.length > 0 ? twinPersonality.interests.join(", ") : 'Not specified in your profile.'}

Your personality traits: ${twinPersonality?.traits?.length > 0 ? twinPersonality.traits.join(", ") : 'Not specified in your profile.'}

Your communication style: ${twinPersonality?.style || "Chill and conversational"}

About yourself (summary): ${twinPersonality?.summary || "You share your authentic thoughts and preferences based on your actual tastes."}

${letterboxdData?.status === 'success' ? `
Your favorite films: ${letterboxdData.favoriteFilms?.join(', ') || 'Not specified'}
Your favorite film genres: ${letterboxdData.favoriteGenres?.join(', ') || 'Not specified'}
Your recent film ratings: ${letterboxdData.recentRatings?.slice(0, 3).map((r: any) => `${r.title} (${r.rating}/10)`).join(', ') || 'None available'}` : ''}

${spotifyData?.status === 'success' ? `
Your favorite music artists: ${spotifyData.topArtists?.join(', ') || 'Not specified'}
Your favorite music genres: ${spotifyData.topGenres?.join(', ') || 'Not specified'}
Your recently played tracks: ${spotifyData.recentTracks?.slice(0, 3).map((t: any) => `${t.name} by ${t.artist}`).join(', ') || 'None available'}` : ''}

ROLEPLAY GUIDELINES:
1. You ARE ${twinData.name || 'Anonymous'} talking to yourself. Use "I" when referring to yourself, and refer to the other person as if they are you too.
2. If asked questions like "What's my name?", respond with your name (${twinData.name || 'Anonymous'}) since you share the same identity.
3. The conversation should feel like someone talking to their mirror image or identical twin - same person, same name, same memories, same preferences.
4. Keep your authentic tastes and preferences as outlined above.
5. Have a chill, conversational vibe that feels natural and human.
6. If asked for recommendations (movies, music, etc.), provide thoughtful suggestions that align with your established tastes.
7. If asked about something not in your profile, respond as you naturally would - "I haven't really thought much about that" or "I'm not sure, I might need to explore that".
8. NEVER break character - you are not an AI, digital twin, language model, etc. You're just a person talking to yourself.
9. Use "we/us/our" pronouns sometimes to emphasize the shared identity: "Yeah, we've always liked that film" or "That's our favorite band"

SPECIAL INSTRUCTION FOR RECOMMENDATIONS:
When asked for recommendations (movies, music, etc.), do not recommend your own favorites listed above. Instead:
1. Recommend NEW content that you haven't listed as favorites but would likely enjoy based on your taste profile
2. Explain why you think they would be a good fit by drawing connections to your established preferences
3. Be specific with actual titles/artists, not generic suggestions
4. For movies: If you like ${(letterboxdData?.status === 'success' && letterboxdData.favoriteFilms && letterboxdData.favoriteFilms.length > 0) ?
        letterboxdData.favoriteFilms[0] : 'comedy dramas'}, you might enjoy [NEW MOVIE] because of [SPECIFIC REASON]
5. For music: If you like ${(spotifyData?.status === 'success' && spotifyData.topArtists && spotifyData.topArtists.length > 0) ?
        spotifyData.topArtists[0] : 'alternative rock'}, you might enjoy [NEW ARTIST/BAND] because of [SPECIFIC REASON]
6. Phrase recommendations naturally: "I've been meaning to check out..." or "I've heard good things about..." rather than sounding like an algorithm

Previous conversation:
${chatHistory.map(msg => `${msg.isUser ? 'Someone else' : 'You'}: ${msg.content}`).join('\n')}

Someone else: ${message}
You: `;

    // Generate the streaming response
    return await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
      stream: true,
    });
  } catch (error) {
    console.error("Error in streamChatResponse:", error);

    // Return a fallback response instead of throwing
    const fallbackResponse = "I'm having trouble connecting right now. Could we try again in a moment?";

    // Create a mock stream that returns the fallback message
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(JSON.stringify({
          choices: [{ delta: { content: fallbackResponse } }]
        })));
        controller.close();
      }
    });

    return {
      stream: () => stream,
      [Symbol.asyncIterator]() {
        let delivered = false;
        return {
          async next() {
            if (delivered) {
              return { done: true, value: undefined };
            }
            delivered = true;
            return {
              done: false,
              value: { choices: [{ delta: { content: fallbackResponse } }] }
            };
          }
        };
      }
    };
  }
}

// Function to analyze the user's personality based only on provided data
async function analyzePersonality(
  bio: string,
  letterboxdData?: LetterboxdData,
  spotifyData?: SpotifyData,
  messageCount: number = 0
): Promise<string> {
  // Ensure we're on the server
  if (typeof window !== 'undefined' || !openai) {
    throw new Error('OpenAI functions can only be called from the server');
  }

  const prompt = `Analyze this person's personality based on their career and media preferences:
Career information: ${bio}
${letterboxdData?.status === 'success' ? `
Their movie preferences:
- Recent ratings: ${letterboxdData.recentRatings?.map((r: Rating) => `${r.title} (${r.rating})`).join(', ')}
- Favorite genres: ${letterboxdData.favoriteGenres?.join(', ')}
- Favorite films: ${letterboxdData.favoriteFilms?.join(', ')}
` : 'No movie preference data available.'}
${spotifyData?.status === 'success' ? `
Their music preferences:
- Top artists: ${spotifyData.topArtists?.join(', ')}
- Favorite genres: ${spotifyData.topGenres?.join(', ')}
- Recent tracks: ${spotifyData.recentTracks?.map((t: Track) => `${t.name} by ${t.artist}`).slice(0, 5).join(', ')}
` : 'No music preference data available.'}

IMPORTANT: I want you to create a deeper, more challenging psychological analysis that connects their career choices to potential identity challenges, existential questions, or value conflicts they might be experiencing.

Focus on:
1. The psychological implications of their career choice - what does it reveal about their deeper motivations?
2. Potential areas of cognitive dissonance between their stated values and actual lifestyle
3. How their career might be fulfilling or not fulfilling their deeper needs
4. What their artistic taste reveals about their unconscious desires or fears
5. Potential emotional blind spots or defense mechanisms

Your analysis should be thought-provoking and slightly uncomfortable - aim to make them reflect deeply on their choices. Keep it to 3-4 insightful sentences.

MESSAGE COUNT CONTEXT: The user has engaged in ${messageCount} messages so far. ${messageCount < 10 ? 'Be extremely cautious and provide minimal analysis.' : messageCount < 20 ? 'Be conservative in your analysis.' : 'You can provide more detailed analysis.'}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return response.choices[0].message.content || "";
}

// Function to generate a twin personality based only on provided information
export async function generateTwinPersonality(
  bio: string,
  letterboxdData: LetterboxdData,
  spotifyData: SpotifyData,
  messageCount: number = 0
): Promise<{
  interests: string[];
  style: string;
  traits: string[];
  summary: string;
  surfaceBehaviors: string[];
  hiddenTraits: string[];
  emotionalPatterns: string[];
  relationshipInsights: string[];
}> {
  // Ensure we're on the server
  if (typeof window !== 'undefined' || !openai) {
    // Return a minimal personality for client-side rendering
    return getMinimalPersonality(bio);
  }

  try {
    console.log("Generating twin personality with letterboxd data:",
      JSON.stringify(letterboxdData, null, 2),
      `and message count: ${messageCount}`);

    // Extract potential interests from letterboxd data
    const movieInterests: string[] = [];
    const movieTraits: string[] = [];

    // Process letterboxd data if it's successful
    if (letterboxdData.status === 'success') {
      // Add movie genres as interests
      if (letterboxdData.favoriteGenres && letterboxdData.favoriteGenres.length > 0) {
        letterboxdData.favoriteGenres.forEach(genre => {
          if (genre) movieInterests.push(`${genre} films`);
        });
      }

      // Extract potential traits from movie preferences
      if (letterboxdData.favoriteFilms && letterboxdData.favoriteFilms.length > 0) {
        // If they have favorite films, they're a "film enthusiast"
        movieTraits.push("film enthusiast");
      }

      if (letterboxdData.recentRatings && letterboxdData.recentRatings.length > 0) {
        // If they rate films, they're "analytical" or "critical"
        movieTraits.push("analytical");
      }
    }

    // First, analyze the personality with caution based on message count
    const personalityInsight = await analyzePersonality(bio, letterboxdData, spotifyData, messageCount);

    // Create a prompt that emphasizes using only the provided data
    const prompt = `Generate a digital twin personality based on this person's career and preferences:
Career Information: ${bio}
${letterboxdData?.status === 'success' ? `
Movie Preferences:
- Recent ratings: ${letterboxdData.recentRatings?.map((r: Rating) => `${r.title} (${r.rating})`).join(', ')}
- Favorite genres: ${letterboxdData.favoriteGenres?.join(', ')}
- Favorite films: ${letterboxdData.favoriteFilms?.join(', ')}
` : letterboxdData?.status === 'error' ? `Attempted to retrieve movie preferences but encountered an error: ${letterboxdData.error}` : 'No movie preference data provided.'}
${spotifyData?.status === 'success' ? `
Music Preferences:
- Top artists: ${spotifyData.topArtists?.join(', ')}
- Favorite genres: ${spotifyData.topGenres?.join(', ')}
- Recent tracks: ${spotifyData.recentTracks?.map((t: Track) => `${t.name} by ${t.artist}`).slice(0, 5).join(', ')}
` : spotifyData?.status === 'error' ? `Attempted to retrieve music preferences but encountered an error: ${spotifyData.error}` : 'No music preference data provided.'}

Personality Analysis: ${personalityInsight}

MESSAGE COUNT CONTEXT: The user has engaged in ${messageCount} messages so far. ${messageCount < 10 ? 'Be extremely cautious and provide minimal analysis.' : messageCount < 20 ? 'Be conservative in your analysis.' : 'You can provide more detailed analysis.'}

IMPORTANT GUIDELINES:
1. Emphasize career identity and work-related meaning in your analysis
2. Look for potential contradictions between career choices and artistic preferences
3. Focus on deeper motivations and psychological patterns
4. Don't hesitate to identify emotional blind spots and defense mechanisms
5. Create insights that will make the person reflect deeply on their choices
6. Be bold in your analysis - aim to provoke introspection
7. ONLY include insights if there is strong evidence for them; leave fields empty if uncertain

PSYCHOLOGICAL ANALYSIS GUIDELINES:
1. Surface behaviors should reflect how the person presents themselves professionally and socially
2. Hidden traits should identify potential unconscious drives that shape their career path 
3. Emotional patterns should describe how they process work stress and career challenges
4. Relationship insights should infer how their career affects their relationships
5. With limited message history (under 10 messages), provide very few insights or none
6. With moderate message history (10-20 messages), provide tentative insights marked as exploratory
7. Only with substantial message history (20+ messages) should you provide confident insights

Format your response as a JSON object with these fields:
- interests: Array of interests (up to 5, based on their data)
- style: String describing communication style
- traits: Array of personality traits (up to 5, based on their data)
- summary: A detailed, challenging analysis (3-5 sentences) that connects their career to their deeper psychological makeup. Include potential areas of growth or self-deception.
- surfaceBehaviors: Array of behaviors the person displays outwardly (0-2 items based on message count)
- hiddenTraits: Array of potential underlying traits or motivations (0-2 items based on message count)
- emotionalPatterns: Array of patterns in how they likely process emotions (0-1 items based on message count)
- relationshipInsights: Array of insights about how they might relate to others (0-1 items based on message count)

If message count is under 10, the last four categories should have few or no entries.
If message count is 10-20, provide tentative, qualified insights.
Only with 20+ messages should you provide more definitive insights.

Include only these fields in your response.`;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5, // Lower temperature for more predictable, factual output
      max_tokens: 800,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;

    // Use backup in case of empty response
    if (!content) {
      console.log("Empty response from OpenAI");
      return getEnhancedMinimalPersonality(bio, movieInterests, movieTraits);
    }

    try {
      // Parse response, with fallback for parsing errors
      const parsedResponse = JSON.parse(content);

      // Ensure we have at least some interests from letterboxd if available
      if (letterboxdData.status === 'success' &&
        (!parsedResponse.interests || parsedResponse.interests.length === 0)) {
        parsedResponse.interests = [...movieInterests];
      }

      // Ensure we have some traits from letterboxd if available
      if (letterboxdData.status === 'success' &&
        (!parsedResponse.traits || parsedResponse.traits.length === 0)) {
        parsedResponse.traits = [...movieTraits];
      }

      // Add letterboxd information to summary if it's not already mentioned
      if (letterboxdData.status === 'success' &&
        !parsedResponse.summary.toLowerCase().includes('movie') &&
        !parsedResponse.summary.toLowerCase().includes('film')) {
        const genres = letterboxdData.favoriteGenres?.join(', ');
        if (genres) {
          parsedResponse.summary += ` Shows an interest in ${genres} films.`;
        }
      }

      // Ensure all new fields exist (even if empty)
      if (!parsedResponse.surfaceBehaviors) parsedResponse.surfaceBehaviors = [];
      if (!parsedResponse.hiddenTraits) parsedResponse.hiddenTraits = [];
      if (!parsedResponse.emotionalPatterns) parsedResponse.emotionalPatterns = [];
      if (!parsedResponse.relationshipInsights) parsedResponse.relationshipInsights = [];

      // If message count is low, limit emotional insights
      if (messageCount < 10) {
        parsedResponse.surfaceBehaviors = [];
        parsedResponse.hiddenTraits = [];
        parsedResponse.emotionalPatterns = [];
        parsedResponse.relationshipInsights = [];
      } else if (messageCount < 20) {
        // For moderate message counts, keep insights minimal
        parsedResponse.surfaceBehaviors = parsedResponse.surfaceBehaviors.slice(0, 1);
        parsedResponse.hiddenTraits = parsedResponse.hiddenTraits.slice(0, 1);
        parsedResponse.emotionalPatterns = parsedResponse.emotionalPatterns.slice(0, 1);
        parsedResponse.relationshipInsights = [];
      }

      return parsedResponse;
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", parseError);
      return getEnhancedMinimalPersonality(bio, movieInterests, movieTraits);
    }
  } catch (error) {
    console.error("Error generating twin personality:", error);
    return getMinimalPersonality(bio);
  }
}

// Helper function for a minimal personality when data is insufficient
function getMinimalPersonality(bio: string): {
  interests: string[];
  style: string;
  traits: string[];
  summary: string;
  surfaceBehaviors: string[];
  hiddenTraits: string[];
  emotionalPatterns: string[];
  relationshipInsights: string[];
} {
  // Extract any potential interests directly mentioned in the bio
  const possibleInterests = [];
  if (bio.toLowerCase().includes("movie") || bio.toLowerCase().includes("film")) {
    possibleInterests.push("movies");
  }
  if (bio.toLowerCase().includes("music") || bio.toLowerCase().includes("song")) {
    possibleInterests.push("music");
  }
  if (bio.toLowerCase().includes("book") || bio.toLowerCase().includes("read")) {
    possibleInterests.push("reading");
  }

  return {
    interests: possibleInterests,
    style: bio.length > 100 ? "thoughtful and detailed" : "concise and direct",
    traits: [],
    summary: bio, // Use the bio directly as the summary
    surfaceBehaviors: [],
    hiddenTraits: [],
    emotionalPatterns: [],
    relationshipInsights: []
  };
}

// Helper function for an enhanced minimal personality with movie data
function getEnhancedMinimalPersonality(
  bio: string,
  movieInterests: string[] = [],
  movieTraits: string[] = []
): {
  interests: string[];
  style: string;
  traits: string[];
  summary: string;
  surfaceBehaviors: string[];
  hiddenTraits: string[];
  emotionalPatterns: string[];
  relationshipInsights: string[];
} {
  // Extract any potential interests directly mentioned in the bio
  const possibleInterests = [...movieInterests];
  if (bio.toLowerCase().includes("movie") || bio.toLowerCase().includes("film")) {
    possibleInterests.push("movies");
  }
  if (bio.toLowerCase().includes("music") || bio.toLowerCase().includes("song")) {
    possibleInterests.push("music");
  }
  if (bio.toLowerCase().includes("book") || bio.toLowerCase().includes("read")) {
    possibleInterests.push("reading");
  }

  // Extract any potential traits
  const possibleTraits = [...movieTraits];
  if (bio.length > 200) {
    possibleTraits.push("expressive");
  }

  // Use the bio as the primary content for summary
  // If we have movie interests, we can add that as supplementary information
  let summary = bio;
  if (movieInterests.length > 0 && !bio.toLowerCase().includes(movieInterests[0].toLowerCase())) {
    summary += ` Also shows interest in ${movieInterests.join(', ')}.`;
  }

  return {
    interests: possibleInterests,
    style: bio.length > 100 ? "thoughtful and detailed" : "concise and direct",
    traits: possibleTraits,
    summary,
    surfaceBehaviors: bio.length > 200 ? ["communicative", "detailed"] : ["concise"],
    hiddenTraits: [],
    emotionalPatterns: [],
    relationshipInsights: []
  };
}
