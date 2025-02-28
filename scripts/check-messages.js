require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client with service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function checkMessages() {
  console.log('Checking messages table in Supabase...');
  
  try {
    // First, let's just get the first message to see its structure
    const { data: firstMessage, error: firstError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);
    
    if (firstError) {
      console.error('Error fetching first message:', firstError);
      console.log('Trying a simple count query instead...');
      
      // Try a count instead
      const { count, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('Error counting messages:', countError);
      } else {
        console.log(`Found ${count || 0} messages in the table`);
      }
    } else {
      if (firstMessage && firstMessage.length > 0) {
        console.log('First message found:');
        console.log(firstMessage[0]);
        console.log('\nMessage columns:', Object.keys(firstMessage[0]).join(', '));
      } else {
        console.log('No messages found in the table');
      }
    }
    
    // Let's try to determine what works
    console.log('\nTesting message insertion with different field names:');
    
    const testMsg = {
      content: 'Test message for field detection',
      is_user: true
    };
    
    // Try each possible field name
    const fieldNames = ['userId', 'user_id', 'twin_id', 'twinId'];
    
    for (const field of fieldNames) {
      const testData = { ...testMsg, [field]: 1 };
      
      console.log(`\nTesting field: ${field}`);
      const { data: insertData, error: insertError } = await supabase
        .from('messages')
        .insert(testData)
        .select();
      
      if (insertError) {
        console.log(`Error with ${field}:`, insertError.message);
      } else {
        console.log(`SUCCESS! Field ${field} works for insertion.`);
        
        // Delete the test message
        if (insertData && insertData.length > 0) {
          console.log('Deleting test message...');
          await supabase
            .from('messages')
            .delete()
            .eq('id', insertData[0].id);
        }
      }
    }
    
    console.log('\nChecking finished.');
  } catch (error) {
    console.error('Error checking messages:', error);
  }
}

checkMessages(); 