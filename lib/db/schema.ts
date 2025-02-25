import { pgTable, text, serial, integer, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export interface Rating {
  title: string;
  rating: string;
  year: string;
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isUser: boolean("is_user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema validation
export const insertUserSchema = createInsertSchema(users, {
  bio: z.string().min(3, "Bio must be at least 3 characters"),
  letterboxdUrl: z.string().url("Invalid URL").optional().nullable(),
  spotifyUrl: z.string().url("Invalid URL").optional().nullable(),
});

export const insertMessageSchema = createInsertSchema(messages);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>; 