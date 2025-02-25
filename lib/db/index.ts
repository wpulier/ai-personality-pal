import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

// This is a singleton to ensure we don't create multiple connections in a serverless environment
let db: ReturnType<typeof initializeDb> | null = null;

function initializeDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?"
    );
  }

  try {
    // Use direct HTTP connection instead of WebSockets
    const connectionString = process.env.DATABASE_URL;
    
    // Force use HTTP instead of WebSockets by setting sslmode=require
    const httpConnectionString = connectionString.includes('sslmode=require') 
      ? connectionString 
      : `${connectionString}${connectionString.includes('?') ? '&' : '?'}sslmode=require`;
    
    // Create the connection pool with HTTP
    const pool = new Pool({ 
      connectionString: httpConnectionString,
      max: 5, // Limit connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
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