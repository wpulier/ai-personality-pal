import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { WebSocket } from 'ws';
import * as schema from './schema';

// Configure Neon to use WebSockets in a Node.js environment
if (typeof window === 'undefined') {
  // Only use WebSocket in Node.js environment (server-side)
  neonConfig.webSocketConstructor = WebSocket;
}

// This is a singleton to ensure we don't create multiple connections in a serverless environment
let db: ReturnType<typeof initializeDb> | null = null;

function initializeDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?"
    );
  }

  try {
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      // Add connection pool settings for better stability
      max: 10, // Maximum number of clients
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
    });
    
    // Add error handler to the pool
    pool.on('error', (err) => {
      console.error('Unexpected error on idle database client', err);
      // Force a new connection to be created next time
      db = null;
    });
    
    return drizzle(pool, { schema });
  } catch (error) {
    console.error('Failed to initialize database connection:', error);
    throw error;
  }
}

export function getDb() {
  if (!db) {
    try {
      db = initializeDb();
    } catch (error) {
      console.error('Error getting database connection:', error);
      throw error;
    }
  }
  return db;
} 