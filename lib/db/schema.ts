import { pgTable, text, serial, integer, json, timestamp, boolean } from "drizzle-orm/pg-core";
import { z } from "zod";

export interface Rating {
  title: string;
  rating: string;
  year?: string;
  url?: string;
}

export interface Track {
  name: string;
  artist: string;
  playedAt?: string;
}

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").default('Anonymous').notNull(),
  spotifyUrl: text("spotify_url"),
  letterboxdUrl: text("letterboxd_url"),
  bio: text("bio").notNull(),
  letterboxdData: json("letterboxd_data").$type<{
    status: 'success' | 'error' | 'not_provided';
    recentRatings?: Rating[];
    favoriteGenres?: string[];
    favoriteFilms?: string[];
    error?: string;
  }>().default({ status: 'not_provided' }),
  spotifyData: json("spotify_data").$type<{
    status: 'success' | 'error' | 'not_provided';
    topArtists?: string[];
    topGenres?: string[];
    recentTracks?: Track[];
    error?: string;
  }>().default({ status: 'not_provided' }),
  twinPersonality: json("twin_personality").$type<{
    interests: string[];
    style: string;
    traits: string[];
    summary: string;
  }>(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Simple schema validation without drizzle-zod
export const insertUserSchema = z.object({
  name: z.string().default('Anonymous'),
  bio: z.string().min(3, "Bio must be at least 3 characters"),
  letterboxdUrl: z.string().url("Invalid URL").optional().nullable(),
  spotifyUrl: z.string().url("Invalid URL").optional().nullable(),
});

export const insertMessageSchema = z.object({
  userId: z.number().int().positive(),
  content: z.string().min(1),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>; 