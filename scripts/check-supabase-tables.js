require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client with the service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSupabaseTables() {
  console.log('Checking Supabase database structure and data...');
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Service key available:', !!process.env.SUPABASE_SERVICE_KEY);
  
  try {
    // Check for twins table
    const { data: twins, error: twinsError } = await supabase
      .from('twins')
      .select('*');
    
    if (twinsError) {
      console.error('Error querying twins table:', twinsError);
    } else {
      console.log('✅ Twins table exists');
      console.log(`Number of twin records: ${twins ? twins.length : 0}`);
      
      // Print details of each twin
      if (twins && twins.length > 0) {
        twins.forEach((twin, index) => {
          console.log(`\n--- Twin #${index + 1} ---`);
          console.log(`ID: ${twin.id}`);
          console.log(`Name: ${twin.name}`);
          console.log(`Auth User ID: ${twin.auth_user_id || 'None (Unclaimed)'}`);
          console.log(`Created: ${new Date(twin.created_at).toLocaleString()}`);
          console.log(`Bio: ${twin.bio.substring(0, 50)}${twin.bio.length > 50 ? '...' : ''}`);
        });
      } else {
        console.log('No twins found in the database');
      }
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkSupabaseTables(); 