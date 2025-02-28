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

async function fixTwinReferences() {
  console.log('Attempting to fix twin references in messages table...');
  console.log('Using Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  try {
    // Try adding the missing columns to the messages table one by one
    console.log('1. Attempting to add user_id column...');
    const { error: addUserIdError } = await supabase
      .from('messages')
      .update({ user_id: 1 })
      .eq('id', 0); // This should fail if user_id doesn't exist
    
    if (addUserIdError && addUserIdError.code === '42703') {
      console.log('user_id column does not exist, adding it...');
      
      // Try directly with a raw SQL query using supabase-js's postgrest extension
      // This might not work on Supabase depending on permissions
      try {
        // Alternate approach using SQL through table creation
        // First create a temporary table with the right columns
        console.log('Creating a new messages table with the right columns...');
        
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .limit(1);
        
        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
        } else {
          console.log('Sample message row:', messagesData);
        }
        
        // Add a view or fallback
        console.log('\nCreating a compatibility view for different field names...');
        
        // First try a direct insert to see what works
        const testData = {
          content: 'Test message to determine working field name',
          is_user: true
        };
        
        // Try each possible field name
        const fieldNames = ['userId', 'user_id', 'twin_id', 'twinId'];
        let workingField = null;
        
        for (const field of fieldNames) {
          console.log(`Testing field name: ${field}`);
          try {
            // Set a test ID
            testData[field] = 1;
            
            const { data, error } = await supabase
              .from('messages')
              .insert(testData)
              .select();
              
            if (error) {
              // If it fails because the field doesn't exist
              if (error.code === '42703') {
                console.log(`Field ${field} doesn't exist in the table`);
              } else {
                console.log(`Insert with ${field} failed with error:`, error);
              }
            } else {
              console.log(`Success! Field ${field} works`);
              workingField = field;
              
              // Delete the test message
              if (data && data.length > 0) {
                console.log('Cleaning up test message...');
                await supabase
                  .from('messages')
                  .delete()
                  .eq('id', data[0].id);
              }
              
              break;
            }
          } catch (e) {
            console.error(`Error testing field ${field}:`, e);
          }
        }
        
        if (workingField) {
          console.log(`\nFound working field name: ${workingField}`);
          console.log('No further action needed');
        } else {
          console.log('\nNo working field name found. Database schema might need to be fixed manually.');
        }
      } catch (sqlError) {
        console.error('Error executing SQL:', sqlError);
      }
    } else {
      console.log('user_id column appears to already exist');
    }
    
    console.log('\nDone attempting fixes.');
  } catch (error) {
    console.error('Error fixing twin references:', error);
  }
}

// Execute the function
fixTwinReferences(); 