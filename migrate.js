require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Check if the created_at column exists
    const checkCreatedAtColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'messages' AND column_name = 'created_at'
    `);
    
    // If created_at doesn't exist, add it
    if (checkCreatedAtColumn.rows.length === 0) {
      console.log('Adding created_at column to messages table...');
      await client.query(`
        ALTER TABLE messages 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      `);
      console.log('Added created_at column');
    } else {
      console.log('created_at column already exists');
    }

    // Check if the from_user column exists and is not nullable
    const checkFromUserColumn = await client.query(`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'messages' AND column_name = 'from_user'
    `);
    
    if (checkFromUserColumn.rows.length > 0) {
      const isNullable = checkFromUserColumn.rows[0].is_nullable === 'YES';
      
      if (!isNullable) {
        console.log('Modifying from_user column to be nullable...');
        await client.query(`
          ALTER TABLE messages 
          ALTER COLUMN from_user DROP NOT NULL
        `);
        console.log('Made from_user column nullable');
      } else {
        console.log('from_user column is already nullable');
      }
    } else {
      console.log('from_user column does not exist');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during migration:', error);
  } finally {
    client.release();
    pool.end();
  }
}

migrate(); 