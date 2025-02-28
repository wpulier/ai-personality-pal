require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client with the service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDatabaseTables() {
  console.log('Checking Supabase database structure...');
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Service key available:', !!process.env.SUPABASE_SERVICE_KEY);
  
  try {
    // Check for twins table
    const { data: twins, error: twinsError } = await supabase
      .from('twins')
      .select('count')
      .limit(1);
    
    if (twinsError) {
      console.error('Error querying twins table:', twinsError);
    } else {
      console.log('✅ Twins table exists');
      console.log(`Number of twin records: ${twins ? twins.length : 0}`);
    }
    
    // Get table details
    const { data: tables, error: tablesError } = await supabase
      .rpc('list_tables');
    
    if (tablesError) {
      console.error('Error getting table list:', tablesError);
      // Alternative approach
      console.log('Trying alternative approach...');
      
      const { data: schemaData, error: schemaError } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_schema')
        .eq('table_schema', 'public');
        
      if (schemaError) {
        console.error('Error with alternative approach:', schemaError);
      } else {
        console.log('Tables in public schema:');
        console.log(schemaData);
      }
    } else {
      console.log('Tables in database:');
      console.log(tables);
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkDatabaseTables(); 