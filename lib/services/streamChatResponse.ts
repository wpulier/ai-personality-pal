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
  spotifyData?: SpotifyData
): Promise<string> {
  // Ensure we're on the server
  if (typeof window !== 'undefined' || !openai) {
    throw new Error('OpenAI functions can only be called from the server');
  }

  const prompt = `Analyze this person's personality based ONLY on:
Bio: ${bio}
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

Create a brief, realistic personality summary based ONLY on the information provided above.
If certain data is not available, focus only on the provided content.
DO NOT make assumptions about interests or preferences unless explicitly shown in the data.
Keep it to 2-3 concise sentences.
If there is insufficient data, simply state what you know for certain about the person.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
  });

  return response.choices[0].message.content || "";
}

// Function to generate a twin personality based only on provided information
export async function generateTwinPersonality(
  bio: string,
  letterboxdData: LetterboxdData,
  spotifyData: SpotifyData
): Promise<{
  interests: string[];
  style: string;
  traits: string[];
  summary: string;
}> {
  // Ensure we're on the server
  if (typeof window !== 'undefined' || !openai) {
    // Return a minimal personality for client-side rendering
    return getMinimalPersonality(bio);
  }

  try {
    console.log("Generating twin personality with letterboxd data:", 
      JSON.stringify(letterboxdData, null, 2));
    
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
    
    // First, analyze the personality
    const personalityInsight = await analyzePersonality(bio, letterboxdData, spotifyData);
    
    // Create a prompt that emphasizes using only the provided data
    const prompt = `Generate a digital twin personality based STRICTLY on:
Bio: ${bio}
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

IMPORTANT GUIDELINES:
1. Only include interests that are EXPLICITLY evidenced in the provided data.
2. DO NOT make up traits or interests that aren't directly evident.
3. If certain information categories are sparse, it's better to have fewer items than made-up ones.
4. The style should reflect how the person might communicate based on the data.
5. For traits, only include those that can be directly inferred from their provided information.
6. If there's insufficient data, some fields can have fewer items than requested.

Format your response as a JSON object with these fields:
- interests: Array of interests (up to 5, but ONLY what's evident in the data)
- style: String describing communication style (based only on evident information)
- traits: Array of personality traits (up to 5, but ONLY what's evident in the data)
- summary: A detailed, comprehensive personality analysis (3-5 sentences) that draws meaningful connections between their movie and music preferences, and what that reveals about their personality. Don't over-summarize or truncate insights.

Include only these fields in your response.`;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5, // Lower temperature for more predictable, factual output
      max_tokens: 500,
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
    summary: bio // Use the bio directly as the summary
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
    summary
  };
}
