require('dotenv').config();
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

// Source database (current PostgreSQL)
const sourcePool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Target Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Note: You'll need to add this to your .env
);

async function migrateData() {
  console.log('Starting migration to Supabase...');
  
  // Connect to source database
  const sourceClient = await sourcePool.connect();
  
  try {
    // 1. Get all users from source database
    console.log('Fetching users from source database...');
    const { rows: sourceUsers } = await sourceClient.query(`
      SELECT * FROM users ORDER BY id
    `);
    
    console.log(`Found ${sourceUsers.length} users to migrate`);
    
    // 2. For each user, create a twin in Supabase
    for (const sourceUser of sourceUsers) {
      console.log(`Migrating user ${sourceUser.id}: ${sourceUser.name}`);
      
      // This is a placeholder - in a real migration, you would:
      // 1. Check if this user has claimed their twin (has auth_user_id)
      // 2. If not, create an unclaimed twin
      
      const { data: twin, error } = await supabase
        .from('twins')
        .insert({
          // No auth_user_id yet - this will be unclaimed
          name: sourceUser.name,
          bio: sourceUser.bio,
          spotify_url: sourceUser.spotify_url,
          letterboxd_url: sourceUser.letterboxd_url,
          letterboxd_data: sourceUser.letterboxd_data,
          spotify_data: sourceUser.spotify_data,
          twin_personality: sourceUser.twin_personality
        })
        .select()
        .single();
      
      if (error) {
        console.error(`Error creating twin for user ${sourceUser.id}:`, error);
        continue;
      }
      
      console.log(`Created twin with ID ${twin.id}`);
      
      // 3. Migrate messages for this user
      const { rows: sourceMessages } = await sourceClient.query(`
        SELECT * FROM messages 
        WHERE user_id = $1
        ORDER BY created_at
      `, [sourceUser.id]);
      
      console.log(`Found ${sourceMessages.length} messages to migrate for user ${sourceUser.id}`);
      
      // Batch insert messages
      if (sourceMessages.length > 0) {
        const messagesToInsert = sourceMessages.map((msg, index) => ({
          twin_id: twin.id,
          content: msg.content,
          is_user: index % 2 !== 0, // Even indices are AI, odd are user
          created_at: msg.created_at
        }));
        
        const { error: messagesError } = await supabase
          .from('messages')
          .insert(messagesToInsert);
        
        if (messagesError) {
          console.error(`Error migrating messages for user ${sourceUser.id}:`, messagesError);
        } else {
          console.log(`Migrated ${messagesToInsert.length} messages for user ${sourceUser.id}`);
        }
      }
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    sourceClient.release();
    sourcePool.end();
  }
}

// Run the migration
migrateData(); 