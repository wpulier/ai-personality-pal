import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { WebSocket } from 'ws';
import * as schema from './schema';

// Configure Neon to use WebSockets in a Node.js environment
neonConfig.webSocketConstructor = WebSocket;

// This is a singleton to ensure we don't create multiple connections in a serverless environment
let db: ReturnType<typeof initializeDb> | null = null;

function initializeDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?"
    );
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return drizzle(pool, { schema });
}

export function getDb() {
  if (!db) {
    db = initializeDb();
  }
  return db;
} 