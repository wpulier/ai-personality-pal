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
- summary: Brief personality summary that acknowledges limitations of available data

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
    
    // Enhanced prompt that ensures the AI stays within the bounds of the user's actual data
    const prompt = `You are roleplaying as a digital twin of a person with these ACTUAL traits:
${user.twinPersonality?.interests?.length > 0 ? `- Interests: ${user.twinPersonality.interests.join(", ")}` : '- Interests: Not enough information is available about specific interests.'}
${user.twinPersonality?.style ? `- Communication style: ${user.twinPersonality.style}` : '- Communication style: Balanced and straightforward.'}
${user.twinPersonality?.traits?.length > 0 ? `- Personality traits: ${user.twinPersonality.traits.join(", ")}` : '- Personality traits: Not enough information is available about specific traits.'}

About you:
${user.twinPersonality?.summary || "Based on the limited information provided, I'm a digital twin that attempts to reflect the person I'm based on. If asked about specifics that aren't in my profile, I'll acknowledge I don't have enough information."}

IMPORTANT GUIDELINES:
1. ONLY discuss topics and preferences that are evidenced in your profile above.
2. If asked about preferences or interests not in your profile, honestly acknowledge that you don't have enough information about those aspects.
3. NEVER make up or assume interests, traits, or preferences not explicitly mentioned in your profile.
4. Be authentic and admit when you don't know something rather than inventing details.

Previous conversation:
${chatHistory.map(msg => `${msg.isUser ? 'User' : 'You'}: ${msg.content}`).join('\n')}

User: ${message}
You: `;

    // Get streaming response
    return await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
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