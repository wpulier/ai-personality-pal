import { z } from 'zod';

// Define the Rating interface
export interface Rating {
  title: string;
  rating: string;
  year?: string;
  url?: string;
}

// Define the Track interface
export interface Track {
  name: string;
  artist: string;
  playedAt?: string;
}

// Define the Twin interface
export interface Twin {
  id: number;
  auth_user_id?: string;
  name: string;
  bio: string;
  spotify_url?: string;
  letterboxd_url?: string;
  letterboxd_data: {
    status: 'success' | 'error' | 'not_provided';
    recentRatings?: Rating[];
    favoriteGenres?: string[];
    favoriteFilms?: string[];
    error?: string;
  };
  spotify_data: {
    status: 'success' | 'error' | 'not_provided';
    topArtists?: string[];
    topGenres?: string[];
    recentTracks?: Track[];
    error?: string;
  };
  twin_personality: {
    interests: string[];
    style: string;
    traits: string[];
    summary: string;
  };
  created_at: string;
  updated_at: string;
}

// Define the Message interface
export interface Message {
  id: number;
  twin_id: number;
  content: string;
  is_user: boolean;
  created_at: string;
}

// Zod schema for twin creation
export const createTwinSchema = z.object({
  name: z.string().default('Anonymous'),
  bio: z.string().min(3, "Bio must be at least 3 characters"),
  letterboxd_url: z.string().url("Invalid URL").optional().nullable(),
  spotify_url: z.string().url("Invalid URL").optional().nullable(),
  auth_user_id: z.string().uuid().optional(),
});

// Zod schema for message creation
export const createMessageSchema = z.object({
  twin_id: z.number().int().positive(),
  content: z.string().min(1),
  is_user: z.boolean().default(true),
});

// Types derived from Zod schemas
export type CreateTwin = z.infer<typeof createTwinSchema>;
export type CreateMessage = z.infer<typeof createMessageSchema>; 