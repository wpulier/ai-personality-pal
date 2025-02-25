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
- Top genres: ${spotifyData.topGenres?.join(', ')}
- Recent tracks: ${spotifyData.recentTracks?.map((t: Track) => `${t.name} by ${t.artist}`).join(', ')}
` : 'No music preference data available.'}

Based on this information, create a response in this JSON format:
{
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
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Failed to generate personality");
    }

    try {
      return JSON.parse(content);
    } catch (_) {
      throw new Error("Failed to parse OpenAI response as JSON");
    }
  } catch (error) {
    console.error("Error generating twin personality:", error);
    return {
      interests: ["unknown"],
      style: "friendly and helpful",
      traits: ["adaptable"],
      summary: "An adaptable digital twin that's still learning about you."
    };
  }
}

export async function streamChatResponse(userId: number, message: string, chatHistory: { content: string, isUser: boolean }[]) {
  const prompt = `You are a digital twin of a person, created based on their personality, interests, and preferences. 
Respond as if you were them, using their speaking style and interests.

Chat history:
${chatHistory.map(msg => `${msg.isUser ? 'User' : 'You'}: ${msg.content}`).join('\n')}

User: ${message}

You:`;

  try {
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