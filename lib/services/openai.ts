import OpenAI from "openai";
import type { Rating, Track } from "../db/schema";

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

async function analyzePersonality(
  bio: string,
  letterboxdData?: LetterboxdData,
  spotifyData?: SpotifyData
): Promise<string> {
  const prompt = `Analyze this person's personality based on:
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

Create a brief, realistic personality summary based ONLY on the information provided.
If certain data is not available, focus only on the provided content.
Do not make assumptions about interests or preferences unless explicitly shown in the data.
Keep it to 2-3 concise sentences.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Error analyzing personality:", error);
    return "A thoughtful individual with varied interests.";
  }
}

export async function generateTwinPersonality(
  bio: string,
  letterboxdData?: LetterboxdData,
  spotifyData?: SpotifyData
): Promise<{
  interests: string[];
  style: string;
  traits: string[];
  summary: string;
}> {
  try {
    const personalityInsight = await analyzePersonality(bio, letterboxdData, spotifyData);

    // Create a default personality in case the API call fails
    const defaultPersonality = {
      interests: ["reading", "learning", "technology", "self-improvement", "communication"],
      style: "friendly and helpful",
      traits: ["adaptable", "thoughtful", "curious", "analytical", "supportive"],
      summary: personalityInsight || "An adaptable digital twin that's still learning about you."
    };

    const prompt = `Generate a digital twin personality based on:
Bio: ${bio}
${letterboxdData?.status === 'success' ? `
Movie Preferences:
- Recent ratings: ${letterboxdData.recentRatings?.map((r: Rating) => `${r.title} (${r.rating})`).join(', ')}
- Favorite genres: ${letterboxdData.favoriteGenres?.join(', ')}
- Favorite films: ${letterboxdData.favoriteFilms?.join(', ')}
` : 'No movie preference data available.'}
${spotifyData?.status === 'success' ? `
Music Preferences:
- Top artists: ${spotifyData.topArtists?.join(', ')}
- Favorite genres: ${spotifyData.topGenres?.join(', ')}
- Recent tracks: ${spotifyData.recentTracks?.map((t: Track) => `${t.name} by ${t.artist}`).slice(0, 5).join(', ')}
` : 'No music preference data available.'}

Personality Analysis: ${personalityInsight}

Create a personality that matches the user's actual traits and interests.
Only include interests and preferences that are evidenced in the provided data.
Do not make assumptions about media preferences unless specifically shown.

Respond with JSON in this format: {
  "interests": ["interest1", "interest2", "interest3", "interest4", "interest5"],
  "style": "brief description of their speaking style, communication preferences",
  "traits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
  "summary": "a paragraph summarizing their personality"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.log("Empty response from OpenAI");
        return defaultPersonality;
      }

      try {
        const data = JSON.parse(content);
        // Validate the response structure
        if (!data.interests || !Array.isArray(data.interests) || 
            !data.style || typeof data.style !== 'string' ||
            !data.traits || !Array.isArray(data.traits)) {
          console.log("Invalid response structure from OpenAI:", data);
          return defaultPersonality;
        }
        
        return {
          ...data,
          summary: personalityInsight
        };
      } catch (parseError) {
        console.error("Failed to parse OpenAI response as JSON:", parseError);
        console.log("Raw response:", content);
        return defaultPersonality;
      }
    } catch (apiError) {
      console.error("Error calling OpenAI API:", apiError);
      return defaultPersonality;
    }
  } catch (error) {
    console.error("Error generating twin personality:", error);
    return {
      interests: ["reading", "learning", "technology", "self-improvement", "communication"],
      style: "friendly and helpful",
      traits: ["adaptable", "thoughtful", "curious", "analytical", "supportive"],
      summary: "An adaptable digital twin that's still learning about you."
    };
  }
}

export async function streamChatResponse(userId: number, message: string, chatHistory: { content: string, isUser: boolean }[]) {
  try {
    // Get the user's twin personality from the database
    const response = await fetch(`/api/users?id=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }
    const user = await response.json();
    
    if (!user.twinPersonality) {
      throw new Error('Twin personality not found');
    }
    
    const prompt = `You are roleplaying as a digital twin of the user. Stay in character throughout the conversation.

Your Personality Profile:
- Key Interests: ${user.twinPersonality.interests?.join(", ") || "varied interests"}
- Communication Style: ${user.twinPersonality.style || "friendly and helpful"}
- Notable Traits: ${user.twinPersonality.traits?.join(", ") || "adaptable, thoughtful"}

Additional Context About You:
${user.twinPersonality.summary || "You are a helpful digital twin."}

Your Role:
- You are a digital twin who shares the exact same traits and interests as shown in your profile
- Only discuss topics and preferences that are evidenced in your profile
- If asked about preferences or interests not in your profile, acknowledge that you're still learning about those aspects
- Stay consistently in character, using your defined communication style

Previous messages for context:
${chatHistory.map(msg => `${msg.isUser ? 'User' : 'You'}: ${msg.content}`).join('\n')}

Remember to maintain your personality while responding to:
${message}`;

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });

    return stream;
  } catch (error) {
    console.error("Error streaming chat response:", error);
    throw error;
  }
} 