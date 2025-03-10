const { createClient } = require('@supabase/supabase-js');

// Create Supabase client with service role key for admin privileges
// NOTE: For production, these values should be loaded from environment variables
// This is just for testing purposes
const supabaseUrl = 'https://bxmadsmygulxbjbreclm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bWFkc215Z3VseGJqYnJlY2xtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDYwOTE0MCwiZXhwIjoyMDU2MTg1MTQwfQ.hkai7KjNohmGEHzUQI6TZETv5caygDtPY9cL2Bh8dyo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAllTwins() {
  try {
    console.log('Checking all twins in the database...');
    
    // Get all twins
    const { data: twins, error: twinsError } = await supabase
      .from('twins')
      .select('id, name, created_at, auth_user_id')
      .order('created_at', { ascending: false });
    
    if (twinsError) {
      console.error('Error fetching twins:', twinsError);
      return;
    }
    
    console.log(`Found ${twins?.length || 0} total twins in the database`);
    
    if (twins && twins.length > 0) {
      console.log('\nTwin details:');
      twins.forEach((twin, index) => {
        console.log(`Twin #${index + 1}:`);
        console.log(`  ID: ${twin.id}`);
        console.log(`  Name: ${twin.name}`);
        console.log(`  Created: ${new Date(twin.created_at).toLocaleString()}`);
        console.log(`  Auth User ID: ${twin.auth_user_id || 'None (Unclaimed)'}`);
      });
      
      // Group twins by auth_user_id
      const twinsByUser = twins.reduce((acc, twin) => {
        const userId = twin.auth_user_id || 'unclaimed';
        if (!acc[userId]) {
          acc[userId] = [];
        }
        acc[userId].push(twin);
        return acc;
      }, {});
      
      console.log('\nTwins grouped by user:');
      for (const [userId, userTwins] of Object.entries(twinsByUser)) {
        console.log(`User ${userId}: ${userTwins.length} twins`);
      }
    }
    
    // Check for auth users
    console.log('\nAttempting to check auth users...');
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Error fetching auth users:', authError);
      } else if (authUsers) {
        console.log(`Found ${authUsers.users?.length || 0} auth users`);
        
        if (authUsers.users && authUsers.users.length > 0) {
          console.log('\nAuth user details:');
          authUsers.users.forEach((user, index) => {
            console.log(`User #${index + 1}:`);
            console.log(`  ID: ${user.id}`);
            console.log(`  Email: ${user.email}`);
            console.log(`  Created: ${new Date(user.created_at).toLocaleString()}`);
          });
        }
      }
    } catch (authListError) {
      console.error('Error listing auth users:', authListError);
      
      // Try a different approach
      console.log('\nTrying alternative approach to check auth schema...');
      const { data: schemaData, error: schemaError } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_schema')
        .eq('table_schema', 'auth');
        
      if (schemaError) {
        console.error('Error checking auth schema:', schemaError);
      } else {
        console.log('Auth schema tables:');
        console.log(schemaData);
      }
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkAllTwins(); 