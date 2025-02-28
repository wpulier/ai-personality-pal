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
    
    // Check if the metadata column exists
    const checkMetadataColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'messages' AND column_name = 'metadata'
    `);
    
    // If metadata doesn't exist, add it
    if (checkMetadataColumn.rows.length === 0) {
      console.log('Adding metadata column to messages table...');
      await client.query(`
        ALTER TABLE messages 
        ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb
      `);
      console.log('Added metadata column');
    } else {
      console.log('metadata column already exists');
    }

    // Check if there's a twin_id column that needs to be renamed to userId
    const checkTwinIdColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'messages' AND column_name = 'twin_id'
    `);

    // If twin_id exists, rename it to user_id for consistency
    if (checkTwinIdColumn.rows.length > 0) {
      console.log('Found twin_id column, renaming to user_id for consistency...');
      await client.query(`
        ALTER TABLE messages 
        RENAME COLUMN twin_id TO user_id
      `);
      console.log('Renamed twin_id to user_id');
    }

    // Verify the user_id column exists
    const checkUserIdColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'messages' AND column_name = 'user_id'
    `);

    // If user_id doesn't exist but it should (assuming twin_id was not present either), add it
    if (checkUserIdColumn.rows.length === 0 && checkTwinIdColumn.rows.length === 0) {
      console.log('Neither user_id nor twin_id columns found in messages table, adding user_id...');
      await client.query(`
        ALTER TABLE messages 
        ADD COLUMN user_id INTEGER REFERENCES users(id)
      `);
      console.log('Added user_id column');
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