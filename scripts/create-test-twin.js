require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client with the service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createTestTwin() {
  console.log('Creating a test twin in the database...');
  
  try {
    // Sample twin data
    const twinData = {
      name: 'Test Twin',
      bio: 'This is a test twin created by a script to verify the database is working.',
      letterboxd_url: null,
      spotify_url: null,
      letterboxd_data: { status: 'not_provided' },
      spotify_data: { status: 'not_provided' },
      twin_personality: {
        interests: ['testing', 'databases'],
        style: 'informative',
        traits: ['helpful', 'analytical'],
        summary: 'A test twin created to verify database functionality.'
      }
    };
    
    // Insert the twin directly with the admin client
    const { data, error } = await supabase
      .from('twins')
      .insert(twinData)
      .select();
    
    if (error) {
      console.error('Error creating test twin:', error);
      return;
    }
    
    console.log('Test twin created successfully!');
    console.log('Twin ID:', data[0].id);
    
    // Now let's verify we can read the twin back
    const { data: readTwin, error: readError } = await supabase
      .from('twins')
      .select('*')
      .eq('id', data[0].id)
      .single();
    
    if (readError) {
      console.error('Error reading back the twin:', readError);
      return;
    }
    
    console.log('Successfully read twin back from database:');
    console.log(`ID: ${readTwin.id}`);
    console.log(`Name: ${readTwin.name}`);
    console.log(`Created: ${new Date(readTwin.created_at).toLocaleString()}`);
    
    // Now let's add a test message for this twin
    const messageData = {
      twin_id: readTwin.id,
      content: 'Hello! This is a test message.',
      is_user: false
    };
    
    const { data: messageResult, error: messageError } = await supabase
      .from('messages')
      .insert(messageData)
      .select();
    
    if (messageError) {
      console.error('Error creating test message:', messageError);
      return;
    }
    
    console.log('Test message created successfully!');
    console.log('Message ID:', messageResult[0].id);
    
  } catch (error) {
    console.error('Error in test twin creation script:', error);
  }
}

createTestTwin(); 