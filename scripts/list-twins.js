require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client with the service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function listTwins() {
  console.log('Listing all twins in the database...');
  
  try {
    // Get all twins
    const { data: twins, error } = await supabase
      .from('twins')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching twins:', error);
      return;
    }
    
    console.log(`Found ${twins.length} twins:`);
    
    // Print each twin's basic info
    twins.forEach((twin, index) => {
      console.log(`\n--- Twin #${index + 1} ---`);
      console.log(`ID: ${twin.id}`);
      console.log(`Name: ${twin.name}`);
      console.log(`Auth User ID: ${twin.auth_user_id || 'None (Unclaimed)'}`);
      console.log(`Created: ${new Date(twin.created_at).toLocaleString()}`);
      console.log(`Bio: ${twin.bio.substring(0, 50)}${twin.bio.length > 50 ? '...' : ''}`);
      
      // Check if this twin has Spotify data
      const hasSpotify = twin.spotify_data && twin.spotify_data.status === 'success';
      console.log(`Has Spotify data: ${hasSpotify ? 'Yes' : 'No'}`);
      
      // Check if this twin has Letterboxd data
      const hasLetterboxd = twin.letterboxd_data && twin.letterboxd_data.status === 'success';
      console.log(`Has Letterboxd data: ${hasLetterboxd ? 'Yes' : 'No'}`);
    });
    
  } catch (error) {
    console.error('Error listing twins:', error);
  }
}

listTwins(); 