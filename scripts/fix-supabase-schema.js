require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client with admin privileges
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

async function checkTables() {
  console.log('Checking database structure...');
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Service key available:', !!process.env.SUPABASE_SERVICE_KEY);
  
  try {
    // First test the connection with twins table
    console.log('\nTesting connection to Supabase...');
    const { data: testData, error: testError } = await supabase
      .from('twins')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('Connection test failed:', testError);
      return;
    }
    
    console.log('Connection test successful');
    
    // Try to check messages table columns
    console.log('\nExamining messages table structure...');
    const { data: infoColumns, error: infoError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'messages')
      .eq('table_schema', 'public');
    
    if (infoError) {
      console.error('Error with information_schema query:', infoError);
      return;
    }
    
    if (!infoColumns || infoColumns.length === 0) {
      console.log('No columns found for messages table. Table might not exist.');
      return;
    }
    
    console.log('\nMessages table columns:');
    infoColumns.forEach(col => console.log(`- ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not nullable'})`));
    
    // Check for ID field issues
    const idColumns = infoColumns.filter(col => 
      col.column_name === 'user_id' || 
      col.column_name === 'userId' || 
      col.column_name === 'twin_id'
    );
    
    console.log('\nID column detection:');
    if (idColumns.length === 0) {
      console.log('No ID column found (user_id, userId, or twin_id)');
      console.log('This is likely the source of the error!');
    } else {
      console.log('Found ID columns:', idColumns.map(col => col.column_name).join(', '));
    }
    
    // Check for rows in the messages table
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .limit(1);
      
      if (messagesError) {
        console.error('Error querying messages table:', messagesError);
      } else {
        console.log('\nSample message row:', messagesData.length > 0 ? 'Found' : 'None found');
        if (messagesData.length > 0) {
          console.log('Column names in first row:', Object.keys(messagesData[0]).join(', '));
        }
      }
    } catch (queryError) {
      console.error('Error during messages query:', queryError);
    }
    
    // Add code to fix any issues detected
    if (idColumns.length === 0) {
      console.log('\nAttempting to add user_id column to messages table...');
      
      // Create a raw SQL query
      const addColumnQuery = `
        ALTER TABLE messages 
        ADD COLUMN user_id INTEGER
      `;
      
      console.log('Executing query:', addColumnQuery);
      
      try {
        const { data, error } = await supabase.rpc('execute_sql', {
          sql: addColumnQuery
        });
        
        if (error) {
          console.error('Failed to add user_id column:', error);
        } else {
          console.log('Successfully added user_id column!');
        }
      } catch (sqlError) {
        console.error('Error executing alter table command:', sqlError);
      }
    }
    
    console.log('\nAnalysis complete!');
  } catch (error) {
    console.error('Error during database analysis:', error);
  }
}

// Run the diagnosis
checkTables(); 