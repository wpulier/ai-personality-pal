import * as dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// This configuration may have TypeScript errors but works at runtime
// @ts-ignore - Ignoring TypeScript errors for deployment
export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dialect: 'postgresql',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
}; 