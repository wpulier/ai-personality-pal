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

// Simple function to generate a basic twin personality
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
    // Create simple prompt
    const prompt = `Create a digital twin personality based on this information:
Bio: ${bio}
Movie preferences: Drama, Sci-Fi, Inception, The Godfather
Music preferences: Rock, Pop, The Beatles, Queen

Format your response as a JSON object with these fields:
- interests: Array of 5 interests
- style: String describing communication style
- traits: Array of 5 personality traits
- summary: Brief personality summary

Include only these fields in your response.`;

    // Call OpenAI API with simple settings
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    
    // Use backup in case of empty response
    if (!content) {
      console.log("Empty response from OpenAI");
      return getFallbackPersonality(bio);
    }

    try {
      // Parse response, with fallback for parsing errors
      return JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", parseError);
      return getFallbackPersonality(bio);
    }
  } catch (error) {
    console.error("Error generating twin personality:", error);
    return getFallbackPersonality(bio);
  }
}

// Function to generate a chat response
export async function streamChatResponse(userId: number, message: string, chatHistory: { content: string, isUser: boolean }[]) {
  try {
    // Simple fetch for user data
    const response = await fetch(`/api/users?id=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }
    const user = await response.json();
    
    // Simple prompt without complex conditionals
    const prompt = `You are a digital twin of a person with these traits:
- Interests: ${user.twinPersonality?.interests?.join(", ") || "movies, music, arts"}
- Communication style: ${user.twinPersonality?.style || "friendly and thoughtful"}
- Personality traits: ${user.twinPersonality?.traits?.join(", ") || "creative, curious"}

This is what you know about yourself:
${user.twinPersonality?.summary || "You enjoy movies and music and are thoughtful in your conversations."}

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

// Helper function for a fallback personality
function getFallbackPersonality(bio: string): {
  interests: string[];
  style: string;
  traits: string[];
  summary: string;
} {
  return {
    interests: ["movies", "music", "storytelling", "arts", "entertainment"],
    style: "friendly, conversational, and thoughtful",
    traits: ["creative", "analytical", "curious", "adaptable", "reflective"],
    summary: `A thoughtful individual who enjoys movies and music. ${bio.length > 20 ? 'Their bio suggests they value self-expression and meaningful connections.' : 'They seem to value concise communication.'}`
  };
} 