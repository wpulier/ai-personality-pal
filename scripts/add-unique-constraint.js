const { createClient } = require('@supabase/supabase-js');

// Create Supabase client with service role key for admin privileges
const supabaseUrl = 'https://bxmadsmygulxbjbreclm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bWFkc215Z3VseGJqYnJlY2xtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDYwOTE0MCwiZXhwIjoyMDU2MTg1MTQwfQ.hkai7KjNohmGEHzUQI6TZETv5caygDtPY9cL2Bh8dyo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addUniqueConstraint() {
  try {
    console.log('Adding unique constraint to auth_user_id in twins table...');
    
    // First, we need to handle existing duplicate auth_user_id values
    // We'll keep only the most recently created twin for each user
    const { data: twins, error: fetchError } = await supabase
      .from('twins')
      .select('id, auth_user_id, created_at')
      .not('auth_user_id', 'is', null)
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('Error fetching twins:', fetchError);
      return;
    }
    
    // Group twins by auth_user_id
    const twinsByUser = {};
    twins.forEach(twin => {
      if (!twin.auth_user_id) return;
      
      if (!twinsByUser[twin.auth_user_id]) {
        twinsByUser[twin.auth_user_id] = [];
      }
      twinsByUser[twin.auth_user_id].push(twin);
    });
    
    // For each user with multiple twins, keep only the most recent one
    for (const [userId, userTwins] of Object.entries(twinsByUser)) {
      if (userTwins.length <= 1) continue;
      
      // Sort by created_at descending (most recent first)
      userTwins.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      // Keep the first one (most recent), delete the rest
      const twinsToDelete = userTwins.slice(1).map(twin => twin.id);
      
      if (twinsToDelete.length > 0) {
        console.log(`User ${userId} has ${userTwins.length} twins. Keeping twin ID ${userTwins[0].id} and deleting ${twinsToDelete.length} older twins.`);
        
        const { error: deleteError } = await supabase
          .from('twins')
          .delete()
          .in('id', twinsToDelete);
        
        if (deleteError) {
          console.error(`Error deleting duplicate twins for user ${userId}:`, deleteError);
        } else {
          console.log(`Successfully deleted ${twinsToDelete.length} duplicate twins for user ${userId}`);
        }
      }
    }
    
    // Now add the unique constraint
    const { error: alterError } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE public.twins
        ADD CONSTRAINT twins_auth_user_id_unique UNIQUE (auth_user_id)
        DEFERRABLE INITIALLY DEFERRED;
      `
    });
    
    if (alterError) {
      console.error('Error adding unique constraint:', alterError);
      return;
    }
    
    console.log('Successfully added unique constraint to auth_user_id in twins table');
    
  } catch (error) {
    console.error('Error in migration script:', error);
  }
}

addUniqueConstraint(); 