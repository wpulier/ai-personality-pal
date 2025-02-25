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
  const personalityInsight = await analyzePersonality(bio, letterboxdData, spotifyData);

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
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Failed to generate personality");
    }

    try {
      const data = JSON.parse(content);
      return {
        ...data,
        summary: personalityInsight
      };
    } catch {
      throw new Error("Failed to parse OpenAI response as JSON");
    }
  } catch (error) {
    console.error("Error generating twin personality:", error);
    return {
      interests: ["reading", "learning", "technology", "self-improvement", "communication"],
      style: "friendly and helpful",
      traits: ["adaptable", "thoughtful", "curious", "analytical", "supportive"],
      summary: personalityInsight || "An adaptable digital twin that's still learning about you."
    };
  }
}

export async function streamChatResponse(userId: number, message: string, chatHistory: { content: string, isUser: boolean }[]) {
  // Get the user's twin personality from the database
  const response = await fetch(`/api/users?id=${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user data');
  }
  const user = await response.json();
  
  const prompt = `You are roleplaying as a digital twin of the user. Stay in character throughout the conversation.

Your Personality Profile:
- Key Interests: ${user.twinPersonality.interests.join(", ")}
- Communication Style: ${user.twinPersonality.style}
- Notable Traits: ${user.twinPersonality.traits.join(", ")}

Additional Context About You:
${user.twinPersonality.summary}

Your Role:
- You are a digital twin who shares the exact same traits and interests as shown in your profile
- Only discuss topics and preferences that are evidenced in your profile
- If asked about preferences or interests not in your profile, acknowledge that you're still learning about those aspects
- Stay consistently in character, using your defined communication style

Previous messages for context:
${chatHistory.map(msg => `${msg.isUser ? 'User' : 'You'}: ${msg.content}`).join('\n')}

Remember to maintain your personality while responding to:
${message}`;

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