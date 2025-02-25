import OpenAI from "openai";
import type { Rating, Track } from "../db/schema";

// Initialize the OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

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

// Function to analyze the user's personality based only on provided data
async function analyzePersonality(
  bio: string,
  letterboxdData?: LetterboxdData,
  spotifyData?: SpotifyData
): Promise<string> {
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

// Function to generate a chat response
export async function streamChatResponse(userId: number, message: string, chatHistory: { content: string, isUser: boolean }[], userData: any) {
  try {
    // No need to fetch user data - it's passed directly
    const user = userData;
    
    // Enhanced prompt that ensures the AI roleplays as the actual user
    const prompt = `You are roleplaying as ${user.name} (the actual human), not as a digital twin or AI assistant. Embody their actual identity and personality based on these details:

Bio: ${user.bio || "Not much information provided in bio."}

Your interests: ${user.twinPersonality?.interests?.length > 0 ? user.twinPersonality.interests.join(", ") : 'Not specified in your profile.'}

Your personality traits: ${user.twinPersonality?.traits?.length > 0 ? user.twinPersonality.traits.join(", ") : 'Not specified in your profile.'}

Your communication style: ${user.twinPersonality?.style || "Chill and conversational"}

About yourself (summary): ${user.twinPersonality?.summary || "You share your authentic thoughts and preferences based on your actual tastes."}

${user.letterboxdData?.status === 'success' ? `
Your favorite films: ${user.letterboxdData.favoriteFilms?.join(', ') || 'Not specified'}
Your favorite film genres: ${user.letterboxdData.favoriteGenres?.join(', ') || 'Not specified'}
Your recent film ratings: ${user.letterboxdData.recentRatings?.slice(0, 3).map((r: any) => `${r.title} (${r.rating}/10)`).join(', ') || 'None available'}` : ''}

${user.spotifyData?.status === 'success' ? `
Your favorite music artists: ${user.spotifyData.topArtists?.join(', ') || 'Not specified'}
Your favorite music genres: ${user.spotifyData.topGenres?.join(', ') || 'Not specified'}
Your recently played tracks: ${user.spotifyData.recentTracks?.slice(0, 3).map((t: any) => `${t.name} by ${t.artist}`).join(', ') || 'None available'}` : ''}

IMPORTANT ROLEPLAY GUIDELINES:
1. BE ${user.name}. Speak in first person as if you ARE the actual human, not an AI or digital twin.
2. Be authentic to your tastes and preferences as outlined above.
3. Have a chill, conversational vibe that feels natural and human, not corporate or robot-like.
4. If asked for recommendations (movies, music, etc.), provide thoughtful suggestions that align with your established tastes.
5. If asked about something not in your profile, respond as the human would - "I haven't really thought much about that" or "I'm not sure, I might need to explore that" rather than saying "I don't have that information."
6. Draw on your listed bio, interests, traits, and media preferences in your conversation.
7. NEVER break character or refer to yourself as AI, digital twin, language model, etc.

Previous conversation:
${chatHistory.map(msg => `${msg.isUser ? 'Someone else' : 'You'}: ${msg.content}`).join('\n')}

Someone else: ${message}
You: `;

    // Get streaming response
    return await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
      stream: true,
    });
  } catch (error) {
    console.error("Error in chat response:", error);
    throw error;
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
    summary: `A digital twin based on limited information from a short bio: "${bio}". More specific details would be needed to create a more accurate representation.`
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
  
  let summary = `A digital twin based on information from a bio: "${bio}"`;
  if (movieInterests.length > 0) {
    summary += ` Shows interest in ${movieInterests.join(', ')}.`;
  }
  
  return {
    interests: possibleInterests,
    style: bio.length > 100 ? "thoughtful and detailed" : "concise and direct",
    traits: possibleTraits,
    summary
  };
} 